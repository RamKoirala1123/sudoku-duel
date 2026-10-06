interface BrokerState {
  url: string;
  ws: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  keepAliveTimer: ReturnType<typeof setInterval> | null;
  packetId: number;
  retryCount: number;
}

export class SignalingService {
  private _isDisposed = false;
  private _listeners: ((msg: Record<string, unknown>) => void)[] = [];
  private _seenMessageIds = new Set<string>();
  private _seenMessageIdsList: string[] = [];
  private _msgSeq = 0;

  // Local API polling
  private _apiPollTimer: ReturnType<typeof setTimeout> | null = null;
  private _lastApiPollTime = 0;
  private _isApiAvailable = true;

  readonly clientId: string;
  readonly roomCode: string;

  private readonly _brokers: BrokerState[] = [
    {
      url: 'wss://broker.emqx.io:8084/mqtt',
      ws: null,
      isConnected: false,
      isConnecting: false,
      reconnectTimer: null,
      keepAliveTimer: null,
      packetId: 1,
      retryCount: 0,
    },
    {
      url: 'wss://broker.hivemq.com:8884/mqtt',
      ws: null,
      isConnected: false,
      isConnecting: false,
      reconnectTimer: null,
      keepAliveTimer: null,
      packetId: 1,
      retryCount: 0,
    },
  ];

  constructor(roomCode: string, clientId?: string) {
    this.roomCode = roomCode.trim().toUpperCase();
    // Keep client ID <= 23 bytes for strict MQTT 3.1.1 compliance
    this.clientId = clientId ?? `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  private get _topic(): string {
    return `sudoku/room/${this.roomCode}`;
  }

  onMessage(callback: (msg: Record<string, unknown>) => void) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter((cb) => cb !== callback);
    };
  }

  get isConnected(): boolean {
    return this._brokers.some((b) => b.isConnected) || (this._isApiAvailable && this._apiPollTimer !== null);
  }

  async connect(): Promise<boolean> {
    if (this._isDisposed) return false;

    // Start local API polling in background if in browser
    this._startApiPolling();

    // Start connecting to all brokers in parallel
    const connectPromises = this._brokers.map((broker) => this._connectBroker(broker, 5000));

    // Wait until at least one broker connects or all settle
    const results = await Promise.allSettled(connectPromises);
    const hasAnyConnected = results.some((r) => r.status === 'fulfilled' && r.value === true);

    if (hasAnyConnected) {
      return true;
    }

    // If initial parallel attempt failed, try a quick second attempt with 6000ms timeout
    if (this._isDisposed) return false;
    console.warn('[Signaling] First connection pass failed, retrying brokers...');
    const retryPromises = this._brokers.map((broker) => this._connectBroker(broker, 6000));
    const retryResults = await Promise.allSettled(retryPromises);
    const hasRetryConnected = retryResults.some((r) => r.status === 'fulfilled' && r.value === true);

    // If local API signaling is available, we can also consider connected
    if (hasRetryConnected || this._isApiAvailable) {
      return true;
    }

    return false;
  }

  private _connectBroker(broker: BrokerState, timeoutMs = 5000): Promise<boolean> {
    if (this._isDisposed) return Promise.resolve(false);
    if (broker.isConnected && broker.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve(true);
    }
    if (broker.isConnecting) {
      return Promise.resolve(false);
    }

    broker.isConnecting = true;
    this._cleanupBrokerSocket(broker);

    return new Promise((resolve) => {
      let resolved = false;
      let ws: WebSocket | null = null;

      const finish = (ok: boolean) => {
        if (!resolved) {
          resolved = true;
          broker.isConnecting = false;
          clearTimeout(timer);
          if (!ok) {
            broker.isConnected = false;
            if (ws) {
              try { ws.close(); } catch {}
            }
          }
          resolve(ok);
        }
      };

      const timer = setTimeout(() => {
        finish(false);
      }, timeoutMs);

      try {
        ws = new WebSocket(broker.url, ['mqtt']);
        ws.binaryType = 'arraybuffer';
        broker.ws = ws;

        ws.onopen = () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            // Append broker specific prefix to avoid client ID collisions across brokers
            const brokerClientId = `${this.clientId}_${broker.url.includes('hivemq') ? 'h' : 'e'}`;
            ws.send(this._buildConnectPacket(brokerClientId));
          }
        };

        ws.onmessage = (event) => {
          const bytes = new Uint8Array(event.data as ArrayBuffer);
          if (bytes.length === 0) return;

          this._handleBrokerIncomingBytes(broker, bytes, () => {
            // Called upon successful CONNACK or SUBACK
            finish(true);
          });
        };

        ws.onerror = () => {
          finish(false);
        };

        ws.onclose = () => {
          const wasConnected = broker.isConnected;
          broker.isConnected = false;
          broker.isConnecting = false;
          this._stopKeepAlive(broker);
          finish(false);

          if (!this._isDisposed && wasConnected) {
            this._scheduleReconnect(broker);
          }
        };
      } catch (err) {
        console.warn(`[Signaling] Error creating WebSocket for ${broker.url}:`, err);
        finish(false);
      }
    });
  }

  private _handleBrokerIncomingBytes(
    broker: BrokerState,
    bytes: Uint8Array,
    onSubscribed: () => void
  ) {
    let index = 0;
    while (index < bytes.length) {
      const firstByte = bytes[index++];
      const packetType = firstByte & 0xf0;

      // Decode Remaining Length
      let multiplier = 1;
      let remLen = 0;
      let digit: number;
      do {
        if (index >= bytes.length) return;
        digit = bytes[index++];
        remLen += (digit & 0x7f) * multiplier;
        multiplier *= 128;
      } while ((digit & 0x80) !== 0);

      const packetEnd = index + remLen;
      if (packetEnd > bytes.length) return;

      // Handle packet types
      if (packetType === 0x20) {
        // CONNACK
        const returnCode = remLen >= 2 ? bytes[index + 1] : 0;
        if (returnCode === 0) {
          broker.isConnected = true;
          broker.retryCount = 0;
          this._startKeepAlive(broker);
          // Subscribe to topic
          broker.ws?.send(this._buildSubscribePacket(broker.packetId++, this._topic));
          // Subscribed confirmation fallback in case SUBACK delayed
          setTimeout(() => {
            if (broker.isConnected) onSubscribed();
          }, 400);
        } else {
          console.warn(`[Signaling] Broker ${broker.url} rejected MQTT with code: ${returnCode}`);
        }
      } else if (packetType === 0x90) {
        // SUBACK
        broker.isConnected = true;
        onSubscribed();
      } else if (packetType === 0x30) {
        // PUBLISH
        try {
          let offset = index;
          if (offset + 2 <= packetEnd) {
            const topicLen = (bytes[offset] << 8) | bytes[offset + 1];
            offset += 2 + topicLen;

            // Check if QoS > 0 (bits 1 or 2 set)
            const qos = (firstByte & 0x06) >> 1;
            if (qos > 0) offset += 2; // skip packet id

            if (offset <= packetEnd) {
              const payloadBytes = bytes.slice(offset, packetEnd);
              const text = new TextDecoder('utf-8').decode(payloadBytes);
              const data = JSON.parse(text) as Record<string, unknown>;
              this._dispatchMessage(data);
            }
          }
        } catch (e) {
          console.warn('[Signaling] Failed to decode incoming publish:', e);
        }
      }

      index = packetEnd;
    }
  }

  private _dispatchMessage(data: Record<string, unknown>) {
    // 1. Ignore echoes from self
    if (data._sender === this.clientId) return;

    // 2. Deduplicate messages
    const msgId = (data._msgId as string) || `${data._sender}_${data._time}_${data.type}`;
    if (this._seenMessageIds.has(msgId)) {
      return;
    }

    this._seenMessageIds.add(msgId);
    this._seenMessageIdsList.push(msgId);
    if (this._seenMessageIdsList.length > 300) {
      const removed = this._seenMessageIdsList.shift();
      if (removed) this._seenMessageIds.delete(removed);
    }

    // 3. Dispatch to all listeners
    for (const listener of this._listeners) {
      try {
        listener(data);
      } catch (err) {
        console.error('[Signaling] Listener error:', err);
      }
    }
  }

  private _scheduleReconnect(broker: BrokerState) {
    if (this._isDisposed || broker.isConnecting) return;
    if (broker.reconnectTimer) clearTimeout(broker.reconnectTimer);

    broker.retryCount++;
    const delay = Math.min(1000 * Math.pow(1.5, broker.retryCount), 8000);

    broker.reconnectTimer = setTimeout(async () => {
      broker.reconnectTimer = null;
      if (!this._isDisposed && !broker.isConnected) {
        await this._connectBroker(broker, 6000);
      }
    }, delay);
  }

  send(message: Record<string, unknown>) {
    if (this._isDisposed) return;

    this._msgSeq++;
    const msgId = `${this.clientId}_${Date.now()}_${this._msgSeq}`;
    const payloadObj = {
      ...message,
      _msgId: msgId,
      _sender: this.clientId,
      _time: Date.now(),
    };

    // Mark own message as seen
    this._seenMessageIds.add(msgId);
    this._seenMessageIdsList.push(msgId);

    const payloadJson = JSON.stringify(payloadObj);
    const packet = this._buildPublishPacket(this._topic, payloadJson);

    // 1. Send via all currently connected MQTT brokers
    for (const broker of this._brokers) {
      if (broker.isConnected && broker.ws?.readyState === WebSocket.OPEN) {
        try {
          broker.ws.send(packet);
        } catch (e) {
          console.warn(`[Signaling] Failed to send via ${broker.url}:`, e);
        }
      }
    }

    // 2. Send via local API route in background
    if (typeof window !== 'undefined' && this._isApiAvailable) {
      fetch('/api/signaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: this.roomCode,
          message: payloadObj,
        }),
      }).catch(() => {
        // Ignore API failures gracefully
      });
    }
  }

  private _startApiPolling() {
    if (typeof window === 'undefined' || this._apiPollTimer) return;

    this._lastApiPollTime = Date.now() - 5000;
    const poll = async () => {
      if (this._isDisposed) return;
      try {
        const res = await fetch(
          `/api/signaling?roomCode=${encodeURIComponent(this.roomCode)}&since=${this._lastApiPollTime}&excludeSender=${encodeURIComponent(this.clientId)}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = (await res.json()) as { messages?: Record<string, unknown>[]; serverTime?: number };
          if (data.serverTime) {
            this._lastApiPollTime = data.serverTime;
          }
          if (Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              this._dispatchMessage(msg);
            }
          }
          this._isApiAvailable = true;
        } else if (res.status === 404) {
          this._isApiAvailable = false;
        }
      } catch {
        // Server unreachable or offline
      }
      if (!this._isDisposed) {
        this._apiPollTimer = setTimeout(poll, 700);
      }
    };

    this._apiPollTimer = setTimeout(poll, 500);
  }

  private _startKeepAlive(broker: BrokerState) {
    this._stopKeepAlive(broker);
    broker.keepAliveTimer = setInterval(() => {
      if (broker.isConnected && broker.ws?.readyState === WebSocket.OPEN) {
        try {
          broker.ws.send(new Uint8Array([0xc0, 0x00])); // PINGREQ
        } catch {}
      }
    }, 20000);
  }

  private _stopKeepAlive(broker: BrokerState) {
    if (broker.keepAliveTimer) {
      clearInterval(broker.keepAliveTimer);
      broker.keepAliveTimer = null;
    }
  }

  private _cleanupBrokerSocket(broker: BrokerState) {
    this._stopKeepAlive(broker);
    if (broker.reconnectTimer) {
      clearTimeout(broker.reconnectTimer);
      broker.reconnectTimer = null;
    }
    if (broker.ws) {
      try {
        broker.ws.onopen = null;
        broker.ws.onmessage = null;
        broker.ws.onerror = null;
        broker.ws.onclose = null;
        broker.ws.close();
      } catch {}
      broker.ws = null;
    }
    broker.isConnected = false;
  }

  dispose() {
    this._isDisposed = true;
    if (this._apiPollTimer) {
      clearTimeout(this._apiPollTimer);
      this._apiPollTimer = null;
    }
    for (const broker of this._brokers) {
      this._cleanupBrokerSocket(broker);
    }
    this._listeners = [];
    this._seenMessageIds.clear();
    this._seenMessageIdsList = [];
  }

  // --- MQTT 3.1.1 Packet Encoders ---

  private _buildConnectPacket(clientId: string): Uint8Array {
    const protocolName = [0x00, 0x04, 0x4d, 0x51, 0x54, 0x54]; // "MQTT"
    const protocolLevel = 0x04; // 3.1.1
    const connectFlags = 0x02; // Clean Session
    const keepAlive = [0x00, 0x3c]; // 60 seconds

    const idBytes = new TextEncoder().encode(clientId);
    const idLen = [idBytes.length >> 8, idBytes.length & 0xff];

    const varHeader = [...protocolName, protocolLevel, connectFlags, ...keepAlive];
    const payload = [...idLen, ...idBytes];
    const remaining = [...varHeader, ...payload];

    return new Uint8Array([0x10, ...this._encodeRemainingLength(remaining.length), ...remaining]);
  }

  private _buildSubscribePacket(packetId: number, topic: string): Uint8Array {
    const topicBytes = new TextEncoder().encode(topic);
    const remaining = [
      packetId >> 8,
      packetId & 0xff,
      topicBytes.length >> 8,
      topicBytes.length & 0xff,
      ...topicBytes,
      0x00, // QoS 0
    ];
    return new Uint8Array([0x82, ...this._encodeRemainingLength(remaining.length), ...remaining]);
  }

  private _buildPublishPacket(topic: string, message: string): Uint8Array {
    const topicBytes = new TextEncoder().encode(topic);
    const msgBytes = new TextEncoder().encode(message);

    const totalRemaining = 2 + topicBytes.length + msgBytes.length;
    const remLenBytes = this._encodeRemainingLength(totalRemaining);

    const packet = new Uint8Array(1 + remLenBytes.length + totalRemaining);
    packet[0] = 0x30; // PUBLISH, QoS 0
    packet.set(remLenBytes, 1);

    let offset = 1 + remLenBytes.length;
    packet[offset++] = (topicBytes.length >> 8) & 0xff;
    packet[offset++] = topicBytes.length & 0xff;
    packet.set(topicBytes, offset);
    offset += topicBytes.length;
    packet.set(msgBytes, offset);

    return packet;
  }

  private _encodeRemainingLength(length: number): number[] {
    const result: number[] = [];
    let x = length;
    do {
      let encodedByte = x % 128;
      x = Math.floor(x / 128);
      if (x > 0) {
        encodedByte |= 128;
      }
      result.push(encodedByte);
    } while (x > 0);
    return result;
  }
}

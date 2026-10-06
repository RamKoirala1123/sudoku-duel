import { NextResponse } from 'next/server';

interface SignalingEntry {
  id: string;
  sender: string;
  time: number;
  data: Record<string, unknown>;
}

// Global in-memory bus for local dev / same-server signaling
const globalRooms = new Map<string, SignalingEntry[]>();

function cleanupOldMessages() {
  const cutoff = Date.now() - 45000; // 45s TTL
  for (const [code, entries] of globalRooms.entries()) {
    const valid = entries.filter((e) => e.time > cutoff);
    if (valid.length === 0) {
      globalRooms.delete(code);
    } else if (valid.length !== entries.length) {
      globalRooms.set(code, valid);
    }
  }
}

export async function GET(req: Request) {
  try {
    cleanupOldMessages();
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get('roomCode')?.trim();
    const since = parseInt(searchParams.get('since') || '0', 10);
    const excludeSender = searchParams.get('excludeSender')?.trim();

    if (!roomCode) {
      return NextResponse.json({ error: 'roomCode required' }, { status: 400 });
    }

    const entries = globalRooms.get(roomCode) || [];
    const messages = entries
      .filter((e) => e.time > since && (!excludeSender || e.sender !== excludeSender))
      .map((e) => e.data);

    return NextResponse.json({ ok: true, messages, serverTime: Date.now() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    cleanupOldMessages();
    const body = (await req.json()) as {
      roomCode?: string;
      message?: Record<string, unknown>;
    };

    const roomCode = body.roomCode?.trim();
    const message = body.message;

    if (!roomCode || !message) {
      return NextResponse.json({ error: 'roomCode and message required' }, { status: 400 });
    }

    let entries = globalRooms.get(roomCode);
    if (!entries) {
      entries = [];
      globalRooms.set(roomCode, entries);
    }

    const sender = (message._sender as string) || 'unknown';
    const msgId = (message._msgId as string) || `${sender}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const time = (message._time as number) || Date.now();

    // Prevent duplicates
    if (!entries.some((e) => e.id === msgId)) {
      entries.push({
        id: msgId,
        sender,
        time,
        data: message,
      });

      // Keep max 50 recent messages per room
      if (entries.length > 50) {
        entries.splice(0, entries.length - 50);
      }
    }

    return NextResponse.json({ ok: true, serverTime: Date.now() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

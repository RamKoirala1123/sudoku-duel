"use client";

import React, { useEffect } from "react";
import {
  Trophy,
  X,
  Crown,
  Skull,
  CheckCircle2,
  Wifi,
  Sparkles,
} from "lucide-react";
import { PlayerProgress } from "@/lib/types";

interface LeaderboardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerProgress[];
  myId: string;
  latencyMs?: number;
  onSendEmoji?: (emoji: string) => void;
}

const EMOJI_LIST = ["🔥", "👏", "🤯", "😎", "😱", "💀"];

export const LeaderboardDrawer: React.FC<LeaderboardDrawerProps> = ({
  isOpen,
  onClose,
  players,
  myId,
  latencyMs,
  onSendEmoji,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Sort players by race position
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isFinished && !b.isFinished) return -1;
    if (!a.isFinished && b.isFinished) return 1;
    if (a.isKnockedOut && !b.isKnockedOut) return 1;
    if (!a.isKnockedOut && b.isKnockedOut) return -1;
    const progB = b.progress ?? b.progressPercent ?? 0;
    const progA = a.progress ?? a.progressPercent ?? 0;
    return progB - progA || a.mistakes - b.mistakes;
  });

  const myRank = Math.max(
    1,
    sortedPlayers.findIndex((p) => p.id === myId) + 1
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Drawer */}
      <aside
        className="relative z-10 w-full max-w-[360px] h-full bg-white dark:bg-[#161926] shadow-2xl border-l border-black/[0.08] dark:border-white/[0.08] flex flex-col transform transition-transform duration-200 ease-out"
        role="dialog"
        aria-modal="true"
        aria-label="Match Standings"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1E2233] dark:text-[#F3F4FA] flex items-center gap-1.5 leading-none">
                Live Standings
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 font-mono text-[#1E2233]/70 dark:text-[#F3F4FA]/70">
                  {players.length} players
                </span>
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-[#1E2233]/60 dark:text-[#F3F4FA]/60 mt-0.5 font-medium">
                <span>Your Rank: #{myRank}</span>
                {latencyMs !== undefined && (
                  <span className="flex items-center gap-0.5 font-mono text-[10px]">
                    <Wifi
                      className={`w-3 h-3 ${
                        latencyMs < 80
                          ? "text-[#3DDC97]"
                          : latencyMs < 180
                          ? "text-[#FFC24B]"
                          : "text-[#FF5D6C]"
                      }`}
                    />
                    {latencyMs}ms
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#1E2233]/70 dark:text-[#F3F4FA]/70 hover:text-[#1E2233] dark:hover:text-[#F3F4FA] transition cursor-pointer"
            title="Close Standings (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          {sortedPlayers.map((p, idx) => {
            const isMe = p.id === myId;
            const prog = p.progress ?? p.progressPercent ?? 0;
            const percent = Math.min(100, Math.max(0, Math.round(prog * 100)));
            const playerColor = p.color || "#5B6CFF";
            const rank = idx + 1;

            return (
              <div
                key={p.id}
                className={`p-3 rounded-[14px] transition-all ${
                  isMe
                    ? "bg-[#5B6CFF]/[0.08] dark:bg-[#7C8CFF]/[0.12] border-2 border-[#5B6CFF] dark:border-[#7C8CFF] shadow-xs"
                    : "bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06]"
                }`}
              >
                {/* Row info */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Rank pill */}
                    <span
                      className={`font-mono text-xs font-black px-1.5 py-0.5 rounded-[6px] shrink-0 ${
                        rank === 1
                          ? "bg-amber-400/20 text-amber-500 dark:text-amber-300"
                          : rank === 2
                          ? "bg-slate-300/30 text-slate-600 dark:text-slate-300"
                          : rank === 3
                          ? "bg-amber-700/20 text-amber-700 dark:text-amber-500"
                          : "bg-black/5 dark:bg-white/10 text-[#1E2233]/50 dark:text-[#F3F4FA]/50"
                      }`}
                    >
                      #{rank}
                    </span>

                    {/* Color dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-[#161926]"
                      style={{ backgroundColor: playerColor }}
                    />

                    {/* Name */}
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-semibold text-xs sm:text-sm text-[#1E2233] dark:text-[#F3F4FA] truncate max-w-[130px]">
                        {p.name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#5B6CFF] text-white shrink-0">
                          YOU
                        </span>
                      )}
                      {p.isHost && (
                        <span title="Host">
                          <Crown className="w-3 h-3 text-[#FFC24B] shrink-0" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status / Percentage */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.isKnockedOut || p.isDefeated ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#FF5D6C] bg-[#FF5D6C]/10 px-1.5 py-0.5 rounded-md">
                        <Skull className="w-3 h-3" /> Knocked Out
                      </span>
                    ) : p.isFinished || p.isCompleted ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#3DDC97] bg-[#3DDC97]/15 px-1.5 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" /> Finished
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-sm text-[#1E2233] dark:text-[#F3F4FA]">
                        {percent}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${percent}%`,
                      backgroundColor:
                        p.isKnockedOut || p.isDefeated ? "#FF5D6C" : playerColor,
                    }}
                  />
                </div>

                {/* Sub details: Mistakes & remaining */}
                <div className="flex items-center justify-between text-[11px] text-[#1E2233]/60 dark:text-[#F3F4FA]/60 font-medium">
                  <span>
                    Mistakes: <strong className={p.mistakes > 0 ? "text-[#FF5D6C]" : ""}>{p.mistakes}</strong>
                  </span>
                  <span>
                    {p.isFinished
                      ? "100% complete"
                      : `${100 - percent}% to go`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: Quick Reactions */}
        {onSendEmoji && (
          <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#1E2233]/60 dark:text-[#F3F4FA]/60 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Send Reaction
              </span>
              <span className="text-[10px] text-[#1E2233]/40 dark:text-[#F3F4FA]/40 font-mono">
                Press Esc to close
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSendEmoji(emoji)}
                  className="h-9 rounded-[10px] flex items-center justify-center text-lg bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.14] hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  title={`React ${emoji}`}
                >
                  <span className="leading-none">{emoji}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

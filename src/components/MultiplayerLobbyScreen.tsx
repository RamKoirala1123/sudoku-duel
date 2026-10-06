"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Copy,
  Check,
  Link2,
  Users,
  Play,
  Crown,
  Share2,
  Loader2,
} from "lucide-react";
import { Difficulty, MistakeRule, PlayerProgress } from "@/lib/types";

interface MultiplayerLobbyScreenProps {
  isHost: boolean;
  roomCode: string;
  players: PlayerProgress[];
  difficulty: Difficulty;
  mistakeRule: MistakeRule;
  onDifficultyChange: (diff: Difficulty) => void;
  onMistakeRuleChange: (rule: MistakeRule) => void;
  onStartMatch: () => void;
  onLeave: () => void;
}

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
  { id: "difficult", label: "Expert" },
  { id: "extreme", label: "Extreme" },
];

const MISTAKE_RULES: { id: MistakeRule; label: string; short: string }[] = [
  { id: "standard", label: "Standard (3 Lives)", short: "3 Lives" },
  { id: "hardcore", label: "Sudden Death (1 Life)", short: "1 Life" },
  { id: "casual", label: "Casual (Unlimited)", short: "Casual" },
];

const AVATAR_COLORS = [
  "bg-indigo-500 text-white",
  "bg-emerald-500 text-white",
  "bg-amber-500 text-white",
  "bg-rose-500 text-white",
  "bg-sky-500 text-white",
  "bg-purple-500 text-white",
];

export const MultiplayerLobbyScreen: React.FC<MultiplayerLobbyScreenProps> = ({
  isHost,
  roomCode,
  players,
  difficulty,
  mistakeRule,
  onDifficultyChange,
  onMistakeRuleChange,
  onStartMatch,
  onLeave,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const joinUrl = `${origin}/#join=${roomCode}`;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const canStart = players.length >= 2;

  return (
    <div className="w-full max-w-[540px] mx-auto px-3 py-3 sm:py-5 flex flex-col select-none animate-fadeIn">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        {/* Leave Room Button */}
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors cursor-pointer py-1 px-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Leave</span>
        </button>

        {/* Room Code Pill with 1-Click Copy */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs">
          <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Room
          </span>
          <span className="font-mono text-sm font-bold tracking-widest text-zinc-900 dark:text-zinc-100">
            {roomCode}
          </span>
          <button
            type="button"
            onClick={handleCopyInvite}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
            title="Copy Invite Link"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{players.length}/6</span>
        </div>
      </div>

      {/* Main Single-Card Container */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1B1E29] border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-4">
        {/* Players / Matchup Roster */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Players ({players.length}/6)</span>
            </span>
            {copied && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fadeIn">
                <Check className="w-3 h-3" /> Link copied to clipboard
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {players.map((p, idx) => {
              const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              return (
                <div
                  key={p.id || idx}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${colorClass}`}
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {p.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.isHost ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-full">
                        <Crown className="w-2.5 h-2.5" />
                        Host
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* If fewer than 2 players, show clean Invite Friend slot */}
            {players.length < 2 && (
              <button
                type="button"
                onClick={handleCopyInvite}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/30"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>+ Invite Opponent</span>
              </button>
            )}
          </div>
        </div>

        {/* Game Settings (Difficulty & Rules) */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-3">
          {/* Difficulty Segmented Control */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                Difficulty
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                {isHost ? "Host can modify" : "Set by Host"}
              </span>
            </div>
            <div className="grid grid-cols-5 p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 gap-0.5">
              {DIFFICULTIES.map((d) => {
                const active = difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={!isHost}
                    onClick={() => isHost && onDifficultyChange(d.id)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all text-center ${
                      active
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    } ${isHost ? "cursor-pointer" : "cursor-default"}`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rules Segmented Control */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                Mistake Rules
              </span>
            </div>
            <div className="grid grid-cols-3 p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 gap-0.5">
              {MISTAKE_RULES.map((r) => {
                const active = mistakeRule === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={!isHost}
                    onClick={() => isHost && onMistakeRuleChange(r.id)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all text-center truncate px-1 ${
                      active
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                    } ${isHost ? "cursor-pointer" : "cursor-default"}`}
                    title={r.label}
                  >
                    {r.short}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Button Area */}
        <div className="pt-2">
          {isHost ? (
            <div>
              {canStart ? (
                <button
                  type="button"
                  onClick={onStartMatch}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-[0.99]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Race ({players.length} Players)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="w-full py-2.5 rounded-xl font-semibold text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-all flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-700 cursor-pointer active:scale-[0.99]"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Invite Link Copied! Send to friend
                      </span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Copy Invite Link (Waiting for 1+ Opponent)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="py-2.5 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/40 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
              <span>Waiting for Host to start the race...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

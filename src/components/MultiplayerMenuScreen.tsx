"use client";

import React, { useState } from "react";
import { ArrowLeft, Users, Plus, AlertCircle, Loader2 } from "lucide-react";
import { Difficulty, MistakeRule } from "@/lib/types";

interface MultiplayerMenuScreenProps {
  initialNickname: string;
  onSaveNickname: (name: string) => void;
  onHost: (difficulty: Difficulty, mistakeRule: MistakeRule) => Promise<void> | void;
  onJoin: (roomCode: string, nickname: string) => Promise<void> | void;
  onBack: () => void;
  initialRoomCode?: string;
  initialTab?: "host" | "join";
}

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
  { id: "difficult", label: "Expert" },
  { id: "extreme", label: "Extreme" },
];

const MISTAKE_RULES: { id: MistakeRule; label: string; desc: string }[] = [
  { id: "standard", label: "3 Lives", desc: "3 mistakes knockout" },
  { id: "hardcore", label: "1 Life", desc: "Sudden death" },
  { id: "casual", label: "Casual", desc: "Unlimited lives" },
];

export const MultiplayerMenuScreen: React.FC<MultiplayerMenuScreenProps> = ({
  initialNickname,
  onSaveNickname,
  onHost,
  onJoin,
  onBack,
  initialRoomCode = "",
  initialTab = "host",
}) => {
  const [nickname, setNickname] = useState(initialNickname || "Player");
  const [tab, setTab] = useState<"host" | "join">(initialRoomCode ? "join" : initialTab);
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [mistakeRule, setMistakeRule] = useState<MistakeRule>("standard");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleNicknameChange = (val: string) => {
    setNickname(val);
    onSaveNickname(val);
  };

  const handleHostSubmit = async () => {
    setErrorMessage("");
    const effectiveName = nickname.trim() || "Host";
    onSaveNickname(effectiveName);
    setIsSubmitting(true);
    try {
      await onHost(difficulty, mistakeRule);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create room";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const handleJoinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    const cleanCode = roomCode.trim().replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setErrorMessage("Please enter a valid 6-digit room code.");
      return;
    }

    const effectiveName = nickname.trim() || "Player";
    onSaveNickname(effectiveName);
    setIsSubmitting(true);
    try {
      await onJoin(cleanCode, effectiveName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not join room";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-3 sm:py-5 flex flex-col select-none animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors disabled:opacity-50 cursor-pointer py-1 px-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <span className="text-xs font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
          Sudoku Duel
        </span>
      </div>

      {/* Main Single-Card Container */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1B1E29] border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Nickname Bar */}
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            {nickname.trim() ? nickname.trim()[0].toUpperCase() : "P"}
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-medium text-zinc-400 dark:text-zinc-500 leading-none mb-0.5">
              Your Nickname
            </label>
            <input
              type="text"
              value={nickname}
              maxLength={16}
              disabled={isSubmitting}
              onChange={(e) => handleNicknameChange(e.target.value)}
              placeholder="Enter name"
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Tab Switcher: Create Room vs Join Room */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60">
          <button
            type="button"
            onClick={() => {
              setTab("host");
              setErrorMessage("");
            }}
            disabled={isSubmitting}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tab === "host"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Match</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab("join");
              setErrorMessage("");
            }}
            disabled={isSubmitting}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tab === "join"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Join with Code</span>
          </button>
        </div>

        {/* Tab Content: Host Match */}
        {tab === "host" && (
          <div className="space-y-3 pt-1">
            {/* Difficulty Segmented Control */}
            <div>
              <span className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
                Difficulty
              </span>
              <div className="grid grid-cols-5 p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 gap-0.5">
                {DIFFICULTIES.map((d) => {
                  const isSelected = difficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDifficulty(d.id)}
                      disabled={isSubmitting}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                        isSelected
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mistake Rules Segmented Control */}
            <div>
              <span className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
                Mistake Rules
              </span>
              <div className="grid grid-cols-3 p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 gap-0.5">
                {MISTAKE_RULES.map((rule) => {
                  const isSelected = mistakeRule === rule.id;
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => setMistakeRule(rule.id)}
                      disabled={isSubmitting}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all text-center cursor-pointer ${
                        isSelected
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                      title={rule.desc}
                    >
                      {rule.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Create Room Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleHostSubmit}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99] shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Lobby...</span>
                  </>
                ) : (
                  <span>Create Lobby</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Join Match */}
        {tab === "join" && (
          <form onSubmit={handleJoinSubmit} className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5 text-center">
                Enter 6-Digit Room Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={roomCode}
                disabled={isSubmitting}
                autoFocus
                onChange={(e) => {
                  setRoomCode(e.target.value.replace(/\D/g, ""));
                  setErrorMessage("");
                }}
                placeholder="••••••"
                className="w-full max-w-[200px] mx-auto block text-center font-mono font-bold text-2xl tracking-[0.25em] py-2 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || roomCode.replace(/\D/g, "").length !== 6}
                className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Join Room</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

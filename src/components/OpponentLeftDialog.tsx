"use client";

import React from "react";
import { UserX, Play, Home } from "lucide-react";

interface OpponentLeftDialogProps {
  onContinueSolo: () => void;
  onReturnHome: () => void;
  isDarkMode?: boolean;
}

export const OpponentLeftDialog: React.FC<OpponentLeftDialogProps> = ({
  onContinueSolo,
  onReturnHome,
  isDarkMode = false,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn select-none">
      <div
        className={`w-full max-w-[360px] rounded-[24px] p-6 shadow-2xl transition-all text-center ${
          isDarkMode
            ? "bg-[#1B1E29] text-[#F3F4FA] border border-white/10"
            : "bg-white text-[#1E2233] border border-black/5"
        }`}
      >
        {/* User Left Icon Badge */}
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/20 flex items-center justify-center mb-3">
          <UserX className="w-6 h-6 text-amber-500 dark:text-amber-400" />
        </div>

        <h3 className="text-lg font-bold mb-1.5">Opponents Left the Match</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          All other players have left the room. Would you like to continue solving this puzzle solo or return to the home screen?
        </p>

        <div className="space-y-2.5">
          {/* Continue Solo Button */}
          <button
            type="button"
            onClick={onContinueSolo}
            className="w-full py-2.5 px-4 rounded-xl bg-[#5B6CFF] hover:bg-[#4D5EFF] dark:bg-[#7C8CFF] dark:hover:bg-[#6B7BFF] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Continue Playing Solo</span>
          </button>

          {/* Return Home Button */}
          <button
            type="button"
            onClick={onReturnHome}
            className="w-full py-2.5 px-4 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

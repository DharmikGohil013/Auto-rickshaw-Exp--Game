import React from 'react';
import { RotateCcw, Home, Trophy, Award } from 'lucide-react';

interface GameOverModalProps {
  score: number;
  deliveries: number;
  bestScore: number;
  isNewRecord: boolean;
  onPlayAgain: () => void;
  onTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  deliveries,
  bestScore,
  isNewRecord,
  onPlayAgain,
  onTitle,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-stone-950/85 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-stone-900 border-2 border-amber-500 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 text-center text-white">
        <div>
          {isNewRecord ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-400 text-amber-300 rounded-full text-xs font-black uppercase mb-2">
              <Award className="w-4 h-4 text-amber-400" /> NEW RECORD DRIVER!
            </div>
          ) : (
            <span className="text-xs uppercase font-black tracking-widest text-stone-400 block mb-1">
              SHIFT COMPLETE
            </span>
          )}
          <h2 className="text-3xl font-black text-amber-400 tracking-wide uppercase">
            TIME'S UP!
          </h2>
          <p className="text-stone-300 text-xs md:text-sm mt-1">
            The Mumbai monsoon rain won this round. Check your fare earnings!
          </p>
        </div>

        {/* Big Score Hero Card */}
        <div className="bg-stone-950/90 border border-stone-800 rounded-2xl p-5 flex flex-col items-center">
          <span className="text-xs uppercase font-bold text-stone-400 tracking-wider">
            TOTAL EARNINGS
          </span>
          <span className="font-mono text-4xl md:text-5xl font-black text-amber-400 tabular-nums my-1">
            Rs. {score}
          </span>
          <div className="flex items-center gap-2 text-xs text-stone-400 mt-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Best All-Time: Rs. {bestScore}</span>
          </div>
        </div>

        {/* Detailed Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">
              DELIVERIES COMPLETED
            </span>
            <span className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
              {deliveries}
            </span>
          </div>

          <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-stone-400 block">
              DRIVER RATING
            </span>
            <span className="text-xl font-bold text-amber-300">
              {deliveries >= 5 ? '⭐⭐⭐⭐⭐' : deliveries >= 3 ? '⭐⭐⭐⭐' : '⭐⭐⭐'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            data-start="true"
            onClick={onPlayAgain}
            className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-base rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-5 h-5 fill-stone-950" /> DRIVE AGAIN (SPACE / ENTER)
          </button>

          <button
            onClick={onTitle}
            className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold text-xs rounded-xl border border-stone-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4" /> Back to Garage & Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

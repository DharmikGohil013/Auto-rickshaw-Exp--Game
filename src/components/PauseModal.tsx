import React from 'react';
import { Play, RotateCcw, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  score: number;
  deliveries: number;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onTitle,
  score,
  deliveries,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-stone-950/75 select-none">
      <div className="w-full max-w-sm bg-stone-900 border-2 border-amber-500/70 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-center text-white">
        <div>
          <h2 className="text-2xl font-black text-amber-400 tracking-wide uppercase">
            GAME PAUSED
          </h2>
          <p className="text-stone-400 text-xs mt-1">Meter is running! Resume to beat the clock.</p>
        </div>

        {/* Current Run Metrics */}
        <div className="grid grid-cols-2 gap-3 bg-stone-950/80 p-3 rounded-xl border border-stone-800">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 block">FARES</span>
            <span className="font-mono text-xl font-bold text-emerald-400 tabular-nums">
              {deliveries}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 block">EARNINGS</span>
            <span className="font-mono text-xl font-bold text-amber-400 tabular-nums">
              Rs. {score}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-stone-950" /> RESUME RUSH
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm rounded-xl border border-stone-700 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" /> RESTART SHIFT
          </button>

          <button
            onClick={onTitle}
            className="w-full py-2 bg-transparent hover:bg-stone-800/50 text-stone-400 hover:text-stone-200 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" /> Back to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

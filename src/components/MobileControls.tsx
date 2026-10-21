import React from 'react';
import { ArrowLeft, ArrowRight, ChevronUp, ChevronDown, Volume2 } from 'lucide-react';

interface MobileControlsProps {
  onInput: (action: 'forward' | 'backward' | 'left' | 'right' | 'brake' | 'nitro', active: boolean) => void;
  onHorn: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ onInput, onHorn }) => {
  const bindTouch = (action: 'forward' | 'backward' | 'left' | 'right' | 'brake' | 'nitro') => ({
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      onInput(action, true);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      onInput(action, false);
    },
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      onInput(action, true);
    },
    onMouseUp: (e: React.MouseEvent) => {
      e.preventDefault();
      onInput(action, false);
    },
    onMouseLeave: () => {
      onInput(action, false);
    },
  });

  return (
    <div className="fixed inset-x-0 bottom-3 pointer-events-none select-none z-20 flex justify-between items-end px-4 md:hidden">
      {/* Steering Controls (Left Hand) */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          {...bindTouch('left')}
          className="w-16 h-16 rounded-2xl bg-stone-900/80 active:bg-amber-500 active:text-stone-950 text-amber-400 border-2 border-stone-700 active:border-stone-950 flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
          aria-label="Steer Left"
        >
          <ArrowLeft className="w-8 h-8" />
        </button>

        <button
          {...bindTouch('right')}
          className="w-16 h-16 rounded-2xl bg-stone-900/80 active:bg-amber-500 active:text-stone-950 text-amber-400 border-2 border-stone-700 active:border-stone-950 flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
          aria-label="Steer Right"
        >
          <ArrowRight className="w-8 h-8" />
        </button>
      </div>

      {/* Center Horn Button */}
      <div className="pointer-events-auto mb-2">
        <button
          onClick={onHorn}
          className="w-12 h-12 rounded-full bg-amber-500 text-stone-950 font-black border-2 border-stone-950 shadow-lg active:scale-90 flex items-center justify-center text-xs"
          aria-label="Horn"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      {/* Gas & Brake / Reverse Controls (Right Hand) */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          {...bindTouch('backward')}
          className="w-16 h-16 rounded-2xl bg-red-950/80 active:bg-red-500 text-red-300 active:text-white border-2 border-red-800/80 flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-transform"
          aria-label="Brake or Reverse"
        >
          <ChevronDown className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-tighter">BRAKE</span>
        </button>

        <button
          {...bindTouch('forward')}
          className="w-16 h-16 rounded-2xl bg-emerald-950/80 active:bg-emerald-500 text-emerald-300 active:text-stone-950 border-2 border-emerald-700/80 flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-transform"
          aria-label="Accelerate Gas"
        >
          <ChevronUp className="w-7 h-7" />
          <span className="text-[9px] font-black uppercase tracking-tighter">GAS</span>
        </button>
      </div>
    </div>
  );
};

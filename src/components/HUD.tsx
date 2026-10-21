import React from 'react';
import { GameHUDState } from '../game/controller';
import { Volume2, VolumeX, Pause, RotateCcw, AlertTriangle, Zap, MapPin, Flag } from 'lucide-react';

interface HUDProps {
  hud: GameHUDState;
  onToggleMute: () => void;
  onPause: () => void;
  onResetVehicle: () => void;
  onTriggerHorn: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hud,
  onToggleMute,
  onPause,
  onResetVehicle,
  onTriggerHorn,
}) => {
  const isLowTime = hud.timeRemaining <= 15;

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 md:p-6">
      {/* Top Bar Cluster */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Time & Deliveries */}
        <div className="flex flex-col gap-2">
          {/* Digital Timer */}
          <div
            className={`flex items-baseline gap-2 px-4 py-2 rounded-lg border shadow-lg transition-colors ${
              isLowTime
                ? 'bg-red-950/90 border-red-500 text-red-200'
                : 'bg-stone-900/90 border-amber-500/50 text-amber-100'
            }`}
          >
            <span className="text-xs uppercase tracking-wider font-bold text-amber-400">
              TIME
            </span>
            <span className="font-mono text-3xl md:text-4xl font-extrabold tabular-nums tracking-tight">
              {hud.timeRemaining}s
            </span>
            {isLowTime && (
              <span className="text-xs font-bold text-red-400 animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> HURRY!
              </span>
            )}
          </div>

          {/* Deliveries & Score */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-stone-900/90 border border-emerald-500/40 text-emerald-300 shadow">
              <span className="text-[10px] uppercase font-bold tracking-wider block text-emerald-400">
                FARES COMPLETED
              </span>
              <span className="font-mono text-xl font-bold tabular-nums">
                {hud.deliveries}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-stone-900/90 border border-amber-500/40 text-amber-200 shadow">
              <span className="text-[10px] uppercase font-bold tracking-wider block text-amber-400">
                CASH EARNED
              </span>
              <span className="font-mono text-xl font-bold tabular-nums">
                Rs. {hud.score}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Status Toast notification */}
        {hud.statusMessage && (
          <div className="px-5 py-2.5 bg-amber-500 text-stone-950 font-bold rounded-full shadow-2xl border-2 border-stone-950 text-sm md:text-base flex items-center gap-2 transform -translate-y-1">
            <span>🛺</span>
            <span>{hud.statusMessage}</span>
          </div>
        )}

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onTriggerHorn}
            title="Horn (H)"
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-lg shadow-md border border-amber-600 flex items-center gap-1 text-xs active:scale-95 cursor-pointer"
          >
            📢 HORN
          </button>

          <button
            onClick={onResetVehicle}
            title="Reposition Auto (R)"
            className="p-2.5 bg-stone-800/90 hover:bg-stone-700 text-stone-200 rounded-lg shadow border border-stone-600 active:scale-95 cursor-pointer"
            aria-label="Reposition Auto"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleMute}
            title="Mute Sound (M)"
            className="p-2.5 bg-stone-800/90 hover:bg-stone-700 text-stone-200 rounded-lg shadow border border-stone-600 active:scale-95 cursor-pointer"
            aria-label={hud.isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {hud.isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={onPause}
            title="Pause (Esc or P)"
            className="p-2.5 bg-stone-800/90 hover:bg-stone-700 text-stone-200 rounded-lg shadow border border-stone-600 active:scale-95 cursor-pointer"
            aria-label="Pause Game"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Area Cluster */}
      <div className="flex flex-col md:flex-row items-end md:items-end justify-between w-full gap-4">
        {/* Left: Speedometer & Nitro Chai Meter */}
        <div className="flex flex-col gap-2">
          {/* Puddle Slip Indicator */}
          {hud.isPuddleSlipping && (
            <div className="px-3 py-1 bg-cyan-900/90 border border-cyan-400 text-cyan-200 text-xs font-bold rounded-lg shadow flex items-center gap-1.5">
              <span>🌊</span> PUDDLE SLIP! STEERING REDUCED
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Speed Gauge */}
            <div className="px-4 py-2 bg-stone-900/90 border border-stone-700 rounded-xl shadow-lg flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold text-white tabular-nums">
                {hud.speedKmh}
              </span>
              <span className="text-xs uppercase font-bold text-stone-400">KM/H</span>
            </div>

            {/* Nitro Chai Boost */}
            <div className="flex flex-col gap-1 w-28 md:w-36 bg-stone-900/90 border border-stone-700 px-3 py-2 rounded-xl shadow-lg">
              <div className="flex justify-between items-center text-[10px] font-bold text-amber-400">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> CHAI BOOST
                </span>
                <span>{hud.nitroCharge}%</span>
              </div>
              <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-100"
                  style={{ width: `${hud.nitroCharge}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center/Bottom: Mission Waypoint Card */}
        {hud.activeMission && (
          <div className="w-full md:w-auto md:max-w-md bg-stone-900/95 border-2 border-amber-500/80 rounded-2xl p-3 md:px-5 md:py-3 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-xl shrink-0">
                {hud.activeMission.avatarIcon}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase text-amber-400">
                    {hud.hasPassenger ? 'DROP-OFF' : 'PICKUP'}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    ({hud.activeMission.passengerRole})
                  </span>
                </div>
                <div className="text-sm md:text-base font-bold text-white truncate max-w-[200px] md:max-w-[240px]">
                  {hud.hasPassenger
                    ? hud.activeMission.dropLocationName
                    : `${hud.activeMission.passengerName} at ${hud.activeMission.pickupLocationName}`}
                </div>
              </div>
            </div>

            {/* Target Distance */}
            <div className="flex flex-col items-end shrink-0 pl-2 border-l border-stone-700">
              <span className="text-[10px] font-bold uppercase text-stone-400">DISTANCE</span>
              <span className="font-mono text-lg font-black text-amber-400 tabular-nums flex items-center gap-1">
                {hud.hasPassenger ? <Flag className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                {hud.targetDistance}m
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

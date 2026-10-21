import React, { useState } from 'react';
import { UPGRADE_TIERS } from '../game/rules';
import { Play, Trophy, Wrench, Palette, Sparkles } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: () => void;
  bestScore: number;
  selectedPaint: string;
  selectedEngine: number;
  selectedTires: number;
  onSelectPaint: (paintId: string) => void;
  onSelectEngine: (tier: number) => void;
  onSelectTires: (tier: number) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  bestScore,
  selectedPaint,
  selectedEngine,
  selectedTires,
  onSelectPaint,
  onSelectEngine,
  onSelectTires,
}) => {
  const [activeTab, setActiveTab] = useState<'play' | 'garage'>('play');

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between items-center p-6 md:p-10 select-none bg-stone-950/70 backdrop-blur-none text-white overflow-y-auto">
      {/* Top Bar with High Score */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-2 px-4 py-2 bg-stone-900/90 border border-amber-500/30 rounded-xl shadow">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-xs uppercase font-bold text-stone-300">BEST RECORD:</span>
          <span className="font-mono text-base font-black text-amber-400 tabular-nums">
            Rs. {bestScore}
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-stone-900/90 p-1 rounded-xl border border-stone-800">
          <button
            onClick={() => setActiveTab('play')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'play'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            Drive
          </button>
          <button
            onClick={() => setActiveTab('garage')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'garage'
                ? 'bg-amber-500 text-stone-950 shadow'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" /> Garage & Tune
          </button>
        </div>
      </div>

      {/* Main Centerpiece Area */}
      <div className="w-full max-w-2xl flex flex-col items-center text-center my-auto py-6">
        {activeTab === 'play' ? (
          <>
            {/* Bespoke SVG Title Lockup */}
            <div className="relative mb-6">
              <svg viewBox="0 0 540 120" className="w-full max-w-lg h-auto mx-auto filter drop-shadow-xl">
                {/* Decorative Indian Rickshaw Badge */}
                <defs>
                  <linearGradient id="titleGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="rickshawGreen" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#15803d" />
                  </linearGradient>
                </defs>

                {/* Subtitle banner */}
                <rect x="150" y="8" width="240" height="24" rx="12" fill="#15803d" stroke="#eab308" strokeWidth="2" />
                <text x="270" y="24" textAnchor="middle" fill="#fef08a" fontSize="12" fontWeight="900" letterSpacing="3">
                  MUMBAI MONSOON EDITION
                </text>

                {/* Main 3D Title Lettering */}
                <text
                  x="270"
                  y="74"
                  textAnchor="middle"
                  fill="url(#titleGold)"
                  stroke="#1c1917"
                  strokeWidth="8"
                  fontSize="46"
                  fontWeight="900"
                  letterSpacing="1"
                  style={{ paintOrder: 'stroke fill' }}
                >
                  MONSOON RICKSHAW
                </text>
                <text
                  x="270"
                  y="108"
                  textAnchor="middle"
                  fill="#ffffff"
                  stroke="#1c1917"
                  strokeWidth="6"
                  fontSize="32"
                  fontWeight="900"
                  letterSpacing="8"
                  style={{ paintOrder: 'stroke fill' }}
                >
                  RUSH
                </text>
              </svg>

              <p className="text-stone-300 text-sm md:text-base max-w-md mx-auto mt-2 leading-relaxed">
                Take the wheel of Mumbai's iconic auto-rickshaw! Pick up passengers, dodge rush-hour
                traffic & slippery puddles, and race the clock through bustling markets!
              </p>
            </div>

            {/* Primary Start CTA */}
            <button
              data-start="true"
              onClick={onStartGame}
              className="px-10 py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-lg md:text-xl rounded-2xl shadow-2xl border-2 border-stone-900 active:scale-95 transition-all flex items-center gap-3 cursor-pointer group hover:shadow-amber-500/30"
            >
              <Play className="w-6 h-6 fill-stone-950 group-hover:scale-110 transition-transform" />
              START DRIVING
            </button>
          </>
        ) : (
          /* Garage Customization Tab */
          <div className="w-full bg-stone-900/95 border border-stone-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-6 text-left">
            <div>
              <h3 className="text-sm font-black uppercase text-amber-400 tracking-wider flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4" /> Mumbai Auto Liveries
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {UPGRADE_TIERS.paintJobs.map((paint) => (
                  <button
                    key={paint.id}
                    onClick={() => onSelectPaint(paint.id)}
                    className={`p-3 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer ${
                      selectedPaint === paint.id
                        ? 'border-amber-400 bg-stone-800 ring-2 ring-amber-400/30'
                        : 'border-stone-700 bg-stone-800/40 hover:bg-stone-800'
                    }`}
                  >
                    <div className="flex gap-1.5 h-6 rounded-lg overflow-hidden border border-stone-600">
                      <div className="flex-1 h-full" style={{ backgroundColor: paint.hood }} />
                      <div className="flex-1 h-full" style={{ backgroundColor: paint.primary }} />
                    </div>
                    <span className="text-xs font-bold text-stone-200">{paint.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Tuning */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-black uppercase text-amber-400 tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Engine Tuning
                </h3>
                <div className="flex flex-col gap-2">
                  {UPGRADE_TIERS.engine.map((eng) => (
                    <button
                      key={eng.level}
                      onClick={() => onSelectEngine(eng.level)}
                      className={`px-3 py-2 rounded-lg border text-left text-xs font-bold flex justify-between items-center cursor-pointer ${
                        selectedEngine === eng.level
                          ? 'border-amber-400 bg-stone-800 text-white'
                          : 'border-stone-800 bg-stone-800/40 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <span>{eng.name}</span>
                      <span className="text-emerald-400">
                        {eng.speedBoost === 0 ? 'Stock' : `+${eng.speedBoost} km/h`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase text-amber-400 tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Monsoon Tires
                </h3>
                <div className="flex flex-col gap-2">
                  {UPGRADE_TIERS.tires.map((tire) => (
                    <button
                      key={tire.level}
                      onClick={() => onSelectTires(tire.level)}
                      className={`px-3 py-2 rounded-lg border text-left text-xs font-bold flex justify-between items-center cursor-pointer ${
                        selectedTires === tire.level
                          ? 'border-amber-400 bg-stone-800 text-white'
                          : 'border-stone-800 bg-stone-800/40 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <span>{tire.name}</span>
                      <span className="text-cyan-400">
                        {tire.gripBonus === 0 ? 'Standard' : `+${Math.round(tire.gripBonus * 100)}% Grip`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('play')}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm rounded-xl transition-all cursor-pointer text-center"
            >
              SAVE SETTINGS & PROCEED
            </button>
          </div>
        )}
      </div>

      {/* Control Hint Line */}
      <div className="w-full max-w-xl text-center">
        <div className="inline-block px-4 py-2 bg-stone-900/80 rounded-full border border-stone-800 text-stone-400 text-xs md:text-sm font-medium">
          <span className="text-amber-400 font-bold">WASD / Arrow Keys</span> Drive ·{' '}
          <span className="text-amber-400 font-bold">Space</span> Brake ·{' '}
          <span className="text-amber-400 font-bold">H</span> Horn ·{' '}
          <span className="text-amber-400 font-bold">R</span> Reposition Auto ·{' '}
          <span className="text-amber-400 font-bold">Esc</span> Pause
        </div>
      </div>
    </div>
  );
};

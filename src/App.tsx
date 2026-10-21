import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameHUDState } from './game/controller';
import { UPGRADE_TIERS } from './game/rules';
import { soundEngine } from './game/audio';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { MobileControls } from './components/MobileControls';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');
  const [hudState, setHudState] = useState<GameHUDState>({
    timeRemaining: 90,
    score: 0,
    deliveries: 0,
    speedKmh: 0,
    isPuddleSlipping: false,
    activeMission: null,
    targetDistance: 0,
    hasPassenger: false,
    nitroCharge: 100,
    combo: 1,
    isMuted: false,
    statusMessage: null,
  });

  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('monsoon_rickshaw_best_score') || '0', 10);
    } catch {
      return 0;
    }
  });

  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [selectedPaint, setSelectedPaint] = useState<string>('classic');
  const [selectedEngine, setSelectedEngine] = useState<number>(1);
  const [selectedTires, setSelectedTires] = useState<number>(1);

  // Sync gameState to body dataset
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Handle Game Over
  const handleGameOver = useCallback((finalScore: number) => {
    setGameState('gameover');
    setBestScore((prev) => {
      if (finalScore > prev) {
        setIsNewRecord(true);
        try {
          localStorage.setItem('monsoon_rickshaw_best_score', String(finalScore));
        } catch {}
        return finalScore;
      }
      setIsNewRecord(false);
      return prev;
    });
  }, []);

  // Initialize GameEngine once
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current, {
      onHUDUpdate: (hud) => {
        setHudState({ ...hud });
      },
      onGameOver: (score, deliveries) => {
        handleGameOver(score);
      },
    });
    engineRef.current = engine;

    // Check autostart query param
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('autostart') === '1') {
      engine.startGame();
      setGameState('playing');
    }

    // Software-WebGL check for loop pacing
    const glProbe = document.createElement('canvas').getContext('webgl2');
    const ext = glProbe?.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : glProbe?.RENDERER;
    const gpu = param && glProbe ? String(glProbe.getParameter(param)) : '';
    glProbe?.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);

    // Animation loop with dt clamping and afterDraw software-GL pacing
    let frameId = 0;
    let lastTime = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = engine.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      engine.update(dt);
      engine.render();

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleGameOver]);

  // Update upgrades & liveries whenever changed
  useEffect(() => {
    if (!engineRef.current) return;
    const eng = UPGRADE_TIERS.engine.find((e) => e.level === selectedEngine);
    const tire = UPGRADE_TIERS.tires.find((t) => t.level === selectedTires);
    const paint = UPGRADE_TIERS.paintJobs.find((p) => p.id === selectedPaint);

    engineRef.current.setUpgradeStats(
      eng ? eng.speedBoost : 0,
      tire ? tire.gripBonus : 0,
      paint?.primary,
      paint?.hood
    );
  }, [selectedPaint, selectedEngine, selectedTires]);

  // Unified Keyboard Controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return;

      // Handle Title / Game Over Start Actions
      if ((e.code === 'Space' || e.code === 'Enter') && (gameState === 'title' || gameState === 'gameover')) {
        e.preventDefault();
        startGame();
        return;
      }

      // Handle Pause Toggle
      if ((e.code === 'Escape' || e.key.toLowerCase() === 'p') && (gameState === 'playing' || gameState === 'paused')) {
        e.preventDefault();
        togglePause();
        return;
      }

      // Quick Horn Action
      if (e.key.toLowerCase() === 'h' && gameState === 'playing') {
        engineRef.current.triggerHorn();
        return;
      }

      // Quick Vehicle Reposition Action
      if (e.key.toLowerCase() === 'r' && gameState === 'playing') {
        engineRef.current.resetVehicle();
        return;
      }

      // Quick Mute Toggle
      if (e.key.toLowerCase() === 'm') {
        toggleMute();
        return;
      }

      // Continuous Driving Keys
      if (gameState === 'playing') {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
          engineRef.current.keys.forward = true;
        } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
          engineRef.current.keys.backward = true;
        } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
          engineRef.current.keys.left = true;
        } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
          engineRef.current.keys.right = true;
        } else if (e.code === 'Space') {
          engineRef.current.keys.brake = true;
        } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          engineRef.current.keys.nitro = true;
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        engineRef.current.keys.forward = false;
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        engineRef.current.keys.backward = false;
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        engineRef.current.keys.left = false;
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        engineRef.current.keys.right = false;
      } else if (e.code === 'Space') {
        engineRef.current.keys.brake = false;
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        engineRef.current.keys.nitro = false;
      }
    };

    const onBlur = () => {
      if (!engineRef.current) return;
      engineRef.current.keys.forward = false;
      engineRef.current.keys.backward = false;
      engineRef.current.keys.left = false;
      engineRef.current.keys.right = false;
      engineRef.current.keys.brake = false;
      engineRef.current.keys.nitro = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [gameState]);

  const startGame = () => {
    if (!engineRef.current) return;
    engineRef.current.startGame();
    setGameState('playing');
  };

  const togglePause = () => {
    if (!engineRef.current) return;
    if (gameState === 'playing') {
      engineRef.current.isPaused = true;
      setGameState('paused');
    } else if (gameState === 'paused') {
      engineRef.current.isPaused = false;
      setGameState('playing');
    }
  };

  const toggleMute = () => {
    const isMuted = soundEngine.toggleMute();
    setHudState((prev) => ({ ...prev, isMuted }));
  };

  const resetVehicle = () => {
    if (engineRef.current) {
      engineRef.current.resetVehicle();
    }
  };

  const triggerHorn = () => {
    if (engineRef.current) {
      engineRef.current.triggerHorn();
    }
  };

  const handleMobileInput = (
    action: 'forward' | 'backward' | 'left' | 'right' | 'brake' | 'nitro',
    active: boolean
  ) => {
    if (!engineRef.current) return;
    engineRef.current.keys[action] = active;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 font-sans select-none">
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={containerRef}
        data-testid="threejs-canvas"
        className="w-full h-full absolute inset-0 z-0"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={startGame}
          bestScore={bestScore}
          selectedPaint={selectedPaint}
          selectedEngine={selectedEngine}
          selectedTires={selectedTires}
          onSelectPaint={setSelectedPaint}
          onSelectEngine={setSelectedEngine}
          onSelectTires={setSelectedTires}
        />
      )}

      {/* In-Game Active HUD */}
      {gameState === 'playing' && (
        <>
          <HUD
            hud={hudState}
            onToggleMute={toggleMute}
            onPause={togglePause}
            onResetVehicle={resetVehicle}
            onTriggerHorn={triggerHorn}
          />
          <MobileControls onInput={handleMobileInput} onHorn={triggerHorn} />
        </>
      )}

      {/* Paused Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={togglePause}
          onRestart={startGame}
          onTitle={() => setGameState('title')}
          score={hudState.score}
          deliveries={hudState.deliveries}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'gameover' && (
        <GameOverModal
          score={hudState.score}
          deliveries={hudState.deliveries}
          bestScore={bestScore}
          isNewRecord={isNewRecord}
          onPlayAgain={startGame}
          onTitle={() => setGameState('title')}
        />
      )}
    </div>
  );
}

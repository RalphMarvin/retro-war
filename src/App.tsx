/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { MobileControls } from './components/MobileControls';
import { PortraitOverlay } from './components/PortraitOverlay';
import { TacticalHUD } from './components/TacticalHUD';
import { soundSynth } from './game/audio';
import { GameEngine } from './game/engine';
import { AmmoState, GameState, PlayerStats } from './game/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(false);

  const [stats, setStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    score: 0,
    kills: 0,
    dronesDestroyed: 0,
    mechsDestroyed: 0,
    shotsFired: 0,
    shotsHit: 0,
    wave: 1,
    survivalTimeSec: 0,
  });

  const [ammo, setAmmo] = useState<AmmoState>({
    currentMag: 30,
    reserve: 180,
    isReloading: false,
    reloadProgress: 0,
  });

  useEffect(() => {
    // Check if device is touch / mobile
    const checkMobile = () => {
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
      const isNarrow = window.innerWidth <= 1024;
      const mobileActive = hasTouch || isNarrow;
      setIsMobile(mobileActive);

      const portraitActive = mobileActive && window.innerHeight > window.innerWidth;
      setIsPortrait(portraitActive);

      if (engineRef.current) {
        engineRef.current.isMobileMode = mobileActive;
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.isMobileMode = isMobile;

    engine.onStatsUpdate = (newStats, newAmmo) => {
      setStats({ ...newStats });
      setAmmo({ ...newAmmo });
    };

    engine.onStateChange = (newState) => {
      setGameState(newState);
    };

    const handleResize = () => {
      engine.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
    };
  }, []);

  const handleStartGame = () => {
    if (engineRef.current) {
      engineRef.current.isTouchFiring = false;
      engineRef.current.isMouseDown = false;
      engineRef.current.touchMove = { x: 0, y: 0 };
      engineRef.current.startGame();
    }
  };

  const handleTogglePause = () => {
    engineRef.current?.togglePause();
  };

  const handleReload = () => {
    engineRef.current?.player.weapon.startReload();
  };

  const handleToggleMute = () => {
    const muted = soundSynth.toggleMute();
    setIsMuted(muted);
  };

  const handleAttemptFullscreenLandscape = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      const orientation = screen.orientation as unknown as { lock?: (type: string) => Promise<void> };
      if (orientation && orientation.lock) {
        await orientation.lock('landscape');
      }
    } catch {
      // Ignored if browser restricts orientation lock
    }
  };

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-slate-950"
      style={{ touchAction: 'none' }}
    >
      {/* Landscape Orientation Lock Enforcement on Mobile */}
      {isMobile && isPortrait && (
        <PortraitOverlay onAttemptFullscreenLandscape={handleAttemptFullscreenLandscape} />
      )}

      {/* Main Game Canvas */}
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-crosshair"
      />

      {/* Tactical Sci-Fi HUD */}
      <TacticalHUD
        gameState={gameState}
        stats={stats}
        ammo={ammo}
        onStartGame={handleStartGame}
        onTogglePause={handleTogglePause}
        onReload={handleReload}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Mobile Touch Controls (Left Virtual Joystick & Right Auto-Aim Trigger) */}
      {isMobile && gameState === 'PLAYING' && (
        <MobileControls
          ammo={ammo}
          onMoveVector={(vec) => {
            if (engineRef.current) {
              engineRef.current.touchMove = vec;
            }
          }}
          onFire={(firing) => {
            if (engineRef.current) {
              engineRef.current.isTouchFiring = firing;
            }
          }}
          onReload={handleReload}
        />
      )}
    </div>
  );
}

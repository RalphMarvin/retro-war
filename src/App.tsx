/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LandingScreen } from './components/LandingScreen';
import { MobileControls } from './components/MobileControls';
import { PortraitOverlay } from './components/PortraitOverlay';
import { TacticalHUD } from './components/TacticalHUD';
import { soundSynth } from './game/audio';
import { GameEngine } from './game/engine';
import { AmmoState, GameState, PlayerStats } from './game/types';

const HIGH_SCORE_KEY = 'ironpoint_highscore';

const INITIAL_AMMO: AmmoState = {
  weaponId: 'rifle',
  weaponName: 'M4A1 Tactical Carbine',
  weaponShortName: 'M4A1',
  fireMode: 'auto',
  currentMag: 30,
  magCapacity: 30,
  reserve: 180,
  isReloading: false,
  reloadProgress: 0,
  isSwapping: false,
  loadout: {
    rifle: { currentMag: 30, magCapacity: 30, reserve: 180 },
    pistol: { currentMag: 12, magCapacity: 12, reserve: 96 },
  },
};

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

  const [ammo, setAmmo] = useState<AmmoState>(INITIAL_AMMO);

  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10) || 0;
    } catch {
      return 0;
    }
  });

  // Persist the best run
  useEffect(() => {
    if (stats.score > highScore) {
      setHighScore(stats.score);
      try {
        localStorage.setItem(HIGH_SCORE_KEY, stats.score.toString());
      } catch {
        // Storage may be unavailable (private mode)
      }
    }
  }, [stats.score, highScore]);

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

    engine.onWeaponChange = () => {
      setAmmo(engine.buildAmmoState());
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

  const handleStartGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.isTouchFiring = false;
    engine.isMouseDown = false;
    engine.touchMove = { x: 0, y: 0 };
    engine.startGame();
    soundSynth.playWeaponSwap();
  }, []);

  const handleOpenMenu = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.isTouchFiring = false;
    engine.isMouseDown = false;
    engine.touchMove = { x: 0, y: 0 };
    engine.gameState = 'TITLE';
    setGameState('TITLE');
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleReload = useCallback(() => {
    engineRef.current?.player.weapon.startReload();
  }, []);

  const handleSwapWeapon = useCallback(() => {
    engineRef.current?.cycleWeapon();
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = soundSynth.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleMoveVector = useCallback((vec: { x: number; y: number }) => {
    if (engineRef.current) {
      engineRef.current.touchMove = vec;
    }
  }, []);

  const handleTouchFire = useCallback((firing: boolean) => {
    if (engineRef.current) {
      engineRef.current.isTouchFiring = firing;
    }
  }, []);

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
      {/* Landscape Orientation Lock Enforcement on Mobile (in-mission only) */}
      {isMobile && isPortrait && gameState !== 'TITLE' && (
        <PortraitOverlay onAttemptFullscreenLandscape={handleAttemptFullscreenLandscape} />
      )}

      {/* Main Game Canvas */}
      <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />

      {/* Tactical Sci-Fi HUD (hidden on the landing page) */}
      <TacticalHUD
        gameState={gameState}
        stats={stats}
        ammo={ammo}
        highScore={highScore}
        onStartGame={handleStartGame}
        onOpenMenu={handleOpenMenu}
        onTogglePause={handleTogglePause}
        onReload={handleReload}
        onSwapWeapon={handleSwapWeapon}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Landing Page & Start Menu */}
      {gameState === 'TITLE' && (
        <LandingScreen
          onStartGame={handleStartGame}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          highScore={highScore}
          isMobile={isMobile}
        />
      )}

      {/* Mobile Touch Controls (Left Virtual Joystick & Right Weapon Cluster) */}
      {isMobile && gameState === 'PLAYING' && (
        <MobileControls
          ammo={ammo}
          onMoveVector={handleMoveVector}
          onFire={handleTouchFire}
          onReload={handleReload}
          onSwapWeapon={handleSwapWeapon}
        />
      )}
    </div>
  );
}


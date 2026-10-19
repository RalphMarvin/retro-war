/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Shield,
  Crosshair,
  Volume2,
  VolumeX,
  RotateCcw,
  Play,
  Pause,
  AlertTriangle,
  Flame,
  Target,
  Trophy,
} from 'lucide-react';
import { soundSynth } from '../game/audio';
import { AmmoState, GameState, PlayerStats } from '../game/types';

interface TacticalHUDProps {
  gameState: GameState;
  stats: PlayerStats;
  ammo: AmmoState;
  onStartGame: () => void;
  onTogglePause: () => void;
  onReload: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onTouchMove?: (vec: { x: number; y: number }) => void;
  onTouchAim?: (vec: { x: number; y: number } | null) => void;
  onTouchFire?: (firing: boolean) => void;
}

export const TacticalHUD: React.FC<TacticalHUDProps> = ({
  gameState,
  stats,
  ammo,
  onStartGame,
  onTogglePause,
  onReload,
  isMuted,
  onToggleMute,
}) => {
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('ironpoint_highscore') || '0', 10);
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (stats.score > highScore) {
      setHighScore(stats.score);
      try {
        localStorage.setItem('ironpoint_highscore', stats.score.toString());
      } catch {}
    }
  }, [stats.score, highScore]);

  // Accuracy calculation
  const accuracy =
    stats.shotsFired > 0
      ? Math.min(100, Math.round((stats.shotsHit / stats.shotsFired) * 100))
      : 0;

  const healthPct = Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100));
  const isHealthCritical = stats.health <= 30;

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-sans">
      {/* 1. ULTRA-COMPACT SLIM TACTICAL TOP BAR (ALL METERS INLINE) */}
      <header className="pointer-events-auto flex h-8 sm:h-9 items-center justify-between border-b border-cyan-950/60 bg-slate-950/85 px-2.5 sm:px-4 backdrop-blur-md">
        {/* Left: Operative Vitals Gauge */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-400 shrink-0" />
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-16 sm:w-22 overflow-hidden rounded border border-slate-800 bg-slate-900">
              <div
                className={`h-full transition-all duration-150 ${
                  isHealthCritical
                    ? 'bg-gradient-to-r from-red-600 to-rose-500'
                    : 'bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-400'
                }`}
                style={{ width: `${healthPct}%` }}
              />
            </div>
            <span
              className={`font-mono text-[10px] sm:text-[11px] font-bold tabular-nums ${
                isHealthCritical ? 'text-red-400' : 'text-cyan-300'
              }`}
            >
              {Math.round(stats.health)}
            </span>
          </div>
        </div>

        {/* Center: Sector & Score */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs">
          <div className="flex items-center gap-1 font-mono text-[10px] sm:text-xs text-slate-300">
            <span className="text-slate-400 text-[9px] sm:text-[10px]">WAVE</span>
            <span className="font-bold text-cyan-400">{stats.wave}</span>
          </div>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <div className="flex items-center gap-1 font-mono text-[10px] sm:text-xs">
            <span className="text-slate-400 text-[9px] sm:text-[10px]">SCORE</span>
            <span className="font-bold text-cyan-300 tabular-nums">{stats.score.toLocaleString()}</span>
          </div>
          <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
          <div className="hidden sm:flex items-center gap-1 font-mono text-xs">
            <span className="text-slate-400 text-[10px]">KILLS</span>
            <span className="font-bold text-slate-200 tabular-nums">{stats.kills}</span>
          </div>
        </div>

        {/* Right: M4A1 Ammo & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="flex items-center gap-1 font-mono text-[10px] sm:text-xs">
            <Flame className="h-3 w-3 text-amber-400 shrink-0" />
            <span
              className={`font-bold tabular-nums ${
                ammo.currentMag <= 6 ? 'text-red-400' : 'text-amber-400'
              }`}
            >
              {String(ammo.currentMag).padStart(2, '0')}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400 tabular-nums text-[9px] sm:text-xs">{ammo.reserve}</span>
          </div>

          {/* Quick Reload Button */}
          <button
            onClick={onReload}
            disabled={ammo.isReloading || ammo.currentMag === 30 || ammo.reserve <= 0}
            className="flex h-5 sm:h-6 items-center gap-1 rounded border border-amber-600/40 bg-amber-950/30 px-1.5 text-[9px] sm:text-[10px] font-medium text-amber-300 transition-colors hover:bg-amber-900/50 disabled:opacity-30"
          >
            <RotateCcw className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${ammo.isReloading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{ammo.isReloading ? 'RELOAD...' : 'R'}</span>
          </button>

          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded border border-slate-800 bg-slate-900/80 text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
          >
            {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </button>

          {/* Pause Button */}
          {gameState === 'PLAYING' && (
            <button
              onClick={onTogglePause}
              aria-label="Pause Game"
              className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded border border-slate-800 bg-slate-900/80 text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
            >
              <Pause className="h-3 w-3" />
            </button>
          )}
        </div>
      </header>

      {/* 3. TITLE / BRIEFING MODAL */}
      {gameState === 'TITLE' && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-slate-950/85 p-4 sm:p-6 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-cyan-800/60 bg-slate-900/90 p-5 sm:p-8 shadow-2xl my-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/60 text-cyan-400">
                <Crosshair className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-wider text-slate-100">
                  OPERATION IRONPOINT
                </h1>
                <p className="text-xs text-cyan-400">
                  Subterranean Tactical Twin-Stick Combat Prototype
                </p>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                An underground autonomous military weapons bunker has been compromised. Swarms of
                high-speed <strong className="text-slate-100">Cyber Drones</strong> and heavily
                shielded <strong className="text-slate-100">Combat Mechs</strong> are breaching the
                containment blast gates.
              </p>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                  Cross-Platform Controls
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] sm:text-[12px]">
                  <div>
                    <span className="font-mono text-cyan-300">WASD / Arrows</span>
                  </div>
                  <div className="text-slate-400">Move operative</div>
                  <div>
                    <span className="font-mono text-cyan-300">Space / Left Click</span>
                  </div>
                  <div className="text-slate-400">Fire assault rifle</div>
                  <div>
                    <span className="font-mono text-cyan-300">Mouse Aim</span>
                  </div>
                  <div className="text-slate-400">360° aim reticle</div>
                  <div>
                    <span className="font-mono text-cyan-300">Mobile Left Stick</span>
                  </div>
                  <div className="text-slate-400">Move operative</div>
                  <div>
                    <span className="font-mono text-cyan-300">Mobile Right Trigger</span>
                  </div>
                  <div className="text-slate-400">Auto-lock & Fire</div>
                  <div>
                    <span className="font-mono text-cyan-300">Key R / Reload Btn</span>
                  </div>
                  <div className="text-slate-400">Tactical reload</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Tactical Drops: Ammo Crates & Medkits</span>
                <span>Record: {highScore.toLocaleString()} pts</span>
              </div>
            </div>

            <button
              onClick={() => {
                soundSynth.playGunshot();
                onStartGame();
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-500 py-3 text-sm font-bold tracking-wider text-slate-950 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              DEPLOY OPERATIVE
            </button>
          </div>
        </div>
      )}

      {/* 4. PAUSE MODAL */}
      {gameState === 'PAUSED' && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-xl border border-cyan-800/60 bg-slate-900/95 p-6 text-center shadow-2xl">
            <h2 className="text-xl font-bold tracking-wider text-slate-100">COMBAT SIMULATION PAUSED</h2>
            <p className="mt-1 text-xs text-slate-400">Awaiting tactical resumption</p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={onTogglePause}
                className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-400"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                RESUME COMBAT
              </button>
              <button
                onClick={onStartGame}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700"
              >
                <RotateCcw className="h-4 w-4" />
                RESTART SECTOR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. GAME OVER DEBRIEFING MODAL */}
      {gameState === 'GAME_OVER' && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-slate-950/90 p-6 backdrop-blur-md">
          <div className="w-full max-w-md rounded-xl border border-red-900/70 bg-slate-900/95 p-8 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/40 bg-red-950/60 text-red-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-wider text-red-400">OPERATIVE KIA</h2>
                <p className="text-xs text-slate-400">Containment Breach Unchecked</p>
              </div>
            </div>

            {/* After Action Statistics */}
            <div className="mt-6 space-y-2.5 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Final Combat Score</span>
                <span className="font-mono font-bold tabular-nums text-cyan-300">
                  {stats.score.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Highest Record</span>
                <span className="font-mono font-bold tabular-nums text-amber-400">
                  {highScore.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Sector Reached</span>
                <span className="font-mono tabular-nums text-slate-200">Wave {stats.wave}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Hostiles Destroyed</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {stats.kills} ({stats.dronesDestroyed} Drones · {stats.mechsDestroyed} Mechs)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Shots Fired / Accuracy</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {stats.shotsFired} rounds · {accuracy}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Survival Duration</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {Math.floor(stats.survivalTimeSec / 60)}m {Math.floor(stats.survivalTimeSec % 60)}s
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                soundSynth.playGunshot();
                onStartGame();
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 py-3 text-sm font-bold tracking-wider text-slate-950 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" />
              REDEPLOY OPERATIVE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

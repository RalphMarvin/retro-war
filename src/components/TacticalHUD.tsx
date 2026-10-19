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
      {/* 1. TOP TELEMETRY BAR */}
      <header className="pointer-events-auto flex items-center justify-between border-b border-cyan-950/60 bg-slate-950/75 px-6 py-3 backdrop-blur-md">
        {/* Sector Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-cyan-500/40 bg-cyan-950/40 text-cyan-400">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-200">
              <span>OPERATION IRONPOINT</span>
              <span className="text-cyan-500/60" aria-hidden="true">·</span>
              <span className="text-cyan-400">BUNKER SECTOR {stats.wave}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Hostiles Active · Escalation Wave {stats.wave}
            </div>
          </div>
        </div>

        {/* Center Score & Neutralized */}
        <div className="flex items-center gap-8 text-sm">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Combat Score</div>
            <div className="font-mono text-lg font-bold tabular-nums text-cyan-300">
              {stats.score.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Neutralized</div>
            <div className="font-mono text-lg font-bold tabular-nums text-slate-200">
              {stats.kills}
            </div>
          </div>
          <div className="hidden text-center sm:block">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Record</div>
            <div className="font-mono text-lg font-bold tabular-nums text-amber-400">
              {highScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="flex h-8 w-8 items-center justify-center rounded border border-slate-800 bg-slate-900/80 text-slate-300 transition-colors hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-300"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          {gameState === 'PLAYING' && (
            <button
              onClick={onTogglePause}
              aria-label="Pause Game"
              className="flex h-8 w-8 items-center justify-center rounded border border-slate-800 bg-slate-900/80 text-slate-300 transition-colors hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-300"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. BOTTOM TACTICAL PANELS (ACTIVE GAMEPLAY) */}
      {gameState === 'PLAYING' && (
        <footer className="pointer-events-none absolute bottom-36 sm:bottom-4 left-4 right-4 flex items-end justify-between gap-4">
          {/* Bottom-Left: Operative Vitals Gauge */}
          <div className="pointer-events-auto rounded-lg border border-cyan-900/50 bg-slate-950/85 p-2.5 sm:p-3.5 shadow-2xl backdrop-blur-md w-48 sm:w-72">
            <div className="flex items-center justify-between text-xs font-semibold tracking-wide">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Shield className="h-3.5 w-3.5 text-cyan-400" />
                VITALS
              </span>
              <span
                className={`font-mono text-xs tabular-nums ${
                  isHealthCritical ? 'font-bold text-red-400' : 'text-cyan-300'
                }`}
              >
                {Math.round(stats.health)} / {stats.maxHealth}
              </span>
            </div>

            {/* Health Bar with segmented ticks */}
            <div className="mt-1.5 sm:mt-2 h-2.5 sm:h-3.5 w-full overflow-hidden rounded border border-slate-800 bg-slate-900">
              <div
                className={`h-full transition-all duration-150 ${
                  isHealthCritical
                    ? 'bg-gradient-to-r from-red-600 to-rose-500'
                    : 'bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-400'
                }`}
                style={{ width: `${healthPct}%` }}
              />
            </div>

            <div className="mt-1 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400">
              <span>{isHealthCritical ? 'CRITICAL' : 'ARMOR OK'}</span>
              <span>ACCURACY {accuracy}%</span>
            </div>
          </div>

          {/* Bottom-Right: Ammunition & Weapon Status */}
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="rounded-lg border border-cyan-900/50 bg-slate-950/85 p-2.5 sm:p-3.5 shadow-2xl backdrop-blur-md w-48 sm:w-72">
              <div className="flex items-center justify-between text-xs font-semibold tracking-wide">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  M4A1
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400">STANAG 5.56</span>
              </div>

              {/* Magazine display */}
              <div className="mt-1.5 sm:mt-2 flex items-baseline justify-between">
                <div className="flex items-baseline gap-1 font-mono">
                  <span
                    className={`text-2xl sm:text-3xl font-black tabular-nums ${
                      ammo.currentMag <= 6 ? 'text-red-400' : 'text-amber-400'
                    }`}
                  >
                    {String(ammo.currentMag).padStart(2, '0')}
                  </span>
                  <span className="text-slate-500">/</span>
                  <span className="text-xs sm:text-sm font-semibold tabular-nums text-slate-400">
                    {ammo.reserve}
                  </span>
                </div>

                {/* Reload button */}
                <button
                  onClick={onReload}
                  disabled={ammo.isReloading || ammo.currentMag === 30 || ammo.reserve <= 0}
                  className="flex items-center gap-1 rounded border border-amber-600/40 bg-amber-950/30 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-amber-300 transition-colors hover:bg-amber-900/50 disabled:opacity-30"
                >
                  <RotateCcw className="h-3 w-3" />
                  {ammo.isReloading ? 'RELOAD...' : 'RELOAD [R]'}
                </button>
              </div>

              {/* Reload Progress bar */}
              {ammo.isReloading && (
                <div className="mt-1.5 sm:mt-2 h-1.5 w-full overflow-hidden rounded bg-slate-800">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${Math.min(100, ammo.reloadProgress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </footer>
      )}

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

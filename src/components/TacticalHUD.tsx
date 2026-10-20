/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Shield,
  Volume2,
  VolumeX,
  RotateCcw,
  Play,
  Pause,
  AlertTriangle,
  Flame,
  Repeat,
} from 'lucide-react';
import { soundSynth } from '../game/audio';
import { AmmoState, GameState, PlayerStats, WeaponId } from '../game/types';

interface TacticalHUDProps {
  gameState: GameState;
  stats: PlayerStats;
  ammo: AmmoState;
  highScore: number;
  onStartGame: () => void;
  onOpenMenu: () => void;
  onTogglePause: () => void;
  onReload: () => void;
  onSwapWeapon: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const WEAPON_LABEL: Record<WeaponId, string> = {
  rifle: 'M4A1',
  pistol: 'MK23',
};

export const TacticalHUD: React.FC<TacticalHUDProps> = ({
  gameState,
  stats,
  ammo,
  highScore,
  onStartGame,
  onOpenMenu,
  onTogglePause,
  onReload,
  onSwapWeapon,
  isMuted,
  onToggleMute,
}) => {
  // Accuracy calculation
  const accuracy =
    stats.shotsFired > 0
      ? Math.min(100, Math.round((stats.shotsHit / stats.shotsFired) * 100))
      : 0;

  const healthPct = Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100));
  const isHealthCritical = stats.health <= 30;
  const stowedId: WeaponId = ammo.weaponId === 'rifle' ? 'pistol' : 'rifle';
  const stowed = ammo.loadout[stowedId];
  const isLowAmmo = ammo.currentMag <= Math.ceil(ammo.magCapacity * 0.25);

  // The landing page owns the title state, so the HUD stays hidden there
  if (gameState === 'TITLE') return null;

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-sans">
      {/* 1. ULTRA-COMPACT SLIM TACTICAL TOP BAR (ALL METERS INLINE) */}
      <header
        className="pointer-events-auto flex h-8 sm:h-9 items-center justify-between border-b border-cyan-950/60 bg-slate-950/85 px-2.5 sm:px-4 backdrop-blur-md"
        style={{
          paddingLeft: 'max(0.625rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.625rem, env(safe-area-inset-right))',
        }}
      >
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

        {/* Right: Active Weapon Ammo & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Active weapon chip */}
          <button
            onClick={onSwapWeapon}
            aria-label={`Active weapon ${WEAPON_LABEL[ammo.weaponId]}. Switch to ${WEAPON_LABEL[stowedId]}`}
            className={`flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[9px] font-bold uppercase transition-colors sm:h-6 sm:text-[10px] ${
              ammo.weaponId === 'rifle'
                ? 'border-cyan-600/50 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50'
                : 'border-emerald-600/50 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
            }`}
          >
            <Repeat className={`h-2.5 w-2.5 ${ammo.isSwapping ? 'animate-spin' : ''}`} />
            {WEAPON_LABEL[ammo.weaponId]}
          </button>

          <div className="flex items-center gap-1 font-mono text-[10px] sm:text-xs">
            <Flame className="h-3 w-3 shrink-0 text-amber-400" />
            <span className={`font-bold tabular-nums ${isLowAmmo ? 'text-red-400' : 'text-amber-400'}`}>
              {String(ammo.currentMag).padStart(2, '0')}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400 tabular-nums text-[9px] sm:text-xs">{ammo.reserve}</span>
          </div>

          {/* Stowed weapon readout keeps both ammo counts visible */}
          <div className="hidden items-center gap-1 font-mono text-[9px] text-slate-500 sm:flex">
            <span className="uppercase">{WEAPON_LABEL[stowedId]}</span>
            <span className="tabular-nums">
              {stowed.currentMag}/{stowed.reserve}
            </span>
          </div>

          {/* Quick Reload Button */}
          <button
            onClick={onReload}
            disabled={ammo.isReloading || ammo.currentMag === ammo.magCapacity || ammo.reserve <= 0}
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

      {/* 3. PAUSE MODAL */}
      {gameState === 'PAUSED' && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-xl border border-cyan-800/60 bg-slate-900/95 p-6 text-center shadow-2xl">
            <h2 className="text-xl font-bold tracking-wider text-slate-100">COMBAT SIMULATION PAUSED</h2>
            <p className="mt-1 text-xs text-slate-400">Awaiting tactical resumption</p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={onTogglePause}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan-500 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-400"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                RESUME COMBAT
              </button>
              <button
                onClick={onStartGame}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-bold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-700"
              >
                <RotateCcw className="h-4 w-4" />
                RESTART SECTOR
              </button>
              <button
                onClick={onOpenMenu}
                className="min-h-11 rounded-lg border border-slate-800 text-xs font-bold text-slate-400 transition-colors hover:text-slate-200"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. GAME OVER DEBRIEFING MODAL */}
      {gameState === 'GAME_OVER' && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center overflow-y-auto bg-slate-950/90 p-4 backdrop-blur-md sm:p-6">
          <div className="my-auto w-full max-w-md rounded-xl border border-red-900/70 bg-slate-900/95 p-5 shadow-2xl sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/40 bg-red-950/60 text-red-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-wider text-red-400">OPERATIVE KIA</h2>
                <p className="text-xs text-slate-400">Containment Breach Unchecked</p>
              </div>
            </div>

            {stats.score >= highScore && stats.score > 0 && (
              <div className="mt-4 rounded-lg border border-amber-600/50 bg-amber-950/30 px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-amber-300">
                New Record Established
              </div>
            )}

            {/* After Action Statistics */}
            <div className="mt-4 space-y-2.5 rounded-lg border border-slate-800 bg-slate-950/70 p-4 sm:mt-6">
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
                <span className="text-slate-400">Rounds Fired / Accuracy</span>
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
                soundSynth.playGunshot('rifle');
                onStartGame();
              }}
              className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 py-3 text-sm font-bold tracking-wider text-slate-950 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] sm:mt-6"
            >
              <RotateCcw className="h-4 w-4" />
              REDEPLOY OPERATIVE
            </button>

            <button
              onClick={onOpenMenu}
              className="mt-2 min-h-11 w-full rounded-lg border border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-200"
            >
              Return to Main Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

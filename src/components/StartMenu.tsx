/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Crosshair,
  Gamepad2,
  Play,
  Swords,
  Target,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { WEAPON_CONFIGS } from '../game/weapon';
import { WeaponId } from '../game/types';

interface StartMenuProps {
  onStartGame: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  highScore: number;
  isMobile: boolean;
}

type MenuTab = 'deploy' | 'loadout' | 'controls';

const TABS: { id: MenuTab; label: string; icon: React.ElementType }[] = [
  { id: 'deploy', label: 'Deploy', icon: Play },
  { id: 'loadout', label: 'Loadout', icon: Swords },
  { id: 'controls', label: 'Controls', icon: Gamepad2 },
];

const WEAPON_ROLE: Record<WeaponId, string> = {
  rifle: 'Primary · Suppression',
  pistol: 'Secondary · Precision',
};

const WeaponCard: React.FC<{ id: WeaponId }> = ({ id }) => {
  const cfg = WEAPON_CONFIGS[id];
  const isAuto = cfg.fireMode === 'auto';
  const rpm = Math.round(60 / cfg.fireInterval);

  const bars = [
    { label: 'Damage', value: Math.min(100, (cfg.damage / 60) * 100) },
    { label: 'Rate', value: Math.min(100, (rpm / 600) * 100) },
    { label: 'Control', value: Math.min(100, (1 - cfg.baseSpread / 0.06) * 100) },
  ];

  return (
    <div
      className={`flex-1 rounded-xl border p-3 sm:p-4 ${
        isAuto
          ? 'border-cyan-700/50 bg-gradient-to-br from-cyan-950/50 to-slate-950/80'
          : 'border-emerald-700/50 bg-gradient-to-br from-emerald-950/40 to-slate-950/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-sm font-black tracking-wider text-slate-100">
            {cfg.shortName}
          </div>
          <div className="text-[10px] text-slate-400">{cfg.name}</div>
        </div>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
            isAuto
              ? 'border-cyan-600/50 bg-cyan-950/60 text-cyan-300'
              : 'border-emerald-600/50 bg-emerald-950/60 text-emerald-300'
          }`}
        >
          {isAuto ? 'Full-Auto' : 'Semi-Auto'}
        </span>
      </div>

      <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">{WEAPON_ROLE[id]}</p>

      <div className="mt-3 space-y-1.5">
        {bars.map((bar) => (
          <div key={bar.label} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[10px] text-slate-400">{bar.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${isAuto ? 'bg-cyan-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.max(6, bar.value)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-800 pt-2 text-center">
        <div>
          <dt className="text-[9px] uppercase text-slate-500">Mag</dt>
          <dd className="font-mono text-xs font-bold text-slate-200">{cfg.magCapacity}</dd>
        </div>
        <div>
          <dt className="text-[9px] uppercase text-slate-500">DMG</dt>
          <dd className="font-mono text-xs font-bold text-slate-200">{cfg.damage}</dd>
        </div>
        <div>
          <dt className="text-[9px] uppercase text-slate-500">RPM</dt>
          <dd className="font-mono text-xs font-bold text-slate-200">{isAuto ? rpm : '—'}</dd>
        </div>
      </dl>
    </div>
  );
};

export const StartMenu: React.FC<StartMenuProps> = ({
  onStartGame,
  isMuted,
  onToggleMute,
  highScore,
  isMobile,
}) => {
  const [tab, setTab] = useState<MenuTab>('deploy');

  return (
    <section
      className="w-full max-w-xl rounded-2xl border border-cyan-900/60 bg-slate-950/80 p-4 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl sm:p-6"
      aria-label="Mission start menu"
    >
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Menu sections"
        className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900/70 p-1"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                active
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div className="mt-4 min-h-[190px]">
        {tab === 'deploy' && (
          <div className="ip-rise space-y-3">
            <p className="text-xs leading-relaxed text-slate-300">
              An autonomous weapons bunker has been compromised. Swarms of{' '}
              <strong className="text-slate-100">Cyber Drones</strong> and shielded{' '}
              <strong className="text-slate-100">Combat Mechs</strong> are breaching the containment
              gates. Hold the line, wave after wave.
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-center">
                <Trophy className="mx-auto h-4 w-4 text-amber-400" />
                <div className="mt-1 font-mono text-sm font-bold tabular-nums text-amber-300">
                  {highScore.toLocaleString()}
                </div>
                <div className="text-[9px] uppercase tracking-wide text-slate-500">Record</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-center">
                <Swords className="mx-auto h-4 w-4 text-cyan-400" />
                <div className="mt-1 font-mono text-sm font-bold text-cyan-300">2</div>
                <div className="text-[9px] uppercase tracking-wide text-slate-500">Weapons</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 text-center">
                <Timer className="mx-auto h-4 w-4 text-emerald-400" />
                <div className="mt-1 font-mono text-sm font-bold text-emerald-300">∞</div>
                <div className="text-[9px] uppercase tracking-wide text-slate-500">Waves</div>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-900/50 bg-amber-950/20 p-3">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                <strong>New:</strong> hold the trigger to spin the carbine into rapid fire, or swap
                to the MK23 sidearm for one precise, high-damage round per tap. Each weapon keeps its
                own magazine and ammo count.
              </p>
            </div>
          </div>
        )}

        {tab === 'loadout' && (
          <div className="ip-rise flex flex-col gap-3 sm:flex-row">
            <WeaponCard id="rifle" />
            <WeaponCard id="pistol" />
          </div>
        )}

        {tab === 'controls' && (
          <div className="ip-rise space-y-2">
            {(isMobile
              ? [
                  ['Left stick', 'Move operative'],
                  ['Tap trigger', 'Single round'],
                  ['Hold trigger', 'Rapid fire (carbine only)'],
                  ['Swap button', 'Change weapon'],
                  ['Reload button', 'Tactical reload'],
                  ['Auto-aim', 'Locks nearest hostile on screen'],
                ]
              : [
                  ['WASD / Arrows', 'Move operative'],
                  ['Mouse', '360° aim reticle'],
                  ['Click / Space', 'Tap = single · hold = rapid fire'],
                  ['1 / 2 / Q', 'Switch carbine ↔ sidearm'],
                  ['R', 'Tactical reload'],
                  ['Esc', 'Pause'],
                ]
            ).map(([key, desc]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2"
              >
                <span className="font-mono text-[11px] font-bold text-cyan-300">{key}</span>
                <span className="text-right text-[11px] text-slate-400">{desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Primary CTA */}
      <button
        onClick={onStartGame}
        className="group relative mt-4 flex min-h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 text-sm font-black uppercase tracking-[0.2em] text-slate-950 shadow-lg shadow-cyan-900/50 transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      >
        <span className="ip-sweep pointer-events-none absolute inset-y-0 w-16 bg-white/25 blur-md" />
        <Crosshair className="h-5 w-5" />
        Deploy Operative
      </button>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 text-[11px] font-medium text-slate-300 transition-colors hover:border-cyan-600/50 hover:text-cyan-300"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {isMuted ? 'Audio Off' : 'Audio On'}
        </button>

        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
          <Target className="h-3.5 w-3.5 text-slate-600" />
          Drops: Ammo · Medkits
        </div>
      </div>
    </section>
  );
};


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Crosshair, RotateCcw, Repeat } from 'lucide-react';
import { RAPID_FIRE_HOLD_THRESHOLD } from '../game/engine';
import { AmmoState, WeaponId } from '../game/types';

interface MobileControlsProps {
  ammo: AmmoState;
  onMoveVector: (vec: { x: number; y: number }) => void;
  onFire: (firing: boolean) => void;
  onReload: () => void;
  onSwapWeapon: () => void;
}

const haptic = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Haptics are best-effort only
  }
};

const WEAPON_LABEL: Record<WeaponId, string> = {
  rifle: 'M4A1',
  pistol: 'MK23',
};

export const MobileControls: React.FC<MobileControlsProps> = ({
  ammo,
  onMoveVector,
  onFire,
  onReload,
  onSwapWeapon,
}) => {
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isStickActive, setIsStickActive] = useState<boolean>(false);
  const [isTriggerActive, setIsTriggerActive] = useState<boolean>(false);
  const [isRapidFire, setIsRapidFire] = useState<boolean>(false);

  const stickBaseRef = useRef<HTMLDivElement | null>(null);
  const touchIdRef = useRef<number | null>(null);
  const rapidTimerRef = useRef<number | null>(null);

  const maxRadius = 46;
  const isAuto = ammo.fireMode === 'auto';
  const stowedId: WeaponId = ammo.weaponId === 'rifle' ? 'pistol' : 'rifle';
  const stowed = ammo.loadout[stowedId];

  const clearRapidTimer = useCallback(() => {
    if (rapidTimerRef.current !== null) {
      window.clearTimeout(rapidTimerRef.current);
      rapidTimerRef.current = null;
    }
  }, []);

  const releaseTrigger = useCallback(() => {
    clearRapidTimer();
    setIsTriggerActive(false);
    setIsRapidFire(false);
    onFire(false);
  }, [clearRapidTimer, onFire]);

  // Ensure controls are reset on mount, unmount, and global touchup
  useEffect(() => {
    setIsTriggerActive(false);
    setIsStickActive(false);
    onFire(false);
    onMoveVector({ x: 0, y: 0 });

    const handleGlobalRelease = () => releaseTrigger();

    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('touchcancel', handleGlobalRelease);
    window.addEventListener('mouseup', handleGlobalRelease);

    return () => {
      clearRapidTimer();
      onFire(false);
      onMoveVector({ x: 0, y: 0 });
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
      window.removeEventListener('mouseup', handleGlobalRelease);
    };
  }, [onFire, onMoveVector, releaseTrigger, clearRapidTimer]);

  // Joystick touch handlers
  const handleStickStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsStickActive(true);
    updateKnob(touch.clientX, touch.clientY);
  };

  const handleStickMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateKnob(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleStickEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsStickActive(false);
        setKnobPos({ x: 0, y: 0 });
        onMoveVector({ x: 0, y: 0 });
        break;
      }
    }
  };

  const updateKnob = (clientX: number, clientY: number) => {
    if (!stickBaseRef.current) return;
    const rect = stickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist <= maxRadius) {
      setKnobPos({ x: dx, y: dy });
      onMoveVector({ x: dx / maxRadius, y: dy / maxRadius });
    } else {
      const angle = Math.atan2(dy, dx);
      const clampedX = Math.cos(angle) * maxRadius;
      const clampedY = Math.sin(angle) * maxRadius;
      setKnobPos({ x: clampedX, y: clampedY });
      onMoveVector({ x: Math.cos(angle), y: Math.sin(angle) });
    }
  };

  /**
   * Trigger: a quick tap fires a single round on either weapon. Holding the
   * trigger past the threshold spins the carbine up into sustained rapid fire —
   * the semi-automatic sidearm always stays one-shot-per-tap.
   */
  const handleTriggerStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsTriggerActive(true);
    onFire(true);
    haptic(12);

    clearRapidTimer();
    if (isAuto) {
      rapidTimerRef.current = window.setTimeout(() => {
        setIsRapidFire(true);
        haptic([0, 18, 40, 18]);
      }, RAPID_FIRE_HOLD_THRESHOLD * 1000);
    }
  };

  const handleTriggerEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    releaseTrigger();
  };

  const handleSwap = (e: React.SyntheticEvent) => {
    e.preventDefault();
    releaseTrigger();
    onSwapWeapon();
    haptic(20);
  };

  const magPct = Math.max(0, Math.min(1, ammo.currentMag / Math.max(1, ammo.magCapacity)));
  const isLowAmmo = ammo.currentMag <= Math.ceil(ammo.magCapacity * 0.25);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 select-none overflow-hidden"
      style={{
        touchAction: 'none',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* 1. LEFT VIRTUAL JOYSTICK FOR MOVEMENT */}
      <div
        className="pointer-events-auto absolute bottom-4 left-4 flex h-40 w-40 items-center justify-center"
        onTouchStart={handleStickStart}
        onTouchMove={handleStickMove}
        onTouchEnd={handleStickEnd}
        onTouchCancel={handleStickEnd}
      >
        {/* Base Ring */}
        <div
          ref={stickBaseRef}
          className={`relative flex h-32 w-32 items-center justify-center rounded-full border border-cyan-500/30 bg-slate-950/45 shadow-xl backdrop-blur-sm transition-all duration-150 ${
            isStickActive ? 'scale-105 border-cyan-400/60 shadow-cyan-950/50' : 'opacity-80'
          }`}
        >
          {/* Subtle Directional Crosshairs */}
          <div className="absolute h-full w-[1px] bg-cyan-500/20" />
          <div className="absolute h-[1px] w-full bg-cyan-500/20" />
          <div className="h-16 w-16 rounded-full border border-cyan-500/15" />

          {/* Dynamic Thumb Knob */}
          <div
            className="absolute flex h-14 w-14 items-center justify-center rounded-full border-2 border-cyan-400 bg-gradient-to-br from-cyan-600 to-cyan-900 shadow-lg shadow-cyan-500/30"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: isStickActive ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className="h-5 w-5 rounded-full border border-cyan-200/50 bg-cyan-300/40" />
          </div>
        </div>
      </div>

      {/* 2. RIGHT WEAPON CLUSTER: SWAP · RELOAD · FIRE */}
      <div className="pointer-events-auto absolute bottom-4 right-4 flex items-end gap-3">
        {/* Secondary column: weapon swap + reload */}
        <div className="flex flex-col items-center gap-2.5">
          {/* Weapon Swap */}
          <button
            onTouchStart={handleSwap}
            onClick={handleSwap}
            aria-label={`Switch to ${WEAPON_LABEL[stowedId]} — ${stowed.currentMag} of ${stowed.reserve} rounds remaining`}
            className={`flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-xl border bg-slate-950/75 shadow-lg backdrop-blur-sm transition-all active:scale-90 ${
              ammo.isSwapping
                ? 'border-cyan-300 text-cyan-200'
                : 'border-cyan-500/40 text-cyan-300'
            }`}
          >
            <Repeat className={`h-4 w-4 ${ammo.isSwapping ? 'animate-spin' : ''}`} />
            <span className="font-mono text-[9px] font-bold leading-none tracking-wide">
              {WEAPON_LABEL[stowedId]}
            </span>
            <span className="font-mono text-[8px] leading-none text-slate-400 tabular-nums">
              {stowed.currentMag}/{stowed.reserve}
            </span>
          </button>

          {/* Quick Reload Button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onReload();
              haptic(10);
            }}
            onClick={(e) => {
              e.preventDefault();
              onReload();
            }}
            disabled={ammo.isReloading || ammo.currentMag === ammo.magCapacity || ammo.reserve <= 0}
            aria-label="Tactical Reload"
            className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-500/40 bg-slate-950/75 text-amber-300 shadow-lg backdrop-blur-sm transition-transform active:scale-90 disabled:opacity-30"
          >
            <RotateCcw className={`h-5 w-5 ${ammo.isReloading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Primary Tactile Fire Trigger Button */}
        <button
          onTouchStart={handleTriggerStart}
          onTouchEnd={handleTriggerEnd}
          onTouchCancel={handleTriggerEnd}
          aria-label={
            isAuto
              ? 'Fire carbine — tap for a single round, hold for rapid fire'
              : 'Fire sidearm — one round per tap'
          }
          className={`relative flex h-28 w-28 items-center justify-center rounded-full border-2 shadow-2xl backdrop-blur-md transition-transform duration-75 active:scale-95 ${
            isRapidFire
              ? 'scale-95 border-red-400 bg-gradient-to-br from-red-500 to-orange-600 shadow-red-500/50'
              : isTriggerActive
                ? 'scale-95 border-amber-400 bg-gradient-to-br from-amber-600 to-red-600 shadow-amber-500/50'
                : 'border-cyan-500/60 bg-gradient-to-br from-slate-900/90 to-cyan-950/80 shadow-cyan-950/60'
          }`}
        >
          {/* Magazine arc around the trigger */}
          <svg className="pointer-events-none absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="4" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={isLowAmmo ? '#f87171' : '#22d3ee'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${magPct * 283} 283`}
              className="transition-all duration-150"
            />
          </svg>

          {/* Rapid fire pulse ring */}
          {isRapidFire && (
            <span className="absolute inset-1 animate-ping rounded-full border-2 border-red-300/70" />
          )}

          {/* Inner ring */}
          <div className="flex h-20 w-20 flex-col items-center justify-center gap-0.5 rounded-full border border-white/20">
            <Crosshair
              className={`h-8 w-8 ${
                isTriggerActive ? 'text-white' : 'text-cyan-300'
              } ${isRapidFire ? 'animate-pulse' : ''}`}
            />
            <span className="font-mono text-[10px] font-bold tabular-nums text-white/90">
              {String(ammo.currentMag).padStart(2, '0')}
            </span>
          </div>

          {/* Trigger label */}
          <div className="absolute -bottom-1 rounded border border-cyan-950 bg-slate-950/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300">
            {isRapidFire ? 'RAPID FIRE' : isAuto ? 'HOLD = AUTO' : 'TAP = SHOT'}
          </div>
        </button>
      </div>
    </div>
  );
};


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Crosshair, RotateCcw } from 'lucide-react';
import { AmmoState } from '../game/types';

interface MobileControlsProps {
  ammo: AmmoState;
  onMoveVector: (vec: { x: number; y: number }) => void;
  onFire: (firing: boolean) => void;
  onReload: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  ammo,
  onMoveVector,
  onFire,
  onReload,
}) => {
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isStickActive, setIsStickActive] = useState<boolean>(false);
  const [isTriggerActive, setIsTriggerActive] = useState<boolean>(false);

  const stickBaseRef = useRef<HTMLDivElement | null>(null);
  const touchIdRef = useRef<number | null>(null);

  const maxRadius = 46;

  // Ensure controls are reset on mount, unmount, and global touchup
  React.useEffect(() => {
    setIsTriggerActive(false);
    setIsStickActive(false);
    onFire(false);
    onMoveVector({ x: 0, y: 0 });

    const handleGlobalRelease = () => {
      setIsTriggerActive(false);
      onFire(false);
    };

    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('touchcancel', handleGlobalRelease);
    window.addEventListener('mouseup', handleGlobalRelease);

    return () => {
      onFire(false);
      onMoveVector({ x: 0, y: 0 });
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
      window.removeEventListener('mouseup', handleGlobalRelease);
    };
  }, [onFire, onMoveVector]);

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

  // Trigger touch handlers
  const handleTriggerStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsTriggerActive(true);
    onFire(true);
  };

  const handleTriggerEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsTriggerActive(false);
    onFire(false);
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 select-none overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* 1. LEFT VIRTUAL JOYSTICK FOR MOVEMENT */}
      <div
        className="pointer-events-auto absolute bottom-6 left-6 flex h-40 w-40 items-center justify-center"
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

      {/* 2. RIGHT DEDICATED FIRE TRIGGER & QUICK RELOAD */}
      <div className="pointer-events-auto absolute bottom-6 right-6 flex flex-col items-center gap-3">
        {/* Quick Reload Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onReload();
          }}
          onClick={(e) => {
            e.preventDefault();
            onReload();
          }}
          disabled={ammo.isReloading || ammo.currentMag === 30 || ammo.reserve <= 0}
          aria-label="Tactical Reload"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/40 bg-slate-950/70 text-amber-300 shadow-lg backdrop-blur-sm active:scale-90 disabled:opacity-30"
        >
          <RotateCcw className={`h-5 w-5 ${ammo.isReloading ? 'animate-spin' : ''}`} />
        </button>

        {/* Primary Tactile Fire Trigger Button */}
        <button
          onTouchStart={handleTriggerStart}
          onTouchEnd={handleTriggerEnd}
          onTouchCancel={handleTriggerEnd}
          aria-label="Fire Weapon (Auto-Lock Nearest Hostile)"
          className={`relative flex h-24 w-24 items-center justify-center rounded-full border-2 shadow-2xl backdrop-blur-md transition-transform duration-75 active:scale-95 ${
            isTriggerActive
              ? 'border-amber-400 bg-gradient-to-br from-amber-600 to-red-600 scale-95 shadow-amber-500/50'
              : 'border-cyan-500/60 bg-gradient-to-br from-slate-900/90 to-cyan-950/80 shadow-cyan-950/60'
          }`}
        >
          {/* Inner ring */}
          <div className="flex h-18 w-18 items-center justify-center rounded-full border border-white/20">
            <Crosshair
              className={`h-9 w-9 ${
                isTriggerActive ? 'text-white animate-pulse' : 'text-cyan-300'
              }`}
            />
          </div>

          {/* Trigger label */}
          <div className="absolute -bottom-2 rounded border border-cyan-950 bg-slate-950/90 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-cyan-300 uppercase">
            AUTO FIRE
          </div>
        </button>
      </div>
    </div>
  );
};

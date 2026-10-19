/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Crosshair, RotateCcw } from 'lucide-react';

interface MobileControlsProps {
  isReloading: boolean;
  onMoveVector: (vec: { x: number; y: number }) => void;
  onFire: (firing: boolean) => void;
  onReload: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  isReloading,
  onMoveVector,
  onFire,
  onReload,
}) => {
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isStickActive, setIsStickActive] = useState<boolean>(false);
  const [isTriggerActive, setIsTriggerActive] = useState<boolean>(false);

  // Stable refs for callbacks to prevent any effect teardown on parent re-renders
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;
  const onMoveVectorRef = useRef(onMoveVector);
  onMoveVectorRef.current = onMoveVector;

  const stickBaseRef = useRef<HTMLDivElement | null>(null);
  const stickTouchIdRef = useRef<number | null>(null);
  const triggerPointerIdRef = useRef<number | null>(null);

  const maxRadius = 46;

  // Global cleanup ONLY on mount and true unmount
  useEffect(() => {
    const handleGlobalBlur = () => {
      triggerPointerIdRef.current = null;
      stickTouchIdRef.current = null;
      setIsTriggerActive(false);
      setIsStickActive(false);
      setKnobPos({ x: 0, y: 0 });
      onFireRef.current(false);
      onMoveVectorRef.current({ x: 0, y: 0 });
    };

    window.addEventListener('blur', handleGlobalBlur);

    return () => {
      onFireRef.current(false);
      onMoveVectorRef.current({ x: 0, y: 0 });
      window.removeEventListener('blur', handleGlobalBlur);
    };
  }, []);

  // 1. Virtual Movement Joystick (Isolated by stickTouchIdRef)
  const handleStickStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (stickTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    stickTouchIdRef.current = touch.identifier;
    setIsStickActive(true);
    updateKnob(touch.clientX, touch.clientY);
  };

  const handleStickMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (stickTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === stickTouchIdRef.current) {
        updateKnob(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleStickEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (stickTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === stickTouchIdRef.current) {
        stickTouchIdRef.current = null;
        setIsStickActive(false);
        setKnobPos({ x: 0, y: 0 });
        onMoveVectorRef.current({ x: 0, y: 0 });
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
      onMoveVectorRef.current({ x: dx / maxRadius, y: dy / maxRadius });
    } else {
      const angle = Math.atan2(dy, dx);
      const clampedX = Math.cos(angle) * maxRadius;
      const clampedY = Math.sin(angle) * maxRadius;
      setKnobPos({ x: clampedX, y: clampedY });
      onMoveVectorRef.current({ x: Math.cos(angle), y: Math.sin(angle) });
    }
  };

  // 2. Fire Trigger: Pointer Events with setPointerCapture for uninterrupted rapid fire
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    triggerPointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsTriggerActive(true);
    onFireRef.current(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (triggerPointerIdRef.current === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      triggerPointerIdRef.current = null;
      setIsTriggerActive(false);
      onFireRef.current(false);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (triggerPointerIdRef.current === e.pointerId) {
      triggerPointerIdRef.current = null;
      setIsTriggerActive(false);
      onFireRef.current(false);
    }
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 select-none overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* 1. LEFT VIRTUAL JOYSTICK FOR MOVEMENT */}
      <div
        className="pointer-events-auto absolute bottom-5 left-5 flex h-36 w-36 items-center justify-center"
        onTouchStart={handleStickStart}
        onTouchMove={handleStickMove}
        onTouchEnd={handleStickEnd}
        onTouchCancel={handleStickEnd}
      >
        {/* Base Ring */}
        <div
          ref={stickBaseRef}
          className={`relative flex h-28 w-28 items-center justify-center rounded-full border border-cyan-500/35 bg-slate-950/50 shadow-xl backdrop-blur-sm transition-all duration-150 ${
            isStickActive ? 'scale-105 border-cyan-400/70 shadow-cyan-950/60' : 'opacity-85'
          }`}
        >
          {/* Subtle Directional Crosshairs */}
          <div className="absolute h-full w-[1px] bg-cyan-500/20" />
          <div className="absolute h-[1px] w-full bg-cyan-500/20" />
          <div className="h-14 w-14 rounded-full border border-cyan-500/15" />

          {/* Dynamic Thumb Knob */}
          <div
            className="absolute flex h-12 w-12 items-center justify-center rounded-full border-2 border-cyan-400 bg-gradient-to-br from-cyan-600 to-cyan-900 shadow-lg shadow-cyan-500/30"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: isStickActive ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className="h-4 w-4 rounded-full border border-cyan-200/50 bg-cyan-300/40" />
          </div>
        </div>
      </div>

      {/* 2. RIGHT DEDICATED FIRE TRIGGER & QUICK RELOAD */}
      <div className="pointer-events-auto absolute bottom-5 right-5 flex flex-col items-center gap-2.5">
        {/* Quick Reload Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReload();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReload();
          }}
          aria-label="Tactical Reload"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-500/40 bg-slate-950/80 text-amber-300 shadow-lg backdrop-blur-sm active:scale-90"
        >
          <RotateCcw className={`h-4 w-4 ${isReloading ? 'animate-spin' : ''}`} />
        </button>

        {/* Primary Tactile Fire Trigger Button (Continuous Rapid Fire on Hold) */}
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
          aria-label="Hold for Rapid Fire (Auto-Lock Nearest On-Screen Hostile)"
          className={`relative flex h-22 w-22 items-center justify-center rounded-full border-2 shadow-2xl backdrop-blur-md transition-transform duration-75 active:scale-95 ${
            isTriggerActive
              ? 'border-amber-400 bg-gradient-to-br from-amber-600 to-red-600 scale-95 shadow-amber-500/60'
              : 'border-cyan-500/60 bg-gradient-to-br from-slate-900/90 to-cyan-950/80 shadow-cyan-950/60'
          }`}
          style={{
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
        >
          {/* Inner ring */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 pointer-events-none">
            <Crosshair
              className={`h-8 w-8 ${
                isTriggerActive ? 'text-white animate-pulse' : 'text-cyan-300'
              }`}
            />
          </div>

          {/* Trigger label */}
          <div className="absolute -bottom-1.5 rounded border border-cyan-950 bg-slate-950/90 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-cyan-300 uppercase pointer-events-none">
            RAPID FIRE
          </div>
        </button>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { StartMenu } from './StartMenu';

interface LandingScreenProps {
  onStartGame: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  highScore: number;
  isMobile: boolean;
}

interface Tracer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

/**
 * Full-screen landing page: animated tactical radar backdrop, title lockup and
 * the start menu. Mobile-first, scrollable, and safe-area aware.
 */
export const LandingScreen: React.FC<LandingScreenProps> = ({
  onStartGame,
  isMuted,
  onToggleMute,
  highScore,
  isMobile,
}) => {
  const bgRef = useRef<HTMLCanvasElement | null>(null);

  // Animated backdrop: drifting grid, radar sweep and stray tracer rounds
  useEffect(() => {
    const canvas = bgRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tracers: Tracer[] = [];
    let raf = 0;
    let t = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnTracer = (w: number, h: number) => {
      const fromLeft = Math.random() < 0.5;
      const angle = (Math.random() - 0.5) * 0.5 + (fromLeft ? 0 : Math.PI);
      const speed = 7 + Math.random() * 6;
      tracers.push({
        x: fromLeft ? -40 : w + 40,
        y: Math.random() * h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 140,
      });
    };

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      t += 1;

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      // Perspective grid
      const spacing = 56;
      const drift = reduceMotion ? 0 : (t * 0.35) % spacing;
      ctx.strokeStyle = 'rgba(14, 116, 144, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -spacing + drift; x < w + spacing; x += spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = -spacing + drift; y < h + spacing; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Radar sweep from the centre
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.hypot(w, h) / 2;
      const sweepAngle = reduceMotion ? -Math.PI / 4 : (t * 0.006) % (Math.PI * 2);

      const sweep = ctx.createConicGradient?.(sweepAngle, cx, cy);
      if (sweep) {
        sweep.addColorStop(0, 'rgba(34, 211, 238, 0.16)');
        sweep.addColorStop(0.08, 'rgba(34, 211, 238, 0.02)');
        sweep.addColorStop(1, 'rgba(34, 211, 238, 0)');
        ctx.fillStyle = sweep;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Range rings
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.12)';
      for (let r = 120; r < radius; r += 150) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Stray tracer rounds streaking across the sector
      if (!reduceMotion && t % 26 === 0) spawnTracer(w, h);

      ctx.lineCap = 'round';
      for (let i = tracers.length - 1; i >= 0; i--) {
        const tr = tracers[i];
        tr.x += tr.vx;
        tr.y += tr.vy;
        tr.life += 1;

        const alpha = Math.max(0, 1 - tr.life / tr.maxLife);
        ctx.strokeStyle = `rgba(251, 191, 36, ${alpha * 0.75})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tr.x, tr.y);
        ctx.lineTo(tr.x - tr.vx * 2.6, tr.y - tr.vy * 2.6);
        ctx.stroke();

        if (tr.life > tr.maxLife || tr.x < -120 || tr.x > w + 120) {
          tracers.splice(i, 1);
        }
      }

      // Vignette
      const vignette = ctx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius);
      vignette.addColorStop(0, 'rgba(2, 6, 23, 0)');
      vignette.addColorStop(1, 'rgba(2, 6, 23, 0.92)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 overflow-y-auto overscroll-contain bg-slate-950">
      {/* Animated tactical backdrop */}
      <canvas ref={bgRef} className="pointer-events-none fixed inset-0 h-full w-full" aria-hidden="true" />

      {/* CRT scanline sheen */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="ip-scanline h-1/3 w-full bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent" />
      </div>

      <main
        className="relative flex min-h-full flex-col items-center justify-center gap-5 px-4 py-8 sm:gap-7 sm:py-12"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 2rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
        }}
      >
        {/* Title lockup */}
        <header className="ip-rise flex w-full max-w-xl flex-col items-center text-center">
          <span className="rounded-full border border-cyan-700/50 bg-cyan-950/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-400">
            Sector 7 · Containment Breach
          </span>

          <h1 className="mt-3 text-4xl font-black leading-none tracking-tight text-slate-50 sm:text-6xl">
            <span className="ip-flicker bg-gradient-to-b from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(34,211,238,0.35)]">
              OPERATION
            </span>
            <br />
            <span className="bg-gradient-to-b from-amber-200 via-amber-400 to-orange-600 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(251,191,36,0.3)]">
              IRONPOINT
            </span>
          </h1>

          <div className="mt-3 flex items-center gap-2" aria-hidden="true">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-cyan-600" />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400">
              Top-Down Tactical Shooter
            </span>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-cyan-600" />
          </div>
        </header>

        <div className="ip-rise w-full max-w-xl" style={{ animationDelay: '0.1s' }}>
          <StartMenu
            onStartGame={onStartGame}
            isMuted={isMuted}
            onToggleMute={onToggleMute}
            highScore={highScore}
            isMobile={isMobile}
          />
        </div>

        <p className="text-center font-mono text-[10px] uppercase tracking-wider text-slate-600">
          {isMobile ? 'Rotate to landscape for full field of view' : 'Best played with sound on'}
        </p>
      </main>
    </div>
  );
};


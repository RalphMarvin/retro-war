/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

interface PortraitOverlayProps {
  onAttemptFullscreenLandscape?: () => void;
}

export const PortraitOverlay: React.FC<PortraitOverlayProps> = ({
  onAttemptFullscreenLandscape,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center backdrop-blur-xl">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
        {/* Animated rotating phone silhouette */}
        <div className="animate-[spin_4s_ease-in-out_infinite] text-cyan-400">
          <Smartphone className="h-16 w-16 rotate-90" />
        </div>
        <div className="absolute -bottom-1 -right-1 rounded-full border border-cyan-500/50 bg-cyan-950 p-1.5 text-cyan-300">
          <RotateCw className="h-4 w-4 animate-spin" />
        </div>
      </div>

      <div className="max-w-xs space-y-2">
        <div className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase">
          Tactical Operations Protocol
        </div>
        <h2 className="text-xl font-black tracking-wider text-slate-100 uppercase">
          Rotate to Landscape
        </h2>
        <p className="text-xs leading-relaxed text-slate-400">
          Operation Ironpoint combat optics and dual-stick telemetry require landscape orientation to engage hostiles.
        </p>
      </div>

      {onAttemptFullscreenLandscape && (
        <button
          onClick={onAttemptFullscreenLandscape}
          className="mt-6 flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-950/60 px-5 py-2.5 text-xs font-semibold text-cyan-300 shadow-lg transition-transform active:scale-95"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Switch to Fullscreen Landscape
        </button>
      )}
    </div>
  );
};

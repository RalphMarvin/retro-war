/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Smartphone, RotateCw, Play } from 'lucide-react';

interface PortraitOverlayProps {
  onBypassPortrait?: () => void;
}

export const PortraitOverlay: React.FC<PortraitOverlayProps> = ({
  onBypassPortrait,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center backdrop-blur-xl select-none">
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
        {/* Animated rotating phone silhouette */}
        <div className="animate-[spin_4s_ease-in-out_infinite] text-cyan-400">
          <Smartphone className="h-14 w-14 rotate-90" />
        </div>
        <div className="absolute -bottom-1 -right-1 rounded-full border border-cyan-500/50 bg-cyan-950 p-1.5 text-cyan-300">
          <RotateCw className="h-3.5 w-3.5 animate-spin" />
        </div>
      </div>

      <div className="max-w-xs space-y-2">
        <div className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">
          Tactical Operations Protocol
        </div>
        <h2 className="text-lg font-black tracking-wider text-slate-100 uppercase">
          Rotate Device to Landscape
        </h2>
        <p className="text-xs leading-relaxed text-slate-300">
          Physically turn your device sideways to enable wide tactical combat optics.
        </p>
        <div className="rounded border border-slate-800 bg-slate-900/60 p-2 text-[11px] text-slate-400">
          <strong className="text-amber-400">iOS Tip:</strong> If the screen does not rotate, swipe down to open iOS Control Center and turn off <strong className="text-slate-200">Portrait Orientation Lock</strong>.
        </div>
      </div>

      {onBypassPortrait && (
        <button
          onClick={onBypassPortrait}
          className="mt-5 flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-4 py-2 text-xs font-semibold text-cyan-300 shadow-md transition-transform active:scale-95 hover:bg-cyan-900/40"
        >
          <Play className="h-3.5 w-3.5 fill-cyan-300" />
          Continue in Portrait Mode
        </button>
      )}
    </div>
  );
};

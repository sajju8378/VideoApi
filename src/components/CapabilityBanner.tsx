import React from 'react';
import { AlertTriangle, CheckCircle2, Info, Cpu, Sparkles } from 'lucide-react';
import { SystemCapabilities } from '../types';

interface CapabilityBannerProps {
  capabilities: SystemCapabilities | null;
  onOpenTelemetry: () => void;
}

export const CapabilityBanner: React.FC<CapabilityBannerProps> = ({ capabilities, onOpenTelemetry }) => {
  if (!capabilities) return null;

  if (capabilities.cuda && capabilities.vram_gb >= 16) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium text-emerald-200">
              Hardware Compatible: {capabilities.gpu} ({capabilities.vram_gb} GB VRAM)
            </p>
            <p className="text-xs text-emerald-400/80">
              Max Resolution: {capabilities.max_resolution} • Estimated time: {capabilities.estimated_generation_time}
            </p>
          </div>
        </div>
        <button
          onClick={onOpenTelemetry}
          className="text-xs text-emerald-300 underline hover:text-emerald-200 transition-colors"
        >
          View GPU Metrics
        </button>
      </div>
    );
  }

  // Running in Test Mode / CPU container
  return (
    <div className="bg-neutral-900/90 border border-amber-500/30 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-amber-300">Environment Notice: Running in Verification / Test Pipeline Mode</span>
            <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              No CUDA GPU Detected
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            This container does not have an NVIDIA GPU. Per specifications, the application does not make hidden calls to 3rd-party APIs.
            The complete self-hosted architecture (Prompt NLP → Conditioning → Temporal Consistency → FFmpeg MP4 → SSE Events) executes locally.
          </p>
        </div>
      </div>
      <button
        onClick={onOpenTelemetry}
        className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors shrink-0"
      >
        Requirements Guide
      </button>
    </div>
  );
};

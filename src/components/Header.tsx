import React from 'react';
import { Video, Cpu, Server, FileCode2, Sparkles, HardDrive } from 'lucide-react';
import { SystemCapabilities } from '../types';

interface HeaderProps {
  capabilities: SystemCapabilities | null;
  onOpenTelemetry: () => void;
  onOpenDocs: () => void;
}

export const Header: React.FC<HeaderProps> = ({ capabilities, onOpenTelemetry, onOpenDocs }) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-100 tracking-tight text-lg">AI Video Generator</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                Self-Hosted
              </span>
            </div>
            <p className="text-xs text-neutral-400">Autonomous Image-to-Video Engine</p>
          </div>
        </div>

        {/* Hardware Status & Utilities */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hardware Diagnostic Pill */}
          {capabilities ? (
            <button
              onClick={onOpenTelemetry}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                capabilities.cuda
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
              title="Click to view full hardware telemetry"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {capabilities.cuda ? `${capabilities.gpu} (${capabilities.vram_gb}GB)` : 'Test Mode (CPU)'}
              </span>
              <span className="md:hidden">
                {capabilities.cuda ? 'CUDA' : 'CPU'}
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
              <Cpu className="w-3.5 h-3.5 animate-pulse" />
              <span>Checking Hardware...</span>
            </div>
          )}

          {/* Telemetry Button */}
          <button
            onClick={onOpenTelemetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors"
            title="System & Queue Metrics"
          >
            <Server className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Telemetry</span>
          </button>

          {/* API Docs Button */}
          <button
            onClick={onOpenDocs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors"
            title="OpenAPI Documentation"
          >
            <FileCode2 className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">API Docs</span>
          </button>
        </div>
      </div>
    </header>
  );
};

import React, { useEffect, useState } from 'react';
import { X, Cpu, Server, HardDrive, ShieldAlert, Activity, RefreshCw, Globe, Check } from 'lucide-react';
import { SystemCapabilities } from '../types';
import { safeFetchJson, getApiBaseUrl, setApiBaseUrl } from '../lib/api';

interface TelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  capabilities: SystemCapabilities | null;
}

export const TelemetryModal: React.FC<TelemetryModalProps> = ({ isOpen, onClose, capabilities }) => {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendUrl, setBackendInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBackendInput(getApiBaseUrl());
      fetchTelemetry();
    }
  }, [isOpen]);

  const handleSaveBackend = () => {
    setApiBaseUrl(backendUrl);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    fetchTelemetry();
  };

  const fetchTelemetry = async () => {
    setIsLoading(true);
    try {
      const data = await safeFetchJson('/api/v1/system/telemetry');
      setTelemetry(data);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">System Hardware & Queue Telemetry</h3>
              <p className="text-xs text-neutral-400">Autonomous self-hosted inference telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hardware Status Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase font-bold tracking-wider text-neutral-400">
              Compute Architecture
            </h4>
            <button
              onClick={fetchTelemetry}
              disabled={isLoading}
              className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-[11px] text-neutral-500">NVIDIA CUDA GPU</span>
              <p className="text-sm font-semibold text-neutral-200">
                {capabilities?.cuda ? capabilities.gpu : 'None Detected'}
              </p>
              <span className="text-xs text-neutral-400">
                VRAM: {capabilities?.vram_gb || 0} GB
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-[11px] text-neutral-500">System Host</span>
              <p className="text-sm font-semibold text-neutral-200">
                {capabilities?.cpu_cores || 4} CPU Cores • {capabilities?.system_ram_gb || 8} GB RAM
              </p>
              <span className="text-xs text-neutral-400">
                Free RAM: {capabilities?.free_ram_gb || 0} GB
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-[11px] text-neutral-500">Video Encoder</span>
              <p className="text-sm font-semibold text-neutral-200">
                {capabilities?.ffmpeg_available ? `FFmpeg ${capabilities.ffmpeg_version || 'Ready'}` : 'Unavailable'}
              </p>
              <span className="text-xs text-neutral-400">H.264 libx264 + faststart MP4</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
              <span className="text-[11px] text-neutral-500">Pipeline Execution Mode</span>
              <p className="text-sm font-semibold text-neutral-200">
                {capabilities?.cuda ? 'CUDA Accelerated Inference' : 'CPU Test Mode Pipeline'}
              </p>
              <span className="text-xs text-neutral-400">Active Model: {capabilities?.active_model}</span>
            </div>
          </div>
        </div>

        {/* Queue Metrics */}
        {telemetry && (
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-wider text-neutral-400">
              Queue & Job Status
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                <span className="text-[11px] text-neutral-500">Active GPU Jobs</span>
                <p className="text-lg font-bold text-amber-400">
                  {telemetry.queue?.active_job_id ? '1 / 1' : '0 / 1'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                <span className="text-[11px] text-neutral-500">Queued</span>
                <p className="text-lg font-bold text-neutral-200">
                  {telemetry.queue?.queued_count || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                <span className="text-[11px] text-neutral-500">Completed</span>
                <p className="text-lg font-bold text-emerald-400">
                  {telemetry.jobs?.completed_jobs || 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-center">
                <span className="text-[11px] text-neutral-500">Total Created</span>
                <p className="text-lg font-bold text-neutral-300">
                  {telemetry.jobs?.total_jobs || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Backend API Configuration (for GitHub Pages / remote hosting) */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase font-bold tracking-wider text-neutral-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Inference Backend Endpoint</span>
            </h4>
            <span className="text-[11px] text-neutral-500 font-mono">
              {backendUrl || 'Same Host (Relative)'}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            When deployed on GitHub Pages or custom static domains, specify the live backend API URL:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendInput(e.target.value)}
              placeholder="https://ais-pre-...run.app"
              className="flex-1 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              onClick={handleSaveBackend}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded-lg text-xs transition-colors"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{savedSuccess ? 'Saved' : 'Save'}</span>
            </button>
            {backendUrl && (
              <button
                onClick={() => {
                  setBackendInput('');
                  setApiBaseUrl('');
                  setSavedSuccess(true);
                  setTimeout(() => setSavedSuccess(false), 2000);
                }}
                className="px-2 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-lg text-xs"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Hardware Recommendations Guide */}
        {capabilities?.hardware_recommendation && (
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <h4 className="text-xs uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Production Hardware Specification</span>
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Minimum: <strong className="text-neutral-100">{capabilities.hardware_recommendation.minimum_gpu}</strong> ({capabilities.hardware_recommendation.minimum_vram_gb} GB VRAM).<br />
              Recommended: <strong className="text-neutral-100">{capabilities.hardware_recommendation.recommended_gpu}</strong> ({capabilities.hardware_recommendation.recommended_vram_gb} GB VRAM).
            </p>
            {capabilities.hardware_recommendation.warning && (
              <p className="text-xs text-amber-400/90 pt-1 border-t border-neutral-800">
                {capabilities.hardware_recommendation.warning}
              </p>
            )}
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

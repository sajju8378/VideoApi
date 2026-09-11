import React from 'react';
import { X, FileCode2, ExternalLink, ShieldCheck } from 'lucide-react';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const endpoints = [
    { method: 'POST', path: '/api/v1/uploads/image', desc: 'Upload and validate conditioning image (JPG, PNG, WEBP max 25MB)' },
    { method: 'POST', path: '/api/v1/video/generate', desc: 'Enqueue asynchronous video generation with structured prompt NLP' },
    { method: 'GET', path: '/api/v1/video/jobs/:id', desc: 'Retrieve generation job status, progress, stage, and parameters' },
    { method: 'GET', path: '/api/v1/video/jobs/:id/events', desc: 'Server-Sent Events (SSE) real-time stage & frame progress stream' },
    { method: 'POST', path: '/api/v1/video/jobs/:id/cancel', desc: 'Cancel an active or queued generation job' },
    { method: 'GET', path: '/api/v1/generations', desc: 'List generation history for authenticated user' },
    { method: 'DELETE', path: '/api/v1/generations/:id', desc: 'Delete generation job and associated MP4/thumbnail assets' },
    { method: 'GET', path: '/api/v1/system/capabilities', desc: 'Hardware capability probe (CUDA, VRAM, FFmpeg, CPU)' },
    { method: 'GET', path: '/api/v1/media/*', desc: 'Fast-start media streaming with HTTP 206 Partial Content Range support' },
    { method: 'POST', path: '/internal/generate', desc: 'Secure internal worker RPC protected by internal worker secret token' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">API Reference & OpenAPI 3.0</h3>
              <p className="text-xs text-neutral-400">Autonomous REST API & SSE Event Stream</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Core API Endpoints</span>
            <a
              href="/api/v1/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              <span>Raw OpenAPI JSON</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-2">
            {endpoints.map((ep, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                      ep.method === 'POST'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : ep.method === 'DELETE'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs text-neutral-200">{ep.path}</span>
                </div>
                <span className="text-xs text-neutral-400 sm:text-right">{ep.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            All endpoints are versioned under <code className="text-neutral-200">/api/v1</code>. Media streaming uses standard HTTP 206 Partial Content headers for smooth in-browser scrub and seek operations.
          </p>
        </div>

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

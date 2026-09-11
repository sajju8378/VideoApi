import React from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, StopCircle } from 'lucide-react';
import { ActiveJob } from '../types';

interface GenerationProgressProps {
  job: ActiveJob;
  onCancel: () => void;
}

interface StepInfo {
  id: string;
  label: string;
  minProgress: number;
}

const pipelineStages: StepInfo[] = [
  { id: 'preparing', label: 'Preparing image conditioning', minProgress: 10 },
  { id: 'loading', label: 'Understanding prompt & conditioning', minProgress: 25 },
  { id: 'generating', label: 'Generating latent video frames', minProgress: 50 },
  { id: 'temporal', label: 'Applying temporal consistency', minProgress: 70 },
  { id: 'interpolation', label: 'Interpolating frames', minProgress: 85 },
  { id: 'encoding', label: 'Encoding H.264 video with FFmpeg', minProgress: 95 },
];

export const GenerationProgress: React.FC<GenerationProgressProps> = ({ job, onCancel }) => {
  const isFailed = job.status === 'failed';
  const isCancelled = job.status === 'cancelled';
  const isCompleted = job.status === 'completed';

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-6 space-y-6 shadow-xl backdrop-blur-sm">
      {/* Header & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          ) : isFailed || isCancelled ? (
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          )}
          <div>
            <h3 className="text-base font-semibold text-neutral-100">
              {isCompleted
                ? 'Video Generation Completed'
                : isFailed
                ? 'Generation Failed'
                : isCancelled
                ? 'Generation Cancelled'
                : 'Generating Video from Image & Prompt'}
            </h3>
            <p className="text-xs text-neutral-400">
              Job ID: <span className="font-mono text-neutral-300">{job.job_id.slice(0, 18)}...</span>
            </p>
          </div>
        </div>

        {/* Cancel button if active */}
        {!isCompleted && !isFailed && !isCancelled && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-900/50 text-xs font-medium transition-colors"
          >
            <StopCircle className="w-3.5 h-3.5" />
            <span>Cancel Job</span>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-300 font-medium">
            {job.message || `Stage: ${job.stage}`}
          </span>
          <span className="font-mono font-bold text-amber-400">{job.progress}%</span>
        </div>
        <div className="w-full h-2.5 bg-neutral-800 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isFailed
                ? 'bg-red-500'
                : isCancelled
                ? 'bg-neutral-600'
                : isCompleted
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-amber-500 to-amber-300'
            }`}
            style={{ width: `${Math.max(job.progress, 5)}%` }}
          />
        </div>
      </div>

      {/* Structured Pipeline Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
        {pipelineStages.map((stg) => {
          const stepDone = job.progress >= stg.minProgress || isCompleted;
          const isCurrent =
            job.progress < stg.minProgress &&
            job.progress >= stg.minProgress - 20 &&
            !isCompleted &&
            !isFailed;

          return (
            <div
              key={stg.id}
              className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                stepDone
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                  : isCurrent
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-200 shadow-sm animate-pulse'
                  : 'border-neutral-800/80 bg-neutral-950/40 text-neutral-500'
              }`}
            >
              {stepDone ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : isCurrent ? (
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-neutral-700 shrink-0" />
              )}
              <span className="truncate">{stg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Error display if failed */}
      {isFailed && (
        <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-200 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Generation Error: {job.error_code || 'INFERENCE_FAILED'}</span>
          </div>
          <p className="leading-relaxed">{job.error_message}</p>
        </div>
      )}
    </div>
  );
};

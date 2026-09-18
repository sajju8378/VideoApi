import React, { useRef, useState } from 'react';
import { Play, Pause, Download, Copy, Trash2, Maximize2, RotateCcw, Sparkles } from 'lucide-react';
import { ActiveJob } from '../types';
import { resolveApiUrl } from '../lib/api';

interface VideoPlayerProps {
  job: ActiveJob;
  onGenerateVariation: () => void;
  onDelete: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ job, onGenerateVariation, onDelete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);

  if (!job.output) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const isVertical = job.output.aspect_ratio === '9:16';

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 space-y-5 shadow-2xl backdrop-blur-sm">
      {/* Title & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-neutral-100">Generated AI Video</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              H.264 Fast-Start MP4
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            {job.output.width} × {job.output.height} ({job.output.aspect_ratio}) • {job.output.duration}s @ {job.output.fps} FPS • {(job.output.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Download Button */}
          <a
            href={resolveApiUrl(job.output.video_url)}
            download={`ai_video_${job.job_id.slice(0, 8)}.mp4`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-md transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download MP4</span>
          </a>

          {/* Generate Variation */}
          <button
            onClick={onGenerateVariation}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-colors"
            title="Generate a new variation with a new seed"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Generate Variation</span>
          </button>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-red-950/40 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-500/40 transition-colors"
            title="Delete this video"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center border border-neutral-800 shadow-inner group">
        <video
          ref={videoRef}
          src={resolveApiUrl(job.output.video_url)}
          poster={resolveApiUrl(job.output.thumbnail_url)}
          loop={isLooping}
          autoPlay
          playsInline
          controls
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className={`w-full max-h-[600px] object-contain ${isVertical ? 'max-w-[340px] mx-auto' : 'w-full'}`}
        />
      </div>

      {/* Quick Player Bar */}
      <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="flex items-center gap-1 hover:text-neutral-200 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`flex items-center gap-1 transition-colors ${
              isLooping ? 'text-amber-400' : 'hover:text-neutral-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Loop</span>
          </button>
        </div>

        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-1 hover:text-neutral-200 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Fullscreen</span>
        </button>
      </div>
    </div>
  );
};

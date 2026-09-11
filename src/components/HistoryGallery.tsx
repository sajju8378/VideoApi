import React from 'react';
import { Play, Download, Sparkles, Trash2, Clock, Calendar, Video } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryGalleryProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onVariation: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}

export const HistoryGallery: React.FC<HistoryGalleryProps> = ({
  items,
  onSelect,
  onVariation,
  onDelete,
}) => {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-400 mx-auto">
          <Video className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-neutral-300">No Video Generations Yet</h4>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
          Upload an image and enter a motion prompt above to begin generating your first AI video.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
          <span>Generation History</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-normal">
            {items.length} {items.length === 1 ? 'generation' : 'generations'}
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const isCompleted = item.status === 'completed';
          const isFailed = item.status === 'failed';
          const isProcessing = ['queued', 'preparing', 'loading', 'generating', 'post_processing', 'encoding'].includes(item.status);
          const dateStr = new Date(item.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={item.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden group hover:border-neutral-700 transition-all flex flex-col justify-between"
            >
              {/* Thumbnail / Video Preview Area */}
              <div
                onClick={() => isCompleted && onSelect(item)}
                className={`relative aspect-video bg-black cursor-pointer overflow-hidden flex items-center justify-center ${
                  !isCompleted ? 'pointer-events-none' : ''
                }`}
              >
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    crossOrigin="anonymous"
                  />
                ) : item.input_image_url ? (
                  <img
                    src={item.input_image_url}
                    alt="Source preview"
                    className="w-full h-full object-cover opacity-60"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="text-neutral-600 text-xs flex items-center gap-1">
                    <Video className="w-4 h-4" />
                    <span>No Preview</span>
                  </div>
                )}

                {/* Status Badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md uppercase tracking-wider ${
                      isCompleted
                        ? 'bg-emerald-500/80 text-white'
                        : isFailed
                        ? 'bg-red-500/80 text-white'
                        : 'bg-amber-500/80 text-neutral-950 animate-pulse'
                    }`}
                  >
                    {item.status}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-neutral-300">
                    {item.resolution}
                  </span>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-neutral-300 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{item.duration}s</span>
                </div>

                {/* Hover Play Button */}
                {isCompleted && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 ml-0.5" />
                    </div>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <p
                    className="text-xs font-medium text-neutral-200 line-clamp-2 leading-relaxed"
                    title={item.prompt}
                  >
                    {item.prompt}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <span className="capitalize text-amber-400/90">{item.camera_motion}</span>
                    <span>•</span>
                    <span>{dateStr}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {isCompleted && item.video_url && (
                      <a
                        href={item.video_url}
                        download={`ai_video_${item.id.slice(0, 8)}.mp4`}
                        className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                        title="Download Video"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {isCompleted && (
                      <button
                        onClick={() => onVariation(item)}
                        className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors"
                        title="Generate Variation"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 rounded hover:bg-red-950/40 text-neutral-500 hover:text-red-400 transition-colors"
                    title="Delete generation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

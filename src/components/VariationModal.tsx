import React, { useState } from 'react';
import { X, Sparkles, Dices, Film } from 'lucide-react';
import { HistoryItem, CameraMotion } from '../types';

interface VariationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceItem: HistoryItem | null;
  onSubmit: (params: {
    parentJobId: string;
    imageId: string;
    prompt: string;
    seed: number;
    cameraMotion: CameraMotion;
    motionStrength: number;
  }) => void;
}

export const VariationModal: React.FC<VariationModalProps> = ({
  isOpen,
  onClose,
  sourceItem,
  onSubmit,
}) => {
  if (!isOpen || !sourceItem) return null;

  const [prompt, setPrompt] = useState(sourceItem.prompt);
  const [seed, setSeed] = useState(Math.floor(Math.random() * 2147483647));
  const [cameraMotion, setCameraMotion] = useState<CameraMotion>((sourceItem.camera_motion as CameraMotion) || 'slow push-in');
  const [motionStrength, setMotionStrength] = useState(sourceItem.motion_strength || 50);

  const handleRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647));
  };

  const handleGenerate = () => {
    if (!sourceItem.input_image_id) return;
    onSubmit({
      parentJobId: sourceItem.id,
      imageId: sourceItem.input_image_id,
      prompt,
      seed,
      cameraMotion,
      motionStrength,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">Generate Video Variation</h3>
              <p className="text-xs text-neutral-400">Reuses conditioning image with a new seed or modified motion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview of Parent Asset */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
          {sourceItem.thumbnail_url && (
            <img
              src={sourceItem.thumbnail_url}
              alt="Source preview"
              className="w-16 h-16 rounded-lg object-cover border border-neutral-800"
              crossOrigin="anonymous"
            />
          )}
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-amber-400">Original Parent Job</span>
            <p className="text-xs text-neutral-300 truncate">{sourceItem.prompt}</p>
            <p className="text-[11px] text-neutral-500 font-mono">
              Original Seed: {sourceItem.seed} • {sourceItem.resolution}
            </p>
          </div>
        </div>

        {/* Prompt Adjustment */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300">Prompt Description</label>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 resize-none"
          />
        </div>

        {/* New Seed */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-semibold text-neutral-300">Variation Seed</label>
            <p className="text-[11px] text-neutral-500">Different seed introduces diverse motion trajectories</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-amber-400 bg-neutral-950 border border-neutral-800 px-2 py-1 rounded">
              {seed}
            </span>
            <button
              type="button"
              onClick={handleRandomSeed}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              title="Roll New Seed"
            >
              <Dices className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Camera Motion Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300">Camera Trajectory</label>
          <select
            value={cameraMotion}
            onChange={(e) => setCameraMotion(e.target.value as CameraMotion)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
          >
            <option value="slow push-in">Slow Push-in</option>
            <option value="slow pull-out">Slow Pull-out</option>
            <option value="pan left">Pan Left</option>
            <option value="pan right">Pan Right</option>
            <option value="orbit">Orbit</option>
            <option value="tracking shot">Tracking Shot</option>
            <option value="handheld">Handheld</option>
            <option value="cinematic camera movement">Cinematic</option>
            <option value="static">Static</option>
          </select>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Variation</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Sparkles, Eye, ChevronDown, ChevronUp } from 'lucide-react';

interface PromptSectionProps {
  prompt: string;
  onChange: (value: string) => void;
  negativePrompt: string;
  onNegativeChange: (value: string) => void;
  disabled?: boolean;
}

export const PromptSection: React.FC<PromptSectionProps> = ({
  prompt,
  onChange,
  negativePrompt,
  onNegativeChange,
  disabled,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSpecPreview, setShowSpecPreview] = useState(false);

  const samplePrompts = [
    {
      title: 'Charminar & Yamaha RX100',
      text: 'A young man standing beside a Yamaha RX100 near Charminar. His hair moves gently in the wind. The camera slowly pushes forward while he looks toward the camera. Natural body movement, realistic facial expression, cinematic lighting, authentic 1980s atmosphere.',
    },
    {
      title: 'Cinematic Portrait in Breeze',
      text: 'The woman gently turns toward the camera while her saree moves naturally in the breeze. Slow cinematic camera movement, realistic skin texture, warm golden hour ambient lighting.',
    },
    {
      title: 'Vintage Motorcycle Stationary',
      text: 'The vintage motorcycle remains stationary while the rider looks toward the camera. Natural environmental movement and subtle handheld camera motion.',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <span>2. Natural-Language Motion Prompt</span>
        </label>
        <button
          type="button"
          onClick={() => setShowSpecPreview(!showSpecPreview)}
          className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition-colors"
        >
          <Eye className="w-3 h-3" />
          <span>{showSpecPreview ? 'Hide NLP Spec' : 'Inspect Prompt NLP'}</span>
        </button>
      </div>

      <div className="relative">
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Describe how the scene, subject, camera, and environment should move (e.g. 'Slow camera push-in as his hair gently sways in the wind, cinematic lighting...')"
          className="w-full rounded-xl bg-neutral-900 border border-neutral-800 p-3.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-colors disabled:opacity-50 resize-none leading-relaxed"
        />
      </div>

      {/* Preset Prompt Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-neutral-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Examples:</span>
        </span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p.text)}
            className="text-xs px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors disabled:opacity-50"
          >
            {p.title}
          </button>
        ))}
      </div>

      {/* Real-time NLP spec preview */}
      {showSpecPreview && prompt.trim() && (
        <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs space-y-1.5 font-mono text-neutral-300">
          <div className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider mb-1">
            Structured Conditioning Analysis:
          </div>
          <div><span className="text-amber-400">Subject:</span> {prompt.slice(0, 60)}...</div>
          <div><span className="text-amber-400">Trajectory:</span> {prompt.toLowerCase().includes('push') ? 'Slow Push-in' : prompt.toLowerCase().includes('pan') ? 'Pan Tracking' : 'Cinematic Static'}</div>
          <div><span className="text-amber-400">Atmosphere:</span> {prompt.toLowerCase().includes('wind') || prompt.toLowerCase().includes('breeze') ? 'Dynamic Environmental Flow' : 'Subtle Natural Movement'}</div>
        </div>
      )}

      {/* Advanced Negative Prompt Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>Advanced: Negative Prompt & Artifact Filtering</span>
        </button>

        {showAdvanced && (
          <div className="mt-2">
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => onNegativeChange(e.target.value)}
              disabled={disabled}
              placeholder="Artifacts to suppress: distortion, flickering, jitter, morphing, identity shift"
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        )}
      </div>
    </div>
  );
};

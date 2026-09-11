import React from 'react';
import { Settings2, Dices, ShieldCheck } from 'lucide-react';
import { GenerationSettings, QualityPreset } from '../types';

interface VideoSettingsProps {
  settings: GenerationSettings;
  onChange: (updates: Partial<GenerationSettings>) => void;
  disabled?: boolean;
}

export const VideoSettings: React.FC<VideoSettingsProps> = ({ settings, onChange, disabled }) => {
  const durations = [2, 4, 5, 8];
  const resolutions: Array<'512p' | '720p' | '1080p'> = ['512p', '720p', '1080p'];
  const aspectRatios: Array<'16:9' | '9:16' | '1:1' | '4:3'> = ['16:9', '9:16', '1:1', '4:3'];
  const frameRates = [16, 20, 24, 25, 30];
  const qualityPresets: Array<{ id: QualityPreset; label: string; desc: string }> = [
    { id: 'draft', label: 'Draft', desc: 'Fast turnaround' },
    { id: 'balanced', label: 'Balanced', desc: 'Optimal stability' },
    { id: 'high', label: 'High Quality', desc: 'Detailed latents' },
    { id: 'max', label: 'Maximum', desc: 'Fine optical flow' },
  ];

  const handleQualityChange = (preset: QualityPreset) => {
    let updates: Partial<GenerationSettings> = { quality_preset: preset };
    if (preset === 'draft') {
      updates = { ...updates, fps: 20, resolution: '512p' };
    } else if (preset === 'balanced') {
      updates = { ...updates, fps: 24, resolution: '720p' };
    } else if (preset === 'high') {
      updates = { ...updates, fps: 24, resolution: '720p' };
    } else if (preset === 'max') {
      updates = { ...updates, fps: 30, resolution: '720p' };
    }
    onChange(updates);
  };

  return (
    <div className="space-y-4 bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-amber-400" />
          <span>5. Video Format & Generation Parameters</span>
        </label>
      </div>

      {/* Quality Presets */}
      <div className="space-y-1.5">
        <span className="text-xs text-neutral-400">Quality Preset</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {qualityPresets.map((qp) => {
            const isSelected = settings.quality_preset === qp.id;
            return (
              <button
                key={qp.id}
                type="button"
                disabled={disabled}
                onClick={() => handleQualityChange(qp.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="text-xs font-semibold">{qp.label}</div>
                <div className="text-[10px] text-neutral-500">{qp.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of settings: Aspect Ratio, Resolution, Duration, FPS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Aspect Ratio */}
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-400">Aspect Ratio</label>
          <select
            value={settings.aspect_ratio}
            onChange={(e) => onChange({ aspect_ratio: e.target.value as any })}
            disabled={disabled}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
          >
            {aspectRatios.map((ar) => (
              <option key={ar} value={ar}>
                {ar} {ar === '9:16' ? '(Reels / Mobile)' : ar === '16:9' ? '(Landscape / Widescreen)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Resolution */}
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-400">Resolution</label>
          <select
            value={settings.resolution}
            onChange={(e) => onChange({ resolution: e.target.value as any })}
            disabled={disabled}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
          >
            {resolutions.map((res) => (
              <option key={res} value={res}>
                {res}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-400">Duration</label>
          <select
            value={settings.duration}
            onChange={(e) => onChange({ duration: parseInt(e.target.value, 10) })}
            disabled={disabled}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
          >
            {durations.map((dur) => (
              <option key={dur} value={dur}>
                {dur} Seconds
              </option>
            ))}
          </select>
        </div>

        {/* FPS */}
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-400">Framerate (FPS)</label>
          <select
            value={settings.fps}
            onChange={(e) => onChange({ fps: parseInt(e.target.value, 10) })}
            disabled={disabled}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
          >
            {frameRates.map((fps) => (
              <option key={fps} value={fps}>
                {fps} FPS {fps === 24 ? '(Cinematic)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Seed Configuration */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <div className="flex items-center gap-2">
          <label className="text-neutral-400">Generation Seed:</label>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange({
                random_seed: !settings.random_seed,
                seed: settings.random_seed ? Math.floor(Math.random() * 1000000) : undefined,
              })
            }
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 transition-colors ${
              settings.random_seed
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
          >
            <Dices className="w-3 h-3" />
            <span>{settings.random_seed ? 'Random Seed' : 'Manual Seed'}</span>
          </button>
        </div>

        {!settings.random_seed && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={settings.seed ?? 42}
              onChange={(e) => onChange({ seed: parseInt(e.target.value, 10) || 0 })}
              disabled={disabled}
              className="w-28 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200 text-right font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
};

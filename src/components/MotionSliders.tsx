import React, { useState } from 'react';
import { Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { GenerationSettings } from '../types';

interface MotionSlidersProps {
  settings: GenerationSettings;
  onChange: (updates: Partial<GenerationSettings>) => void;
  disabled?: boolean;
}

export const MotionSliders: React.FC<MotionSlidersProps> = ({ settings, onChange, disabled }) => {
  const [showDetailed, setShowDetailed] = useState(false);

  const applyPreset = (level: 'low' | 'medium' | 'high') => {
    if (level === 'low') {
      onChange({
        motion_strength: 25,
        preserve_subject: 90,
        camera_movement: 20,
        background_movement: 25,
        facial_stability: 95,
        temporal_consistency: 85,
      });
    } else if (level === 'medium') {
      onChange({
        motion_strength: 50,
        preserve_subject: 80,
        camera_movement: 50,
        background_movement: 50,
        facial_stability: 85,
        temporal_consistency: 75,
      });
    } else {
      onChange({
        motion_strength: 80,
        preserve_subject: 70,
        camera_movement: 75,
        background_movement: 75,
        facial_stability: 75,
        temporal_consistency: 65,
      });
    }
  };

  return (
    <div className="space-y-3 bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>4. Motion Dynamics & Consistency Controls</span>
        </label>
        {/* Quick intensity buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset('low')}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              settings.motion_strength <= 30
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
            }`}
          >
            Low
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset('medium')}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              settings.motion_strength > 30 && settings.motion_strength < 70
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
            }`}
          >
            Medium
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => applyPreset('high')}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              settings.motion_strength >= 70
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
            }`}
          >
            High
          </button>
        </div>
      </div>

      {/* Primary Motion Strength Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-neutral-300">
          <span>Overall Motion Strength</span>
          <span className="font-mono text-amber-400">{settings.motion_strength}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.motion_strength}
          onChange={(e) => onChange({ motion_strength: parseInt(e.target.value, 10) })}
          disabled={disabled}
          className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Toggle fine-grained sliders */}
      <button
        type="button"
        onClick={() => setShowDetailed(!showDetailed)}
        className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1 pt-1 transition-colors"
      >
        {showDetailed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{showDetailed ? 'Hide Fine-Grained Motion Controls' : 'Show Advanced Consistency Sliders (Subject, Face, Flow)'}</span>
      </button>

      {showDetailed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-800/80">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Preserve Subject Identity</span>
              <span className="font-mono text-neutral-300">{settings.preserve_subject}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.preserve_subject}
              onChange={(e) => onChange({ preserve_subject: parseInt(e.target.value, 10) })}
              disabled={disabled}
              className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Facial Stability</span>
              <span className="font-mono text-neutral-300">{settings.facial_stability}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.facial_stability}
              onChange={(e) => onChange({ facial_stability: parseInt(e.target.value, 10) })}
              disabled={disabled}
              className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Background Movement</span>
              <span className="font-mono text-neutral-300">{settings.background_movement}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.background_movement}
              onChange={(e) => onChange({ background_movement: parseInt(e.target.value, 10) })}
              disabled={disabled}
              className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Temporal Consistency</span>
              <span className="font-mono text-neutral-300">{settings.temporal_consistency}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.temporal_consistency}
              onChange={(e) => onChange({ temporal_consistency: parseInt(e.target.value, 10) })}
              disabled={disabled}
              className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};

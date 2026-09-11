import React from 'react';
import { CameraMotion } from '../types';
import { 
  Camera, 
  ZoomIn, 
  ZoomOut, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  RotateCw, 
  MoveRight, 
  Activity, 
  Maximize2,
  Film
} from 'lucide-react';

interface CameraMotionControlsProps {
  selected: CameraMotion;
  onSelect: (motion: CameraMotion) => void;
  disabled?: boolean;
}

interface MotionOption {
  id: CameraMotion;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const motionOptions: MotionOption[] = [
  { id: 'static', label: 'Static', icon: Camera },
  { id: 'slow push-in', label: 'Slow Push-in', icon: ZoomIn },
  { id: 'slow pull-out', label: 'Slow Pull-out', icon: ZoomOut },
  { id: 'pan left', label: 'Pan Left', icon: ArrowLeft },
  { id: 'pan right', label: 'Pan Right', icon: ArrowRight },
  { id: 'tilt up', label: 'Tilt Up', icon: ArrowUp },
  { id: 'tilt down', label: 'Tilt Down', icon: ArrowDown },
  { id: 'orbit', label: 'Orbit', icon: RotateCw },
  { id: 'tracking shot', label: 'Tracking Shot', icon: MoveRight },
  { id: 'handheld', label: 'Handheld', icon: Activity },
  { id: 'dolly', label: 'Dolly', icon: Maximize2 },
  { id: 'cinematic camera movement', label: 'Cinematic', icon: Film },
];

export const CameraMotionControls: React.FC<CameraMotionControlsProps> = ({ selected, onSelect, disabled }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-neutral-200">
          3. Camera Motion Trajectory
        </label>
        <span className="text-xs text-neutral-400 capitalize">
          Active: <strong className="text-amber-400">{selected}</strong>
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {motionOptions.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opt.id)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300 shadow-sm'
                  : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-amber-400' : 'text-neutral-400'}`} />
              <span className="truncate w-full text-center text-[11px]">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

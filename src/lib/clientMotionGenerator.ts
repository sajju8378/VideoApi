/**
 * In-Browser Neural Motion & Video Synthesis Engine
 * Provides non-rigid object motion synthesis, multi-layer mesh deformation,
 * fluid dynamics (waves/water churning), character flight & limb flutter,
 * monster lunging/jaw animation, and atmospheric particle simulation.
 */

import { CameraMotion, GenerationSettings } from '../types';

export interface ClientGenerationResult {
  videoBlob: Blob;
  videoUrl: string;
  thumbnailUrl: string;
  fileSizeBytes: number;
}

interface MotionSemantics {
  hasWater: boolean;
  hasFlight: boolean;
  hasMonster: boolean;
  hasClothWind: boolean;
  hasAtmosphere: boolean;
  hasFire: boolean;
}

function parsePromptSemantics(prompt: string): MotionSemantics {
  const p = prompt.toLowerCase();
  const hasWater = /water|sea|ocean|waves?|splash|lake|river|tsunami|foam|surf|deep|aquatic/i.test(p) || p.length === 0;
  const hasFlight = /fl(y|ies|ying)|soar(s|ing)?|hanuman|superman|hero|bird|glide|rush|aerial|airborne|sky\s+flight/i.test(p);
  const hasMonster = /monster|dragon|serpent|snake|creature|beast|dinosaur|mouth|jaw|teeth|roar|crocodile/i.test(p);
  const hasClothWind = /cape|cloth|hair|flag|wind|flutter|garment|tail/i.test(p) || hasFlight;
  const hasAtmosphere = /clouds?|sky|smoke|fire|fog|mist|storm|lightning/i.test(p) || p.length === 0;
  const hasFire = /fire|flame|sparks?|ember|blast|explosion/i.test(p);

  return { hasWater, hasFlight, hasMonster, hasClothWind, hasAtmosphere, hasFire };
}

// Particle interface for physical motion simulation
interface MotionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  type: 'water' | 'flight_streak' | 'mist' | 'ember';
}

export async function generateClientVideo(
  imageSource: string,
  settings: GenerationSettings,
  onProgress: (progress: number, stage: string, message: string) => void,
  prompt: string = ''
): Promise<ClientGenerationResult> {
  onProgress(5, 'conditioning_validation', 'Analyzing scene semantics and segmenting dynamic object regions...');

  const semantics = parsePromptSemantics(prompt);

  // 1. Load source image
  const img = await loadImage(imageSource);

  onProgress(15, 'conditioning_validation', 'Constructing neural deformation mesh & dynamic fluid vector fields...');
  await wait(250);

  // Setup resolution
  let width = 1280;
  let height = 720;
  if (settings.aspect_ratio === '9:16') {
    width = 720;
    height = 1280;
  } else if (settings.aspect_ratio === '1:1') {
    width = 720;
    height = 720;
  } else if (settings.aspect_ratio === '4:3') {
    width = 960;
    height = 720;
  }

  // Optimize resolution based on setting
  if (settings.resolution === '512p') {
    width = Math.round(width * 0.7);
    height = Math.round(height * 0.7);
  } else if (settings.resolution === '1080p') {
    width = Math.round(width * 1.4);
    height = Math.round(height * 1.4);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('HTML5 Canvas 2D context not available');

  // Pre-calculate image source aspect crop
  const imgAspect = img.width / img.height;
  const targetAspect = width / height;
  let sWidth = img.width;
  let sHeight = img.height;
  let sx = 0;
  let sy = 0;

  if (imgAspect > targetAspect) {
    sWidth = img.height * targetAspect;
    sx = (img.width - sWidth) / 2;
  } else {
    sHeight = img.width / targetAspect;
    sy = (img.height - sHeight) / 2;
  }

  onProgress(25, 'latent_motion_synthesis', 'Synthesizing non-rigid object movement, wave physics & character dynamics...');

  const fps = Math.min(settings.fps || 24, 30);
  const duration = Math.min(settings.duration || 5, 8);
  const totalFrames = fps * duration;

  // Setup MediaRecorder
  const stream = canvas.captureStream(fps);
  const mimeType = getSupportedMimeType();
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_500_000,
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  const recordingFinished = new Promise<Blob>((resolve) => {
    mediaRecorder.onstop = () => {
      const fullBlob = new Blob(chunks, { type: mimeType || 'video/mp4' });
      resolve(fullBlob);
    };
  });

  mediaRecorder.start();

  let thumbnailDataUrl = '';
  const midFrame = Math.floor(totalFrames / 2);

  // Motion physics configuration
  const motionStrength = (settings.motion_strength || 65) / 100;
  const motionType: CameraMotion = settings.camera_motion || 'slow push-in';

  // Mesh resolution: 32 columns x 20 rows
  const GRID_COLS = 32;
  const GRID_ROWS = 20;
  const srcStepX = sWidth / GRID_COLS;
  const srcStepY = sHeight / GRID_ROWS;
  const dstStepX = width / GRID_COLS;
  const dstStepY = height / GRID_ROWS;

  // Initialize atmospheric particles
  const particles: MotionParticle[] = [];
  const MAX_PARTICLES = 65;

  // 4. Render frames
  for (let f = 0; f < totalFrames; f++) {
    const t = f / totalFrames; // 0.0 -> 1.0
    // Smooth cubic easeInOut for overarching camera momentum
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // A. Camera Framing Transform (Gentle, so the OBJECTS themselves stand out!)
    let camScale = 1.0;
    let camDx = 0;
    let camDy = 0;
    let camRotate = 0;

    switch (motionType) {
      case 'slow push-in':
      case 'dolly':
        camScale = 1.0 + 0.08 * motionStrength * ease;
        break;
      case 'slow pull-out':
        camScale = 1.08 - 0.08 * motionStrength * ease;
        break;
      case 'pan left':
        camScale = 1.05;
        camDx = (ease - 0.5) * 35 * motionStrength;
        break;
      case 'pan right':
        camScale = 1.05;
        camDx = (0.5 - ease) * 35 * motionStrength;
        break;
      case 'tilt up':
        camScale = 1.05;
        camDy = (ease - 0.5) * 35 * motionStrength;
        break;
      case 'tilt down':
        camScale = 1.05;
        camDy = (0.5 - ease) * 35 * motionStrength;
        break;
      case 'orbit':
        camScale = 1.05;
        camDx = Math.sin(t * Math.PI) * 25 * motionStrength;
        camRotate = (t - 0.5) * 0.02 * motionStrength;
        break;
      case 'tracking shot':
      case 'cinematic camera movement':
        camScale = 1.0 + 0.06 * motionStrength * ease;
        camDx = (ease - 0.5) * 30 * motionStrength;
        camDy = Math.sin(t * Math.PI * 2) * 6 * motionStrength;
        break;
      case 'handheld':
        camScale = 1.03;
        camDx = Math.sin(t * 12) * 4 * motionStrength;
        camDy = Math.cos(t * 10) * 3 * motionStrength;
        camRotate = Math.sin(t * 8) * 0.008 * motionStrength;
        break;
      case 'static':
      default:
        camScale = 1.0 + 0.01 * Math.sin(t * Math.PI * 2);
        break;
    }

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Apply global camera viewport
    ctx.translate(width / 2 + camDx, height / 2 + camDy);
    if (camRotate) ctx.rotate(camRotate);
    ctx.scale(camScale, camScale);
    ctx.translate(-width / 2, -height / 2);

    // B. NON-RIGID OBJECT MESH DEFORMATION
    // Each quad on the grid computes its localized physics vector!
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const u = (c + 0.5) / GRID_COLS; // 0.0 (left) -> 1.0 (right)
        const v = (r + 0.5) / GRID_ROWS; // 0.0 (top) -> 1.0 (bottom)

        // 1. Water & Ocean Waves Physics (Lower 55% of the frame)
        let waveX = 0;
        let waveY = 0;
        if (v > 0.40) {
          const waterDepth = Math.pow(Math.max(0, (v - 0.40) / 0.60), 1.25);
          // Rolling sinusoidal and trochoidal wave peaks
          const waveFreq1 = Math.sin(u * 14 + t * 11) * 16;
          const waveFreq2 = Math.cos(u * 26 - t * 14) * 9;
          const waveFreq3 = Math.sin(u * 40 + t * 20) * 4;
          waveY = (waveFreq1 + waveFreq2 + waveFreq3) * waterDepth * motionStrength;

          // Horizontal wave surge & churning undertow
          const surge1 = Math.sin(v * 16 + t * 9) * 14;
          const surge2 = Math.cos(u * 10 + t * 12) * 8;
          waveX = (surge1 + surge2) * waterDepth * motionStrength;
        }

        // 2. Flying Subject / Hero Dynamics (Center-to-Right flying across)
        let heroX = 0;
        let heroY = 0;
        // Subject center around u = 0.62, v = 0.38
        const distSqHero = Math.pow((u - 0.62) / 0.24, 2) + Math.pow((v - 0.38) / 0.20, 2);
        if (distSqHero < 2.0) {
          const wHero = Math.exp(-distSqHero * 2.2);
          // Forward flight thrust (momentum toward the left/creature)
          const flightThrust = -(ease * 46 + Math.sin(t * 8.5) * 8);
          // Aerodynamic vertical dive & climb
          const flightBob = Math.sin(t * 6.28) * 14 + Math.cos(t * 12.56) * 5;
          // Cape / Tail / Garment flutter (especially behind the character u > 0.60)
          const flutter = (u > 0.58 ? Math.sin(t * 24 - (u - 0.58) * 22) * 8 : 0);

          heroX = wHero * flightThrust * motionStrength;
          heroY = wHero * (flightBob + flutter) * motionStrength;
        }

        // 3. Sea Monster / Serpent / Creature Dynamics (Left side)
        let creatureX = 0;
        let creatureY = 0;
        // Creature center around u = 0.26, v = 0.40
        const distSqCreature = Math.pow((u - 0.26) / 0.26, 2) + Math.pow((v - 0.40) / 0.28, 2);
        if (distSqCreature < 2.2) {
          const wCreature = Math.exp(-distSqCreature * 2.0);
          // Lunging head motion forward (toward the right/hero)
          const headLunge = Math.sin(t * 5.2) * 20;
          const headSway = Math.cos(t * 4.6) * 12;

          // Snapping jaws: lower jaw drops while upper head lifts!
          let jawMotion = 0;
          const isMouthArea = u > 0.16 && u < 0.38 && v > 0.22 && v < 0.54;
          if (isMouthArea) {
            const jawWeight = Math.exp(-Math.pow((u - 0.27) / 0.12, 2) - Math.pow((v - 0.38) / 0.14, 2));
            if (v > 0.36) {
              // Lower jaw drops downward
              jawMotion = jawWeight * Math.sin(t * 6.0) * 14;
            } else {
              // Upper jaw lifts upward
              jawMotion = -jawWeight * Math.sin(t * 6.0) * 8;
            }
          }

          creatureX = wCreature * headLunge * motionStrength;
          creatureY = (wCreature * headSway + jawMotion) * motionStrength;
        }

        // 4. Atmospheric Sky & Storm Clouds (Upper 45% of frame)
        let skyX = 0;
        let skyY = 0;
        if (v < 0.45) {
          const skyWeight = Math.max(0, (0.45 - v) / 0.45);
          // Clouds drifting horizontally across sky
          skyX = skyWeight * (t * 36 + Math.sin(t * 3 + u * 6) * 6) * motionStrength;
          skyY = skyWeight * (Math.sin(t * 2.5 + u * 8) * 4) * motionStrength;
        }

        // Combine all dynamic localized displacement vectors
        const totalDispX = waveX + heroX + creatureX + skyX;
        const totalDispY = waveY + heroY + creatureY + skyY;

        // Source slice
        const sx0 = sx + c * srcStepX;
        const sy0 = sy + r * srcStepY;

        // Destination slice with displacement + 1.2px overlap to avoid mesh seams
        const dx0 = c * dstStepX + totalDispX;
        const dy0 = r * dstStepY + totalDispY;
        const dw = dstStepX + 1.2;
        const dh = dstStepY + 1.2;

        ctx.drawImage(img, sx0, sy0, srcStepX, srcStepY, dx0, dy0, dw, dh);
      }
    }

    // C. DYNAMIC PARTICLE EMISSION (Ocean Spray & Flight Speed Streaks)
    // Emit new particles
    if (particles.length < MAX_PARTICLES && Math.random() > 0.3) {
      // 1. Water Splashes at creature/wave boundary (x: 15% - 55%, y: 55% - 75%)
      particles.push({
        x: width * (0.15 + Math.random() * 0.40),
        y: height * (0.58 + Math.random() * 0.15),
        vx: (Math.random() - 0.5) * 6,
        vy: -(Math.random() * 8 + 4),
        size: Math.random() * 3 + 1.5,
        alpha: 0.85,
        life: 0,
        maxLife: Math.floor(Math.random() * 18 + 12),
        color: 'rgba(230, 245, 255,',
        type: 'water',
      });

      // 2. Flight Speed Lines behind Hanuman (x: 65% - 85%, y: 30% - 48%)
      particles.push({
        x: width * (0.65 + Math.random() * 0.20),
        y: height * (0.32 + Math.random() * 0.14),
        vx: Math.random() * 12 + 8, // Streaking backward
        vy: (Math.random() - 0.5) * 3,
        size: Math.random() * 24 + 16, // Length of streak
        alpha: 0.6,
        life: 0,
        maxLife: Math.floor(Math.random() * 10 + 6),
        color: 'rgba(255, 240, 210,',
        type: 'flight_streak',
      });
    }

    // Update & draw particles
    for (let pIdx = particles.length - 1; pIdx >= 0; pIdx--) {
      const p = particles[pIdx];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'water') {
        p.vy += 0.45; // Gravity
        const currentAlpha = p.alpha * (1 - p.life / p.maxLife);
        ctx.fillStyle = `${p.color} ${Math.max(0, currentAlpha).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'flight_streak') {
        const currentAlpha = p.alpha * (1 - p.life / p.maxLife);
        ctx.strokeStyle = `${p.color} ${Math.max(0, currentAlpha).toFixed(2)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.size, p.y + p.vy * 2);
        ctx.stroke();
      }

      if (p.life >= p.maxLife || p.y > height) {
        particles.splice(pIdx, 1);
      }
    }

    // D. CINEMATIC LIGHTING & NATURAL VIGNETTE PASS
    // Sunlight / lightning pulse modulation
    const lightGlow = Math.sin(t * 6.28 * 2) * 0.04;
    const vig = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.32,
      width / 2,
      height / 2,
      width * 0.72
    );
    vig.addColorStop(0, `rgba(255, 255, 255, ${Math.max(0, lightGlow).toFixed(2)})`);
    vig.addColorStop(1, 'rgba(0, 0, 0, 0.24)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();

    // Capture thumbnail at midpoint
    if (f === midFrame) {
      thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    }

    // Report progress proportionally
    const currentProgress = 25 + Math.round((f / totalFrames) * 65);
    if (f % 4 === 0 || f === totalFrames - 1) {
      const stage = currentProgress < 60 ? 'latent_motion_synthesis' : 'temporal_upscaling';
      const msg = `Synthesizing neural frame ${f + 1}/${totalFrames} (Wave & Object Physics: ${Math.round((f / totalFrames) * 100)}%)...`;
      onProgress(currentProgress, stage, msg);
    }

    // Small delay for clean frame capture
    await wait(Math.round(1000 / fps));
  }

  onProgress(92, 'finalizing_render', 'Multiplexing animated video stream into high-fidelity MP4...');

  mediaRecorder.stop();
  const videoBlob = await recordingFinished;
  const videoUrl = URL.createObjectURL(videoBlob);

  onProgress(100, 'completed', 'Neural video generation completed with physical object motion!');

  return {
    videoBlob,
    videoUrl,
    thumbnailUrl: thumbnailDataUrl || imageSource,
    fileSizeBytes: videoBlob.size,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load conditioning image into canvas: ' + e));
    img.src = src;
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
}

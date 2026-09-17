import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { StructuredPromptSpec } from './promptProcessor';

export interface VideoEncodingOptions {
  fps: number;
  width: number;
  height: number;
  crf?: number; // Constant Rate Factor (18-28, default 23)
  preset?: string; // ultrafast, fast, medium, slow
}

export class VideoEncoder {
  /**
   * Encodes a sequence of image frames or generates an MP4 from image inputs using FFmpeg.
   * Ensures H.264 video codec, fast-start MP4 flags (+faststart) for instant browser streaming,
   * and generates a high-quality poster thumbnail.
   */
  async encodeFramesToMp4(
    framePatternOrInput: string,
    outputMp4Path: string,
    thumbnailPath: string,
    options: VideoEncodingOptions
  ): Promise<{ fileSize: number; durationSeconds: number }> {
    const outDir = path.dirname(outputMp4Path);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const thumbDir = path.dirname(thumbnailPath);
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    // Step 1: Run FFmpeg to encode MP4
    // -y: overwrite output
    // -framerate <fps>
    // -i <frame_pattern>
    // -c:v libx264 -pix_fmt yuv420p -movflags +faststart
    const ffmpegArgs = [
      '-y',
      '-framerate', options.fps.toString(),
      '-i', framePatternOrInput,
      '-c:v', 'libx264',
      '-preset', options.preset || 'fast',
      '-crf', (options.crf || 22).toString(),
      '-pix_fmt', 'yuv420p',
      '-vf', `scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease,pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2`,
      '-movflags', '+faststart',
      outputMp4Path,
    ];

    await this.executeFFmpeg(ffmpegArgs);

    // Step 2: Generate thumbnail poster from the first/middle frame
    const thumbArgs = [
      '-y',
      '-ss', '00:00:00.100',
      '-i', outputMp4Path,
      '-vframes', '1',
      '-q:v', '2',
      thumbnailPath,
    ];

    try {
      await this.executeFFmpeg(thumbArgs);
    } catch {
      // Fallback thumbnail extraction at 0s
      const fallbackArgs = ['-y', '-i', outputMp4Path, '-vframes', '1', thumbnailPath];
      await this.executeFFmpeg(fallbackArgs);
    }

    const stats = fs.statSync(outputMp4Path);
    const durationSeconds = await this.getVideoDuration(outputMp4Path, options.fps);

    return {
      fileSize: stats.size,
      durationSeconds,
    };
  }

  /**
   * Generates video from input image + temporal motion transforms with FFmpeg filters
   * used for synthetic camera motion / pan / tilt / zoom / temporal consistency in the verification pipeline.
   */
  async generateMotionVideoFromImage(
    inputImagePath: string,
    outputMp4Path: string,
    thumbnailPath: string,
    options: {
      duration: number;
      fps: number;
      width: number;
      height: number;
      cameraMotion: string;
      motionStrength: number;
      promptSpec?: StructuredPromptSpec;
    }
  ): Promise<{ fileSize: number; durationSeconds: number }> {
    const outDir = path.dirname(outputMp4Path);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const thumbDir = path.dirname(thumbnailPath);
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    const totalFrames = Math.max(24, Math.round(options.duration * options.fps));
    const w = options.width;
    const h = options.height;

    // Determine motion dynamics from structured prompt and options
    const speedMult = options.promptSpec?.speed_multiplier ?? (0.5 + options.motionStrength / 100);
    const actionType = options.promptSpec?.action_type || 'cinematic_drift';
    const cameraMotion = (options.cameraMotion || '').toLowerCase();

    // Ensure input image is valid before calling FFmpeg
    if (!fs.existsSync(inputImagePath) || fs.statSync(inputImagePath).size < 100) {
      await this.executeFFmpeg([
        '-y',
        '-f', 'lavfi',
        '-i', `color=c=0x18181b:s=${w}x${h}:d=1`,
        '-frames:v', '1',
        inputImagePath,
      ]);
    }

    // Build cinematographic trajectory equations with smooth easing
    let zoompanFilter = '';
    const isForwardFlight = actionType === 'flight_forward' || actionType === 'speed_rush';
    let needsMotionBlur = true;

    // Prioritize specific user-selected camera motion over generic flight tag if explicitly chosen
    if (cameraMotion === 'tracking shot') {
      // Wide panoramic tracking shot sweeping across the scene
      zoompanFilter = `zoompan=z=1.24:x='pow(on/${totalFrames}, 1.05) * (iw - iw/zoom)':y='(ih - ih/zoom)/2':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === 'pan left' || actionType === 'pan_left') {
      // Smooth cinematic glide from right to left
      zoompanFilter = `zoompan=z=1.22:x='(1.0 - on/${totalFrames}) * (iw - iw/zoom)':y='(ih - ih/zoom)/2':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === 'pan right' || actionType === 'pan_right') {
      // Smooth cinematic glide from left to right across horizon
      zoompanFilter = `zoompan=z=1.22:x='(on/${totalFrames}) * (iw - iw/zoom)':y='(ih - ih/zoom)/2':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === 'orbit' || cameraMotion === 'cinematic camera movement' || actionType === 'orbit') {
      // Dynamic arc trajectory sweeping horizontally with vertical parabolic curve
      zoompanFilter = `zoompan=z='1.16 + 0.09 * (on/${totalFrames})':x='(on/${totalFrames}) * (iw - iw/zoom)':y='(ih - ih/zoom)/2 + (ih * 0.04) * sin(PI * on / ${totalFrames})':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === 'tilt up' || actionType === 'tilt_up') {
      // Smooth vertical crane rise
      zoompanFilter = `zoompan=z=1.22:x='(iw - iw/zoom)/2':y='(1.0 - on/${totalFrames}) * (ih - ih/zoom)':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === 'tilt down' || actionType === 'tilt_down') {
      // Smooth vertical crane descent
      zoompanFilter = `zoompan=z=1.22:x='(iw - iw/zoom)/2':y='(on/${totalFrames}) * (ih - ih/zoom)':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (isForwardFlight) {
      // Dynamic forward flight trajectory: translates along flight path while surging forward
      const zoomDelta = Math.min(0.55, 0.35 * speedMult);
      const maxZoom = (1.10 + zoomDelta).toFixed(3);
      zoompanFilter = `zoompan=z='min(1.10 + pow(on/${totalFrames}, 1.15)*${zoomDelta.toFixed(3)}, ${maxZoom})':x='pow(on/${totalFrames}, 1.12) * (iw - iw/zoom)':y='(ih - ih/zoom)/2 - (ih * 0.05) * sin(PI * on / ${totalFrames})':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === 'slow push-in' || cameraMotion === 'dolly' || actionType === 'dolly_zoom') {
      // Smooth linear push-in with forward camera drift
      const zoomDelta = Math.min(0.45, 0.25 * speedMult);
      const maxZoom = (1.05 + zoomDelta).toFixed(3);
      zoompanFilter = `zoompan=z='min(1.05 + (on/${totalFrames})*${zoomDelta.toFixed(3)}, ${maxZoom})':x='(iw/2 - iw/zoom/2) + (iw * 0.05) * (on/${totalFrames})':y='(ih/2 - ih/zoom/2) - (ih * 0.03) * (on/${totalFrames})':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === 'slow pull-out') {
      // Smooth continuous reveal pulling backward with drift
      const zoomDelta = Math.min(0.40, 0.25 * speedMult);
      const startZoom = (1.05 + zoomDelta).toFixed(3);
      zoompanFilter = `zoompan=z='max(1.05, ${startZoom} - (on/${totalFrames})*${zoomDelta.toFixed(3)})':x='(iw/2 - iw/zoom/2) - (iw * 0.05) * (on/${totalFrames})':y='(ih/2 - ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (cameraMotion === 'handheld') {
      // Organic Steadicam breathing motion with long period (approx 4 seconds) to avoid jitter
      zoompanFilter = `zoompan=z='1.08 + 0.016 * sin(2*PI*on/(${options.fps}*3.8))':x='(iw/2 - iw/zoom/2) + (iw * 0.014) * sin(2*PI*on/(${options.fps}*4.2))':y='(ih/2 - ih/zoom/2) + (ih * 0.010) * cos(2*PI*on/(${options.fps}*3.6))':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
      needsMotionBlur = false;
    } else if (actionType === 'ambient_flow') {
      // Atmospheric fluid drift
      zoompanFilter = `zoompan=z='1.06 + 0.022 * sin(2*PI*on/(${options.fps}*4.0))':x='(iw/2 - iw/zoom/2) + (iw * 0.016) * sin(2*PI*on/(${options.fps}*4.8))':y='(ih/2 - ih/zoom/2) + (ih * 0.012) * cos(2*PI*on/(${options.fps}*3.4))':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
    } else if (actionType === 'living_subject') {
      // Living character focal breathing
      zoompanFilter = `zoompan=z='1.04 + 0.020 * sin(2*PI*on/(${options.fps}*3.2))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
      needsMotionBlur = false;
    } else {
      // Dynamic panoramic gentle pan across frame
      zoompanFilter = `zoompan=z=1.14:x='(on/${totalFrames}) * (iw - iw/zoom)':y='(ih - ih/zoom)/2':d=${totalFrames}:s=${w}x${h}:fps=${options.fps}`;
      needsMotionBlur = false;
    }

    // Color grading based on lighting style
    let colorGrading = 'eq=contrast=1.06:saturation=1.10';
    const lighting = options.promptSpec?.lighting || '';
    if (lighting.includes('golden hour')) {
      colorGrading = 'eq=contrast=1.07:brightness=0.01:saturation=1.18';
    } else if (lighting.includes('neon') || lighting.includes('cyberpunk')) {
      colorGrading = 'eq=contrast=1.12:saturation=1.25';
    } else if (lighting.includes('night') || lighting.includes('dark')) {
      colorGrading = 'eq=contrast=1.10:brightness=-0.02:saturation=0.94';
    }

    // Compose filter graph
    let filterComplex = '';
    if (isForwardFlight) {
      filterComplex = `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},${zoompanFilter}[zoomed];` +
        `[zoomed]lenscorrection=cx=0.5:cy=0.5:k1=-0.035:k2=-0.012[perspective];` +
        `[perspective]split[p1][p2];` +
        `[p2]tblend=all_mode=average[blurred];` +
        `[p1][blurred]blend=all_mode=lighten:all_opacity=0.35[motion];` +
        `[motion]${colorGrading},format=yuv420p[out]`;
    } else if (needsMotionBlur) {
      filterComplex = `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},${zoompanFilter}[zoomed];` +
        `[zoomed]split[p1][p2];` +
        `[p2]tblend=all_mode=average[blurred];` +
        `[p1][blurred]blend=all_mode=lighten:all_opacity=0.30[motion];` +
        `[motion]${colorGrading},format=yuv420p[out]`;
    } else {
      filterComplex = `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},${zoompanFilter},${colorGrading},format=yuv420p[out]`;
    }

    const ffmpegArgs = [
      '-y',
      '-threads', '0',
      '-i', inputImagePath,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      '-frames:v', totalFrames.toString(),
      '-movflags', '+faststart',
      outputMp4Path,
    ];

    await this.executeFFmpeg(ffmpegArgs);

    // Generate thumbnail at 0.5s or frame 1
    const thumbArgs = [
      '-y',
      '-ss', '00:00:00.500',
      '-i', outputMp4Path,
      '-vframes', '1',
      '-q:v', '2',
      thumbnailPath,
    ];

    try {
      await this.executeFFmpeg(thumbArgs);
    } catch {
      try {
        fs.copyFileSync(inputImagePath, thumbnailPath);
      } catch {}
    }

    const stats = fs.existsSync(outputMp4Path) ? fs.statSync(outputMp4Path) : { size: 0 };
    return {
      fileSize: stats.size,
      durationSeconds: options.duration,
    };
  }

  private executeFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', args);
      let stderr = '';

      const timer = setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {}
        reject(new Error('FFmpeg execution timed out after 30 seconds'));
      }, 30000);

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg error (code ${code}): ${stderr.slice(-500)}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
      });
    });
  }

  private async getVideoDuration(videoPath: string, fallbackFps: number): Promise<number> {
    return new Promise((resolve) => {
      const proc = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        videoPath,
      ]);

      let output = '';
      proc.stdout.on('data', (d) => {
        output += d.toString();
      });

      proc.on('close', (code) => {
        const dur = parseFloat(output.trim());
        if (code === 0 && !isNaN(dur) && dur > 0) {
          resolve(Math.round(dur * 100) / 100);
        } else {
          resolve(5); // Fallback
        }
      });

      proc.on('error', () => resolve(5));
    });
  }
}

export const videoEncoder = new VideoEncoder();

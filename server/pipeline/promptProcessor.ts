export type ActionType =
  | 'flight_forward'
  | 'speed_rush'
  | 'pan_left'
  | 'pan_right'
  | 'tilt_up'
  | 'tilt_down'
  | 'orbit'
  | 'dolly_zoom'
  | 'ambient_flow'
  | 'dynamic_action'
  | 'living_subject'
  | 'cinematic_drift';

export interface StructuredPromptSpec {
  subject: string;
  environment: string;
  action: string;
  action_type: ActionType;
  camera_motion: string;
  lighting: string;
  style: string;
  motion_intensity: 'low' | 'medium' | 'high';
  speed_multiplier: number;
  duration: number;
  fps: number;
  seed?: number;
  negative_prompt?: string;
}

export class PromptProcessor {
  /**
   * Transforms raw user natural-language prompt into structured generation specification
   * without altering the user's intended meaning.
   */
  process(
    prompt: string,
    options: {
      camera_motion?: string;
      motion_strength?: number;
      duration?: number;
      fps?: number;
      seed?: number;
      negative_prompt?: string;
    } = {}
  ): StructuredPromptSpec {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      throw new Error('Prompt cannot be empty');
    }

    const lower = cleanPrompt.toLowerCase();

    // 1. Detect Action Type from Prompt Semantics
    let actionType: ActionType = 'cinematic_drift';
    let speedMultiplier = 1.0;

    const isFlight =
      lower.includes('fly') ||
      lower.includes('flies') ||
      lower.includes('flying') ||
      lower.includes('soar') ||
      lower.includes('forward fast') ||
      lower.includes('rush forward') ||
      lower.includes('rocket') ||
      lower.includes('warp') ||
      lower.includes('hyperspace') ||
      lower.includes('dive');

    const isRush =
      !isFlight &&
      (lower.includes('fast') ||
        lower.includes('run') ||
        lower.includes('running') ||
        lower.includes('dash') ||
        lower.includes('sprint') ||
        lower.includes('speed') ||
        lower.includes('chase') ||
        lower.includes('driving'));

    const isWaterOrFlow =
      lower.includes('water') ||
      lower.includes('wave') ||
      lower.includes('ocean') ||
      lower.includes('river') ||
      lower.includes('stream') ||
      lower.includes('clouds') ||
      lower.includes('wind') ||
      lower.includes('smoke') ||
      lower.includes('breeze');

    const isAction =
      lower.includes('fight') ||
      lower.includes('battle') ||
      lower.includes('explosion') ||
      lower.includes('fire') ||
      lower.includes('blast') ||
      lower.includes('laser') ||
      lower.includes('power') ||
      lower.includes('magic');

    const isLiving =
      lower.includes('portrait') ||
      lower.includes('person') ||
      lower.includes('character') ||
      lower.includes('face') ||
      lower.includes('smile') ||
      lower.includes('talking') ||
      lower.includes('breathe') ||
      lower.includes('eyes');

    if (isFlight) {
      actionType = 'flight_forward';
      speedMultiplier = 1.8;
    } else if (isRush) {
      actionType = 'speed_rush';
      speedMultiplier = 1.5;
    } else if (lower.includes('pan left') || lower.includes('move left') || lower.includes('sweep left')) {
      actionType = 'pan_left';
    } else if (lower.includes('pan right') || lower.includes('move right') || lower.includes('sweep right')) {
      actionType = 'pan_right';
    } else if (lower.includes('tilt up') || lower.includes('rise') || lower.includes('rising') || lower.includes('ascend')) {
      actionType = 'tilt_up';
    } else if (lower.includes('tilt down') || lower.includes('descend')) {
      actionType = 'tilt_down';
    } else if (lower.includes('orbit') || lower.includes('circle around')) {
      actionType = 'orbit';
    } else if (lower.includes('dolly') || lower.includes('vertigo') || lower.includes('zoom')) {
      actionType = 'dolly_zoom';
    } else if (isWaterOrFlow) {
      actionType = 'ambient_flow';
    } else if (isAction) {
      actionType = 'dynamic_action';
      speedMultiplier = 1.4;
    } else if (isLiving) {
      actionType = 'living_subject';
    }

    // 2. Camera motion selection & harmonizing
    // 2. Camera Motion Conditioning:
    // Respect user-selected camera motion unless left at default 'static'
    let cameraMotion = options.camera_motion || 'static';

    if (cameraMotion === 'static') {
      if (actionType === 'flight_forward') {
        cameraMotion = 'tracking shot';
      } else if (actionType === 'speed_rush') {
        cameraMotion = 'tracking shot';
      } else if (actionType === 'pan_left') {
        cameraMotion = 'pan left';
      } else if (actionType === 'pan_right') {
        cameraMotion = 'pan right';
      } else if (actionType === 'tilt_up') {
        cameraMotion = 'tilt up';
      } else if (actionType === 'tilt_down') {
        cameraMotion = 'tilt down';
      } else if (actionType === 'orbit') {
        cameraMotion = 'orbit';
      } else if (actionType === 'dolly_zoom') {
        cameraMotion = 'dolly';
      }
    }

    // 3. Motion intensity
    let motionIntensity: 'low' | 'medium' | 'high' = 'medium';
    const strength = options.motion_strength ?? 50;
    if (strength <= 30 || lower.includes('subtle') || lower.includes('slow') || lower.includes('gently')) {
      motionIntensity = 'low';
    } else if (strength >= 70 || lower.includes('fast') || lower.includes('rapid') || lower.includes('dynamic') || actionType === 'flight_forward') {
      motionIntensity = 'high';
    }

    // Adjust speed multiplier by user motion strength slider
    speedMultiplier *= 0.5 + (strength / 100);

    // 4. Lighting extraction
    let lighting = 'natural cinematic lighting';
    if (lower.includes('golden hour')) lighting = 'golden hour warm lighting';
    else if (lower.includes('neon') || lower.includes('cyberpunk')) lighting = 'vibrant neon dramatic lighting';
    else if (lower.includes('studio') || lower.includes('rim light')) lighting = 'studio three-point rim lighting';
    else if (lower.includes('sunset') || lower.includes('dusk')) lighting = 'sunset twilight ambient lighting';
    else if (lower.includes('night') || lower.includes('dark')) lighting = 'low-key moody night lighting';

    // 5. Style extraction
    let style = 'photorealistic cinematic';
    if (lower.includes('anime') || lower.includes('animation')) style = 'high quality animation';
    else if (lower.includes('vintage') || lower.includes('1980s') || lower.includes('retro')) style = 'authentic vintage film aesthetic';
    else if (lower.includes('documentary')) style = 'crisp raw documentary style';

    // 6. Subject, Environment & Action description
    const sentences = cleanPrompt.split(/[.,;]\s+/);
    const subject = sentences[0] || 'Primary subject from conditioned image';
    const environment = sentences.length > 1 ? sentences[1] : 'Original scene context';
    let actionDesc = sentences.length > 2 ? sentences.slice(2).join('; ') : 'Natural consistent movement';

    if (actionType === 'flight_forward') {
      actionDesc = 'Dynamic high-speed forward flight into depth with temporal motion blur';
    } else if (actionType === 'speed_rush') {
      actionDesc = 'High-velocity forward motion with shutter blur and perspective acceleration';
    } else if (actionType === 'ambient_flow') {
      actionDesc = 'Fluid atmospheric undulation and organic environmental motion';
    } else if (actionType === 'living_subject') {
      actionDesc = 'Subtle living subject breathing and continuous organic depth focal rack';
    }

    return {
      subject,
      environment,
      action: actionDesc,
      action_type: actionType,
      camera_motion: cameraMotion,
      lighting,
      style,
      motion_intensity: motionIntensity,
      speed_multiplier: speedMultiplier,
      duration: options.duration || 5,
      fps: options.fps || 24,
      seed: options.seed,
      negative_prompt: options.negative_prompt || 'distortion, flickering, artifacts, jitter, identity shift, blur, morphing',
    };
  }
}

export const promptProcessor = new PromptProcessor();

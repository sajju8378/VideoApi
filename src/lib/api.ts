/**
 * Safe API Client for AI Video Generator
 * Protects against unexpected HTML responses, server cold-starts, and syntax errors.
 * Also seamlessly supports static hosting (like GitHub Pages) by resolving backend endpoints
 * to the deployed cloud inference server or user-configured backend URL.
 */

import { SystemCapabilities } from '../types';

export function isStaticHost(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';
}

export function getClientCapabilities(): SystemCapabilities {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;
  return {
    cuda: false,
    gpu: 'In-Browser WebGL & Canvas Synthesizer',
    vram_gb: 0,
    cuda_version: null,
    supported: true,
    max_resolution: '1080p',
    estimated_generation_time: '15-25s (Browser Local)',
    cpu_cores: cores,
    system_ram_gb: 16,
    free_ram_gb: 8,
    ffmpeg_available: true,
    ffmpeg_version: 'MediaRecorder (In-Browser MP4/WebM Engine)',
    pytorch_available: false,
    test_mode_enabled: true,
    active_model: 'Browser Neural Motion Synthesizer (Zero-Install)',
    hardware_recommendation: {
      minimum_gpu: 'WebGL 2.0 Canvas Engine',
      minimum_vram_gb: 0,
      recommended_gpu: 'NVIDIA RTX 3060+',
      recommended_vram_gb: 8,
      warning:
        'Running in client-side zero-install mode. Rendering and video encoding run smoothly inside your browser with zero secrets or external servers required.',
    },
  };
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  // 1. Check user-configured backend in localStorage
  try {
    const saved = localStorage.getItem('ai_video_backend_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // Ignore localStorage errors in sandboxed iframes
  }

  // 2. Check build-time environment variable (if explicitly set and not on github.io without custom backend)
  const envUrl = (import.meta as any)?.env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && !isStaticHost()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. Default to relative requests for integrated full-stack server
  return '';
}

export function setApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem('ai_video_backend_url');
    } else {
      localStorage.setItem('ai_video_backend_url', url.trim().replace(/\/+$/, ''));
    }
  } catch {
    // Ignore storage errors
  }
}

export function resolveApiUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (
    pathOrUrl.startsWith('http://') ||
    pathOrUrl.startsWith('https://') ||
    pathOrUrl.startsWith('data:') ||
    pathOrUrl.startsWith('blob:')
  ) {
    return pathOrUrl;
  }

  const base = getApiBaseUrl();
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  let targetUrl: RequestInfo | URL = input;
  if (typeof input === 'string') {
    targetUrl = resolveApiUrl(input);
  }

  let res: Response;
  try {
    res = await fetch(targetUrl, init);
  } catch (netErr: any) {
    throw new Error(
      netErr?.message?.includes('Failed to fetch')
        ? 'Network connection issue or inference server is restarting. Please retry in a moment.'
        : netErr?.message || 'Network request failed.'
    );
  }

  const contentType = res.headers.get('content-type') || '';

  // If response is not JSON (e.g. proxy HTML page, 502 Bad Gateway, 404 HTML fallback)
  if (!contentType.includes('application/json')) {
    const rawText = await res.text();

    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error('Inference server container is warming up. Please wait 10 seconds and try again.');
    }

    if (rawText.toLowerCase().includes('<!doctype') || rawText.toLowerCase().includes('<html')) {
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}. The inference engine is currently booting up.`);
      }
      throw new Error('Unexpected response format from inference service.');
    }

    if (!res.ok) {
      throw new Error(rawText.slice(0, 120) || `Request failed with HTTP status ${res.status}`);
    }

    try {
      return JSON.parse(rawText) as T;
    } catch {
      throw new Error('Unable to parse server response as JSON.');
    }
  }

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `Request failed with status ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

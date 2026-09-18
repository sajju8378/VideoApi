/**
 * Safe API Client for AI Video Generator
 * Protects against unexpected HTML responses, server cold-starts, and syntax errors.
 * Also seamlessly supports static hosting (like GitHub Pages) by resolving backend endpoints
 * to the deployed cloud inference server or user-configured backend URL.
 */

const DEFAULT_CLOUD_BACKEND = 'https://ais-pre-dg5ndgbnhkfyywsrfnwjdd-312216031270.asia-southeast1.run.app';

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

  // 2. Check build-time environment variable
  const envUrl = (import.meta as any)?.env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. If running on GitHub Pages (*.github.io) or another external static domain without backend
  const hostname = window.location.hostname || '';
  if (hostname.endsWith('github.io') || hostname === 'localhost' && window.location.port === '5173') {
    return DEFAULT_CLOUD_BACKEND;
  }

  // 4. Default to relative requests for integrated full-stack server
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

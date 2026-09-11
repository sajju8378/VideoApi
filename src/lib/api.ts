/**
 * Safe API Client for AI Video Generator
 * Protects against unexpected HTML responses, server cold-starts, and syntax errors.
 */

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
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

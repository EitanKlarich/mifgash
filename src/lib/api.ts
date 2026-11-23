export const API_BASE = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

/**
 * Joins API_BASE with a relative backend path (ensuring a single slash).
 * Absolute external URLs (http:// or https://) are returned unchanged.
 */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const cleanPath = path.replace(/^\/+/, '');
  return API_BASE ? `${API_BASE}/${cleanPath}` : `/${cleanPath}`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}

export async function checkBackendHealth(): Promise<{ status: string; timestamp: string }> {
  const res = await fetch(apiUrl('/api/health'));
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

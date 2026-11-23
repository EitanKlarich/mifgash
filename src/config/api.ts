const rawBaseUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

export const API_BASE_URL: string = rawBaseUrl;

/**
 * Builds a full request URL using VITE_API_URL when given a relative backend route.
 * Absolute third-party URLs (https://...) are preserved as-is.
 */
export function buildApiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Centralized fetch wrapper for all frontend network requests.
 * Relative API paths automatically prepend import.meta.env.VITE_API_URL || ''.
 */
export async function apiFetch(pathOrUrl: string, init?: RequestInit): Promise<Response> {
  return fetch(buildApiUrl(pathOrUrl), init);
}

export async function checkBackendHealth(): Promise<{ status: string; timestamp: string }> {
  const res = await apiFetch('/api/health');
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Native Maps launcher utility
 * Directs users to their device's native mapping application:
 * - Apple Maps on iOS, iPadOS, macOS
 * - Google Maps on Android, Windows, Linux, and Web
 */

export function getNativeMapsUrl(location: string): string {
  if (!location || location.trim() === '' || location.toLowerCase() === 'tbd') {
    return '#';
  }

  const encoded = encodeURIComponent(location.trim());

  // Check if running on Apple ecosystem (iOS, iPadOS, macOS)
  const isApple =
    typeof navigator !== 'undefined' &&
    (/Macintosh|MacIntel|iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  if (isApple) {
    return `https://maps.apple.com/?q=${encoded}`;
  }

  // Google Maps universal search URL (launches native Google Maps app on Android and works universally on web)
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

export function openNativeMaps(location: string, e?: React.MouseEvent) {
  if (e) {
    try {
      e.stopPropagation();
    } catch {
      // ignore
    }
  }

  if (!location || location.trim() === '' || location.toLowerCase() === 'tbd') {
    return;
  }

  const url = getNativeMapsUrl(location);
  if (url && url !== '#') {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Could not open maps url:', err);
    }
  }
}

const AVATAR_COLORS = [
  '#8E84E4',
  '#5C53A5',
  '#3EB88F',
  '#4A7CD8',
  '#C470A4',
  '#D99E4A',
];

export function getInitialsFromName(name: string): string {
  const clean = (name || '').trim();
  if (!clean) return 'M';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function createInitialsAvatarDataUrl(name: string): string {
  const initials = getInitialsFromName(name);
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const bg = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="${bg}"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Compresses an uploaded image file to a JPEG data URL strictly under maxChars
 * so it respects Firestore's 50,000 character validation limit.
 */
export async function compressImageFileToDataUrl(
  file: File,
  maxDimension = 256,
  maxChars = 42000
): Promise<string> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read image file'));
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Unsupported image format'));
    el.src = rawUrl;
  });

  const canvas = document.createElement('canvas');
  let { width, height } = img;
  if (width > height && width > maxDimension) {
    height = Math.round((height * maxDimension) / width);
    width = maxDimension;
  } else if (height > maxDimension) {
    width = Math.round((width * maxDimension) / height);
    height = maxDimension;
  }
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.8, 0.65, 0.5, 0.35]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= maxChars) {
      return dataUrl;
    }
  }

  // Fallback smaller resize if still too large
  canvas.width = 128;
  canvas.height = 128;
  ctx.drawImage(img, 0, 0, 128, 128);
  return canvas.toDataURL('image/jpeg', 0.5);
}

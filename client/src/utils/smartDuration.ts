export function clampDuration(seconds: number, min = 6, max = 30): number {
  if (!Number.isFinite(seconds)) return min;
  return Math.max(min, Math.min(max, Math.round(seconds)));
}

export function calculateSmartDuration(photoCount: number): number {
  const count = Math.max(0, Math.floor(Number(photoCount) || 0));
  if (count <= 0) return 10;

  // Gemini-backed simple formula:
  // Hero shot = 2.5s
  // Every other photo = 1.5s
  // CTA ending = 2.5s
  // Clamp to 6s minimum and 30s maximum.
  const heroSeconds = 2.5;
  const normalPhotoSeconds = 1.5;
  const ctaSeconds = 2.5;
  const normalPhotos = Math.max(0, count - 1);
  return clampDuration(heroSeconds + normalPhotos * normalPhotoSeconds + ctaSeconds, 6, 30);
}

export function explainSmartDuration(photoCount: number, duration: number): string {
  const count = Math.max(0, Math.floor(Number(photoCount) || 0));
  if (count <= 0) return 'Upload photos to get an auto length recommendation.';
  const plural = count === 1 ? 'photo' : 'photos';
  return `We recommend ${duration} seconds for ${count} ${plural} so each room gets seen without the reel feeling slow.`;
}

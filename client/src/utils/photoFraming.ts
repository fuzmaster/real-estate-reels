export type CropMode = 'fill' | 'whole';

export type SmartFramingTemplate =
  | 'vertical-photo'
  | 'square-photo'
  | 'standard-mls'
  | 'wide-room-pan'
  | 'ultra-wide-room'
  | 'exterior-hero'
  | 'detail-shot';

export interface PhotoFraming {
  cropMode: CropMode;
  x: number;      // -50 to 50. Used as focus offset for Fill Screen.
  y: number;      // -50 to 50. Used as focus offset for Fill Screen.
  scale: number;  // 1 to 1.35. Extra zoom for Fill Screen.
  template?: SmartFramingTemplate;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

export const DEFAULT_PHOTO_FRAMING: PhotoFraming = {
  cropMode: 'fill',
  x: 0,
  y: 0,
  scale: 1.04,
  template: 'standard-mls',
};

// Backwards-compatible alias for older patches that used PhotoSetting naming.
export const DEFAULT_PHOTO_SETTING = (photoPath?: string): PhotoFraming => ({
  ...recommendPhotoFramingForImage({
    photoPath: photoPath ?? '',
  }),
});

export function getPhotoFraming(
  photoFraming: Record<string, PhotoFraming> | undefined,
  photoPath: string,
): PhotoFraming {
  return photoFraming?.[photoPath] ?? DEFAULT_PHOTO_FRAMING;
}

export function getPhotoSetting(
  photoFraming: Record<string, PhotoFraming> | undefined,
  photoPath: string,
): PhotoFraming {
  return getPhotoFraming(photoFraming, photoPath);
}

export function getSmartFramingLabel(settings?: PhotoFraming): string {
  const template = settings?.template ?? 'standard-mls';
  switch (template) {
    case 'vertical-photo': return 'Smart Framing: Vertical';
    case 'square-photo': return 'Smart Framing: Square';
    case 'wide-room-pan': return 'Smart Framing: Wide Room Pan';
    case 'ultra-wide-room': return 'Smart Framing: Ultra-Wide';
    case 'exterior-hero': return 'Smart Framing: Exterior Hero';
    case 'detail-shot': return 'Smart Framing: Detail Shot';
    default: return 'Smart Framing: Standard MLS';
  }
}

export function getSmartFramingDescription(settings?: PhotoFraming): string {
  const template = settings?.template ?? 'standard-mls';
  switch (template) {
    case 'vertical-photo': return 'Already vertical. We keep it full screen.';
    case 'square-photo': return 'Square image. We fill the reel with a gentle push-in.';
    case 'wide-room-pan': return 'Wide room. We keep it full screen and start with a safe horizontal pan.';
    case 'ultra-wide-room': return 'Very wide. Full-screen crop is default, but Show Whole Room is available if needed.';
    case 'exterior-hero': return 'Best for first shot. Full-screen with a longer cinematic hold.';
    case 'detail-shot': return 'Good detail image. Do not use it as the first photo.';
    default: return 'Normal listing photo. Full-screen vertical crop with a gentle push-in.';
  }
}

function hasWord(photoPath: string, words: string[]): boolean {
  const s = photoPath.toLowerCase();
  return words.some(w => s.includes(w));
}

export function recommendPhotoFramingForImage(input: {
  width?: number;
  height?: number;
  photoPath?: string;
  index?: number;
}): PhotoFraming {
  const width = input.width || 0;
  const height = input.height || 0;
  const ratio = width > 0 && height > 0 ? width / height : undefined;
  const p = input.photoPath ?? '';
  const index = input.index ?? 999;

  const isExterior = hasWord(p, ['exterior', 'front', 'drone', 'aerial', 'backyard', 'yard', 'outside', 'facade', 'hero']);
  const isWeakDetail = hasWord(p, ['stove', 'oven', 'sink', 'toilet', 'closet', 'laundry', 'vanity', 'appliance']);

  if (isExterior || index === 0) {
    return {
      cropMode: 'fill',
      x: 0,
      y: -2,
      scale: 1.03,
      template: 'exterior-hero',
      width,
      height,
      aspectRatio: ratio,
    };
  }

  if (isWeakDetail) {
    return {
      cropMode: 'fill',
      x: 0,
      y: 0,
      scale: 1.08,
      template: 'detail-shot',
      width,
      height,
      aspectRatio: ratio,
    };
  }

  if (!ratio) {
    return { ...DEFAULT_PHOTO_FRAMING, width, height, aspectRatio: ratio };
  }

  if (ratio < 0.8) {
    return { cropMode: 'fill', x: 0, y: 0, scale: 1.02, template: 'vertical-photo', width, height, aspectRatio: ratio };
  }

  if (ratio <= 1.25) {
    return { cropMode: 'fill', x: 0, y: 0, scale: 1.04, template: 'square-photo', width, height, aspectRatio: ratio };
  }

  if (ratio <= 1.65) {
    return { cropMode: 'fill', x: 0, y: 0, scale: 1.05, template: 'standard-mls', width, height, aspectRatio: ratio };
  }

  if (ratio <= 2.15) {
    // IMPORTANT: Still fill screen. Do NOT letterbox by default.
    return { cropMode: 'fill', x: 0, y: 0, scale: 1.07, template: 'wide-room-pan', width, height, aspectRatio: ratio };
  }

  // Ultra-wide: still default to full-screen crop, but label it so the agent can inspect it.
  return { cropMode: 'fill', x: 0, y: 0, scale: 1.08, template: 'ultra-wide-room', width, height, aspectRatio: ratio };
}

export function detectImageDimensions(file: File): Promise<{ width: number; height: number; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      URL.revokeObjectURL(url);
      resolve({ width, height, aspectRatio: width / height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image dimensions'));
    };
    img.src = url;
  });
}

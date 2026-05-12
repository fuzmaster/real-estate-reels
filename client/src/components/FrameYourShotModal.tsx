import { useEffect, useMemo, useRef, useState } from 'react';
import type { PhotoFraming } from '../utils/photoFraming';
import { DEFAULT_PHOTO_FRAMING } from '../utils/photoFraming';

interface FrameYourShotModalProps {
  open: boolean;
  photoPath: string;
  photoUrl: string;
  initial?: PhotoFraming;
  onClose: () => void;
  onSave: (settings: PhotoFraming) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function FrameYourShotModal({
  open,
  photoPath,
  photoUrl,
  initial,
  onClose,
  onSave,
}: FrameYourShotModalProps) {
  const [settings, setSettings] = useState<PhotoFraming>(initial ?? DEFAULT_PHOTO_FRAMING);
  const [dragging, setDragging] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const startRef = useRef<{ x: number; y: number; sx: number; sy: number } | null>(null);

  useEffect(() => {
    if (open) {
      setSettings(initial ?? DEFAULT_PHOTO_FRAMING);
      setPreviewing(false);
    }
  }, [open, initial, photoPath]);

  const focusLabel = useMemo(() => {
    if (settings.cropMode === 'whole') return 'Fit to Screen with dark background';
    const horizontal = settings.x < -8 ? 'left' : settings.x > 8 ? 'right' : 'center';
    const vertical = settings.y < -8 ? 'top' : settings.y > 8 ? 'bottom' : 'middle';
    return `Focused ${horizontal} / ${vertical}`;
  }, [settings]);

  if (!open) return null;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (settings.cropMode !== 'fill') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    startRef.current = { x: e.clientX, y: e.clientY, sx: settings.x, sy: settings.y };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !startRef.current || settings.cropMode !== 'fill') return;
    const dx = (e.clientX - startRef.current.x) / 4;
    const dy = (e.clientY - startRef.current.y) / 4;
    setSettings(prev => ({
      ...prev,
      x: clamp(startRef.current!.sx + dx, -45, 45),
      y: clamp(startRef.current!.sy + dy, -45, 45),
    }));
  }

  function handlePointerUp() {
    setDragging(false);
    startRef.current = null;
  }

  function setCropMode(cropMode: PhotoFraming['cropMode']) {
    setSettings(prev => ({
      ...prev,
      cropMode,
      x: cropMode === 'whole' ? 0 : prev.x,
      y: cropMode === 'whole' ? 0 : prev.y,
      scale: cropMode === 'whole' ? 1 : prev.scale,
    }));
  }

  const objectPosition = `${50 + settings.x}% ${50 + settings.y}%`;
  const fillScale = settings.scale;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-700 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-neutral-800">
          <div>
            <h2 className="text-white font-bold text-lg">Frame Your Shot</h2>
            <p className="text-neutral-400 text-xs mt-1">
              Drag the image inside the phone frame so the important part stays visible.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-white text-xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="grid lg:grid-cols-[420px_1fr] gap-0">
          <div className="p-5 border-r border-neutral-800 bg-neutral-900/50">
            <div
              className={`mx-auto relative bg-black rounded-[28px] overflow-hidden border-4 border-neutral-700 select-none ${settings.cropMode === 'fill' ? 'cursor-grab active:cursor-grabbing' : ''}`}
              style={{ width: 270, height: 480 }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {settings.cropMode === 'whole' ? (
                <>
                  <img
                    src={photoUrl}
                    alt="Blurred background"
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: 'blur(34px) brightness(0.22) saturate(1.1)', transform: 'scale(1.22)' }}
                  />
                  <img
                    src={photoUrl}
                    alt="Full room preview"
                    draggable={false}
                    className={`absolute inset-0 w-full h-full object-contain ${previewing ? 'animate-[rerPreviewWhole_2s_ease-in-out_infinite_alternate]' : ''}`}
                  />
                </>
              ) : (
                <img
                  src={photoUrl}
                  alt="Crop preview"
                  draggable={false}
                  className={`absolute inset-0 w-full h-full object-cover ${previewing ? 'animate-[rerPreviewFill_2s_ease-in-out_infinite_alternate]' : ''}`}
                  style={{ objectPosition, transform: `scale(${fillScale})` }}
                />
              )}
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15 pointer-events-none" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/15 pointer-events-none" />
              <div className="absolute top-3 left-3 bg-black/65 text-white text-[10px] font-bold px-2 py-1 rounded-sm pointer-events-none">
                9:16 SAFE PREVIEW
              </div>
            </div>
            <p className="text-center text-xs text-neutral-500 mt-3 truncate" title={photoPath}>{photoPath}</p>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Crop Mode</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCropMode('fill')}
                  className={`text-left rounded-none border p-4 transition-colors ${settings.cropMode === 'fill' ? 'border-white bg-white/10 text-white' : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500'}`}
                >
                  <div className="font-bold text-sm">Crop to Vertical</div>
                  <div className="text-xs text-neutral-500 mt-1">Best for exteriors, kitchens, bathrooms, and detail shots. Fills the vertical reel.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setCropMode('whole')}
                  className={`text-left rounded-none border p-4 transition-colors ${settings.cropMode === 'whole' ? 'border-white bg-white/10 text-white' : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500'}`}
                >
                  <div className="font-bold text-sm">Fit to Screen</div>
                  <div className="text-xs text-neutral-500 mt-1">Best for very wide rooms. Shows the full photo with a dark blurred background.</div>
                </button>
              </div>
            </div>

            {settings.cropMode === 'fill' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-neutral-400 mb-1">
                    <span>Zoom</span>
                    <span>{settings.scale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="1.28"
                    step="0.01"
                    value={settings.scale}
                    onChange={e => setSettings(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div className="rounded-none bg-neutral-900 border border-neutral-800 p-4">
                  <p className="text-sm text-neutral-300 font-medium mb-1">{focusLabel}</p>
                  <p className="text-xs text-neutral-500">Tip: Drag the preview photo. Keep counters, islands, windows, and room entrances inside the frame.</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPreviewing(p => !p)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium px-4 py-2 rounded-none border border-neutral-700"
              >
                {previewing ? 'Stop Movement Preview' : 'Preview Movement'}
              </button>
              <button
                type="button"
                onClick={() => setSettings(DEFAULT_PHOTO_FRAMING)}
                className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-sm font-medium px-4 py-2 rounded-none border border-neutral-700"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => onSave(settings)}
                className="ml-auto bg-white hover:bg-neutral-200 text-black text-sm font-bold px-6 py-2 rounded-none"
              >
                Save Framing
              </button>
            </div>

            <div className="rounded-none border border-yellow-900/70 bg-yellow-950/30 p-4 text-xs text-yellow-200 leading-relaxed">
              Use <strong>Crop to Vertical</strong> for most photos. Use <strong>Fit to Screen</strong> only when cropping ruins the room layout.
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes rerPreviewFill {
          from { transform: scale(${fillScale}); }
          to { transform: scale(${Math.min(fillScale + 0.06, 1.36)}); }
        }
        @keyframes rerPreviewWhole {
          from { transform: scale(1); }
          to { transform: scale(1.025); }
        }
      `}</style>
    </div>
  );
}

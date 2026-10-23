'use client';

import { useEffect, useState } from 'react';
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import { IconChevronLeft, IconChevronRight, IconX, IconZoomIn, IconZoomOut } from '@tabler/icons-react';

const ZOOM_STEPS = [1, 2, 3, 4];

/**
 * A photo (or the photos of an item) full screen. The + and - buttons zoom in steps and the photo can be dragged or
 * scrolled while zoomed; a double tap zooms in and out. A plain <img> is used so an animated GIF keeps moving and the
 * photo is shown in full resolution.
 */
export default function ImageLightbox({
  open,
  images,
  startIndex = 0,
  name,
  onClose,
}: {
  open: boolean;
  images: string[];
  startIndex?: number;
  name: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) {
      setIndex(Math.min(Math.max(startIndex, 0), Math.max(images.length - 1, 0)));
      setStep(0);
    }
  }, [open, startIndex, images.length]);

  const many = images.length > 1;
  const zoom = ZOOM_STEPS[step];
  const go = (delta: number) => {
    setIndex((i) => (i + delta + images.length) % images.length);
    setStep(0);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && many) go(1);
      else if (e.key === 'ArrowLeft' && many) go(-1);
      else if (e.key === '+' || e.key === '=') setStep((s) => Math.min(s + 1, ZOOM_STEPS.length - 1));
      else if (e.key === '-') setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, many, images.length]);

  if (!images.length) return null;
  const round = { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.92)', color: '#111827', '&:hover': { backgroundColor: '#fff' } } as const;

  return (
    <Dialog open={open} onClose={onClose} fullScreen PaperProps={{ sx: { backgroundColor: '#0b0b0b', backgroundImage: 'none' } }}>
      <Box sx={{ position: 'absolute', top: 'max(12px, env(safe-area-inset-top))', left: 12, right: 12, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }}>
        <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,0.6)', pointerEvents: 'auto' }}>
          {many ? `${index + 1} / ${images.length}` : ''}
        </Typography>
        <IconButton aria-label="Close" onClick={onClose} sx={{ ...round, pointerEvents: 'auto' }}>
          <IconX size={22} />
        </IconButton>
      </Box>

      {/* the photo: fits the screen at 1x; zoomed, it is bigger than the screen and can be dragged or scrolled */}
      <Box
        sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y pinch-zoom' }}
        onDoubleClick={() => setStep((s) => (s === 0 ? 1 : 0))}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index]}
          alt={name}
          draggable={false}
          style={
            step === 0
              ? { margin: 'auto', width: '100%', height: '100%', objectFit: 'contain' }
              : { margin: 'auto', width: `${zoom * 100}%`, maxWidth: 'none', height: 'auto', flexShrink: 0 }
          }
        />
      </Box>

      {many && (
        <>
          <IconButton aria-label="Previous photo" onClick={() => go(-1)} sx={{ ...round, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 3 }}>
            <IconChevronLeft size={24} />
          </IconButton>
          <IconButton aria-label="Next photo" onClick={() => go(1)} sx={{ ...round, position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 3 }}>
            <IconChevronRight size={24} />
          </IconButton>
        </>
      )}

      <Box sx={{ position: 'absolute', bottom: 'max(20px, env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'flex', gap: 1.5 }}>
        <IconButton aria-label="Zoom out" disabled={step === 0} onClick={() => setStep((s) => Math.max(s - 1, 0))} sx={{ ...round, '&.Mui-disabled': { backgroundColor: 'rgba(255,255,255,0.4)' } }}>
          <IconZoomOut size={22} />
        </IconButton>
        <IconButton aria-label="Zoom in" disabled={step === ZOOM_STEPS.length - 1} onClick={() => setStep((s) => Math.min(s + 1, ZOOM_STEPS.length - 1))} sx={{ ...round, '&.Mui-disabled': { backgroundColor: 'rgba(255,255,255,0.4)' } }}>
          <IconZoomIn size={22} />
        </IconButton>
      </Box>
    </Dialog>
  );
}

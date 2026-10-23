'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Box, IconButton } from '@mui/material';
import { IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react';
import ImageLightbox from './ImageLightbox';

/**
 * The photo strip at the top of an item: the whole photo is shown (contain) over a soft blurred copy of itself, so any
 * photo shape fills the strip without being cropped. With more than one photo they can be swiped (or stepped with the
 * arrows) and dots show where you are. The + button opens the photo full screen to zoom.
 */
const AUTO_ADVANCE_MS = 4000;

export default function ItemImageGallery({ name, images }: { name: string; images: string[] }) {
  const list = images.filter(Boolean);
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const many = list.length > 1;
  // a finger or the mouse is on the strip: the photos wait
  const [holding, setHolding] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // every 4 seconds the next photo slides in (the last one goes back to the first). Any change of photo, by swipe or by
  // itself, starts the 4 seconds again; it waits while the strip is touched or the zoom view is open, and never runs for
  // someone who asked their device for less motion.
  useEffect(() => {
    if (!many || holding || zoomOpen || reducedMotion) return;
    const timer = window.setTimeout(() => goTo((index + 1) % list.length), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [many, holding, zoomOpen, reducedMotion, index, list.length]);

  useEffect(() => {
    setIndex(0);
    scroller.current?.scrollTo({ left: 0 });
  }, [list.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  function goTo(i: number) {
    const el = scroller.current;
    if (!el) return;
    const next = Math.min(Math.max(i, 0), list.length - 1);
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  }

  if (list.length === 0) return null;
  const round = { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.92)', color: '#111827', boxShadow: '0 2px 8px rgba(0,0,0,0.18)', '&:hover': { backgroundColor: '#fff' } } as const;

  return (
    <Box sx={{ position: 'relative', width: '100%', height: { xs: 240, sm: 300 }, flexShrink: 0, overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
      <Box
        ref={scroller}
        onScroll={many ? onScroll : undefined}
        onPointerDown={() => setHolding(true)}
        onPointerUp={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
        onTouchStart={() => setHolding(true)}
        onTouchEnd={() => setHolding(false)}
        onTouchCancel={() => setHolding(false)}
        sx={{ display: 'flex', width: '100%', height: '100%', overflowX: many ? 'auto' : 'hidden', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
      >
        {list.map((src, i) => (
          <Box key={src} sx={{ position: 'relative', flex: '0 0 100%', height: '100%', scrollSnapAlign: 'start', overflow: 'hidden' }}>
            <Image src={src} alt="" aria-hidden fill sizes="700px" style={{ objectFit: 'cover', filter: 'blur(24px) saturate(1.1)', transform: 'scale(1.15)', opacity: 0.85 }} />
            <Image src={src} alt={many ? `${name} (photo ${i + 1} of ${list.length})` : name} fill priority={i === 0} sizes="(max-width: 600px) 100vw, 700px" style={{ objectFit: 'contain' }} />
          </Box>
        ))}
      </Box>

      {many && index > 0 && (
        <IconButton aria-label="Previous photo" onClick={() => goTo(index - 1)} sx={{ ...round, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: { xs: 'none', sm: 'inline-flex' } }}>
          <IconChevronLeft size={20} />
        </IconButton>
      )}
      {many && index < list.length - 1 && (
        <IconButton aria-label="Next photo" onClick={() => goTo(index + 1)} sx={{ ...round, position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: { xs: 'none', sm: 'inline-flex' } }}>
          <IconChevronRight size={20} />
        </IconButton>
      )}
      {many && (
        <Box sx={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 0.75, pointerEvents: 'none' }}>
          {list.map((_, i) => (
            <Box key={i} sx={{ width: i === index ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: i === index ? '#f89c35' : 'rgba(255,255,255,0.95)', boxShadow: '0 0 0 1px rgba(17,24,39,0.35)', transition: 'width .2s' }} />
          ))}
        </Box>
      )}

      {/* the zoom button: a plus, bottom right */}
      <IconButton aria-label="Zoom photo" onClick={() => setZoomOpen(true)} sx={{ ...round, position: 'absolute', right: 12, bottom: 12, width: 40, height: 40 }}>
        <IconPlus size={22} />
      </IconButton>

      <ImageLightbox open={zoomOpen} images={list} startIndex={index} name={name} onClose={() => setZoomOpen(false)} />
    </Box>
  );
}

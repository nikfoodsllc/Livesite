'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import HeroBanner from '@/components/banners/HeroBanner';
import type { PublicBanner } from '@/lib/banners';

const CACHE_KEY = 'nikfoods_banners_v1';
const AUTO_MS = 5500;

/**
 * The home page banners the admin set up (a swipeable strip). With no banners the page keeps its original hero, so nothing changes
 * until someone adds one. Tapping a banner opens its menu category or its web page.
 */
export default function HomeBanners({ onOpenCategory }: { onOpenCategory: (categoryId: string) => void }) {
  const [banners, setBanners] = useState<PublicBanner[] | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // the last answer is shown at once on a repeat visit, then refreshed
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) setBanners(JSON.parse(cached) as PublicBanner[]);
    } catch {
      // no cache: wait for the answer
    }
    let live = true;
    fetch('/api/banners')
      .then((r) => r.json())
      .then((j) => {
        if (!live) return;
        const list: PublicBanner[] = Array.isArray(j?.data) ? j.data : [];
        setBanners(list);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(list));
        } catch {
          // fine
        }
      })
      .catch(() => live && setBanners((prev) => prev ?? []));
    return () => {
      live = false;
    };
  }, []);

  const goTo = useCallback((i: number, smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const count = banners?.length ?? 0;

  // follow the swipe
  const onScroll = () => {
    const el = scroller.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex((prev) => (prev === i ? prev : i));
  };

  // advance by itself (not for people who asked for less motion, and not while the pointer is over it or it is being touched)
  useEffect(() => {
    if (count < 2 || paused) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => goTo((index + 1) % count), AUTO_MS);
    return () => clearInterval(t);
  }, [count, paused, index, goTo]);

  if (banners === null) return null;
  if (count === 0) return <HeroBanner />;

  const open = (b: PublicBanner) => {
    if (b.linkType === 'category' && b.categoryId) {
      onOpenCategory(b.categoryId);
      document.getElementById('categories-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (b.linkType === 'url' && b.url) {
      window.open(b.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Box
      component="section"
      aria-roledescription="carousel"
      aria-label="Promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      sx={{ position: 'relative', maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, mt: { xs: 1.5, md: 3 }, mb: { xs: 2, md: 4 } }}
    >
      <Box
        ref={scroller}
        onScroll={onScroll}
        sx={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          borderRadius: { xs: '18px', md: '24px' },
          boxShadow: '0 14px 40px rgba(59,42,20,0.14)',
          backgroundColor: '#F3EEE6',
        }}
      >
        {banners.map((b, i) => {
          const clickable = b.linkType !== 'none' && (b.linkType === 'category' ? Boolean(b.categoryId) : Boolean(b.url));
          return (
            <Box
              key={b.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}${b.title ? `: ${b.title}` : ''}`}
              onClick={clickable ? () => open(b) : undefined}
              onKeyDown={clickable ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open(b)) : undefined}
              tabIndex={clickable ? 0 : -1}
              sx={{ position: 'relative', flex: '0 0 100%', scrollSnapAlign: 'start', aspectRatio: '2 / 1', maxHeight: 420, cursor: clickable ? 'pointer' : 'default', outlineOffset: -3 }}
            >
              <Box component="img" src={b.imageUrl} alt={b.title || 'NikFoods'} loading={i === 0 ? 'eager' : 'lazy'} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {(b.title || b.subtitle) && (
                <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, p: { xs: 2, md: 4 }, pt: { xs: 6, md: 10 }, background: 'linear-gradient(to top, rgba(26,20,16,0.72), rgba(26,20,16,0))', color: '#fff' }}>
                  {b.title && (
                    <Typography sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.9rem' }, lineHeight: 1.15, textShadow: '0 1px 8px rgba(0,0,0,0.25)' }}>{b.title}</Typography>
                  )}
                  {b.subtitle && <Typography sx={{ mt: 0.5, fontSize: { xs: '0.8rem', md: '1.05rem' }, opacity: 0.92 }}>{b.subtitle}</Typography>}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {count > 1 && (
        <>
          <IconButton aria-label="Previous banner" onClick={() => goTo((index - 1 + count) % count)} sx={{ display: { xs: 'none', md: 'flex' }, position: 'absolute', left: { md: 44 }, top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.92)', '&:hover': { backgroundColor: '#fff' } }}>
            <IconChevronLeft size={22} />
          </IconButton>
          <IconButton aria-label="Next banner" onClick={() => goTo((index + 1) % count)} sx={{ display: { xs: 'none', md: 'flex' }, position: 'absolute', right: { md: 44 }, top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.92)', '&:hover': { backgroundColor: '#fff' } }}>
            <IconChevronRight size={22} />
          </IconButton>
          <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: { xs: 18, md: 34 }, display: 'flex', justifyContent: 'center', gap: 0.75, pointerEvents: 'none' }}>
            {banners.map((b, i) => (
              <Box key={b.id} sx={{ width: i === index ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i === index ? '#fff' : 'rgba(255,255,255,0.55)', transition: 'width 320ms cubic-bezier(0.32,0.72,0,1)' }} />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

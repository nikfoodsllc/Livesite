'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, ButtonBase, IconButton, InputBase } from '@mui/material';
import CategoryCard from '@/components/cards/CategoryCard';
import { IconLayoutGrid, IconSearch, IconX } from '@tabler/icons-react';

interface NavCategory {
  _id: string;
  name: string;
  imageUrl?: string;
}

const GOLD = '#B8893B';
const INK = '#1F1712';
/** the fixed site header is 64px high on phones and 72px from 900px up */
export const HEADER_H = { xs: 64, md: 72 };
export const STRIP_H = 44;
const FADE = 28;
/** the side list sits in the free margin left of the 1200px menu, so it needs a screen at least this wide */
const SIDE_MIN = 1560;

/**
 * Keeps the categories in reach once the big photo row has scrolled out of sight. Most screens: a thin strip (44px) under
 * the header with small round photos and serif names. Screens 1560px and wider: a column of the round photos in the free
 * left margin (with search), so the dishes keep their full width. Nothing shows while the photo row is on screen. Put it first inside a wrapper that holds the whole menu: it is a zero-height sticky box, so it never
 * pushes anything down.
 */
export default function StickyCategoryNav({
  categories,
  selectedCategory,
  onSelect,
  searchQuery,
  onSearch,
  watchId = 'categories-container',
}: {
  categories: NavCategory[];
  selectedCategory: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearch: (value: string) => void;
  watchId?: string;
}) {
  const [show, setShow] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ left: false, right: false });

  // visible only after the photo row has scrolled up out of view (a scroll listener, not an IntersectionObserver:
  // that one stays silent when a jump goes from "below the screen" straight to "above it")
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const el = document.getElementById(watchId);
      setShow(Boolean(el) && el!.getBoundingClientRect().bottom < 100);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [watchId, categories.length]);

  // a soft fade at an edge shows there is more to scroll that way
  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    setFade({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [categories.length, show]);

  // bring the chosen chip into view
  useEffect(() => {
    const el = scroller.current;
    const chosen = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !chosen) return;
    el.scrollTo({ left: chosen.offsetLeft - el.clientWidth / 2 + chosen.clientWidth / 2, behavior: 'smooth' });
  }, [selectedCategory, show]);

  const goSearch = () => {
    const box = document.getElementById('menu-search');
    if (!box) return;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => box.querySelector('input')?.focus({ preventScroll: true }), 350);
  };

  const mask = `linear-gradient(90deg, ${fade.left ? `transparent 0, #000 ${FADE}px` : '#000 0, #000 0'}, ${fade.right ? `#000 calc(100% - ${FADE}px), transparent 100%` : '#000 100%, #000 100%'})`;

  return (
    <Box sx={{ position: 'sticky', top: { xs: HEADER_H.xs, md: HEADER_H.md }, height: 0, zIndex: 1050 }}>
      <Box
        component="nav"
        aria-label="Menu categories"
        sx={{
          opacity: show ? 1 : 0,
          visibility: show ? 'visible' : 'hidden',
          pointerEvents: show ? 'auto' : 'none',
          transform: show ? 'none' : 'translateY(-6px)',
          transition: 'opacity 0.2s ease, transform 0.2s ease, visibility 0.2s',
          height: STRIP_H,
          display: 'flex',
          [`@media (min-width:${SIDE_MIN}px)`]: { display: 'none' },
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(253, 249, 242, 0.94)',
          backdropFilter: 'blur(12px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
          borderBottom: '1px solid rgba(184, 137, 59, 0.38)',
          boxShadow: '0 10px 18px -14px rgba(60, 35, 10, 0.5)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', maxWidth: 1200, px: { xs: 1.25, md: 3 } }}>
          <IconButton
            aria-label="Search the menu"
            onClick={goSearch}
            sx={{
              flex: '0 0 auto',
              width: 32,
              height: 32,
              color: GOLD,
              border: '1px solid rgba(184, 137, 59, 0.5)',
              backgroundColor: '#FFFEFB',
              '&:hover': { backgroundColor: '#FFFFFF' },
            }}
          >
            <IconSearch size={17} />
          </IconButton>
          <Box
            ref={scroller}
            onScroll={measure}
            sx={{
              display: 'flex',
              gap: 0.75,
              overflowX: 'auto',
              flex: 1,
              minWidth: 0,
              py: 0.5,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              // centred when everything fits, from the left edge when it scrolls
              '& > :first-of-type': { ml: 'auto' },
              '& > :last-of-type': { mr: 'auto' },
              WebkitMaskImage: mask,
              maskImage: mask,
            }}
          >
            <Chip label="All" icon selected={selectedCategory === ''} onClick={() => onSelect('')} />
            {categories.map((c) => (
              <Chip key={c._id} label={c.name} imageUrl={c.imageUrl} selected={selectedCategory === c._id} onClick={() => onSelect(selectedCategory === c._id ? '' : c._id)} />
            ))}
          </Box>
        </Box>
      </Box>

      {/* side list for wide screens */}
      <Box
        component="nav"
        aria-label="Menu categories"
        sx={{
          opacity: show ? 1 : 0,
          visibility: show ? 'visible' : 'hidden',
          pointerEvents: show ? 'auto' : 'none',
          transition: 'opacity 0.2s ease, visibility 0.2s',
          display: 'none',
          [`@media (min-width:${SIDE_MIN}px)`]: { display: 'block' },
          position: 'absolute',
          top: 16,
          left: 'calc(50% - 752px)',
          width: 160,
          maxHeight: { xs: 'calc(100vh - 110px)', md: 'calc(100vh - 118px)' },
          overflowY: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            height: 38,
            px: 1.25,
            mb: 1.5,
            borderRadius: 999,
            backgroundColor: '#FFFEFB',
            border: '1px solid rgba(184, 137, 59, 0.35)',
            '&:focus-within': { borderColor: GOLD },
          }}
        >
          <IconSearch size={16} color={GOLD} aria-hidden />
          <InputBase
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search"
            inputProps={{ 'aria-label': 'Search the menu', autoComplete: 'off', style: { fontSize: '0.875rem' } }}
            sx={{ flex: 1, color: INK }}
          />
          {searchQuery && (
            <IconButton aria-label="Clear search" size="small" onClick={() => onSearch('')} sx={{ p: 0.25 }}>
              <IconX size={14} />
            </IconButton>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pb: 1 }}>
          <CategoryCard compact name="All" icon={<IconLayoutGrid size={26} stroke={1.5} />} selected={selectedCategory === ''} onClick={() => onSelect('')} />
          {categories.map((c) => (
            <CategoryCard
              compact
              key={c._id}
              imageUrl={c.imageUrl}
              name={c.name}
              selected={selectedCategory === c._id}
              onClick={() => onSelect(selectedCategory === c._id ? '' : c._id)}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function Chip({ label, imageUrl, icon, selected, onClick }: { label: string; imageUrl?: string; icon?: boolean; selected: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        flex: '0 0 auto',
        maxWidth: 220,
        height: 34,
        pl: '4px',
        pr: 1.5,
        gap: 0.875,
        borderRadius: 999,
        fontFamily: 'var(--font-display), Georgia, serif',
        fontSize: '0.875rem',
        fontWeight: selected ? 700 : 600,
        letterSpacing: '0.01em',
        color: selected ? '#F6E7C4' : INK,
        backgroundColor: selected ? INK : '#FFFEFB',
        border: `1px solid ${selected ? INK : 'rgba(184, 137, 59, 0.45)'}`,
        boxShadow: selected ? '0 8px 14px -8px rgba(31, 23, 18, 0.7)' : '0 1px 2px rgba(60, 35, 10, 0.06)',
        transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
        '&:active': { transform: 'scale(0.97)' },
        '&:focus-visible': { outline: `2px solid ${GOLD}`, outlineOffset: 2 },
      }}
    >
      <Box
        aria-hidden
        sx={{
          flex: '0 0 auto',
          width: 26,
          height: 26,
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: selected ? 'rgba(246, 213, 142, 0.18)' : '#F4EBDD',
          boxShadow: `0 0 0 1.5px ${selected ? '#F6D58E' : 'rgba(184, 137, 59, 0.7)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: selected ? '#F6D58E' : '#8A6420',
          ml: '1px',
        }}
      >
        {icon ? (
          <IconLayoutGrid size={15} stroke={1.6} />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" width={26} height={26} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : null}
      </Box>
      <Box component="span" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </Box>
    </ButtonBase>
  );
}

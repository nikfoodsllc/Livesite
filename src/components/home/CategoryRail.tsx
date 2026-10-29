'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { IconChevronLeft, IconChevronRight, IconLayoutGrid } from '@tabler/icons-react';
import CategoryCard from '@/components/cards/CategoryCard';

interface RailCategory {
  _id: string;
  name: string;
  imageUrl?: string;
  listingType?: 'flat' | 'day-wise';
}

const FADE = 44;

/**
 * The row of category photos. It scrolls sideways; round arrow buttons (on every screen size) and a soft fade at the
 * edges show that there is more, and each only appears while there is something in that direction.
 */
export default function CategoryRail({
  categories,
  selectedCategory,
  onSelect,
}: {
  categories: RailCategory[];
  selectedCategory: string;
  onSelect: (id: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [measure, categories.length]);

  // when the chosen category changes, bring it into view
  useEffect(() => {
    const el = scroller.current;
    const chosen = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !chosen) return;
    const left = chosen.offsetLeft - el.clientWidth / 2 + chosen.clientWidth / 2;
    el.scrollTo({ left, behavior: 'smooth' });
  }, [selectedCategory]);

  const step = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(160, el.clientWidth * 0.7), behavior: 'smooth' });
  };

  const arrow = {
    position: 'absolute',
    top: 'calc(50% - 14px)',
    transform: 'translateY(-50%)',
    zIndex: 2,
    width: 38,
    height: 38,
    color: '#1F1712',
    backgroundColor: 'rgba(255, 254, 251, 0.94)',
    border: '1px solid rgba(184, 137, 59, 0.45)',
    boxShadow: '0 10px 20px -10px rgba(60, 35, 10, 0.45)',
    backdropFilter: 'blur(6px)',
    transition: 'transform 0.2s ease, background-color 0.2s ease',
    '&:hover': { backgroundColor: '#FFFFFF', transform: 'translateY(-50%) scale(1.06)' },
    '&:active': { transform: 'translateY(-50%) scale(0.94)' },
  } as const;

  const mask = `linear-gradient(90deg, ${canLeft ? 'transparent 0, #000 ' + FADE + 'px' : '#000 0, #000 0'}, ${canRight ? '#000 calc(100% - ' + FADE + 'px), transparent 100%' : '#000 100%, #000 100%'})`;

  return (
    <Box sx={{ position: 'relative' }}>
      {canLeft && (
        <IconButton aria-label="Scroll categories left" onClick={() => step(-1)} sx={{ ...arrow, left: { xs: -6, md: -18 } }}>
          <IconChevronLeft size={20} />
        </IconButton>
      )}
      <Box
        ref={scroller}
        id="categories-container"
        onScroll={measure}
        sx={{
          display: 'flex',
          gap: { xs: 2, md: 3 },
          overflowX: 'auto',
          scrollSnapType: 'x proximity',
          px: 1,
          scrollPaddingInline: '8px',
          pt: 2,
          pb: 3,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          // centred when everything fits, starts at the left edge when it scrolls
          '& > :first-of-type': { ml: 'auto' },
          '& > :last-of-type': { mr: 'auto' },
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      >
        <CategoryCard name="All" icon={<IconLayoutGrid size={34} stroke={1.5} />} selected={selectedCategory === ''} onClick={() => onSelect('')} />
        {categories.map((category) => (
          <CategoryCard
            key={category._id}
            imageUrl={category.imageUrl}
            name={category.name}
            listingType={category.listingType || 'flat'}
            selected={selectedCategory === category._id}
            onClick={() => onSelect(selectedCategory === category._id ? '' : category._id)}
          />
        ))}
      </Box>
      {canRight && (
        <IconButton aria-label="Scroll categories right" onClick={() => step(1)} sx={{ ...arrow, right: { xs: -6, md: -18 } }}>
          <IconChevronRight size={20} />
        </IconButton>
      )}
    </Box>
  );
}

'use client';

import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import Image from 'next/image';

interface CategoryCardProps {
  imageUrl?: string;
  name: string;
  /** Kept for callers; day-wise and flat categories look the same */
  listingType?: 'flat' | 'day-wise';
  selected?: boolean;
  onClick?: () => void;
  /** Shown inside the ring instead of a photo (the "All" tile) */
  icon?: ReactNode;
}

/** A round photo with a fine gold ring and its name underneath. The chosen one gets a solid gold ring and a dark name tag. */
export default function CategoryCard({ imageUrl, name, selected = false, onClick, icon }: CategoryCardProps) {
  const imageSize = 84;

  // Fallback placeholder image when imageUrl is undefined or null
  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiByeD0iNDAiIGZpbGw9IiNGNUY1RjUiLz4KPHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIyMCIgeT0iMjAiPgo8cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJTNi40OCAyMiAxMiAyMlMyMiAxNy41MiAyMiAxMlMxNy41MiAyIDEyIDJ6TTEyIDIwYy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHpNMTMgN2gtMnY2aDZWN2gtNHoiIGZpbGw9IiNDQ0NDQ0MiLz4KPC9zdmc+Cjwvc3ZnPgo=';
  const imageSrc = imageUrl || fallbackImage;

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      sx={{
        width: { xs: 92, md: 108 },
        flex: '0 0 auto',
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.25,
        cursor: 'pointer',
        outline: 'none',
        '&:hover .cat-ring': { transform: 'translateY(-3px)', boxShadow: '0 16px 26px -12px rgba(138, 100, 32, 0.55)' },
        '&:active .cat-ring': { transform: 'scale(0.96)' },
        '&:focus-visible .cat-ring': { boxShadow: '0 0 0 3px #FBF7F0, 0 0 0 5px #B8893B' },
      }}
    >
      <Box
        className="cat-ring"
        sx={{
          width: { xs: imageSize, md: imageSize + 12 },
          height: { xs: imageSize, md: imageSize + 12 },
          borderRadius: '50%',
          p: selected ? '4px' : '3px',
          background: selected
            ? 'linear-gradient(135deg, #F6D58E 0%, #B8893B 55%, #8A6420 100%)'
            : 'linear-gradient(135deg, rgba(184, 137, 59, 0.7), rgba(184, 137, 59, 0.18))',
          boxShadow: selected ? '0 14px 24px -12px rgba(138, 100, 32, 0.6)' : '0 8px 18px -12px rgba(60, 35, 10, 0.35)',
          transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid #FFFFFF',
            backgroundColor: '#F4EBDD',
          }}
        >
          {icon ? (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: selected ? '#F6D58E' : '#8A6420', backgroundColor: selected ? '#1F1712' : '#FBF4E6', transition: 'background-color 0.25s ease, color 0.25s ease' }}>
              {icon}
            </Box>
          ) : (
            <Image src={imageSrc} alt={name} fill sizes="100px" style={{ objectFit: 'cover' }} />
          )}
        </Box>
      </Box>

      <Typography
        className="category-name"
        sx={{
          fontFamily: 'var(--font-display), Georgia, serif',
          fontWeight: selected ? 700 : 600,
          fontSize: { xs: '0.8125rem', md: '0.9375rem' },
          lineHeight: 1.2,
          textAlign: 'center',
          px: selected ? 1.25 : 0.25,
          py: selected ? 0.5 : 0.25,
          borderRadius: 999,
          color: selected ? '#F6E7C4' : '#1F1712',
          backgroundColor: selected ? '#1F1712' : 'transparent',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          textWrap: 'balance',
          transition: 'background-color 0.25s ease, color 0.25s ease',
        }}
      >
        {name}
      </Typography>
    </Box>
  );
}

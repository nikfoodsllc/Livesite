'use client';

import { Box, Typography } from '@mui/material';
import Image from 'next/image';

interface CategoryCardProps {
  imageUrl?: string;
  name: string;
  /** Flat categories use a neutral card; day-wise keeps the warm tint when unselected */
  listingType?: 'flat' | 'day-wise';
  selected?: boolean;
  onClick?: () => void;
}

export default function CategoryCard({
  imageUrl,
  name,
  listingType = 'flat',
  selected = false,
  onClick,
}: CategoryCardProps) {
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
        width: 118,
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.25,
        pt: 1.5,
        pb: 1.75,
        px: 1,
        borderRadius: '20px',
        cursor: 'pointer',
        backgroundColor: selected ? '#1F1712' : listingType === 'flat' ? '#FFFEFB' : '#F6EDDC',
        border: selected ? '1px solid #1F1712' : '1px solid rgba(60, 35, 10, 0.09)',
        boxShadow: selected
          ? '0 14px 26px -12px rgba(31, 23, 18, 0.55)'
          : '0 1px 2px rgba(60, 35, 10, 0.05), 0 10px 22px -14px rgba(60, 35, 10, 0.25)',
        transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease, background-color 0.25s ease',
        outline: 'none',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 18px 28px -14px rgba(60, 35, 10, 0.35)',
        },
        '&:active': { transform: 'scale(0.97)' },
        '&:focus-visible': { boxShadow: '0 0 0 2px #FBF7F0, 0 0 0 4px #B8893B' },
      }}
    >
      {/* Round photo with a fine gold ring */}
      <Box
        sx={{
          width: imageSize + 8,
          height: imageSize + 8,
          borderRadius: '50%',
          p: '3px',
          background: selected
            ? 'linear-gradient(135deg, #F6D58E, #B8893B)'
            : 'linear-gradient(135deg, rgba(184, 137, 59, 0.75), rgba(184, 137, 59, 0.2))',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid #FFFEFB',
            backgroundColor: '#F4EBDD',
          }}
        >
          <Image src={imageSrc} alt={name} fill sizes="92px" style={{ objectFit: 'cover' }} />
        </Box>
      </Box>

      {/* Category Name */}
      <Typography
        className="category-name"
        sx={{
          fontFamily: 'var(--font-display), Georgia, serif',
          fontWeight: 600,
          fontSize: '0.9375rem',
          lineHeight: 1.2,
          color: selected ? '#F6E7C4' : '#1F1712',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          minHeight: 36,
          textWrap: 'balance',
          transition: 'color 0.25s ease',
        }}
      >
        {name}
      </Typography>
    </Box>
  );
}

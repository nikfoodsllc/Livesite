'use client';

import { Box, Tooltip } from '@mui/material';
import { IconSeedling } from '@tabler/icons-react';
import { allergenInfo, type AllergenKey } from '@/lib/allergens';

/** Sesame and mustard have no emoji: drawn here, 24px grid, round strokes. */
function Custom({ k, size }: { k: 'sesame' | 'mustard'; size: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (k === 'sesame')
    return (
      <svg {...common}>
        <path d="M8 4c2.2.800 3.200 3 2.200 5.600S7.200 13.600 5.800 12.800 5 8.600 6.200 6.200C6.700 5.200 7.300 4.300 8 4z" />
        <path d="M17.500 10c2.2.800 3.200 3 2.200 5.600s-3 4-4.400 3.200-.8-4.200.4-6.600c.5-1 1.100-1.900 1.800-2.200z" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="8" cy="9" r="2.600" />
      <circle cx="16" cy="8" r="2.600" />
      <circle cx="11" cy="16" r="2.600" />
      <circle cx="18" cy="16.5" r="1.800" />
    </svg>
  );
}

const EMOJI: Partial<Record<AllergenKey, string>> = {
  milk: '\u{1F95B}', // glass of milk
  eggs: '\u{1F95A}', // egg
  fish: '\u{1F41F}', // fish
  shellfish: '\u{1F990}', // shrimp
  tree_nuts: '\u{1F330}', // chestnut
  peanuts: '\u{1F95C}', // peanuts
  gluten: '\u{1F33E}', // sheaf of rice / wheat
};

function Glyph({ k, size }: { k: AllergenKey; size: number }) {
  const emoji = EMOJI[k];
  if (emoji) {
    return (
      <span aria-hidden style={{ fontSize: size * 0.95, lineHeight: 1, fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}>
        {emoji}
      </span>
    );
  }
  if (k === 'soy') return <IconSeedling size={size} stroke={2} aria-hidden />;
  return <Custom k={k as 'sesame' | 'mustard'} size={size} />;
}

/**
 * One allergen as a round badge: the icon on a soft tint of its colour. Hover (computer) or press and hold (phone)
 * shows what it is ("Contains milk (dairy)"). It is also readable by screen readers.
 */
export default function AllergenIcon({ allergen, size = 22 }: { allergen: AllergenKey; size?: number }) {
  const info = allergenInfo(allergen);
  if (!info) return null;
  return (
    <Tooltip title={info.description} arrow enterTouchDelay={0} leaveTouchDelay={2500}>
      <Box
        role="img"
        aria-label={info.description}
        tabIndex={0}
        // a click on the badge must not open the dish popup underneath it
        onClick={(e) => e.stopPropagation()}
        sx={{
          width: size + 10,
          height: size + 10,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: info.color,
          backgroundColor: info.bg,
          boxShadow: `inset 0 0 0 1px ${info.color}33`,
          '&:focus-visible': { outline: `2px solid ${info.color}`, outlineOffset: 1 },
        }}
      >
        <Glyph k={allergen} size={size} />
      </Box>
    </Tooltip>
  );
}

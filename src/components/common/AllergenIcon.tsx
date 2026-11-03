'use client';

import { Box, Tooltip } from '@mui/material';
import { allergenInfo, type AllergenKey } from '@/lib/allergens';

/** Soy, sesame and mustard have no emoji: drawn as filled, coloured seeds in the same look as the emoji. 24px grid. */
function Seeds({ k, size }: { k: 'soy' | 'sesame' | 'mustard'; size: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true };
  if (k === 'soy')
    // three soybeans: round beige-green beans, each with a small dark eye
    return (
      <svg {...common}>
        {[
          [8, 9],
          [16, 9.5],
          [12, 16],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx="4.6" ry="4.1" fill="#D9C98A" stroke="#8C7A33" strokeWidth="1.2" />
            <ellipse cx={cx - 1.2} cy={cy - 1.3} rx="1.3" ry="0.8" fill="#F1E6B8" />
            <circle cx={cx + 1.6} cy={cy + 1.2} r="0.8" fill="#6B5B20" />
          </g>
        ))}
      </svg>
    );
  if (k === 'sesame')
    // four sesame seeds: cream teardrops, pointed at one end
    return (
      <svg {...common}>
        {[
          [7, 8, -30],
          [16, 7, 25],
          [9, 16, 20],
          [17, 16, -25],
        ].map(([x, y, r], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
            <path d="M0 -4.2C2.6 -1.800 3.2 1.800 0 4.2C-3.2 1.800 -2.6 -1.800 0 -4.2Z" fill="#F4E8C8" stroke="#9A8250" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M0 -2.200V2.400" stroke="#D4BF8C" strokeWidth="0.9" strokeLinecap="round" />
          </g>
        ))}
      </svg>
    );
  // mustard: round yellow-brown seeds, a few of them
  return (
    <svg {...common}>
      {[
        [8, 8, 3.2],
        [16, 7.5, 3],
        [12, 14.5, 3.4],
        [5.5, 16.5, 2.4],
        [18.5, 16, 2.6],
      ].map(([cx, cy, r], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r} fill="#E3A81B" stroke="#8A6410" strokeWidth="1.2" />
          <circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.28} fill="#F8DC8A" />
        </g>
      ))}
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
  return <Seeds k={k as 'soy' | 'sesame' | 'mustard'} size={Math.round(size * 1.12)} />;
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

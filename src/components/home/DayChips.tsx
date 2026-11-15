'use client';

import { Box, ButtonBase } from '@mui/material';
import { HEADER_H, STRIP_H } from '@/components/home/StickyCategoryNav';

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/** "Tue" and "17" for a YYYY-MM-DD date (read at noon UTC so no time zone can move the day) */
function parts(date: string): { wd: string; n: string } {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return { wd: dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }), n: String(dt.getUTCDate()) };
}

/** Where a day's block starts, so the sticky bars above it do not cover its heading */
export const dayAnchorId = (key: string, date: string) => `day-${key}-${date}`;
export const DAY_SCROLL_MARGIN = { xs: HEADER_H.xs + STRIP_H + 8, md: HEADER_H.md + STRIP_H + 8 };

/** One chip per open day; tapping one glides to that day's block. Only worth showing for two or more days. */
export default function DayChips({ dates, anchorKey }: { dates: string[]; anchorKey: string }) {
  if (dates.length < 2) return null;
  return (
    <Box
      role="navigation"
      aria-label="Delivery days"
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        pb: 1,
        mb: 2,
        mx: { xs: -2, sm: 0 },
        px: { xs: 2, sm: 0 },
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {dates.map((date) => {
        const { wd, n } = parts(date);
        return (
          <ButtonBase
            key={date}
            onClick={() => document.getElementById(dayAnchorId(anchorKey, date))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            aria-label={`Jump to ${wd} ${n}`}
            sx={{
              flexShrink: 0,
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: 58,
              px: 1.5,
              py: 0.75,
              borderRadius: '16px',
              background: '#FFFEFB',
              boxShadow: 'inset 0 0 0 1px rgba(184,137,59,0.4)',
              color: '#1F1712',
              transition: `transform 400ms ${EASE}, background 300ms ${EASE}, box-shadow 300ms ${EASE}`,
              '&:hover': { background: '#FBF1DA' },
              '&:active': { transform: 'scale(0.95)' },
              '&.Mui-focusVisible': { outline: '2px solid #C9A24B', outlineOffset: 2 },
            }}
          >
            <Box component="span" sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A6420', fontWeight: 600 }}>
              {wd}
            </Box>
            <Box component="span" sx={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.15 }}>
              {n}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

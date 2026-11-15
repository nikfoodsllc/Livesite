'use client';

import { Box, Button, Typography } from '@mui/material';
import { IconArrowRight } from '@tabler/icons-react';

const INK = '#3B1F0E'; // the drawing's outline: the brand's deep brown
const EASE_BOB = 'cubic-bezier(0.45, 0, 0.55, 1)';

/**
 * The empty cart: the same samosa as in the app, with a face, standing on a soft blob and bobbing gently
 * (it stands still for people who prefer less motion), one short line and one way forward.
 */
export default function SamosaEmptyState({ onOrder }: { onOrder: () => void }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        py: { xs: 5, sm: 7 },
        px: 3,
        '@keyframes samosaBob': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        '@keyframes samosaShadow': { '0%, 100%': { transform: 'scaleX(1)', opacity: 1 }, '50%': { transform: 'scaleX(0.86)', opacity: 0.75 } },
        '@media (prefers-reduced-motion: reduce)': { '& .samosa-body, & .samosa-shadow': { animation: 'none' } },
      }}
    >
      <Box sx={{ position: 'relative', width: 240, height: 250, maxWidth: '100%' }} aria-hidden>
        <Box component="svg" viewBox="0 0 240 250" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <path d="M42 120C34 70 74 22 128 28c52 6 86 46 70 98-12 40-52 66-96 62C62 184 48 158 42 120Z" fill="#F6F0E6" />
        </Box>
        <Box
          className="samosa-shadow"
          component="svg"
          viewBox="0 0 120 14"
          sx={{ position: 'absolute', left: '50%', bottom: 14, width: 120, height: 14, ml: '-60px', animation: `samosaShadow 3s ${EASE_BOB} infinite` }}
        >
          <ellipse cx="60" cy="7" rx="52" ry="6" fill="#D8CFC4" />
        </Box>
        <Box
          className="samosa-body"
          component="svg"
          viewBox="0 0 240 210"
          sx={{ position: 'absolute', left: 0, top: 18, width: '100%', height: 210, animation: `samosaBob 3s ${EASE_BOB} infinite` }}
        >
          {/* legs and feet */}
          <path d="M98 160v26M142 160v26" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="92" cy="189" rx="11" ry="5" fill={INK} />
          <ellipse cx="148" cy="189" rx="11" ry="5" fill={INK} />
          {/* arms */}
          <path d="M66 128c-16 4-22 16-16 26" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M174 128c16 4 22 16 16 26" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
          {/* the samosa */}
          <path d="M120 22 L192 160 Q194 168 184 168 H56 Q46 168 48 160 Z" fill="#E9AE55" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d="M120 22 L192 160 Q194 168 184 168 H138 Z" fill="#CF8B2E" opacity="0.55" />
          {/* the crimped edge */}
          <g stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.55">
            <path d="M134 56l6-3M142 72l6-3M150 88l6-3M158 104l6-3M166 120l6-3M174 136l6-3" />
          </g>
          {/* face */}
          <circle cx="104" cy="112" r="4.5" fill={INK} />
          <circle cx="138" cy="112" r="4.5" fill={INK} />
          <path d="M113 126q8 6 16 0" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
          <ellipse cx="93" cy="124" rx="7" ry="4.5" fill="#E0705A" opacity="0.45" />
          <ellipse cx="149" cy="124" rx="7" ry="4.5" fill="#E0705A" opacity="0.45" />
          {/* a little steam */}
          <path d="M112 12q-5-6 0-11M126 10q5-6 0-11" stroke="#C9BFB2" strokeWidth="3" strokeLinecap="round" fill="none" />
        </Box>
      </Box>

      <Typography
        component="h2"
        sx={{ mt: 1.5, fontFamily: 'var(--font-display), Georgia, serif', fontWeight: 600, fontSize: { xs: '1.75rem', sm: '2.1rem' }, lineHeight: 1.15, color: '#1F1712' }}
      >
        Your cart is empty
      </Typography>
      <Typography sx={{ mt: 0.75, fontSize: '1rem', color: '#6B5B47' }}>It&apos;s lonely in here.</Typography>

      <Button
        onClick={onOrder}
        endIcon={<IconArrowRight size={19} stroke={1.8} />}
        sx={{
          mt: 3,
          px: 4,
          height: 52,
          borderRadius: 999,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          color: '#FBF1DA',
          background: 'linear-gradient(135deg, #2B1F14 0%, #14100C 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,236,196,0.16), 0 14px 26px -14px rgba(40,26,10,0.6)',
          transition: 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)',
          '&:hover': { background: 'linear-gradient(135deg, #3A2A14 0%, #1B1510 100%)' },
          '&:active': { transform: 'scale(0.985)' },
        }}
      >
        Order now
      </Button>
    </Box>
  );
}

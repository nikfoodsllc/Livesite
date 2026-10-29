'use client';

import { Box, GlobalStyles } from '@mui/material';

/**
 * Page loader: the NikFoods wordmark with a soft gold light sweeping across it, and a thin gold line that
 * slides underneath. Pure CSS (no gif), and it only fades gently for anyone who asked for less motion.
 */
export default function BrandLoader({ width = 150, label = 'Loading' }: { width?: number; label?: string }) {
  return (
    <Box role="status" aria-label={label} sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <GlobalStyles
        styles={{
          '@keyframes nfSweep': { '0%': { transform: 'translateX(-130%) skewX(-18deg)' }, '100%': { transform: 'translateX(230%) skewX(-18deg)' } },
          '@keyframes nfLine': { '0%': { transform: 'translateX(-110%)' }, '100%': { transform: 'translateX(260%)' } },
          '@keyframes nfFade': { '0%, 100%': { opacity: 0.55 }, '50%': { opacity: 1 } },
        }}
      />
      <Box sx={{ position: 'relative', width, overflow: 'hidden', lineHeight: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="" width={width} style={{ display: 'block', width, height: 'auto', opacity: 0.9 }} />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            width: '45%',
            background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,246,222,0.95) 50%, rgba(255,255,255,0) 100%)',
            mixBlendMode: 'soft-light',
            animation: 'nfSweep 1.9s cubic-bezier(0.45, 0, 0.25, 1) infinite',
            '@media (prefers-reduced-motion: reduce)': { animation: 'nfFade 2.4s ease-in-out infinite', width: '100%', transform: 'none' },
          }}
        />
      </Box>
      <Box aria-hidden sx={{ position: 'relative', width: width * 0.62, height: '1px', overflow: 'hidden', backgroundColor: 'rgba(184, 137, 59, 0.22)' }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            width: '40%',
            background: 'linear-gradient(90deg, transparent, #B8893B, transparent)',
            animation: 'nfLine 1.6s ease-in-out infinite',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', width: '100%', opacity: 0.6 },
          }}
        />
      </Box>
    </Box>
  );
}

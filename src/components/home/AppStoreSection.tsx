import { Box } from '@mui/material';
import { APP_STORE_URL } from '@/lib/appStore';

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * App strip above the home banners: a floating pill in two layers (a gold hairline shell around a deep espresso core),
 * the logo, "Download the NikFoods App" and the App Store badge. A slow band of light passes over it; the whole pill opens the App Store page.
 */
export default function AppStoreSection() {
  return (
    <Box component="section" aria-label="NikFoods app" sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, mt: { xs: 1.5, md: 2 }, mb: { xs: 1.5, md: 2 } }}>
      <Box
        component="a"
        href={APP_STORE_URL}
        aria-label="Download the NikFoods App on the App Store"
        target="_blank"
        rel="noopener"
        sx={{
          display: 'block',
          p: '3px',
          borderRadius: { xs: '22px', sm: 999 },
          textDecoration: 'none',
          // outer shell: a thin gold edge that catches light
          background: 'linear-gradient(135deg, rgba(226,188,106,0.85) 0%, rgba(184,137,59,0.25) 38%, rgba(226,188,106,0.7) 100%)',
          boxShadow: '0 18px 34px -18px rgba(60,35,10,0.55), 0 2px 6px rgba(60,35,10,0.12)',
          transition: `transform 500ms ${EASE}, box-shadow 500ms ${EASE}`,
          '&:hover': { boxShadow: '0 24px 40px -18px rgba(60,35,10,0.62), 0 2px 6px rgba(60,35,10,0.14)' },
          '&:hover .appBadge': { transform: 'translateY(-1px) scale(1.04)' },
          '&:active': { transform: 'scale(0.992)' },
          '&:focus-visible': { outline: '2px solid #C9A24B', outlineOffset: 3 },
          '@keyframes appSweep': { from: { transform: 'translateX(-130%) skewX(-18deg)' }, to: { transform: 'translateX(330%) skewX(-18deg)' } },
          '@media (prefers-reduced-motion: reduce)': { '& *': { animation: 'none !important' } },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: { xs: 1, sm: 2 },
            pl: { xs: 1.75, sm: 3.5 },
            pr: { xs: 0.75, sm: 1 },
            py: { xs: '8px', sm: '8px' },
            borderRadius: { xs: '19px', sm: 999 },
            // espresso with a warm glow behind the logo and a soft top highlight
            background: 'radial-gradient(70% 220% at 0% 50%, rgba(201,162,75,0.2) 0%, rgba(201,162,75,0) 60%), linear-gradient(135deg, #2A1E13 0%, #17110C 55%, #0F0B08 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,236,196,0.14), inset 0 0 0 1px rgba(0,0,0,0.35)',
          }}
        >
          {/* band of light */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '22%',
              pointerEvents: 'none',
              background: 'linear-gradient(90deg, rgba(255,236,196,0) 0%, rgba(255,236,196,0.14) 50%, rgba(255,236,196,0) 100%)',
              animation: 'appSweep 7s cubic-bezier(0.4, 0, 0.2, 1) 2s infinite',
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="NikFoods" width={341} height={136} style={{ display: 'block', height: 'auto', width: 'clamp(60px, 17vw, 96px)', flexShrink: 0, position: 'relative' }} />
          <Box
            component="span"
            sx={{
              position: 'relative',
              flex: 1,
              textAlign: 'center',
              color: '#F6EBD3',
              fontFamily: 'var(--font-display), Georgia, serif',
              fontWeight: 500,
              fontSize: { xs: 14, sm: 20 },
              letterSpacing: '0.02em',
              lineHeight: 1.15,
              whiteSpace: { xs: 'normal', sm: 'nowrap' },
              textWrap: 'balance',
            }}
          >
            Download the NikFoods App
          </Box>
          {/* the badge sits in its own light well, flush with the pill's end */}
          <Box
            className="appBadge"
            sx={{
              position: 'relative',
              flexShrink: 0,
              p: { xs: '4px', sm: '5px' },
              borderRadius: { xs: '14px', sm: 999 },
              background: 'rgba(255,236,196,0.07)',
              boxShadow: 'inset 0 0 0 1px rgba(226,188,106,0.28)',
              transition: `transform 500ms ${EASE}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/app-store-badge.png" alt="Download on the App Store" width={360} height={120} style={{ display: 'block', height: 'auto', width: 'clamp(88px, 26vw, 112px)', borderRadius: 8 }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

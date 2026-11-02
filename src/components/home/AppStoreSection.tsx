import { Box } from '@mui/material';
import { APP_STORE_URL } from '@/lib/appStore';

/** Thin app strip above the home banners: logo, "Download Our App" and the App Store badge; the whole strip opens the App Store page. */
export default function AppStoreSection() {
  return (
    <Box component="section" aria-label="NikFoods app" sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, mt: { xs: 1.5, md: 2 }, mb: { xs: 1.5, md: 2 } }}>
      <Box
        component="a"
        href={APP_STORE_URL}
        aria-label="Download Our App on the App Store"
        target="_blank"
        rel="noopener"
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: { xs: 1, sm: 2 },
          px: { xs: 1.5, sm: 3 },
          py: { xs: 'calc(8px - 1px)', sm: 'calc(10px - 1px)' }, // minus the 1px border so the height stays the same
          borderRadius: 3,
          overflow: 'hidden',
          textDecoration: 'none',
          // deep espresso with a soft warm glow behind the logo, a hairline gold edge and a faint top highlight
          background: 'radial-gradient(120% 220% at 0% 50%, rgba(201,162,75,0.18) 0%, rgba(201,162,75,0) 55%), linear-gradient(135deg, #241a11 0%, #14100c 60%, #0e0b08 100%)',
          border: '1px solid rgba(201,162,75,0.38)',
          boxShadow: 'inset 0 1px 0 rgba(255,236,196,0.10), 0 6px 18px -8px rgba(40,26,10,0.45)',
          transition: 'box-shadow 200ms ease, border-color 200ms ease',
          '&:hover': { borderColor: 'rgba(201,162,75,0.65)', boxShadow: 'inset 0 1px 0 rgba(255,236,196,0.14), 0 10px 24px -8px rgba(40,26,10,0.55)' },
          '&:active': { transform: 'scale(0.995)' },
          '&:focus-visible': { outline: '2px solid #C9A24B', outlineOffset: 2 },
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="NikFoods" width={341} height={136} style={{ display: 'block', height: 'auto', width: 'clamp(60px, 17vw, 96px)', flexShrink: 0 }} />
        <Box
          component="span"
          sx={{
            flex: 1,
            textAlign: 'center',
            color: '#F6EBD3',
            fontFamily: 'var(--font-display), Georgia, serif',
            fontWeight: 600,
            fontSize: { xs: 15, sm: 20 },
            letterSpacing: '0.01em',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          Download Our App
        </Box>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/app-store-badge.png" alt="Download on the App Store" width={360} height={120} style={{ display: 'block', height: 'auto', width: 'clamp(92px, 27vw, 120px)', flexShrink: 0, borderRadius: 8, boxShadow: '0 0 0 1px rgba(201,162,75,0.35)' }} />
      </Box>
    </Box>
  );
}

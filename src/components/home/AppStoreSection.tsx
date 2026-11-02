import { Box } from '@mui/material';
import { APP_STORE_URL } from '@/lib/appStore';

/** Thin app strip above the home banners: logo, "Download our app" and the App Store badge; the whole strip opens the App Store page. */
export default function AppStoreSection() {
  return (
    <Box component="section" aria-label="NikFoods app" sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, mt: { xs: 1.5, md: 2 }, mb: { xs: 1.5, md: 2 } }}>
      <Box
        component="a"
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: { xs: 1, sm: 2 },
          maxWidth: 760,
          mx: 'auto',
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1, sm: 1.25 },
          borderRadius: 3,
          bgcolor: '#17120d',
          textDecoration: 'none',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="NikFoods" width={341} height={136} style={{ display: 'block', height: 'auto', width: 'clamp(60px, 17vw, 96px)', flexShrink: 0 }} />
        <Box component="span" sx={{ flex: 1, textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: { xs: 14, sm: 18 }, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
          Download our app
        </Box>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/app-store-badge.png" alt="Download on the App Store" width={360} height={120} style={{ display: 'block', height: 'auto', width: 'clamp(92px, 27vw, 120px)', flexShrink: 0 }} />
      </Box>
    </Box>
  );
}

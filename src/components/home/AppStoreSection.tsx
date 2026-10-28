import { Box } from '@mui/material';
import { APP_STORE_URL } from '@/lib/appStore';

/** The app picture under the home banners; tapping it opens the App Store page. */
export default function AppStoreSection() {
  return (
    <Box component="section" aria-label="NikFoods app" sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, mb: { xs: 2, md: 2 } }}>
      <a href={APP_STORE_URL} target="_blank" rel="noopener" style={{ display: 'block', lineHeight: 0, maxWidth: 560, margin: '0 auto' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/app-popup.png" alt="Get the NikFoods app on the App Store" width={1200} height={600} style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 12 }} />
      </a>
    </Box>
  );
}

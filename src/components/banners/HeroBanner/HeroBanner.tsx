'use client';

import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';

export default function HeroBanner() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Don't show on mobile devices
  if (isMobile) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'relative',
        height: 400,
        backgroundColor: '#FFF9F2',
        overflow: 'hidden',
        mb: { xs: 2, md: 4 },
      }}
    >
      {/* Background Pattern Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url(/images/pattern-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.8,
        }}
      />

      {/* Content Container */}
      <Box
        sx={{
          position: 'relative',
          height: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 4,
        }}
      >
        {/* Left Section: Text Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {/* Banner Text Image */}
          <Box
            component="img"
            src="/images/banner-text.png"
            alt="Authentic Indian Food"
            sx={{
              width: 400,
              height: 100,
              objectFit: 'contain',
            }}
          />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 400,
              fontSize: { md: '1rem', lg: '1.125rem' },
              color: theme.palette.text.secondary,
              maxWidth: 500,
              lineHeight: 1.6,
            }}
          >
            Order your favorite curries, biryanis, and more for convenient delivery across Greater Seattle Region and we do free deliveries too!
          </Typography>
        </Box>

        {/* Right Section: Food Image */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            position: 'relative',
            pr: 0,
          }}
        >
          {/* Decorative Circle 1 */}
          <Box
            sx={{
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: '50%',
              backgroundColor: theme.palette.primary.light,
              opacity: 0.2,
              top: '10%',
              right: '20%',
            }}
          />

          {/* Decorative Circle 2 */}
          <Box
            sx={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: '50%',
              backgroundColor: theme.palette.primary.main,
              opacity: 0.15,
              bottom: '15%',
              right: '40%',
            }}
          />

          {/* Food Image - Thali Plate */}
          <Box
            component="img"
            src="/images/thali-plate.png"
            alt="Indian Thali"
            sx={{
              position: 'relative',
              zIndex: 1,
              width: 500,
              height: 500,
              objectFit: 'cover',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

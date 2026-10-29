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
        background: 'radial-gradient(ellipse at 78% 45%, #F3E4C4 0%, #FBF7F0 62%)',
        overflow: 'hidden',
        mb: { xs: 2, md: 4 },
        borderBottom: '1px solid rgba(184, 137, 59, 0.3)',
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
          opacity: 0.25,
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
          {/* Headline */}
          <Typography
            component="h1"
            sx={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontWeight: 600,
              fontSize: { md: '2.75rem', lg: '3.5rem' },
              lineHeight: 1.1,
              letterSpacing: '-0.005em',
              color: '#1F1712',
              textWrap: 'balance',
            }}
          >
            Your American Source for
            <Box component="span" sx={{ display: 'block', fontStyle: 'italic', fontWeight: 500, color: '#B8893B' }}>
              Delicious Indian Food.
            </Box>
          </Typography>
          <Box aria-hidden sx={{ width: 64, height: '1px', background: 'linear-gradient(90deg, #B8893B, rgba(184,137,59,0))' }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 400,
              fontSize: { md: '1rem', lg: '1.125rem' },
              color: '#5C4F40',
              maxWidth: 480,
              lineHeight: 1.7,
              textWrap: 'pretty',
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
          {/* Gold rings behind the plate */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              width: 440,
              height: 440,
              borderRadius: '50%',
              border: '1px solid rgba(184, 137, 59, 0.45)',
              top: '50%',
              right: 30,
              transform: 'translateY(-50%)',
            }}
          />
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              width: 500,
              height: 500,
              borderRadius: '50%',
              border: '1px solid rgba(184, 137, 59, 0.2)',
              top: '50%',
              right: 0,
              transform: 'translateY(-50%)',
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
              width: 440,
              height: 440,
              marginRight: '30px',
              objectFit: 'cover',
              filter: 'drop-shadow(0 28px 30px rgba(60, 35, 10, 0.3))',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

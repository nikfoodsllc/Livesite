'use client';

import { Box, Typography, Button, useTheme, useMediaQuery } from '@mui/material';
import { IconShoppingCart, IconArrowRight } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

export default function EmptyCart() {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleContinueShopping = () => {
    router.push('/');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: isMobile ? 6 : 10,
        px: 3,
      }}
    >
      {/* Cart Icon */}
      <Box
        sx={{
          width: isMobile ? 120 : 160,
          height: isMobile ? 120 : 160,
          borderRadius: '50%',
          backgroundColor: '#FFF4E4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <IconShoppingCart
          size={isMobile ? 60 : 80}
          strokeWidth={1.5}
          color={theme.palette.primary.main}
        />
      </Box>

      {/* Empty Cart Message */}
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          fontSize: isMobile ? '1.5rem' : '2rem',
          color: theme.palette.text.primary,
          mb: 1.5,
        }}
      >
        Your Cart is Empty
      </Typography>

      <Typography
        variant="body1"
        sx={{
          fontSize: isMobile ? '0.95rem' : '1.05rem',
          color: theme.palette.text.secondary,
          maxWidth: 450,
          mb: 4,
          lineHeight: 1.6,
        }}
      >
        Looks like you haven&apos;t added any delicious meals to your cart yet. Browse our menu and
        add your favorite dishes!
      </Typography>

      {/* Continue Shopping Button */}
      <Button
        variant="contained"
        onClick={handleContinueShopping}
        endIcon={<IconArrowRight size={20} />}
        sx={{
          backgroundColor: theme.palette.primary.main,
          color: '#ffffff',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: isMobile ? '1rem' : '1.05rem',
          px: isMobile ? 3 : 4,
          py: 1.5,
          borderRadius: 2,
          '&:hover': {
            backgroundColor: theme.palette.primary.dark,
          },
        }}
      >
        Continue Shopping
      </Button>

      {/* Additional Info */}
      <Box
        sx={{
          mt: 6,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 2 : 4,
          alignItems: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: isMobile ? '0.95rem' : '1rem',
              color: theme.palette.text.primary,
              mb: 0.5,
            }}
          >
            Fresh & Healthy
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.85rem',
              color: theme.palette.text.secondary,
            }}
          >
            Prepared daily with love
          </Typography>
        </Box>

        <Box
          sx={{
            width: 1,
            height: 40,
            backgroundColor: theme.palette.divider,
            display: isMobile ? 'none' : 'block',
          }}
        />

        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: isMobile ? '0.95rem' : '1rem',
              color: theme.palette.text.primary,
              mb: 0.5,
            }}
          >
            Free Delivery
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.85rem',
              color: theme.palette.text.secondary,
            }}
          >
            Always free
          </Typography>
        </Box>

        <Box
          sx={{
            width: 1,
            height: 40,
            backgroundColor: theme.palette.divider,
            display: isMobile ? 'none' : 'block',
          }}
        />

        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: isMobile ? '0.95rem' : '1rem',
              color: theme.palette.text.primary,
              mb: 0.5,
            }}
          >
            Safe & Secure
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.85rem',
              color: theme.palette.text.secondary,
            }}
          >
            100% secure checkout
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

'use client';

import { Box, Typography, Divider, Button, useTheme, useMediaQuery, CircularProgress } from '@mui/material';
import { IconArrowRight } from '@tabler/icons-react';
import { CartSummary as CartSummaryType } from '@/types/cart';

interface CartSummaryProps {
  summary: CartSummaryType;
  onCheckout: () => void;
  canCheckout: boolean;
  isLoading?: boolean;
  checkoutMessage?: string;
  hasAddress?: boolean;
  minOrderValue?: number;
  selectedZipcode?: string;
  isMobile?: boolean;
}

export default function CartSummary({
  summary,
  onCheckout,
  canCheckout,
  isLoading = false,
  checkoutMessage = '',
  hasAddress = false,
  minOrderValue,
  selectedZipcode,
}: CartSummaryProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Delivery is always free now

  return (
    <Box
      sx={{
        backgroundColor: '#ffffff',
        borderRadius: 3,
        p: isMobile ? 2 : 3,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #f0f0f0',
        position: isMobile ? 'sticky' : 'static',
        bottom: isMobile ? 0 : 'auto',
        zIndex: isMobile ? 10 : 'auto',
      }}
    >
      {/* Summary Header */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          fontSize: isMobile ? '1.25rem' : '1.5rem',
          color: theme.palette.text.primary,
          mb: 2.5,
        }}
      >
        Order Summary
      </Typography>

      {/* Item Total */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          variant="body1"
          sx={{
            fontSize: isMobile ? '0.95rem' : '1rem',
            color: theme.palette.text.primary,
          }}
        >
          Item Total
        </Typography>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            fontSize: isMobile ? '0.95rem' : '1rem',
            color: theme.palette.text.primary,
          }}
        >
          ${summary.subtotal.toFixed(2)}
        </Typography>
      </Box>

      {/* Discount */}
      {summary.discount > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography
            variant="body1"
            sx={{
              fontSize: isMobile ? '0.95rem' : '1rem',
              color: theme.palette.text.primary,
            }}
          >
            Discount
          </Typography>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 600,
              fontSize: isMobile ? '0.95rem' : '1rem',
              color: theme.palette.success.main,
            }}
          >
            -${summary.discount.toFixed(2)}
          </Typography>
        </Box>
      )}

      {/* Item Count */}
      <Typography
        variant="body2"
        sx={{
          fontSize: '0.85rem',
          color: theme.palette.text.secondary,
          mb: 2,
          textAlign: 'center',
        }}
      >
        {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'} in cart
      </Typography>

      {/* Checkout Button */}
      <Button
        variant="contained"
        fullWidth
        onClick={onCheckout}
        disabled={!canCheckout || isLoading}
        endIcon={
          isLoading ? (
            <CircularProgress size={20} sx={{ color: '#ffffff' }} />
          ) : (
            <IconArrowRight size={20} />
          )
        }
        sx={{
          backgroundColor: canCheckout ? theme.palette.primary.main : theme.palette.grey[400],
          color: '#ffffff',
          textTransform: 'none',
          fontWeight: 700,
          fontSize: isMobile ? '1rem' : '1.1rem',
          height: isMobile ? 48 : 50,
          borderRadius: 2,
          '&:hover': {
            backgroundColor: canCheckout ? theme.palette.primary.dark : theme.palette.grey[400],
          },
          '&:disabled': {
            backgroundColor: theme.palette.grey[400],
            color: '#ffffff',
          },
        }}
      >
        Proceed to Checkout
      </Button>

      {/* Disabled Message - Show checkout message when address is selected */}
      {!canCheckout && checkoutMessage && hasAddress && (
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.875rem',
            color: theme.palette.error.main,
            textAlign: 'center',
            mt: 1.5,
            fontWeight: 500,
          }}
        >
          {checkoutMessage}
        </Typography>
      )}

      {/* Address Selection Prompt - Show when no address is selected */}
      {!hasAddress && (
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.875rem',
            color: theme.palette.info.main,
            textAlign: 'center',
            mt: 1.5,
            fontWeight: 500,
          }}
        >
          Please select a delivery address to check order eligibility
        </Typography>
      )}

      {/* Payment Info */}
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontSize: '0.8rem',
          color: theme.palette.text.secondary,
          textAlign: 'center',
          mt: 2,
        }}
      >
        We accept all major credit cards
      </Typography>
    </Box>
  );
}

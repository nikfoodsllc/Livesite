'use client';

import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  IconX,
  IconShoppingCart,
  IconArrowRight,
} from '@tabler/icons-react';
import { useCart } from '@/contexts/CartContext';
import CartDaySection from './CartDaySection';
import EmptyCart from './EmptyCart';

interface CartPreviewSidebarProps {
  open: boolean;
  onClose: () => void;
  onViewFullCart?: () => void;
  onCheckout?: () => void;
}

export default function CartPreviewSidebar({
  open,
  onClose,
  onViewFullCart,
  onCheckout,
}: CartPreviewSidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { cart, summary, isLoading } = useCart();

  const drawerWidth = isMobile ? '85%' : 400;

  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout();
      onClose();
    }
  };

  const handleViewFullCart = () => {
    if (onViewFullCart) {
      onViewFullCart();
      onClose();
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          maxWidth: '100vw',
          boxSizing: 'border-box',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconShoppingCart
            size={24}
            color={theme.palette.primary.main}
          />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              color: theme.palette.text.primary,
            }}
          >
            Your Cart
          </Typography>
          {summary && summary.itemCount > 0 && (
            <Box
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                borderRadius: '50%',
                minWidth: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {summary.itemCount}
            </Box>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <IconX size={20} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box
        sx={{
          height: 'calc(100vh - 140px)',
          overflowY: 'auto',
          backgroundColor: theme.palette.background.default,
        }}
      >
        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '50%',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Typography
              variant="body1"
              sx={{ color: theme.palette.text.secondary }}
            >
              Loading cart...
            </Typography>
          </Box>
        ) : !cart || !summary || summary.itemCount === 0 ? (
          <Box sx={{ p: 2 }}>
            {/* Simplified Empty State for Sidebar */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                py: 6,
                px: 2,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: '#FFF4E4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <IconShoppingCart
                  size={40}
                  strokeWidth={1.5}
                  color={theme.palette.primary.main}
                />
              </Box>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: theme.palette.text.primary,
                  mb: 1,
                }}
              >
                Your Cart is Empty
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.9rem',
                  color: theme.palette.text.secondary,
                  mb: 3,
                  lineHeight: 1.5,
                }}
              >
                Add delicious meals to your cart to see them here
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            {/* Cart Items by Day */}
            {cart.days.map((day) => (
              <CartDaySection
                key={day._id}
                cartDay={day}
                hasAddress={!!cart.selectedAddress}
                onClose={onClose}
              />
            ))}

            {/* Cart Summary */}
            <Box
              sx={{
                backgroundColor: '#ffffff',
                borderRadius: 2,
                p: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #f0f0f0',
                mt: 2,
              }}
            >
              {/* Summary Header */}
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: theme.palette.text.primary,
                  mb: 2,
                }}
              >
                Order Summary
              </Typography>

              {/* Item Total */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.9rem',
                    color: theme.palette.text.primary,
                  }}
                >
                  Item Total
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: theme.palette.text.primary,
                  }}
                >
                  ${summary.subtotal.toFixed(2)}
                </Typography>
              </Box>

              {/* Discount */}
              {summary.discount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.9rem',
                      color: theme.palette.text.primary,
                    }}
                  >
                    Discount
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: theme.palette.success.main,
                    }}
                  >
                    -${summary.discount.toFixed(2)}
                  </Typography>
                </Box>
              )}

              {/* Item Count */}
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.8rem',
                  color: theme.palette.text.secondary,
                  mb: 2,
                  display: 'block',
                  textAlign: 'center',
                }}
              >
                {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'} in cart
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Action Buttons */}
      {cart && summary && summary.itemCount > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            backgroundColor: theme.palette.background.paper,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {/* View Full Cart Button */}
          {onViewFullCart && (
            <Button
              variant="outlined"
              fullWidth
              onClick={handleViewFullCart}
              sx={{
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: isMobile ? '0.9rem' : '1rem',
                height: 44,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  borderColor: theme.palette.primary.main,
                },
              }}
            >
              View Full Cart
            </Button>
          )}

          {/* Checkout Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleCheckout}
            disabled={!cart.canCheckout}
            endIcon={<IconArrowRight size={18} />}
            sx={{
              backgroundColor: cart.canCheckout
                ? theme.palette.primary.main
                : theme.palette.grey[400],
              color: 'white',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: isMobile ? '0.9rem' : '1rem',
              height: 44,
              borderRadius: 2,
              '&:hover': {
                backgroundColor: cart.canCheckout
                  ? theme.palette.primary.dark
                  : theme.palette.grey[400],
              },
              '&:disabled': {
                backgroundColor: theme.palette.grey[400],
                color: 'white',
              },
            }}
          >
            Proceed to Checkout
          </Button>

          {/* Checkout Disabled Message */}
          {!cart.canCheckout && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.75rem',
                color: theme.palette.error.main,
                textAlign: 'center',
                fontWeight: 500,
              }}
            >
              Minimum order value not met for this order
            </Typography>
          )}
        </Box>
      )}
    </Drawer>
  );
}
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
  IconLock,
} from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';
import SamosaEmptyState from './SamosaEmptyState';
import { useCart } from '@/contexts/CartContext';
import { DEFAULT_MIN_CART_VALUE } from '@/lib/cartLogic';
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
  const { cart, summary, isLoading, minOrderValue } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  // "Order now" from the empty cart: close it and take the customer to the menu
  const handleOrderNow = () => {
    onClose();
    if (pathname === '/') {
      window.setTimeout(() => document.getElementById('menu-search')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    } else {
      router.push('/');
    }
  };

  // Nothing can be checked out while all the days together are under the minimum; the per-day cards say which day, this says what unlocks checkout
  const minValue = minOrderValue && minOrderValue > 0 ? minOrderValue : DEFAULT_MIN_CART_VALUE;
  const cartTotal = summary?.subtotal ?? 0;
  const shortfall = Math.max(0, minValue - cartTotal);
  const blocked = Boolean(cart && summary && summary.itemCount > 0 && !cart.canCheckout && shortfall > 0);
  // days under the minimum are delivered with the last day in the cart
  const lastDay = cart?.days.length ? cart.days.reduce((a, d) => (new Date(d.date).getTime() > new Date(a.date).getTime() ? d : a), cart.days[0]) : undefined;
  const lastDayLabel = lastDay ? (lastDay.formattedDate || String(lastDay.day)).replace(/,\s*\d{4}$/, '') : '';

  const drawerWidth = isMobile ? 'min(92%, 420px)' : 420;

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
      slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(31, 23, 18, 0.38)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' } } }}
      sx={{
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          maxWidth: '100vw',
          boxSizing: 'border-box',
          borderRadius: '28px 0 0 28px',
          overflow: 'hidden',
          boxShadow: '-24px 0 48px -24px rgba(31, 23, 18, 0.45)',
          // header, a list that scrolls, and a footer that stays in view (the footer no longer floats over the list)
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.palette.background.default,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          flexShrink: 0,
          borderBottom: '1px solid rgba(184, 137, 59, 0.3)',
          backgroundColor: '#FFFEFB',
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
              fontFamily: 'var(--font-display), Georgia, serif',
              fontWeight: 600,
              fontSize: isMobile ? '1.25rem' : '1.4rem',
              color: '#1F1712',
            }}
          >
            Your Cart
          </Typography>
          {summary && summary.itemCount > 0 && (
            <Box
              sx={{
                backgroundColor: '#1F1712',
                color: '#F6D58E',
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
        <IconButton
          onClick={onClose}
          aria-label="Close cart"
          sx={{
            width: 38,
            height: 38,
            backgroundColor: '#F7F0E3',
            color: '#1F1712',
            transition: 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1), background-color 300ms ease',
            '&:hover': { backgroundColor: '#EFE3CC' },
            '&:active': { transform: 'scale(0.92)' },
          }}
        >
          <IconX size={19} stroke={1.8} />
        </IconButton>
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          backgroundColor: theme.palette.background.default,
          '@keyframes cartIn': { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
          '& .MuiCard-root': { animation: 'cartIn 650ms cubic-bezier(0.32, 0.72, 0, 1) backwards' },
          '& .MuiCard-root:nth-of-type(2)': { animationDelay: '70ms' },
          '& .MuiCard-root:nth-of-type(3)': { animationDelay: '140ms' },
          '& .MuiCard-root:nth-of-type(4)': { animationDelay: '210ms' },
          '@media (prefers-reduced-motion: reduce)': { '& .MuiCard-root': { animation: 'none' } },
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
          <SamosaEmptyState onOrder={handleOrderNow} />
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

            {/* Subtotal */}
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', px: 0.5, pt: 1, pb: 1 }}>
              <Typography sx={{ fontFamily: 'var(--font-display), Georgia, serif', fontWeight: 600, fontSize: '1.125rem', color: '#1F1712' }}>
                Subtotal
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.375rem', color: '#1F1712', fontVariantNumeric: 'tabular-nums' }}>
                ${summary.subtotal.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Action Buttons */}
      {cart && summary && summary.itemCount > 0 && (
        <Box
          sx={{
            flexShrink: 0,
            px: 2,
            pt: 1.5,
            pb: 'max(16px, env(safe-area-inset-bottom))',
            backgroundColor: '#FFFEFB',
            borderTop: '1px solid rgba(184, 137, 59, 0.3)',
            boxShadow: '0 -14px 24px -18px rgba(60, 35, 10, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {/* Why checkout is off: one short box (the per-day detail is in the day cards) */}
          {blocked && (
            <Box
              role="status"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1.25,
                borderRadius: '16px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #B8893B',
              }}
            >
              <Box
                aria-hidden
                sx={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #2B1F14 0%, #14100C 100%)', color: '#F6D58E' }}
              >
                <IconLock size={18} stroke={1.7} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, lineHeight: 1.3, color: '#1F1712' }}>
                  Add ${shortfall.toFixed(2)} more to check out
                </Typography>
                <Typography sx={{ mt: 0.25, fontSize: '0.875rem', lineHeight: 1.4, color: '#6B6760' }}>
                  {lastDayLabel && (cart?.days.length ?? 0) > 1 ? `Days under $${minValue.toFixed(0)} arrive ${lastDayLabel}.` : `Minimum $${minValue.toFixed(0)} per day.`}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Checkout Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleCheckout}
            disabled={!cart.canCheckout}
            endIcon={<IconArrowRight size={18} />}
            sx={{
              background: 'linear-gradient(135deg, #2B1F14 0%, #14100C 100%)',
              color: '#FBF1DA',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              height: 52,
              borderRadius: 999,
              boxShadow: 'inset 0 1px 0 rgba(255,236,196,0.16), 0 14px 26px -14px rgba(40,26,10,0.6)',
              transition: 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)',
              '&:hover': { background: 'linear-gradient(135deg, #3A2A14 0%, #1B1510 100%)' },
              '&:active': { transform: 'scale(0.985)' },
              '&:disabled': {
                background: '#E6DED1',
                color: '#9A8F80',
                boxShadow: 'none',
              },
            }}
          >
            Proceed to Checkout
          </Button>

          {/* View Full Cart: a quiet link under the main action */}
          {onViewFullCart && (
            <Button
              variant="text"
              fullWidth
              onClick={handleViewFullCart}
              sx={{
                color: '#8A6420',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9375rem',
                height: 40,
                borderRadius: 999,
                '&:hover': { backgroundColor: 'rgba(184, 137, 59, 0.1)' },
              }}
            >
              View Full Cart
            </Button>
          )}

        </Box>
      )}
    </Drawer>
  );
}
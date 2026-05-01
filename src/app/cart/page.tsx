'use client';

import React from 'react';
import { Box, Container, Typography, CircularProgress, useTheme, useMediaQuery, Button } from '@mui/material';
import { IconArrowLeft } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/layout/Footer';
import { CartDaySection, CartSummary, EmptyCart } from '@/components/cart';
import AddressSelector from '@/components/cart/AddressSelector';
import { useCart } from '@/contexts/CartContext';
import { getCheckoutMessage, DEFAULT_MIN_CART_VALUE } from '@/lib/cartLogic';

export default function CartPage() {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { cart, summary, isLoading, updateAddress, updateZipcode, selectedAddressId, selectedZipcode, minOrderValue, zipcodeConfig } = useCart();

  // Cart is loaded automatically by CartContext for both guest and authenticated users

  const handleCheckout = () => {
    if (!cart?.canCheckout) {
      return;
    }

    // Navigate to checkout page
    router.push('/checkout');
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleAddressSelect = async (addressId: string) => {
    try {
      await updateAddress(addressId);
      // Cart will be automatically refreshed by CartContext
    } catch (error) {
      console.error('Failed to update address:', error);
    }
  };

  const handleZipcodeChange = async (zipcode: string) => {
    try {
      await updateZipcode(zipcode);
      // Cart will be automatically refreshed by CartContext
    } catch (error) {
      console.error('Failed to update zipcode:', error);
    }
  };

  // Loading state
  if (isLoading && !cart) {
    return (
      <>
        <Container maxWidth="xl" sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ color: theme.palette.primary.main, mb: 2 }} />
            <Typography variant="h6" sx={{ color: theme.palette.text.secondary }}>
              Loading your cart...
            </Typography>
          </Box>
        </Container>
        <Footer />
      </>
    );
  }

  // Empty cart or no user
  const hasItems = cart && cart.days && cart.days.length > 0 && cart.days.some(day => day.items.length > 0);

  if (!hasItems) {
    return (
      <>
        <Container maxWidth="xl" sx={{ minHeight: '60vh', py: 4 }}>
          <EmptyCart />
        </Container>
        <Footer />
      </>
    );
  }

  // Determine if address is selected (for authenticated users: saved address, for guest users: zipcode)
  const hasAddress = !!(selectedAddressId || selectedZipcode);

  // Get checkout message only when address is selected (min cart value varies by location)
  const checkoutMessage = hasAddress && cart ? getCheckoutMessage(cart.days, zipcodeConfig?.minCartValue || DEFAULT_MIN_CART_VALUE) : '';

  return (
    <>
      <Container maxWidth="xl" sx={{ py: isMobile ? 2 : 4, minHeight: '60vh' }}>
        {/* Back Button and Page Title */}
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<IconArrowLeft size={20} />}
            onClick={handleBackToHome}
            sx={{
              color: theme.palette.text.secondary,
              textTransform: 'none',
              fontWeight: 500,
              mb: 2,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            Continue Shopping
          </Button>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              fontSize: isMobile ? '1.75rem' : '2.5rem',
              color: theme.palette.text.primary,
            }}
          >
            Your Cart
          </Typography>
          {cart && (
            <Typography
              variant="subtitle1"
              sx={{
                color: theme.palette.text.secondary,
                mt: 0.5,
              }}
            >
              {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'} in your cart
            </Typography>
          )}
        </Box>

        {/* Cart Content - Two Column Layout (Desktop) / Stacked (Mobile) */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 3,
            alignItems: 'flex-start',
          }}
        >
          {/* Cart Items Section */}
          <Box
            sx={{
              flex: 1,
              width: '100%',
              order: isMobile ? 2 : 1,
            }}
          >
            {cart?.days.map((day) => (
              <CartDaySection key={day._id} cartDay={day} hasAddress={hasAddress} />
            ))}
          </Box>

          {/* Cart Summary Section */}
          <Box
            sx={{
              width: isMobile ? '100%' : 380,
              flexShrink: 0,
              order: isMobile ? 1 : 2,
              position: isMobile ? 'static' : 'sticky',
              top: isMobile ? 'auto' : 100,
            }}
          >
            {/* Address Selector */}
            <AddressSelector
              onAddressSelect={handleAddressSelect}
              onZipcodeChange={handleZipcodeChange}
              selectedAddressId={selectedAddressId}
              selectedZipcode={selectedZipcode}
            />

            {/* Cart Summary */}
            {summary && cart && (
              <CartSummary
                summary={summary}
                onCheckout={handleCheckout}
                canCheckout={cart.canCheckout && hasAddress}
                isLoading={isLoading}
                checkoutMessage={checkoutMessage}
                hasAddress={hasAddress}
                minOrderValue={minOrderValue}
                selectedZipcode={selectedZipcode}
                isMobile={isMobile}
              />
            )}
          </Box>
        </Box>
      </Container>
      <Footer />
    </>
  );
}

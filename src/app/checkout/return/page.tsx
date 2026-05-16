'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';

function CheckoutReturnInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Confirming your payment…');

  useEffect(() => {
    const run = async () => {
      const clientSecret = searchParams.get('payment_intent_client_secret');
      if (!clientSecret) {
        router.replace(
          `/checkout/failure?error=${encodeURIComponent('Missing payment confirmation')}`
        );
        return;
      }

      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        router.replace(
          `/checkout/failure?error=${encodeURIComponent('Stripe is not configured')}`
        );
        return;
      }

      const stripe = await loadStripe(publishableKey);
      if (!stripe) {
        router.replace(
          `/checkout/failure?error=${encodeURIComponent('Could not load Stripe')}`
        );
        return;
      }

      const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);

      if (error) {
        router.replace(
          `/checkout/failure?error=${encodeURIComponent(error.message ?? 'Payment lookup failed')}`
        );
        return;
      }

      const orderId = (
        paymentIntent as { metadata?: { orderId?: string } } | null
      )?.metadata?.orderId;

      if (paymentIntent?.status === 'succeeded' && orderId) {
        router.replace(`/checkout/success?orderId=${encodeURIComponent(orderId)}`);
        return;
      }

      if (paymentIntent?.status === 'processing') {
        setMessage('Payment is processing. You will receive an email when it completes.');
        setTimeout(() => {
          router.replace(orderId ? `/checkout/success?orderId=${encodeURIComponent(orderId)}` : '/checkout');
        }, 4000);
        return;
      }

      router.replace(
        `/checkout/failure?error=${encodeURIComponent(
          paymentIntent?.last_payment_error?.message ?? 'Payment was not completed'
        )}`
      );
    };

    void run();
  }, [router, searchParams]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: 2,
        py: 6,
      }}
    >
      <CircularProgress sx={{ color: '#FF9F0D' }} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#FF9F0D' }} />
        </Box>
      }
    >
      <CheckoutReturnInner />
    </Suspense>
  );
}

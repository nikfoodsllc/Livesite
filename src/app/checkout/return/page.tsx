'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import { decideReturnDestination, lookupOrderIdForPayment } from '@/lib/checkout/returnDestination';

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

      // Stripe does not give payment metadata to the browser, so the order number comes from our server
      const orderId = paymentIntent?.id ? await lookupOrderIdForPayment(paymentIntent.id) : undefined;

      const destination = decideReturnDestination({
        status: paymentIntent?.status,
        orderId,
        lastErrorMessage: paymentIntent?.last_payment_error?.message,
      });

      switch (destination.kind) {
        case 'success':
          router.replace(`/checkout/success?orderId=${encodeURIComponent(destination.orderId)}`);
          return;
        case 'processing':
          setMessage('Payment is processing. You will receive an email when it completes.');
          setTimeout(() => {
            router.replace(
              destination.orderId
                ? `/checkout/success?orderId=${encodeURIComponent(destination.orderId)}`
                : '/account/orders'
            );
          }, 4000);
          return;
        case 'orders':
          // Paid, but we could not tell which order (e.g. signed out): never show this as a failure
          router.replace('/account/orders');
          return;
        default:
          router.replace(`/checkout/failure?error=${encodeURIComponent(destination.error)}`);
      }
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

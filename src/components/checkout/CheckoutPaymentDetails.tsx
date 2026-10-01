'use client';

import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Box, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { IconLock } from '@tabler/icons-react';

export interface CheckoutPaymentDetailsHandle {
  confirmPayment: (orderIdOverride?: string) => Promise<boolean>;
}

export interface CheckoutPaymentDetailsProps {
  orderId?: string | null;
  clientSecret: string;
  name: string;
  email: string;
  phone: string;
  onPaymentSuccess: (orderId: string) => Promise<void>;
  onPaymentError: (message: string) => void;
  isSubmitting: boolean;
  onSubmittingChange: (value: boolean) => void;

   onCardDetailsChange?: (complete: boolean) => void;
}

const CheckoutPaymentDetails = forwardRef<
  CheckoutPaymentDetailsHandle,
  CheckoutPaymentDetailsProps
>(function CheckoutPaymentDetails(
  {
    orderId,
    clientSecret,
    name,
    email,
    phone,
    onPaymentSuccess,
    onPaymentError,
    isSubmitting,
    onSubmittingChange,
    onCardDetailsChange
  },
  ref
) {
  const stripe = useStripe();
  const elements = useElements();
  const [localError, setLocalError] = useState<string | null>(null);

  const confirmPayment = async (orderIdOverride?: string): Promise<boolean> => {
    const resolvedOrderId = orderIdOverride ?? orderId;
    if (!stripe || !elements) {
      setLocalError('Payment system is still loading. Please wait a moment.');
      return false;
    }

    setLocalError(null);
    onSubmittingChange(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setLocalError(submitError.message ?? 'Please check your payment details.');
        onSubmittingChange(false);
        return false;
      }

      const returnUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/checkout/return`
          : '/checkout/return';

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      });

      if (error) {
        const msg = error.message ?? 'Payment failed';
        setLocalError(msg);
        onPaymentError(msg);
        onSubmittingChange(false);
        return false;
      }

      if (paymentIntent?.status === 'succeeded') {
        if (!resolvedOrderId) {
          setLocalError('Order was not created. Please try again.');
          onSubmittingChange(false);
          return false;
        }
        await onPaymentSuccess(resolvedOrderId);
        return true;
      }

      setLocalError('Payment could not be completed. Please try again.');
      onSubmittingChange(false);
      return false;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setLocalError(msg);
      onPaymentError(msg);
      onSubmittingChange(false);
      return false;
    }
  };

  useImperativeHandle(ref, () => ({ confirmPayment }), [
    stripe,
    elements,
    clientSecret,
    orderId,
    onPaymentSuccess,
    onPaymentError,
    onSubmittingChange,
  ]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        border: '1px solid #EDEDED',
        borderRadius: '12px',
        bgcolor: '#fff',
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Payment details
      </Typography>

      {localError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocalError(null)}>
          {localError}
        </Alert>
      )}

      {!stripe || !elements ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
          <CircularProgress size={22} sx={{ color: '#FF9F0D' }} />
          <Typography variant="body2" sx={{ color: '#666' }}>
            Loading payment options…
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mb: 1 }}>
          <PaymentElement
  onChange={(event) => {
    onCardDetailsChange?.(event.complete);
  }}
  options={{
    layout: { type: 'accordion', defaultCollapsed: false },
    wallets: {
      applePay: 'auto',
      googlePay: 'auto',
    },
    defaultValues: {
      billingDetails: {
        name,
        email,
        phone,
      },
    },
  }}
/>
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 0.5,
          mt: 1.5,
        }}
      >
        <IconLock size={14} style={{ color: '#666' }} />
        <Typography variant="caption" sx={{ color: '#666' }}>
          Secured by Stripe
        </Typography>
      </Box>
    </Paper>
  );
});

export default CheckoutPaymentDetails;

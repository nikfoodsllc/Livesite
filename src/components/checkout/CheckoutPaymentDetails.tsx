'use client';

import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Box, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { IconLock } from '@tabler/icons-react';
import { reportPaymentError, paymentIntentIdFromClientSecret } from '@/lib/checkout/reportPaymentError';

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
        reportPaymentError({
          stage: 'submit_form',
          message: submitError.message ?? 'Please check your payment details.',
          code: submitError.code,
          type: submitError.type,
          orderId: resolvedOrderId,
          paymentIntentId: paymentIntentIdFromClientSecret(clientSecret),
        });
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
          // The payment form only shows the fields a method needs (for cards: zip and country), so
          // name, email and phone never reached Stripe. Attach them so charges show the cardholder
          // and Stripe's fraud checks have them.
          payment_method_data: {
            billing_details: {
              ...(name ? { name } : {}),
              ...(email ? { email } : {}),
              ...(phone ? { phone } : {}),
            },
          },
        },
        redirect: 'if_required',
      });

      if (error) {
        const msg = error.message ?? 'Payment failed';
        reportPaymentError({
          stage: 'confirm_payment',
          message: msg,
          code: error.code,
          declineCode: error.decline_code,
          type: error.type,
          orderId: resolvedOrderId,
          paymentIntentId: error.payment_intent?.id ?? paymentIntentIdFromClientSecret(clientSecret),
        });
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

      reportPaymentError({
        stage: 'confirm_incomplete',
        message: `Payment did not complete (status: ${paymentIntent?.status ?? 'unknown'})`,
        orderId: resolvedOrderId,
        paymentIntentId: paymentIntent?.id ?? paymentIntentIdFromClientSecret(clientSecret),
      });
      setLocalError('Payment could not be completed. Please try again.');
      onSubmittingChange(false);
      return false;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      reportPaymentError({
        stage: 'unexpected',
        message: msg,
        orderId: resolvedOrderId,
        paymentIntentId: paymentIntentIdFromClientSecret(clientSecret),
      });
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
    // Apple Pay first, then Card; any other methods (e.g. Bank) follow. Apple Pay only shows
    // on devices/domains that support it, so Card stays first everywhere else.
    paymentMethodOrder: ['apple_pay', 'card'],
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

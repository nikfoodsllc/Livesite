'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { IconLock } from '@tabler/icons-react';
import type { Cart } from '@/types/cart';
import { calculateDeliveryDates, type DayDeliveryInfo } from '@/lib/deliveryCalculator';
import { DEFAULT_MIN_CART_VALUE } from '@/lib/cartLogic';
import type { ZipcodeConfig } from '@/types/zipcode';
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary';

export interface CheckoutPaymentStepProps {
  orderId: string;
  clientSecret: string;
  cart: Cart;
  name: string;
  email: string;
  phone: string;
  tipPercentage: number;
  zipcodeConfig: ZipcodeConfig | null;
  onPaymentSuccess: (orderId: string) => Promise<void>;
  onPaymentError: (message: string) => void;
}

export default function CheckoutPaymentStep({
  orderId,
  clientSecret,
  cart,
  name,
  email,
  phone,
  tipPercentage,
  zipcodeConfig,
  onPaymentSuccess,
  onPaymentError,
}: CheckoutPaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const subtotal = cart.subtotal;
  const platformFee = cart.platformFee;
  const deliveryFee = cart.deliveryFee;
  const tax = cart.tax;
  const tip = (subtotal * tipPercentage) / 100;
  const discount = cart.appliedCoupon?.discountAmount || 0;
  const total = subtotal + platformFee + deliveryFee + tax + tip - discount;

  const deliveryCalculation = calculateDeliveryDates(
    cart.days,
    zipcodeConfig?.minCartValue || DEFAULT_MIN_CART_VALUE
  );
  const deliveryCalculations: DayDeliveryInfo[] = deliveryCalculation.deliveryDays;

  const handleCompletePayment = async () => {
    if (!stripe || !elements) {
      setLocalError('Payment system is still loading. Please wait a moment.');
      return;
    }

    setLocalError(null);
    setIsSubmitting(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setLocalError(submitError.message ?? 'Please check your payment details.');
        setIsSubmitting(false);
        return;
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
        setIsSubmitting(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        await onPaymentSuccess(orderId);
        return;
      }

      setLocalError('Payment could not be completed. Please try again.');
      setIsSubmitting(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setLocalError(msg);
      onPaymentError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 400px' },
        gap: 3,
      }}
    >
      <Box>
        <Paper
          elevation={2}
          sx={{
            p: 4,
            mb: 3,
            borderRadius: '20px',
            border: '1px solid #ECECEC',
            background: '#fff',
          }}
        >
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
            Pay securely
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            Pay with your card or with Apple Pay / Google Pay when your browser offers them.
            <strong> Apple Pay on the web only appears in Safari</strong> (not Chrome), on{' '}
            <strong>HTTPS</strong>, and after this domain is verified in your Stripe Dashboard.
            Plain <code>localhost</code> usually will not show Apple Pay.
            Order <strong>{orderId}</strong> is reserved until payment completes.
          </Typography>

          {localError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocalError(null)}>
              {localError}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <PaymentElement
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

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleCompletePayment}
            disabled={isSubmitting || !stripe || !elements}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={20} sx={{ color: '#fff' }} />
              ) : null
            }
            sx={{
              bgcolor: '#FF9F0D',
              color: '#fff',
              py: 1.5,
              fontSize: '16px',
              fontWeight: 600,
              '&:hover': { bgcolor: '#e68f0c' },
              '&:disabled': { bgcolor: '#ccc', color: '#666' },
            }}
          >
            {isSubmitting ? 'Processing…' : `Pay $${total.toFixed(2)}`}
          </Button>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
      </Box>

      <Box>
        <CheckoutOrderSummary
          cartDays={cart.days}
          subtotal={subtotal}
          platformFee={platformFee}
          deliveryFee={deliveryFee}
          tax={tax}
          tip={tip}
          discount={discount}
          total={total}
          deliveryCalculations={deliveryCalculations}
          discountCode={cart.appliedCoupon?.code}
        />
      </Box>
    </Box>
  );
}

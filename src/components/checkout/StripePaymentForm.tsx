'use client';
import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { CardElement, useElements, useStripe, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import { StripeCardElementOptions, PaymentRequest } from '@stripe/stripe-js';

interface StripePaymentFormProps {
  show: boolean;
  onValidationChange?: (isValid: boolean, isEmpty: boolean, error?: string) => void;
  showApplePay?: boolean;
  amount?: number;
  onApplePayAvailable?: (available: boolean) => void;
  onApplePaySuccess?: (paymentMethodId: string) => void;
}

const CARD_ELEMENT_OPTIONS: StripeCardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#333',
      fontFamily: 'Roboto, sans-serif',
      '::placeholder': { color: '#aab7c4' },
      iconColor: '#666',
    },
    invalid: {
      color: '#dc2626',
      iconColor: '#dc2626',
    },
  },
  hidePostalCode: false,
};

export default function StripePaymentForm({
  show,
  onValidationChange,
  showApplePay = false,
  amount = 0,
  onApplePayAvailable,
  onApplePaySuccess,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [applePayReady, setApplePayReady] = useState(false);

  // Initialize payment request
  useEffect(() => {
    if (!stripe || !showApplePay || amount <= 0) return;

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: 'NikFoods Order',
        amount: Math.round(amount * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    pr.canMakePayment().then(result => {
      if (result && result.applePay) {
        setPaymentRequest(pr);
        setApplePayReady(true);
        onApplePayAvailable?.(true);
      } else {
        onApplePayAvailable?.(false);
      }
    });

    pr.on('paymentmethod', (e) => {
      onApplePaySuccess?.(e.paymentMethod.id);
      e.complete('success');
    });
  }, [stripe, showApplePay]);

  // Update payment request amount whenever total changes (e.g. tip changes)
  useEffect(() => {
    if (paymentRequest && amount > 0) {
      paymentRequest.update({
        total: {
          label: 'NikFoods Order',
          amount: Math.round(amount * 100),
        },
      });
    }
  }, [paymentRequest, amount]);

  const handleCardChange = (event: any) => {
    onValidationChange?.(event.complete, event.empty, event.error?.message);
  };

  if (showApplePay && applePayReady && paymentRequest) {
    return (
      <Paper
        elevation={2}
        sx={{ p: 3, mb: 3, border: '2px solid #FF9F0D', backgroundColor: '#FFFBF5' }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Apple Pay
        </Typography>
        <PaymentRequestButtonElement
          options={{
            paymentRequest,
            style: {
              paymentRequestButton: {
                type: 'buy',
                theme: 'dark',
                height: '48px',
              },
            },
          }}
        />
      </Paper>
    );
  }

  if (!show) return null;

  return (
    <Paper
      elevation={2}
      sx={{ p: 3, mb: 3, border: '2px solid #FF9F0D', backgroundColor: '#FFFBF5' }}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Card Details
      </Typography>
      <Box
        sx={{
          p: 2,
          border: '1px solid #EDEDED',
          borderRadius: '4px',
          bgcolor: '#FAFAFA',
        }}
      >
        <CardElement options={CARD_ELEMENT_OPTIONS} onChange={handleCardChange} />
      </Box>
      <Alert severity="info" sx={{ mt: 2 }}>
        Your payment information is encrypted and secure. We use Stripe for payment processing.
      </Alert>
      <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: '#666' }}>
          We accept:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {['Visa', 'Mastercard', 'Amex', 'Discover'].map((brand) => (
            <Box
              key={brand}
              sx={{
                px: 1, py: 0.5, bgcolor: '#fff',
                border: '1px solid #EDEDED', borderRadius: '4px',
                fontSize: '11px', fontWeight: 600, color: '#666',
              }}
            >
              {brand}
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
}

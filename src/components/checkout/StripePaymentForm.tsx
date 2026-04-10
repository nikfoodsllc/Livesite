'use client';

import React from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { CardElement, useElements } from '@stripe/react-stripe-js';
import { StripeCardElementOptions } from '@stripe/stripe-js';

interface StripePaymentFormProps {
  show: boolean;
  onValidationChange?: (isValid: boolean, isEmpty: boolean, error?: string) => void;
}

const CARD_ELEMENT_OPTIONS: StripeCardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#333',
      fontFamily: 'Roboto, sans-serif',
      '::placeholder': {
        color: '#aab7c4',
      },
      iconColor: '#666',
    },
    invalid: {
      color: '#dc2626',
      iconColor: '#dc2626',
    },
  },
  hidePostalCode: false,
};

export default function StripePaymentForm({ show, onValidationChange }: StripePaymentFormProps) {
  const elements = useElements();

  const handleCardChange = (event: any) => {
    // Track CardElement validation state
    const isValid = event.complete;
    const isEmpty = event.empty;
    const errorMessage = event.error?.message;

    // Notify parent component of validation state changes
    onValidationChange?.(isValid, isEmpty, errorMessage);
  };

  if (!show) return null;

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        border: '2px solid #FF9F0D',
        backgroundColor: '#FFFBF5',
      }}
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
        Your payment information is encrypted and secure. We use Stripe for
        payment processing.
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
                px: 1,
                py: 0.5,
                bgcolor: '#fff',
                border: '1px solid #EDEDED',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#666',
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

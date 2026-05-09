'use client';

import React, { useState } from 'react';

import {
  Box,
  Typography,
  Paper,
  Alert
} from '@mui/material';

import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from '@stripe/react-stripe-js';

interface StripePaymentFormProps {
  show: boolean;
  onValidationChange?: (
    isValid: boolean,
    isEmpty: boolean,
    error?: string
  ) => void;
}

const ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1A2027',
      fontFamily: 'Inter, sans-serif',
      '::placeholder': {
        color: '#9CA3AF',
      },
      iconColor: '#111827',
    },
    invalid: {
      color: '#EF4444',
      iconColor: '#EF4444',
    },
  },
};

export default function StripePaymentForm({
  show,
  onValidationChange,
}: StripePaymentFormProps) {

  const [cardComplete, setCardComplete] =
    useState(false);

  const [expiryComplete, setExpiryComplete] =
    useState(false);

  const [cvcComplete, setCvcComplete] =
    useState(false);

  const [postalCode, setPostalCode] =
    useState('');

  const [errorMessage, setErrorMessage] =
    useState('');

  const updateValidation = (
    card = cardComplete,
    expiry = expiryComplete,
    cvc = cvcComplete,
    postal = postalCode
  ) => {

    const isValid =
      card &&
      expiry &&
      cvc &&
      postal.trim() !== '';

    const isEmpty =
      !card &&
      !expiry &&
      !cvc &&
      postal.trim() === '';

    onValidationChange?.(
      isValid,
      isEmpty,
      errorMessage
    );
  };

  if (!show) return null;

  return (
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

      <Typography
        variant="h5"
        sx={{
          mb: 1,
          fontWeight: 700,
        }}
      >
      Card Details
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: '#666',
          mb: 3,
        }}
      >
       Your payment information is encrypted and secure. We use Stripe for payment processing.
      </Typography>

      {/* Card Number */}
      <Typography sx={labelStyle}>
        Card Number
      </Typography>

      <Box sx={inputStyle}>
        <CardNumberElement
          options={ELEMENT_OPTIONS}
          onChange={(e) => {

            setCardComplete(e.complete);

            setErrorMessage(
              e.error?.message || ''
            );

            updateValidation(
              e.complete,
              expiryComplete,
              cvcComplete,
              postalCode
            );
          }}
        />
      </Box>

      {/* Expiry + CVC */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mt: 2,
        }}
      >

        {/* Expiry */}
        <Box sx={{ flex: 1 }}>

          <Typography sx={labelStyle}>
            Expiration Date
          </Typography>

          <Box sx={inputStyle}>
            <CardExpiryElement
              options={ELEMENT_OPTIONS}
              onChange={(e) => {

                setExpiryComplete(e.complete);

                updateValidation(
                  cardComplete,
                  e.complete,
                  cvcComplete,
                  postalCode
                );
              }}
            />
          </Box>

        </Box>

        {/* CVC */}
        <Box sx={{ flex: 1 }}>

          <Typography sx={labelStyle}>
            Security Code
          </Typography>

          <Box sx={inputStyle}>
            <CardCvcElement
              options={ELEMENT_OPTIONS}
              onChange={(e) => {

                setCvcComplete(e.complete);

                updateValidation(
                  cardComplete,
                  expiryComplete,
                  e.complete,
                  postalCode
                );
              }}
            />
          </Box>

        </Box>

      </Box>

      {/* Postal Code */}
      <Typography
        sx={{
          ...labelStyle,
          mt: 2,
        }}
      >
        Postal Code
      </Typography>

      <input
        type="text"
        placeholder="110043"
        value={postalCode}
        onChange={(e) => {

          setPostalCode(e.target.value);

          updateValidation(
            cardComplete,
            expiryComplete,
            cvcComplete,
            e.target.value
          );
        }}
        style={postalInputStyle}
      />

      {/* Error */}
      {errorMessage && (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
        >
          {errorMessage}
        </Alert>
      )}

      {/* Footer */}
      <Box
        sx={{
          mt: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >

      <Box
  sx={{
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    flexWrap: 'wrap',
  }}
>

  <Typography
    variant="body2"
    sx={{
      color: '#666',
      fontWeight: 500,
    }}
  >
    We accept:
  </Typography>

  {['Visa', 'Mastercard', 'Amex', 'Discover'].map(
    (brand) => (
      <Box
        key={brand}
        sx={{
          px: 1.2,
          py: 0.5,
          border: '1px solid #DADADA',
          borderRadius: '6px',
          backgroundColor: '#fff',
          fontSize: '12px',
          fontWeight: 600,
          color: '#555',
        }}
      >
        {brand}
      </Box>
    )
  )}

</Box>

        {cardComplete &&
          expiryComplete &&
          cvcComplete &&
          postalCode && (
            <Typography
              variant="body2"
              sx={{
                color: '#10B981',
                fontWeight: 700,
              }}
            >
              Card Verified ✓
            </Typography>
          )}

      </Box>

    </Paper>
  );
}

const labelStyle = {
  mb: 1,
  fontSize: '14px',
  fontWeight: 600,
  color: '#374151',
};

const inputStyle = {
  border: '1px solid #E5E7EB',
  borderRadius: '14px',
  padding: '16px',
  backgroundColor: '#fff',
};

const postalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  borderRadius: '14px',
  border: '1px solid #E5E7EB',
  fontSize: '16px',
  outline: 'none',
  backgroundColor: '#fff',
  boxSizing: 'border-box',
};
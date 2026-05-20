'use client';
import React from 'react';
import { Box, Typography, Paper, Radio } from '@mui/material';
import { IconCreditCard } from '@tabler/icons-react';
import { PaymentMethod } from '@/types/order';

interface PaymentMethodSectionProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  applePayAvailable?: boolean;
}

export default function PaymentMethodSection({
  selectedMethod,
  onMethodChange,
  applePayAvailable = false,
}: PaymentMethodSectionProps) {
  const paymentMethods: Array<{
    value: PaymentMethod;
    label: string;
    icon: React.ReactNode;
    description: string;
  }> = [
    {
      value: 'Credit Card',
      label: 'Credit or Debit Card',
      icon: <IconCreditCard size={24} />,
      description: 'Pay securely with your card via Stripe',
    },
    ...(applePayAvailable ? [{
      value: 'Apple Pay' as PaymentMethod,
      label: 'Apple Pay',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      ),
      description: 'Fast and secure checkout with Apple Pay',
    }] : []),
  ];

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #EDEDED' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Payment Method
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {paymentMethods.map((method) => (
          <Paper
            key={method.value}
            elevation={0}
            onClick={() => onMethodChange(method.value)}
            sx={{
              p: 2,
              border: '2px solid',
              borderColor: selectedMethod === method.value ? '#FF9F0D' : '#EDEDED',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: selectedMethod === method.value ? '#FF9F0D' : '#ccc',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Radio
                checked={selectedMethod === method.value}
                onChange={() => onMethodChange(method.value)}
                value={method.value}
                sx={{
                  color: '#666',
                  '&.Mui-checked': { color: '#FF9F0D' },
                }}
              />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: '8px',
                  bgcolor: '#FAFAFA',
                  color: selectedMethod === method.value ? '#FF9F0D' : '#666',
                }}
              >
                {method.icon}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {method.label}
                </Typography>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  {method.description}
                </Typography>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
    </Paper>
  );
}

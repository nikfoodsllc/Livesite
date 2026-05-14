'use client';

import React from 'react';
import { Box, Typography, Paper, Radio } from '@mui/material';
import { IconCreditCard } from '@tabler/icons-react';
import { PaymentMethod } from '@/types/order';

interface PaymentMethodSectionProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
}

export default function PaymentMethodSection({
  selectedMethod,
  onMethodChange,
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
      description: 'Pay with card, Apple Pay, or other methods shown at checkout (Stripe)',
    },
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
              borderColor:
                selectedMethod === method.value ? '#FF9F0D' : '#EDEDED',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor:
                  selectedMethod === method.value ? '#FF9F0D' : '#ccc',
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
                  '&.Mui-checked': {
                    color: '#FF9F0D',
                  },
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

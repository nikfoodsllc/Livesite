'use client';

import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';

interface TipSectionProps {
  selectedTipPercentage: number;
  onTipChange: (percentage: number) => void;
  subtotal: number;
}

export default function TipSection({
  selectedTipPercentage,
  onTipChange,
  subtotal,
}: TipSectionProps) {
  const tipOptions = [0, 5, 10, 15];

  const calculateTipAmount = (percentage: number) => {
    return (subtotal * percentage) / 100;
  };

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #EDEDED' }}>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
        Add a Tip (Optional)
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
        Show your appreciation for our delivery team
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1.5,
        }}
      >
        {tipOptions.map((percentage) => {
          const tipAmount = calculateTipAmount(percentage);
          const isSelected = selectedTipPercentage === percentage;

          return (
            <Button
              key={percentage}
              variant={isSelected ? 'contained' : 'outlined'}
              onClick={() => onTipChange(percentage)}
              sx={{
                py: 1.5,
                flexDirection: 'column',
                gap: 0.5,
                borderColor: isSelected ? '#FF9F0D' : '#EDEDED',
                bgcolor: isSelected ? '#FF9F0D' : 'transparent',
                color: isSelected ? '#fff' : '#333',
                '&:hover': {
                  bgcolor: isSelected ? '#FF9F0D' : '#FAFAFA',
                  borderColor: '#FF9F0D',
                },
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {percentage}%
              </Typography>
              <Typography variant="caption">
                {percentage === 0
                  ? 'No Tip'
                  : `$${tipAmount.toFixed(2)}`}
              </Typography>
            </Button>
          );
        })}
      </Box>

      {selectedTipPercentage > 0 && (
        <Typography
          variant="body2"
          sx={{ mt: 2, color: '#28a745', fontWeight: 500 }}
        >
          Thank you for your generosity! Your tip helps support our delivery
          team.
        </Typography>
      )}
    </Paper>
  );
}

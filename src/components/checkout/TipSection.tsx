'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, TextField, InputAdornment } from '@mui/material';
import { MAX_TIP_AMOUNT } from '@/lib/orderHelpers';

interface TipSectionProps {
  selectedTipPercentage: number;
  /** A tip typed in dollars; when set, no percentage button is selected */
  customTip: number | null;
  onTipChange: (percentage: number) => void;
  onCustomTipChange: (amount: number | null) => void;
  subtotal: number;
}

/** Keeps digits and one dot, at most two decimals. */
function cleanAmount(raw: string): string {
  const kept = raw.replace(/[^\d.]/g, '');
  const [whole, ...rest] = kept.split('.');
  return rest.length > 0 ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

export default function TipSection({
  selectedTipPercentage,
  customTip,
  onTipChange,
  onCustomTipChange,
  subtotal,
}: TipSectionProps) {
  const tipOptions = [0, 5, 10, 15];
  const [text, setText] = useState('');

  // a percentage button was pressed (the page cleared the custom amount): empty the box
  useEffect(() => {
    if (customTip === null) setText('');
  }, [customTip]);

  const calculateTipAmount = (percentage: number) => {
    return (subtotal * percentage) / 100;
  };

  const handleText = (raw: string) => {
    const next = cleanAmount(raw);
    setText(next);
    const value = next === '' || next === '.' ? null : Number(next);
    onCustomTipChange(value !== null && value <= MAX_TIP_AMOUNT ? value : null);
  };

  const tooHigh = text !== '' && Number(text) > MAX_TIP_AMOUNT;
  const hasTip = customTip !== null ? customTip > 0 : selectedTipPercentage > 0;

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
          const isSelected = customTip === null && selectedTipPercentage === percentage;

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

      <TextField
        fullWidth
        size="small"
        label="Other amount"
        value={text}
        onChange={(e) => handleText(e.target.value)}
        error={tooHigh}
        helperText={tooHigh ? `Up to $${MAX_TIP_AMOUNT}` : undefined}
        slotProps={{
          input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
          htmlInput: { inputMode: 'decimal', maxLength: 7, 'aria-label': 'Tip amount in dollars' },
        }}
        sx={{ mt: 1.5 }}
      />

      {hasTip && (
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

'use client';

import React from 'react';
import { Paper, TextField, Typography } from '@mui/material';
import { IconNotes } from '@tabler/icons-react';

export const DELIVERY_INSTRUCTIONS_MAX = 100;

interface DeliveryInstructionsSectionProps {
  value: string;
  onChange: (value: string) => void;
  /** Saved addresses keep the instructions for the next order; a guest zip address cannot */
  saved: boolean;
}

/**
 * Delivery instructions at checkout (leave at the door, call on arrival, ...). They go on this order and, for a saved
 * address, are kept on that address so they are already filled in next time.
 */
export default function DeliveryInstructionsSection({ value, onChange, saved }: DeliveryInstructionsSectionProps) {
  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #EDEDED' }}>
      <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconNotes size={20} style={{ color: '#FF9F0D' }} />
        Delivery Instructions <Typography component="span" variant="body2" sx={{ color: '#666', fontWeight: 400 }}>(optional)</Typography>
      </Typography>
      <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
        Anything our delivery team should know, like where to leave the order or how to reach you.
      </Typography>
      <TextField
        fullWidth
        multiline
        minRows={2}
        maxRows={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\n/g, ' ').slice(0, DELIVERY_INSTRUCTIONS_MAX))}
        placeholder="For example: Leave with the front desk, call when you arrive"
        inputProps={{ maxLength: DELIVERY_INSTRUCTIONS_MAX, 'aria-label': 'Delivery instructions (optional)' }}
        helperText={`${value.length}/${DELIVERY_INSTRUCTIONS_MAX}${saved ? ' · Saved with this address for your next order' : ''}`}
      />
    </Paper>
  );
}

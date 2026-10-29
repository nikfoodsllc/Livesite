'use client';

import React from 'react';
import { Box, Paper, Switch, Typography } from '@mui/material';

interface StoreCreditSectionProps {
  /** Dollars the customer has */
  balance: number;
  /** Dollars this order uses (0 when the switch is off) */
  applied: number;
  checked: boolean;
  onChange: (value: boolean) => void;
  /** An order is already started with its credit: it cannot be changed any more */
  locked?: boolean;
}

const money = (n: number) => `$${n.toFixed(2)}`;

/** Store credit at checkout: one line and a switch. Only shown when the customer has credit. */
export default function StoreCreditSection({ balance, applied, checked, onChange, locked }: StoreCreditSectionProps) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 2, mb: 3, border: '1px solid #EDEDED', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Store credit
        </Typography>
        <Typography variant="body2" sx={{ color: checked && applied > 0 ? '#28a745' : '#666', fontWeight: checked && applied > 0 ? 600 : 400 }}>
          {checked && applied > 0 ? `${money(applied)} applied` : `${money(balance)} available`}
        </Typography>
      </Box>
      <Switch
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={locked}
        slotProps={{ input: { 'aria-label': 'Use store credit' } }}
        sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#8A6420' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#1F1712' } }}
      />
    </Paper>
  );
}

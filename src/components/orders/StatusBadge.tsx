'use client';

import { Chip } from '@mui/material';
import { OrderStatus } from '@/types/order';
import { getStatusColor, getStatusLabel } from '@/lib/orderHelpers';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        backgroundColor: color,
        color: '#FFFFFF',
        fontWeight: 600,
        fontSize: size === 'small' ? '12px' : '14px',
        height: size === 'small' ? '24px' : '32px',
        borderRadius: '6px',
        '& .MuiChip-label': {
          px: size === 'small' ? 1.5 : 2,
        },
      }}
    />
  );
}

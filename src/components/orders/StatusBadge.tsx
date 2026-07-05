'use client';

import { Chip } from '@mui/material';
import { OrderStatus, PaymentStatus } from '@/types/order';
import { getStatusColor, getStatusLabel } from '@/lib/orderHelpers';

interface StatusBadgeProps {
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status, paymentStatus, size = 'small' }: StatusBadgeProps) {
  const isUnpaidPending = status === 'pending' && paymentStatus === 'unpaid';
  const color = isUnpaidPending ? '#EF4444' : getStatusColor(status);
  const label = isUnpaidPending ? 'Failed' : getStatusLabel(status);

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

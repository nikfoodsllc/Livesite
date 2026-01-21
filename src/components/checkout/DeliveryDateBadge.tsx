'use client';

import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { IconCalendar } from '@tabler/icons-react';
import { formatDeliveryDate, isDeliveryDateDifferent, type DayDeliveryInfo } from '@/lib/deliveryCalculator';

interface DeliveryDateBadgeProps {
  dayInfo: DayDeliveryInfo;
}

/**
 * Displays delivery date information for a cart day
 * Shows scheduled date vs actual delivery date when different
 */
export default function DeliveryDateBadge({ dayInfo }: DeliveryDateBadgeProps) {
  console.log('=== DELIVERY DATE BADGE ===');
  console.log('DayInfo received:', dayInfo);
  console.log('Original date:', dayInfo.originalDate);
  console.log('Delivery date:', dayInfo.actualDeliveryDate);
  console.log('=== END DELIVERY DATE BADGE ===');

  const isDateDifferent = isDeliveryDateDifferent(dayInfo);
  const deliveryDate = formatDeliveryDate(dayInfo.actualDeliveryDate);

  if (!isDateDifferent) {
    // Same day delivery
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mt: 0.5,
        }}
      >
        <IconCalendar size={14} style={{ color: '#28a745' }} />
        <Typography
          variant="caption"
          sx={{
            color: '#28a745',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}
        >
          Delivering on {deliveryDate}
        </Typography>
      </Box>
    );
  }

  // Clubbed day - delivery moved to different date
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        mt: 0.5,
      }}
    >
      <IconCalendar size={14} style={{ color: '#FF9F0D' }} />
      <Typography
        variant="caption"
        sx={{
          color: '#FF9F0D',
          fontSize: '0.75rem',
          fontWeight: 500,
        }}
      >
        Delivery moved to {deliveryDate}
      </Typography>
    </Box>
  );
}

'use client';

import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { IconCalendar } from '@tabler/icons-react';
import { CartDay } from '@/types/cart';
import CartItemCard from './CartItemCard';
import DeliveryMessageBadge from './DeliveryMessageBadge';
import { calculateDayTotal } from '@/lib/cartLogic';
import { PST_TIMEZONE } from '@/lib/timezone';

interface CartDaySectionProps {
  cartDay: CartDay;
  hasAddress?: boolean;
  onClose?: () => void;
}

export default function CartDaySection({ cartDay, hasAddress = false, onClose }: CartDaySectionProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const dayTotal = calculateDayTotal(cartDay.items);

  return (
    <Box sx={{ mb: 4 }}>
      {/* Day Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          pb: 1.5,
          borderBottom: `2px solid ${theme.palette.primary.main}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconCalendar size={24} color={theme.palette.primary.main} />
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: isMobile ? '1.1rem' : '1.25rem',
                color: theme.palette.text.primary,
              }}
            >
              {/*
                Display formatted date which already includes the day name (e.g., "Friday, Jan 15, 2026")
                Only display the day field separately if formattedDate is not available
              */}
              {cartDay.formattedDate || cartDay.day}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: '0.8rem',
              }}
            >
              {/*
                Only show additional date info if formattedDate is not already showing it
              */}
              {!cartDay.formattedDate && cartDay.date}
            </Typography>
          </Box>
        </Box>

        {/* Day Total */}
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: '0.75rem',
              display: 'block',
            }}
          >
            Day Total
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: isMobile ? '1.1rem' : '1.25rem',
              color: theme.palette.primary.main,
            }}
          >
            ${dayTotal.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* Delivery Message - Only show when address is selected */}
      {hasAddress && cartDay.deliveryMessage && <DeliveryMessageBadge message={cartDay.deliveryMessage} onClose={onClose} />}

      {/* Cart Items */}
      <Box>
        {cartDay.items.map((item) => (
          <CartItemCard key={item._id} item={item} />
        ))}
      </Box>

      {/* No Items Message */}
      {cartDay.items.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            px: 2,
            backgroundColor: '#f9fafb',
            borderRadius: 2,
            border: '1px dashed #e5e7eb',
          }}
        >
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            No items for this day
          </Typography>
        </Box>
      )}
    </Box>
  );
}

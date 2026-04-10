'use client';

import { Box, Typography, Chip } from '@mui/material';
import { OrderDay, OrderStatus } from '@/types/order';
import { getDeliveryDayColor, formatCurrency } from '@/lib/orderHelpers';
import { formatDeliveryDate } from '@/lib/deliveryCalculator';

interface OrderDaySectionProps {
  dayOrder: OrderDay;
  orderStatus: OrderStatus;
  currency?: string;
}

export default function OrderDaySection({ dayOrder, orderStatus, currency = 'usd' }: OrderDaySectionProps) {
  const deliveryColor = getDeliveryDayColor(orderStatus);

  return (
    <Box
      sx={{
        mb: 2,
        pb: 2,
        borderBottom: '1px solid #E5E7EB',
        '&:last-child': {
          borderBottom: 'none',
          mb: 0,
          pb: 0,
        },
      }}
    >
      {/* Day Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1.5,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: '14px', sm: '16px' },
            fontWeight: 600,
            color: '#111827',
          }}
        >
          {dayOrder.day}&apos;s Item
        </Typography>
        {dayOrder.actualDeliveryDate ? (
          <Chip
            label={`Delivery on ${formatDeliveryDate(
              typeof dayOrder.actualDeliveryDate === 'string'
                ? dayOrder.actualDeliveryDate
                : dayOrder.actualDeliveryDate.toISOString().split('T')[0]
            )}`}
            size="small"
            sx={{
              backgroundColor: `${deliveryColor}15`,
              color: deliveryColor,
              fontWeight: 500,
              fontSize: '12px',
              height: '24px',
              borderRadius: '6px',
            }}
          />
        ) : (
          <Chip
            label={`Delivery on ${dayOrder.day}`}
            size="small"
            sx={{
              backgroundColor: `${deliveryColor}15`,
              color: deliveryColor,
              fontWeight: 500,
              fontSize: '12px',
              height: '24px',
              borderRadius: '6px',
            }}
          />
        )}
      </Box>

      {/* Items List */}
      <Box sx={{ mb: 1.5 }}>
        {dayOrder.items.map((item, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 0.75,
            }}
          >
            {/* Veg Indicator */}
            <Box
              sx={{
                width: '16px',
                height: '16px',
                border: '2px solid #0A9750',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#0A9750',
                }}
              />
            </Box>

            {/* Item Info */}
            <Typography
              sx={{
                fontSize: { xs: '13px', sm: '14px' },
                color: '#374151',
              }}
            >
              {item.quantity} X {item.food.name}
              {item.portions && ` (${item.portions} portions)`}
              {item.food.spiceLevel && item.spiceLevel && ` - ${item.spiceLevel}`}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Day Total */}
      <Typography
        sx={{
          fontSize: { xs: '14px', sm: '16px' },
          fontWeight: 600,
          color: '#111827',
          textAlign: 'right',
        }}
      >
        {formatCurrency(dayOrder.dayTotal, currency)}
      </Typography>
    </Box>
  );
}

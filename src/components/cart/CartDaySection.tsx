'use client';

import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { IconCalendar } from '@tabler/icons-react';
import { CartDay } from '@/types/cart';
import CartItemCard from './CartItemCard';
import DeliveryMessageBadge from './DeliveryMessageBadge';
import DayMinimumCard from './DayMinimumCard';
import { calculateDayTotal, DEFAULT_MIN_CART_VALUE } from '@/lib/cartLogic';
import { useCart } from '@/contexts/CartContext';
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

  // the minimum is per delivery day: a day under it gets its own card (also before an address is chosen, with the minimum in use)
  const { cart, minOrderValue } = useCart();
  const minValue = minOrderValue && minOrderValue > 0 ? minOrderValue : DEFAULT_MIN_CART_VALUE;
  const lastDay = cart?.days.reduce((a, d) => (new Date(d.date).getTime() > new Date(a.date).getTime() ? d : a), cart.days[0]);
  const dayLabel = cartDay.formattedDate || String(cartDay.day);
  const dayName = dayLabel.split(',')[0];
  const isLastDay = Boolean(lastDay && lastDay._id === cartDay._id);
  // every day under the minimum gets the card (the last day too: it says what rides along with it), and a day that meets it says
  // where it is delivered, so the whole delivery plan is visible here and not only at checkout
  const showMinimum = Boolean(cart && lastDay && cartDay.items.length > 0 && dayTotal < minValue);
  const showDeliveredLine = Boolean(cart && cart.canCheckout && cart.days.length > 1 && cartDay.items.length > 0 && dayTotal >= minValue);
  const movedFrom = isLastDay && cart
    ? cart.days
        .filter((d) => d._id !== cartDay._id && d.items.length > 0 && calculateDayTotal(d.items) < minValue)
        .map((d) => (d.formattedDate || String(d.day)).split(',')[0])
    : [];

  return (
    <Box sx={{ mb: 3 }}>
      {/* Day Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.5,
          pb: 1,
          borderBottom: '1px solid rgba(184, 137, 59, 0.4)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconCalendar size={22} stroke={1.6} color="#8A6420" />
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'var(--font-display), Georgia, serif',
                fontWeight: 600,
                fontSize: isMobile ? '1.1rem' : '1.2rem',
                lineHeight: 1.25,
                color: '#1F1712',
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
              fontSize: isMobile ? '1.05rem' : '1.15rem',
              color: '#8A6420',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ${dayTotal.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* This day's minimum: how far it is, and what it means for the delivery */}
      {showMinimum && lastDay && (
        <DayMinimumCard
          dayName={dayName}
          dayTotal={dayTotal}
          minValue={minValue}
          deliveryDate={lastDay.formattedDate || String(lastDay.day)}
          isLastDay={isLastDay}
          canCheckout={Boolean(cart?.canCheckout)}
          movedFrom={movedFrom}
        />
      )}

      {showDeliveredLine && (
        <Typography sx={{ mb: 1.5, fontSize: '0.9375rem', lineHeight: 1.4, color: '#1F1712' }}>
          Delivered {dayLabel.replace(/,\s*\d{4}$/, '').replace(/([A-Za-z]{3}) (\d)/, '$1\u00a0$2')}
        </Typography>
      )}

      {/* Any other delivery message (the two above are covered by the card) waits for an address */}
      {hasAddress && cartDay.deliveryMessage && !showMinimum && cartDay.deliveryMessage.type !== 'warning' && cartDay.deliveryMessage.type !== 'error' && (
        <DeliveryMessageBadge message={cartDay.deliveryMessage} onClose={onClose} />
      )}

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

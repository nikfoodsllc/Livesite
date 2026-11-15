'use client';

import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import { IconCalendar } from '@tabler/icons-react';
import { CartDay } from '@/types/cart';
import CartItemCard from './CartItemCard';
import DeliveryMessageBadge from './DeliveryMessageBadge';
import DayMinimumCard from './DayMinimumCard';
import { calculateDayTotal, DEFAULT_MIN_CART_VALUE } from '@/lib/cartLogic';
import { useCart } from '@/contexts/CartContext';
import { planDeliveries, ownDayFix } from '@/lib/deliveryPlan';
import { useMemo } from 'react';
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

  // The minimum is per delivery day, and where a day is delivered comes from the SAME function checkout and the order use
  // (see lib/deliveryPlan.ts), so the cart cannot say one thing while the order does another.
  const { cart, minOrderValue } = useCart();
  const minValue = minOrderValue && minOrderValue > 0 ? minOrderValue : DEFAULT_MIN_CART_VALUE;
  const dayLabel = cartDay.formattedDate || String(cartDay.day);
  const dayName = dayLabel.split(',')[0];
  const nameOf = (date: string) => ((cart?.days.find((d) => d.date === date)?.formattedDate) || date).split(',')[0];
  const labelOf = (date: string) => cart?.days.find((d) => d.date === date)?.formattedDate || date;

  const note = useMemo(() => {
    if (!cart || cart.days.length < 2 || cartDay.items.length === 0) return null;
    const days = cart.days.map((d) => ({ date: d.date, dayTotal: calculateDayTotal(d.items) }));
    const plan = planDeliveries(days, minValue); // null = the order cannot be placed yet
    const actual = plan?.get(cartDay.date);
    const moved = Boolean(actual && actual !== cartDay.date);
    let fixText: string | undefined;
    let reasonText: string | undefined;
    let includesText: string | undefined;
    const money = (n: number) => `$${n.toFixed(2)}`;
    const mine = days.find((d) => d.date === cartDay.date);
    if (plan && actual && moved) {
      // why this day travels with a later one:
      // - the day itself is under the minimum, or
      // - it meets the minimum, but the days after it add up to less than the minimum and cannot be delivered on their own
      if (mine && mine.dayTotal < minValue) {
        reasonText = `${dayName} is under the $${minValue.toFixed(0)} minimum, so it is delivered together with ${nameOf(actual)}.`;
      } else {
        const later = days.filter((d) => new Date(d.date).getTime() > new Date(cartDay.date).getTime());
        const laterTotal = later.reduce((a, d) => a + d.dayTotal, 0);
        const names = later.map((d) => nameOf(d.date));
        const who = names.length === 1 ? `${names[0]} (${money(laterTotal)})` : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} (${money(laterTotal)} together)`;
        reasonText = `${dayName} meets the $${minValue.toFixed(0)} minimum, but ${who} ${names.length === 1 ? 'is' : 'are'} under it and cannot be delivered on ${names.length === 1 ? 'its' : 'their'} own, so ${dayName}'s items are delivered with ${names.length === 1 ? 'it' : 'them'}.`;
      }
      const fix = ownDayFix(days, minValue, cartDay.date);
      if (fix) {
        fixText = `To deliver ${dayName}'s items on ${dayName}, add ${money(fix.amount)} more to ${fix.toDate === cartDay.date ? dayName : nameOf(fix.toDate)}.`;
      }
    } else if (plan && actual === cartDay.date) {
      // the day other days are delivered with
      const riders = days.filter((d) => d.date !== cartDay.date && plan.get(d.date) === cartDay.date).map((d) => `${nameOf(d.date)}'s`);
      if (riders.length) includesText = `Also delivered here: ${riders.length === 1 ? riders[0] : `${riders.slice(0, -1).join(', ')} and ${riders[riders.length - 1]}`} items.`;
    }
    return { deliveredOn: actual ? labelOf(actual) : undefined, fixText, reasonText, includesText };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, minValue, cartDay]);
  const showBar = Boolean(note && dayTotal < minValue);

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

      {/* This day: how it stands against the minimum and where it is really delivered */}
      {note && (
        <DayMinimumCard
          dayName={dayName}
          dayTotal={dayTotal}
          minValue={minValue}
          deliveredOn={note.deliveredOn}
          reasonText={note.reasonText}
          includesText={note.includesText}
          fixText={note.fixText}
          showBar={showBar}
        />
      )}

      {/* Any other delivery message (the two above are covered by the card) waits for an address */}
      {hasAddress && cartDay.deliveryMessage && !note && cartDay.deliveryMessage.type !== 'warning' && cartDay.deliveryMessage.type !== 'error' && (
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

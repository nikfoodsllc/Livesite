'use client';

import { Box, Typography } from '@mui/material';

interface DayMinimumCardProps {
  /** "Tuesday" */
  dayName: string;
  dayTotal: number;
  minValue: number;
  /** "Thursday, Nov 19": where this day's items are delivered (the last day in the cart when this day moves, else its own date) */
  deliveryDate: string;
  /** The last day keeps its own delivery day: it only shows where it stands (the checkout box says what to add) */
  isLastDay?: boolean;
  /** The order total meets the minimum, so the cart can be checked out and a short day really is delivered with the last day */
  canCheckout: boolean;
  /** For the last day: the earlier days (under the minimum) whose items are delivered with it, e.g. ["Tuesday"] */
  movedFrom?: string[];
}

/**
 * The minimum order is per delivery day. A day under it (that is not the last day) gets this small card under its date:
 * where it stands, where its items will be delivered instead, and what it takes to keep its own day. White and grey with one
 * gold bar, so it reads at a glance.
 */
export default function DayMinimumCard({ dayName, dayTotal, minValue, deliveryDate, isLastDay = false, canCheckout, movedFrom = [] }: DayMinimumCardProps) {
  const shortfall = Math.max(0, minValue - dayTotal);
  const progress = Math.min(1, minValue > 0 ? dayTotal / minValue : 1);
  if (shortfall <= 0) return null;

  return (
    <Box
      role="status"
      sx={{
        mb: 2,
        p: 1.75,
        borderRadius: '16px',
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(31, 23, 18, 0.1)',
      }}
    >
      <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, lineHeight: 1.3, color: '#1F1712', fontVariantNumeric: 'tabular-nums' }}>
        {dayName}: ${dayTotal.toFixed(2)} of ${minValue.toFixed(0)} minimum
      </Typography>
      <Box
        role="progressbar"
        aria-label={`Progress to the ${dayName} minimum`}
        aria-valuemin={0}
        aria-valuemax={minValue}
        aria-valuenow={Math.min(dayTotal, minValue)}
        sx={{ mt: 1, height: 6, borderRadius: 3, backgroundColor: '#ECE8E1', overflow: 'hidden' }}
      >
        <Box
          sx={{
            height: '100%',
            width: '100%',
            borderRadius: 3,
            transformOrigin: 'left center',
            transform: `scaleX(${progress})`,
            backgroundColor: '#B8893B',
            transition: 'transform 800ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        />
      </Box>
      {/* "Delivered <last day>" is only said once the order total is met; before that the card says what it takes to deliver on this day */}
      {!isLastDay && canCheckout && (
        <>
          <Typography sx={{ mt: 1.25, fontSize: '0.9375rem', lineHeight: 1.4, color: '#1F1712' }}>
            Delivered {deliveryDate.replace(/,\s*\d{4}$/, '').replace(/([A-Za-z]{3}) (\d)/, '$1\u00a0$2')}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.4, color: '#6B6760' }}>
            Add ${shortfall.toFixed(2)} more to deliver it on {dayName} instead.
          </Typography>
        </>
      )}
      {isLastDay && canCheckout && (
        <>
          <Typography sx={{ mt: 1.25, fontSize: '0.9375rem', lineHeight: 1.4, color: '#1F1712' }}>
            Delivered {deliveryDate.replace(/,\s*\d{4}$/, '').replace(/([A-Za-z]{3}) (\d)/, '$1\u00a0$2')}
          </Typography>
          {movedFrom.length > 0 && (
            <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.4, color: '#6B6760' }}>
              Includes {movedFrom.map((n) => `${n}'s`).join(' and ')} items.
            </Typography>
          )}
        </>
      )}
      {!isLastDay && !canCheckout && (
        <Typography sx={{ mt: 1.25, fontSize: '0.9375rem', lineHeight: 1.4, color: '#1F1712' }}>
          Add ${shortfall.toFixed(2)} more for {dayName} delivery.
        </Typography>
      )}
    </Box>
  );
}

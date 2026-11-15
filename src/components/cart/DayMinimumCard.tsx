'use client';

import { Box, Typography } from '@mui/material';

interface DayMinimumCardProps {
  /** "Tuesday" */
  dayName: string;
  dayTotal: number;
  minValue: number;
  /** Where this day's items are delivered, e.g. "Thursday, Nov 19". Left out while the order cannot be placed yet (no plan exists). */
  deliveredOn?: string;
  /** What it takes to deliver this day on its own day, already worded ("Add $15.00 more to Thursday to deliver Wednesday on Wednesday.") */
  fixText?: string;
  /** Show the progress bar (the day is under the minimum) */
  showBar: boolean;
}

const tidy = (s: string) => s.replace(/,\s*\d{4}$/, '').replace(/([A-Za-z]{3}) (\d)/, '$1 $2');

/**
 * What the cart says about one delivery day: how it stands against the minimum (a day under it gets a small card with a gold bar),
 * where its items are really delivered (the same answer checkout and the order will give), and, for a day that is delivered on a
 * different day than it was picked for, the smallest addition that would change that. White and grey with one gold bar.
 */
export default function DayMinimumCard({ dayName, dayTotal, minValue, deliveredOn, fixText, showBar }: DayMinimumCardProps) {
  const progress = Math.min(1, minValue > 0 ? dayTotal / minValue : 1);

  const lines = (
    <>
      {deliveredOn && (
        <Typography sx={{ mt: showBar ? 1.25 : 0, fontSize: '0.9375rem', lineHeight: 1.4, color: '#1F1712' }}>Delivered {tidy(deliveredOn)}</Typography>
      )}
      {fixText && <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.4, color: '#6B6760' }}>{fixText}</Typography>}
    </>
  );

  if (!showBar) {
    // a day that meets the minimum: just where it is delivered (no card)
    return deliveredOn ? <Box sx={{ mb: 1.5 }}>{lines}</Box> : null;
  }

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
      {lines}
    </Box>
  );
}

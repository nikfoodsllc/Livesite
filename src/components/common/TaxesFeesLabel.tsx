'use client';

import { Box, Tooltip } from '@mui/material';
import { IconInfoCircle } from '@tabler/icons-react';
import { TAXES_FEES_TEXT, TAXES_FEES_TOOLTIP } from '@/lib/orderTotalsDisplay';

/**
 * "Taxes & Fees" with a small (i) next to it. Hovering it (or tapping it on a phone, or focusing it with the keyboard)
 * shows what is in the line: the 10.3% tax and the digital payment processing fee.
 */
export default function TaxesFeesLabel() {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {TAXES_FEES_TEXT}
      <Tooltip title={TAXES_FEES_TOOLTIP} arrow enterTouchDelay={0} leaveTouchDelay={5000} placement="top">
        <Box
          component="span"
          tabIndex={0}
          role="img"
          aria-label={`${TAXES_FEES_TEXT}: ${TAXES_FEES_TOOLTIP}`}
          sx={{ display: 'inline-flex', cursor: 'help', color: '#9CA3AF', '&:hover, &:focus-visible': { color: '#6B7280' }, '&:focus-visible': { outline: '2px solid #F5C77E', borderRadius: '50%' } }}
        >
          <IconInfoCircle size={14} />
        </Box>
      </Tooltip>
    </Box>
  );
}

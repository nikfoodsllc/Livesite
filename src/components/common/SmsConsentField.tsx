'use client';

import React from 'react';
import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material';
import Link from 'next/link';
import { SMS_CONSENT_LABEL, SMS_CONSENT_SMALL_PRINT } from '@/lib/sms/consent';

interface SmsConsentFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Shown instead of the small print when the box cannot be used (for example no phone number yet) */
  hint?: string;
}

/**
 * The text-message opt-in. Never ticked by default: the customer has to tick it themselves. The small print (rates, STOP)
 * and the links to the Terms and Privacy pages are required wherever this box appears.
 */
export default function SmsConsentField({ checked, onChange, disabled, hint }: SmsConsentFieldProps) {
  return (
    <Box>
      <FormControlLabel
        control={<Checkbox checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} sx={{ py: 0.5 }} />}
        label={<Typography sx={{ fontSize: 15, fontWeight: 500 }}>{SMS_CONSENT_LABEL}</Typography>}
        sx={{ m: 0, alignItems: 'center' }}
      />
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', pl: '34px', mt: -0.25, lineHeight: 1.5 }}>
        {hint ?? SMS_CONSENT_SMALL_PRINT}{' '}
        <Link href="/terms#sms" style={{ color: 'inherit', textDecoration: 'underline' }}>Terms</Link>
        {' · '}
        <Link href="/privacy#sms" style={{ color: 'inherit', textDecoration: 'underline' }}>Privacy</Link>
      </Typography>
    </Box>
  );
}

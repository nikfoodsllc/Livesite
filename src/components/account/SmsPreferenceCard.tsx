'use client';

import React, { useEffect, useState } from 'react';
import { Alert, Paper, Typography } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import SmsConsentField from '@/components/common/SmsConsentField';

/** My Account > Profile: turn order texts on or off. Agreeing uses the phone number saved on the profile. */
export default function SmsPreferenceCard() {
  const { user } = useAuth();
  const { authenticatedFetch } = useApiClient();
  const [optedIn, setOptedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hasPhone = /\d{10}/.test(String(user?.phone ?? '').replace(/\D/g, ''));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await authenticatedFetch('/api/account/sms-consent');
        const body = await response.json().catch(() => ({}));
        if (alive && response.ok) setOptedIn(Boolean(body?.data?.optedIn));
      } catch {
        /* the box simply stays off */
      }
    })();
    return () => {
      alive = false;
    };
  }, [authenticatedFetch, user?.phone]);

  const change = async (next: boolean) => {
    setBusy(true);
    setError('');
    try {
      const response = await authenticatedFetch('/api/account/sms-consent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optedIn: next }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Could not save');
      setOptedIn(Boolean(body?.data?.optedIn));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3 }, border: '1px solid #EDEDED', borderRadius: 2 }}>
      <Typography sx={{ fontWeight: 600, fontSize: 18, mb: 1 }}>Text messages</Typography>
      <SmsConsentField
        checked={optedIn && hasPhone}
        onChange={change}
        disabled={busy || !hasPhone}
        hint={hasPhone ? undefined : 'Add a phone number above first.'}
      />
      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
    </Paper>
  );
}

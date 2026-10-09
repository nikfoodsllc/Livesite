'use client';

import React, { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Container, Paper, TextField, Typography } from '@mui/material';
import Footer from '@/components/layout/Footer';
import SmsConsentField from '@/components/common/SmsConsentField';
import { validateUSPhone } from '@/utils/validation';

/** Public sign-up for order text messages: a phone number field and the opt-in box (never pre-ticked). No account needed. */
export default function TextUpdatesPage() {
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const check = validateUSPhone(phone);
    if (!check.valid) {
      setError(check.error || 'Enter a 10 digit US phone number.');
      return;
    }
    if (!agreed) {
      setError('Please tick the box to agree.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/sms/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, agreed: true }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Something went wrong. Please try again.');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box component="main" sx={{ flex: 1 }}>
        <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
          <Paper elevation={2} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
            <Typography variant="h1" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 700, mb: 1 }}>
              Text Updates
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.7 }}>
              Order and delivery updates from NikFoods by text message.
            </Typography>
            {done ? (
              <Alert severity="success">You are signed up. A confirmation text is on its way.</Alert>
            ) : (
              <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="Mobile phone number"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputProps={{ maxLength: 16, inputMode: 'tel' }}
                  fullWidth
                  required
                />
                <SmsConsentField checked={agreed} onChange={setAgreed} />
                {error && <Alert severity="error">{error}</Alert>}
                <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ textTransform: 'none', fontWeight: 700, py: 1.25 }}>
                  {busy ? <CircularProgress size={22} color="inherit" /> : 'Sign up'}
                </Button>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}

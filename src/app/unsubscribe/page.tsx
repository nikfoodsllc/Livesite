'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Container, Paper, TextField, Typography } from '@mui/material';
import Footer from '@/components/layout/Footer';
import { cleanOptOutEmail } from '@/lib/emailOptOut';

/** Public unsubscribe: confirm the email, press the button. Nothing happens just by opening the link (mail apps pre-open links). */
function UnsubscribeForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!cleanOptOutEmail(email)) {
      setError('Enter a valid email.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
    <Paper elevation={2} sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }}>
      <Typography variant="h1" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 700, mb: 3 }}>
        Unsubscribe
      </Typography>
      {done ? (
        <Alert severity="success">You are unsubscribed. This request may take up to 24 hrs to be processed.</Alert>
      ) : (
        <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputProps={{ maxLength: 254, inputMode: 'email' }}
            fullWidth
            required
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ textTransform: 'none', fontWeight: 700, py: 1.25 }}>
            {busy ? <CircularProgress size={22} color="inherit" /> : 'Unsubscribe'}
          </Button>
        </Box>
      )}
    </Paper>
  );
}

export default function UnsubscribePage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box component="main" sx={{ flex: 1 }}>
        <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
          <Suspense fallback={null}>
            <UnsubscribeForm />
          </Suspense>
        </Container>
      </Box>
      <Footer />
    </Box>
  );
}

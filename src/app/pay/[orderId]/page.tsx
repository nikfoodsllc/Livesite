'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Container, Divider, Paper, Typography } from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

/**
 * The page behind the pay link an admin emails for an order they entered. The secret in the link opens this one
 * order only. It reuses the same Stripe payment the checkout uses, so the website's payment handling (marking the
 * order paid, the confirmation email, the Stripe fee) runs unchanged once the card is accepted.
 */

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface PayData {
  state: 'pay' | 'paid' | 'closed';
  orderId: string;
  firstName?: string;
  clientSecret?: string;
  customer?: { name: string; email: string; phone: string };
  subtotal?: number;
  taxesAndFees?: number;
  tip?: number;
  discount?: number;
  total?: number;
  days?: Array<{ date: string; items: Array<{ name: string; quantity: number; price: number; portion?: string; spice?: string; eco?: boolean }> }>;
}

const money = (n: number | undefined) => `$${(n ?? 0).toFixed(2)}`;
const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: '#FAFAFA', minHeight: '70vh', py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="sm" sx={{ px: { xs: 1.5, sm: 3 } }}>
        {children}
      </Container>
    </Box>
  );
}

function PayForm({ data, token, onPaid }: { data: PayData; token: string; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pay = async () => {
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError('');
    const returnUrl = `${window.location.origin}/pay/${encodeURIComponent(data.orderId)}?t=${encodeURIComponent(token)}`;
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        payment_method_data: {
          billing_details: { name: data.customer?.name, email: data.customer?.email, phone: data.customer?.phone },
        },
      },
      redirect: 'if_required',
    });
    if (result.error) {
      setError(result.error.message ?? 'The payment did not go through. Please try again.');
      setBusy(false);
      return;
    }
    if (result.paymentIntent?.status === 'succeeded') {
      onPaid();
      return;
    }
    setError('The payment could not be completed. Please try again.');
    setBusy(false);
  };

  return (
    <Box>
      <PaymentElement options={{ layout: { type: 'accordion', defaultCollapsed: false } }} />
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} role="alert">
          {error}
        </Alert>
      )}
      <Button
        fullWidth
        size="large"
        variant="contained"
        disabled={!stripe || busy}
        onClick={pay}
        sx={{ mt: 2, py: 1.4, fontWeight: 800, textTransform: 'none', fontSize: 17, bgcolor: '#FF9F0D', color: '#1A1106', '&:hover': { bgcolor: '#E68A00' } }}
      >
        {busy ? <CircularProgress size={22} sx={{ color: '#1A1106' }} /> : `Pay ${money(data.total)}`}
      </Button>
    </Box>
  );
}

function PayInner() {
  const params = useParams<{ orderId: string }>();
  const search = useSearchParams();
  const token = search.get('t') ?? '';
  const orderId = decodeURIComponent(String(params.orderId ?? ''));
  const [data, setData] = useState<PayData | null>(null);
  const [problem, setProblem] = useState('');
  const [justPaid, setJustPaid] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/pay/${encodeURIComponent(orderId)}?t=${encodeURIComponent(token)}`, { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setProblem(body.error || 'This payment link is not valid.');
        return;
      }
      setData(body.data);
    } catch {
      setProblem('We could not load your order. Please check your connection and try again.');
    }
  }, [orderId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  // after a payment (also when the bank sent the customer away and back) wait for the website to record it
  useEffect(() => {
    if (!justPaid && search.get('redirect_status') !== 'succeeded') return;
    setJustPaid(true);
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      void load();
      if (tries >= 8) clearInterval(timer);
    }, 2500);
    return () => clearInterval(timer);
  }, [justPaid, search, load]);

  const elementsOptions = useMemo(
    () => (data?.clientSecret ? { clientSecret: data.clientSecret, appearance: { theme: 'stripe' as const, variables: { colorPrimary: '#FF9F0D' } } } : undefined),
    [data?.clientSecret]
  );

  if (problem) {
    return (
      <Shell>
        <Alert severity="error" role="alert">{problem}</Alert>
        <Typography sx={{ mt: 2, color: '#555', fontSize: 14 }}>
          If you need a new link, reply to your order email or write to <a href="mailto:support@nikfoods.com">support@nikfoods.com</a>.
        </Typography>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#FF9F0D' }} />
        </Box>
      </Shell>
    );
  }
  if (data.state === 'paid' || (justPaid && data.state !== 'pay')) {
    return (
      <Shell>
        <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Payment received{data.firstName ? `, thank you ${data.firstName}!` : '!'}</Typography>
          <Typography sx={{ color: '#555' }}>Order {data.orderId} is confirmed. We are sending your confirmation email now.</Typography>
        </Paper>
      </Shell>
    );
  }
  if (data.state === 'closed') {
    return (
      <Shell>
        <Alert severity="info" role="alert">This order can no longer be paid with this link. Please contact <a href="mailto:support@nikfoods.com">support@nikfoods.com</a>.</Alert>
      </Shell>
    );
  }
  if (justPaid) {
    return (
      <Shell>
        <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
          <CircularProgress size={26} sx={{ color: '#FF9F0D', mb: 1 }} />
          <Typography sx={{ fontWeight: 700 }}>Confirming your payment…</Typography>
          <Typography sx={{ color: '#555', fontSize: 14 }}>This takes a few seconds. Please do not close this page.</Typography>
        </Paper>
      </Shell>
    );
  }

  return (
    <Shell>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Pay for your NikFoods order</Typography>
      <Typography sx={{ color: '#666', mb: 2, fontSize: 14 }}>Order {data.orderId}</Typography>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, mb: 2, borderRadius: 3, border: '1px solid #ECECEC' }}>
        {data.days?.map((day) => (
          <Box key={day.date} sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A85A00', mb: 0.5 }}>
              Delivery · {dayLabel(day.date)}
            </Typography>
            {day.items.map((it, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, wordBreak: 'break-word' }}>{it.quantity} × {it.name}</Typography>
                  {(it.portion || it.spice || it.eco) && (
                    <Typography sx={{ fontSize: 12, color: '#777' }}>{[it.portion, it.spice, it.eco ? 'Eco container' : ''].filter(Boolean).join(' · ')}</Typography>
                  )}
                </Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}>{money(it.price * it.quantity)}</Typography>
              </Box>
            ))}
          </Box>
        ))}
        <Divider sx={{ my: 1 }} />
        <Row label="Subtotal" value={money(data.subtotal)} />
        <Row label="Taxes & Fees" value={money(data.taxesAndFees)} />
        {(data.tip ?? 0) > 0 && <Row label="Tip — thank you!" value={money(data.tip)} />}
        {(data.discount ?? 0) > 0 && <Row label="Discount" value={`-${money(data.discount)}`} />}
        <Row label="Total" value={money(data.total)} bold />
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, border: '1px solid #ECECEC' }}>
        {elementsOptions ? (
          <Elements stripe={stripePromise} options={elementsOptions}>
            <PayForm data={data} token={token} onPaid={() => setJustPaid(true)} />
          </Elements>
        ) : (
          <Alert severity="error">The payment form could not be loaded.</Alert>
        )}
      </Paper>
    </Shell>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
      <Typography sx={{ fontSize: bold ? 16 : 14, fontWeight: bold ? 800 : 400, color: bold ? '#111' : '#555' }}>{label}</Typography>
      <Typography sx={{ fontSize: bold ? 16 : 14, fontWeight: bold ? 800 : 400, color: bold ? '#111' : '#555' }}>{value}</Typography>
    </Box>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={null}>
      <PayInner />
    </Suspense>
  );
}

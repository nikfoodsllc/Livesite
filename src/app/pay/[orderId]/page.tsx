'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Container, Divider, Paper, Typography } from '@mui/material';
import { IconLock } from '@tabler/icons-react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { formatSpiceLevel } from '@/utils/formatters';

/**
 * The page behind the pay link an admin emails for an order they entered. It is laid out like the website's
 * checkout page (same payment card, Apple Pay first, same order summary) so it feels the same to the customer.
 * The secret in the link opens this one order only. The Stripe payment is the same kind the checkout uses, so the
 * website's payment handling (marking the order paid, the confirmation email, the Stripe fee) runs unchanged.
 */

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// same look as the checkout page's payment form (see app/checkout/page.tsx)
const stripeAppearance: StripeElementsOptions['appearance'] = {
  theme: 'stripe',
  variables: { colorPrimary: '#FF9F0D' },
  rules: { '.AccordionItem': { fontSize: '20px' } },
};

interface PayItem {
  name: string;
  quantity: number;
  price: number;
  portion?: string;
  spice?: string;
  eco?: boolean;
  combo: string[];
}

interface PayData {
  state: 'pay' | 'paid' | 'closed' | 'cutoff';
  orderId: string;
  message?: string;
  firstName?: string;
  clientSecret?: string;
  customer?: { name: string; email: string; phone: string };
  subtotal?: number;
  platformFee?: number;
  deliveryFee?: number;
  tax?: number;
  tip?: number;
  discount?: number;
  discountCode?: string;
  total?: number;
  days?: Array<{ date: string; dayTotal: number; items: PayItem[] }>;
}

const money = (n: number | undefined) => `$${(n ?? 0).toFixed(2)}`;
const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function Page({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: '#FAFAFA', minHeight: '70vh', py: 4 }}>
      <Container maxWidth="lg">{children}</Container>
    </Box>
  );
}

function Header({ orderId }: { orderId?: string }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Checkout
      </Typography>
      <Typography variant="body1" sx={{ color: '#666' }}>
        {orderId ? `Complete your payment for order ${orderId} and we will start preparing it` : 'Complete your payment'}
      </Typography>
    </Box>
  );
}

function SummaryRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2" sx={{ color: green ? '#28a745' : undefined }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, color: green ? '#28a745' : undefined }}>{value}</Typography>
    </Box>
  );
}

function OrderSummary({ data }: { data: PayData }) {
  const itemCount = data.days?.reduce((sum, d) => sum + d.items.length, 0) ?? 0;
  return (
    <Box sx={{ position: { md: 'sticky' }, top: 20 }}>
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #EDEDED' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Order Summary
        </Typography>
        <Box sx={{ mb: 2 }}>
          {data.days?.map((day) => (
            <Box key={day.date} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#FF9F0D', mb: 1 }}>
                {dayLabel(day.date)}
              </Typography>
              {day.items.map((item, i) => (
                <Box key={i} sx={{ mb: 1, pl: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      {item.name} x {item.quantity}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {money(item.price * item.quantity)}
                    </Typography>
                  </Box>
                  {item.combo.length > 0 && (
                    <Box sx={{ mt: 0.5, pl: 1 }}>
                      {item.combo.map((line) => (
                        <Typography key={line} variant="caption" sx={{ color: '#999', fontSize: '0.7rem', display: 'block' }}>
                          • {line}
                        </Typography>
                      ))}
                    </Box>
                  )}
                  {(item.portion || item.spice || item.eco) && (
                    <Box sx={{ mt: 0.5, pl: 1 }}>
                      {item.portion && (
                        <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem', display: 'block' }}>• {item.portion}</Typography>
                      )}
                      {item.spice && (
                        <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem', display: 'block' }}>• Spice: {formatSpiceLevel(item.spice)}</Typography>
                      )}
                      {item.eco && (
                        <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem', display: 'block' }}>• Eco container</Typography>
                      )}
                    </Box>
                  )}
                </Box>
              ))}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, pl: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Day Total:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{money(day.dayTotal)}</Typography>
              </Box>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <SummaryRow label="Subtotal" value={money(data.subtotal)} />
          <SummaryRow label="Platform Fee" value={money(data.platformFee)} />
          <SummaryRow label="Delivery Fee" value={(data.deliveryFee ?? 0) > 0 ? money(data.deliveryFee) : 'Free'} green={(data.deliveryFee ?? 0) <= 0} />
          <SummaryRow label="Tax (10.3%)" value={money(data.tax)} />
          {(data.tip ?? 0) > 0 && <SummaryRow label="Tip" value={money(data.tip)} />}
          {(data.discount ?? 0) > 0 && (
            <SummaryRow label={data.discountCode ? `Discount (${data.discountCode})` : 'Discount'} value={`-${money(data.discount)}`} green />
          )}
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Total</Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#FF9F0D' }}>{money(data.total)}</Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 2, color: '#666', textAlign: 'center' }}>
          {itemCount} items in order
        </Typography>
      </Paper>
    </Box>
  );
}

function PayForm({ data, token, onPaid, onClosed }: { data: PayData; token: string; onPaid: () => void; onClosed: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  const pay = async () => {
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError('');
    try {
      // ask the site whether every delivery day is still open, right before charging (like the checkout page does)
      const check = await fetch(`/api/pay/${encodeURIComponent(data.orderId)}/check?t=${encodeURIComponent(token)}`, { method: 'POST', cache: 'no-store' });
      if (check.status === 409) {
        const body = await check.json().catch(() => ({}));
        setError(`${body.error || 'Ordering has closed for a day in this order.'} Please contact support@nikfoods.com so we can help.`);
        setBusy(false);
        onClosed();
        return;
      }
      const submitted = await elements.submit();
      if (submitted.error) {
        setError(submitted.error.message ?? 'Please check your payment details.');
        setBusy(false);
        return;
      }
      const returnUrl = `${window.location.origin}/pay/${encodeURIComponent(data.orderId)}?t=${encodeURIComponent(token)}`;
      const name = data.customer?.name;
      const email = data.customer?.email;
      const phone = data.customer?.phone;
      const result = await stripe.confirmPayment({
        elements,
        clientSecret: data.clientSecret!,
        confirmParams: {
          return_url: returnUrl,
          // the payment form only asks for what a method needs, so attach the cardholder details like the checkout does
          payment_method_data: { billing_details: { ...(name ? { name } : {}), ...(email ? { email } : {}), ...(phone ? { phone } : {}) } },
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    }
    setBusy(false);
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #EDEDED', borderRadius: '12px', bgcolor: '#fff' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Payment details
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')} role="alert">
            {error}
          </Alert>
        )}
        {!stripe || !elements ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={22} sx={{ color: '#FF9F0D' }} />
            <Typography variant="body2" sx={{ color: '#666' }}>Loading payment options…</Typography>
          </Box>
        ) : (
          <Box sx={{ mb: 1 }}>
            <PaymentElement
              onChange={(event) => setComplete(event.complete)}
              options={{
                layout: { type: 'accordion', defaultCollapsed: false },
                // Apple Pay first, then Card (same as the checkout page); Apple Pay only shows where the device supports it
                paymentMethodOrder: ['apple_pay', 'card'],
                wallets: { applePay: 'auto', googlePay: 'auto' },
                defaultValues: { billingDetails: { name: data.customer?.name, email: data.customer?.email, phone: data.customer?.phone } },
              }}
            />
          </Box>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
          <IconLock size={14} style={{ color: '#666' }} />
          <Typography variant="caption" sx={{ color: '#666' }}>Secured by Stripe</Typography>
        </Box>
      </Paper>

      <Button
        fullWidth
        variant="contained"
        size="large"
        onClick={pay}
        disabled={busy || !stripe || !elements || !complete}
        startIcon={busy ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : null}
        sx={{ bgcolor: '#FF9F0D', color: '#fff', py: 1.5, fontSize: '16px', fontWeight: 600, '&:hover': { bgcolor: '#e68f0c' }, '&:disabled': { bgcolor: '#ccc', color: '#666' } }}
      >
        {busy ? 'Processing…' : `Pay ${money(data.total)}`}
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
    () => (data?.clientSecret ? { clientSecret: data.clientSecret, appearance: stripeAppearance } : undefined),
    [data?.clientSecret]
  );

  if (problem) {
    return (
      <Page>
        <Header />
        <Alert severity="error" role="alert">{problem}</Alert>
        <Typography sx={{ mt: 2, color: '#555', fontSize: 14 }}>
          If you need a new link, reply to your order email or write to <a href="mailto:support@nikfoods.com">support@nikfoods.com</a>.
        </Typography>
      </Page>
    );
  }
  if (!data) {
    return (
      <Page>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#FF9F0D' }} />
        </Box>
      </Page>
    );
  }
  if (data.state === 'paid' || (justPaid && data.state !== 'pay')) {
    return (
      <Page>
        <Header />
        <Paper elevation={0} sx={{ p: 4, border: '1px solid #EDEDED', borderRadius: '12px', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Payment received{data.firstName ? `, thank you ${data.firstName}!` : '!'}</Typography>
          <Typography sx={{ color: '#555' }}>Order {data.orderId} is confirmed. We are sending your confirmation email now.</Typography>
        </Paper>
      </Page>
    );
  }
  if (data.state === 'cutoff') {
    return (
      <Page>
        <Header />
        <Alert severity="warning" role="alert">
          {data.message || 'Ordering has closed for a day in this order.'} Please contact <a href="mailto:support@nikfoods.com">support@nikfoods.com</a> so we can help.
        </Alert>
      </Page>
    );
  }
  if (data.state === 'closed') {
    return (
      <Page>
        <Header />
        <Alert severity="info" role="alert">This order can no longer be paid with this link. Please contact <a href="mailto:support@nikfoods.com">support@nikfoods.com</a>.</Alert>
      </Page>
    );
  }
  if (justPaid) {
    return (
      <Page>
        <Header />
        <Paper elevation={0} sx={{ p: 4, border: '1px solid #EDEDED', borderRadius: '12px', textAlign: 'center' }}>
          <CircularProgress size={26} sx={{ color: '#FF9F0D', mb: 1 }} />
          <Typography sx={{ fontWeight: 700 }}>Confirming your payment…</Typography>
          <Typography sx={{ color: '#555', fontSize: 14 }}>This takes a few seconds. Please do not close this page.</Typography>
        </Paper>
      </Page>
    );
  }

  return (
    <Page>
      <Header orderId={data.orderId} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 400px' }, gap: 3, alignItems: 'start' }}>
        <Box>
          {elementsOptions ? (
            <Elements stripe={stripePromise} key={data.clientSecret} options={elementsOptions}>
              <PayForm data={data} token={token} onPaid={() => setJustPaid(true)} onClosed={() => void load()} />
            </Elements>
          ) : (
            <Alert severity="error">The payment form could not be loaded.</Alert>
          )}
        </Box>
        <OrderSummary data={data} />
      </Box>
    </Page>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={null}>
      <PayInner />
    </Suspense>
  );
}

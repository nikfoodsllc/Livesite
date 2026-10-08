'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Container, Divider, Paper, Typography } from '@mui/material';
import { IconLock, IconMail, IconMapPin, IconPhone, IconUser } from '@tabler/icons-react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { hasAmount, taxesAndFeesOf } from '@/lib/orderTotalsDisplay';
import TaxesFeesLabel from '@/components/common/TaxesFeesLabel';

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
  notes?: string;
  combo: Array<{ title: string; choices: string[] }>;
}

interface PayData {
  state: 'pay' | 'paid' | 'closed' | 'cutoff';
  orderId: string;
  message?: string;
  firstName?: string;
  clientSecret?: string;
  customer?: { name: string; email: string; phone: string };
  address?: { street?: string; apartment?: string; city?: string; state?: string; zip?: string; entrance?: string; floor?: string; landmark?: string };
  subtotal?: number;
  platformFee?: number;
  deliveryFee?: number;
  tax?: number;
  tip?: number;
  discount?: number;
  discountCode?: string;
  total?: number;
  days?: Array<{ day: string; date: string; deliverOn: string; dayTotal: number; items: PayItem[] }>;
}

const money = (n: number | undefined) => `$${(n ?? 0).toFixed(2)}`;
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

// colours of the NikFoods emails (the order details below are laid out like the order confirmation email)
const C = {
  card: '#FFFBF5', surface: '#FBF1E1', line: '#EADBC3', text: '#2B1D0E', body: '#54442F', muted: '#76664F',
  brand: '#F89C35', brandText: '#A85A00', onBrand: '#1A1106', tile: '#FFE7C2', tileLine: '#F2B35E', green: '#14803C',
};

const pickedParts = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  return {
    month: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    dom: d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' }),
  };
};
const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
const fullDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function Tag({ text, bg, line, color }: { text: string; bg: string; line: string; color: string }) {
  return (
    <Box component="span" sx={{ display: 'inline-block', mr: 0.75, mt: 0.4, px: 1.1, py: '1px', border: `1px solid ${line}`, borderRadius: '999px', bgcolor: bg, color, fontSize: 11, fontWeight: 700, lineHeight: '16px' }}>
      {text}
    </Box>
  );
}

function ItemTags({ item }: { item: PayItem }) {
  return (
    <Box>
      {item.portion && <Tag text={item.portion} bg={C.tile} line={C.tileLine} color={C.brandText} />}
      {item.spice && <Tag text={`\u{1F336}\uFE0F ${item.spice}`} bg="#FDE7E2" line="#EFA397" color="#A12A14" />}
      {item.eco && <Tag text={'\u267B\uFE0F Eco'} bg="#E2F4E7" line="#8CCB9B" color="#126B2C" />}
    </Box>
  );
}

function DayCard({ day }: { day: NonNullable<PayData['days']>[number] }) {
  const { month, dom } = pickedParts(day.date);
  const n = day.items.reduce((sum, i) => sum + i.quantity, 0);
  return (
    <Box sx={{ mt: 1.25, border: `1px solid ${C.line}`, borderRadius: '16px', bgcolor: C.card, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: { xs: 1.75, sm: 2.25 }, py: 1, bgcolor: C.surface, borderBottom: `1px solid ${C.line}` }}>
        <Box sx={{ width: 50, height: 50, flexShrink: 0, border: `2px solid ${C.brand}`, bgcolor: C.tile, borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: C.brandText, lineHeight: '12px' }}>{month}</Typography>
          <Typography sx={{ fontSize: 21, fontWeight: 800, color: C.text, lineHeight: '23px' }}>{dom}</Typography>
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 800, color: C.text, lineHeight: '24px' }}>{day.day}</Typography>
          <Typography sx={{ fontSize: 13, color: C.muted, lineHeight: '18px' }}>
            Deliver on <strong style={{ color: C.text }}>{weekdayOf(day.deliverOn)}</strong>, {fullDate(day.deliverOn)}
          </Typography>
        </Box>
        <Box sx={{ flexShrink: 0, border: `2px solid ${C.brand}`, bgcolor: C.tile, borderRadius: '16px', px: 1.25, py: '2px' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: C.brandText, whiteSpace: 'nowrap' }}>{n} item{n === 1 ? '' : 's'}</Typography>
        </Box>
      </Box>
      <Box sx={{ px: { xs: 1.75, sm: 2.25 }, pb: 0.25 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 26px 70px', sm: '1fr 64px 90px' }, pt: 0.75 }}>
          {['Item', 'Qty', 'Price'].map((h, i) => (
            <Typography key={h} sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right' }}>{h}</Typography>
          ))}
        </Box>
        {day.items.map((item, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 26px 70px', sm: '1fr 64px 90px' }, py: 0.9, borderBottom: i === day.items.length - 1 ? 'none' : `1px solid ${C.line}` }}>
            <Box sx={{ pr: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: '21px', wordBreak: 'break-word' }}>{item.name}</Typography>
              <ItemTags item={item} />
              {item.combo.length > 0 && (
                <Box sx={{ mt: 0.4 }}>
                  {item.combo.map((c) => (
                    <Typography key={c.title} sx={{ fontSize: 12, lineHeight: '17px', color: C.muted }}>
                      <span style={{ fontWeight: 400 }}>{c.title}:</span> <strong style={{ color: C.body }}>{c.choices.join(', ')}</strong>
                    </Typography>
                  ))}
                </Box>
              )}
              {item.notes && <Typography sx={{ mt: 0.75, fontSize: 12, fontStyle: 'italic', color: C.green }}>“{item.notes}”</Typography>}
            </Box>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: C.text, textAlign: 'center' }}>{item.quantity}</Typography>
            <Typography sx={{ fontSize: { xs: 14, sm: 15 }, fontWeight: 800, color: C.text, textAlign: 'right', whiteSpace: 'nowrap' }}>{money(item.price * item.quantity)}</Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ px: { xs: 1.75, sm: 2.25 }, py: 0.9, bgcolor: C.surface, borderTop: `1px solid ${C.line}`, textAlign: 'right' }}>
        <Typography component="span" sx={{ fontSize: 13, fontWeight: 700, color: C.body }}>{day.day} total&nbsp;&nbsp;</Typography>
        <Typography component="span" sx={{ fontSize: 15, fontWeight: 800, color: C.text }}>{money(day.dayTotal)}</Typography>
      </Box>
    </Box>
  );
}

function SumRow({ label, value, note }: { label: React.ReactNode; value: string; note?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: '3px' }}>
      <Typography sx={{ fontSize: 14, color: C.body }}>
        {label}
        {note ? <span style={{ color: C.muted, fontSize: 12 }}> {note}</span> : null}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: C.text }}>{value}</Typography>
    </Box>
  );
}

/** The order, laid out like the Order Details and Payment summary of the order confirmation email. */
function OrderSummary({ data }: { data: PayData }) {
  const taxesAndFees = taxesAndFeesOf({ taxes: data.tax, platformFee: data.platformFee, deliveryFee: data.deliveryFee });
  return (
    <Box sx={{ position: { md: 'sticky' }, top: 20 }}>
      <Typography sx={{ fontSize: 20, fontWeight: 800, color: C.text, lineHeight: '26px' }}>Order Details</Typography>
      {data.days?.map((day) => <DayCard key={`${day.date}-${day.day}`} day={day} />)}
      <Typography sx={{ fontSize: 20, fontWeight: 800, color: C.text, lineHeight: '26px', mt: 2, mb: 1.5 }}>Payment summary</Typography>
      <Box sx={{ border: `1px solid ${C.line}`, borderRadius: '16px', bgcolor: C.card, overflow: 'hidden' }}>
        <Box sx={{ px: 2.25, py: 1 }}>
          <SumRow label="Subtotal" value={money(data.subtotal)} />
          {(data.discount ?? 0) > 0 && <SumRow label={data.discountCode ? `Discount (${data.discountCode})` : 'Discount'} value={`-${money(data.discount)}`} />}
          {hasAmount(taxesAndFees) && <SumRow label={<TaxesFeesLabel />} value={money(taxesAndFees)} />}
          {(data.tip ?? 0) > 0 && <SumRow label="Tip" note="— thank you!" value={money(data.tip)} />}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: C.brand, px: 2.25, py: 1.4 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: C.onBrand }}>Total to pay</Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: C.onBrand }}>{money(data.total)}</Typography>
        </Box>
      </Box>
    </Box>
  );
}

/** A small orange icon tile like the one the checkout page puts next to the address. */
function IconTile({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '8px', bgcolor: '#FFF5E6', color: '#FF9F0D', flexShrink: 0 }}>
      {children}
    </Box>
  );
}

/** Contact Information and Delivery Address, in the same cards as the checkout page. */
function DeliveryDetails({ data }: { data: PayData }) {
  const a = data.address ?? {};
  const street = (a.street ?? '').trim();
  const cityLine = [a.city, a.state].filter(Boolean).join(', ') + (a.zip ? ` ${a.zip}` : '');
  const streetHasCity = street && a.city ? street.toLowerCase().includes(a.city.trim().toLowerCase()) : false;
  const cardSx = { p: 3, mb: 3, border: '1px solid #EDEDED' } as const;
  return (
    <>
      <Paper elevation={0} sx={cardSx}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Contact Information
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[
            { icon: <IconUser size={20} />, value: data.customer?.name },
            { icon: <IconMail size={20} />, value: data.customer?.email },
            { icon: <IconPhone size={20} />, value: data.customer?.phone },
          ]
            .filter((row) => row.value)
            .map((row, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconTile>{row.icon}</IconTile>
                <Typography variant="body1" sx={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{row.value}</Typography>
              </Box>
            ))}
        </Box>
      </Paper>

      <Paper elevation={0} sx={cardSx}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Delivery Address
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconTile>
            <IconMapPin size={24} />
          </IconTile>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" sx={{ mb: 0.5, wordBreak: 'break-word' }}>{street}</Typography>
            {a.apartment && (
              <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>{a.apartment}</Typography>
            )}
            {!streetHasCity && cityLine.trim() && (
              <Typography variant="body2" sx={{ color: '#666' }}>{cityLine}</Typography>
            )}
            {a.entrance && (
              <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>Gate code: {a.entrance}</Typography>
            )}
            {a.floor && (
              <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>Delivery instructions: {a.floor}</Typography>
            )}
            {a.landmark && (
              <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>Landmark: {a.landmark}</Typography>
            )}
          </Box>
        </Box>
      </Paper>
    </>
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
  const viewReported = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/pay/${encodeURIComponent(orderId)}?t=${encodeURIComponent(token)}`, { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setProblem(body.error || 'This payment link is not valid.');
        return;
      }
      setData(body.data);
      // tell the shop the link was opened in a browser (once per page load; never blocks anything)
      if (!viewReported.current) {
        viewReported.current = true;
        void fetch(`/api/pay/${encodeURIComponent(orderId)}/seen?t=${encodeURIComponent(token)}`, { method: 'POST', keepalive: true, cache: 'no-store' }).catch(() => undefined);
      }
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
          <DeliveryDetails data={data} />
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

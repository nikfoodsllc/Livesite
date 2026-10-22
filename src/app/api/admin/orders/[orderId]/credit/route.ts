import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { db } from '@/lib/server/db';
import type { Order } from '@/types/order';
import { issueItemCredit, type CreditSelection } from '@/lib/server/storeCreditIssue';
import { sendStoreCreditEmail } from '@/lib/storeCreditEmail';
import { notifyOrderSafely } from '@/lib/server/push/orderPush';
import { toCents } from '@/lib/storeCredit';
import { deliveryDaysOf } from '@/lib/server/optimoRoute/stops';
import { syncAfterCredit } from '@/lib/server/optimoRoute/sync';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/orders/{orderId}/credit  { items: [{ line, item, quantity? }], note? }
 * Gives the customer store credit for specific items of a paid order (item price, plus the 10.3% tax on it only when includeTax is true (default: withheld); the Platform Fee, the tax
 * on it and the tip are never credited) and emails them. The credit is added even if the email fails.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const { orderId: raw } = await params;
  const orderId = decodeURIComponent(raw);

  let body: { items?: unknown; note?: unknown; includeTax?: unknown; includeFee?: unknown; entireOrder?: unknown; internalNote?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? (body.items as CreditSelection[]) : [];
  const note = typeof body.note === 'string' ? body.note : undefined;

  // the days the order is delivered on before this credit, to see afterwards which days have nothing left
  const beforeRead = await db.readOne<Order>('orders', { orderId } as never);
  const datesBefore = beforeRead.success && beforeRead.data ? deliveryDaysOf(beforeRead.data).map((d) => d.date) : [];

  const result = await issueItemCredit(orderId, items, note, auth.adminId, body.includeTax === true, body.includeFee === true, body.entireOrder === true, typeof body.internalNote === 'string' ? body.internalNote : undefined);
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });

  // the credited items are not delivered: take the order (or the days with nothing left) off the OptimoRoute stops
  await syncAfterCredit(orderId, datesBefore);

  // tell the customer (best effort: the credit stands either way)
  let email: { sent: boolean; error?: string } = { sent: false };
  try {
    const found = await db.readOne<Order>('orders', { orderId } as never);
    if (found.success && found.data) {
      // the whole order is credited when the "entire order" button was used, or everything credited so far adds up to what was paid
      const creditedSoFar = (found.data.creditsIssued ?? []).reduce((n, c) => n + toCents(c.amount || 0), 0);
      const full = result.issued.entireOrder === true || (toCents(found.data.totalPaid) > 0 && creditedSoFar >= toCents(found.data.totalPaid));
      const sent = await sendStoreCreditEmail(found.data, {
        full,
        orderTotal: found.data.totalPaid,
        amount: result.issued.amount,
        items: [
          ...result.issued.items.map((i) => ({ name: i.name, quantity: i.quantity, amount: i.amount })),
          ...(result.issued.fee ? [{ name: 'Platform Fee (with tax)', quantity: 1, amount: result.issued.fee }] : []),
          ...(result.issued.tip ? [{ name: 'Tip', quantity: 1, amount: result.issued.tip }] : []),
        ],
        balance: result.balance,
        note: result.issued.note,
      });
      email = sent.success ? { sent: true } : { sent: false, error: sent.error };
      if (sent.success) await db.updateOne('orders', { orderId } as never, { $set: { creditEmail: { sentAt: new Date(), messageId: sent.messageId } } } as never);
    }
  } catch (error) {
    email = { sent: false, error: error instanceof Error ? error.message : 'Email failed' };
  }

  // and on the phone (best effort; one message for each credit, so a second credit on the same order is told too)
  const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;
  await notifyOrderSafely(orderId, 'store_credit', {
    guardKey: `store_credit-${Date.now()}`,
    note: `${money(result.issued.amount)} was added to your store credit${typeof result.balance === 'number' ? ` (balance ${money(result.balance)})` : ''}.`,
  });

  return NextResponse.json({ success: true, data: { orderId, issued: result.issued, balance: result.balance, email } });
}

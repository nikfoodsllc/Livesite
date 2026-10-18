import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { db } from '@/lib/server/db';
import type { Order } from '@/types/order';
import { issueItemCredit, type CreditSelection } from '@/lib/server/storeCreditIssue';
import { sendStoreCreditEmail } from '@/lib/storeCreditEmail';

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

  let body: { items?: unknown; note?: unknown; includeTax?: unknown; includeFee?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? (body.items as CreditSelection[]) : [];
  const note = typeof body.note === 'string' ? body.note : undefined;

  const result = await issueItemCredit(orderId, items, note, auth.adminId, body.includeTax === true, body.includeFee === true);
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });

  // tell the customer (best effort: the credit stands either way)
  let email: { sent: boolean; error?: string } = { sent: false };
  try {
    const found = await db.readOne<Order>('orders', { orderId } as never);
    if (found.success && found.data) {
      const sent = await sendStoreCreditEmail(found.data, {
        amount: result.issued.amount,
        items: [
          ...result.issued.items.map((i) => ({ name: i.name, quantity: i.quantity, amount: i.amount })),
          ...(result.issued.fee ? [{ name: 'Platform Fee (with tax)', quantity: 1, amount: result.issued.fee }] : []),
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

  return NextResponse.json({ success: true, data: { orderId, issued: result.issued, balance: result.balance, email } });
}

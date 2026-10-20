import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { requireAdminWithId } from '@/lib/adminAuth';
import { addCredit, getBalanceCents, getLedger, spendCredit } from '@/lib/server/storeCredit';
import { toCents, toDollars } from '@/lib/storeCredit';

export const dynamic = 'force-dynamic';

const MAX_ADJUST_CENTS = 100000; // $1,000 in one go

/** GET: the customer's store credit balance and its history (admin only). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const { userId } = await params;
  if (!/^[a-f0-9]{24}$/i.test(userId)) return NextResponse.json({ success: false, error: 'Not a valid customer.' }, { status: 400 });
  const [balanceCents, ledger] = await Promise.all([getBalanceCents(userId), getLedger(userId, 200)]);

  // the order each row belongs to (when it was placed and what it came to) and the name of the admin who made the change
  const orderIds = [...new Set(ledger.map((r) => r.orderId).filter((id): id is string => !!id))];
  const orders = orderIds.length
    ? await db.read<{ orderId: string; createdAt?: Date; totalPaid?: number; status?: string }>('orders', { orderId: { $in: orderIds } } as never, { projection: { orderId: 1, createdAt: 1, totalPaid: 1, status: 1 } })
    : { success: true, data: [] };
  const orderById = new Map((orders.success && orders.data ? orders.data : []).map((o) => [o.orderId, o]));
  const adminIds = [...new Set(ledger.map((r) => r.by).filter((id): id is string => !!id && ObjectId.isValid(id)))];
  const admins = adminIds.length
    ? await db.read<{ _id: ObjectId; name?: string; email?: string }>('users', { _id: { $in: adminIds.map((id) => new ObjectId(id)) } } as never, { projection: { name: 1, email: 1 } })
    : { success: true, data: [] };
  const adminById = new Map((admins.success && admins.data ? admins.data : []).map((a) => [String(a._id), a.name || a.email || '']));

  return NextResponse.json({
    success: true,
    data: {
      balance: toDollars(balanceCents),
      history: ledger.map((r) => {
        const order = r.orderId ? orderById.get(r.orderId) : undefined;
        return {
          at: r.at,
          amount: toDollars(r.cents),
          type: r.type,
          orderId: r.orderId,
          reason: r.reason,
          internalNote: r.internalNote,
          by: r.by,
          byName: r.by ? adminById.get(r.by) || '' : '',
          items: (r.items ?? []).map((i) => ({ name: i.name, quantity: i.quantity, amount: toDollars(i.cents) })),
          order: order ? { placedAt: order.createdAt, total: order.totalPaid, status: order.status } : undefined,
          balanceAfter: r.balanceAfterCents === undefined ? undefined : toDollars(r.balanceAfterCents),
        };
      }),
    },
  });
}

/** POST { amount, reason }: a manual change by an admin: + adds credit, - removes it (never below zero). A reason is required. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const { userId } = await params;
  if (!/^[a-f0-9]{24}$/i.test(userId)) return NextResponse.json({ success: false, error: 'Not a valid customer.' }, { status: 400 });

  let body: { amount?: unknown; reason?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }
  const cents = toCents(Number(body.amount));
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 200) : '';
  if (!Number.isFinite(cents) || cents === 0) return NextResponse.json({ success: false, error: 'Enter an amount.' }, { status: 400 });
  if (Math.abs(cents) > MAX_ADJUST_CENTS) return NextResponse.json({ success: false, error: 'That is more than $1,000 at once.' }, { status: 400 });
  if (!reason) return NextResponse.json({ success: false, error: 'Write a reason.' }, { status: 400 });

  try {
    if (cents > 0) {
      await addCredit({ userId, cents, type: 'adjusted', reason, by: auth.adminId });
    } else {
      const ok = await spendCredit({ userId, cents: -cents, reason, by: auth.adminId, type: 'adjusted' });
      if (!ok) return NextResponse.json({ success: false, error: 'The customer has less credit than that.' }, { status: 409 });
    }
  } catch (error) {
    console.error('[store-credit] manual change failed', { userId, message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Could not change the credit.' }, { status: 500 });
  }
  const balanceCents = await getBalanceCents(userId);
  return NextResponse.json({ success: true, data: { balance: toDollars(balanceCents) } });
}

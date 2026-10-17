import { NextRequest, NextResponse } from 'next/server';
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
  const [balanceCents, ledger] = await Promise.all([getBalanceCents(userId), getLedger(userId, 100)]);
  return NextResponse.json({
    success: true,
    data: {
      balance: toDollars(balanceCents),
      history: ledger.map((r) => ({ at: r.at, amount: toDollars(r.cents), type: r.type, orderId: r.orderId, reason: r.reason, by: r.by, balanceAfter: r.balanceAfterCents === undefined ? undefined : toDollars(r.balanceAfterCents) })),
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

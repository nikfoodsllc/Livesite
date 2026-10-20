import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { getBalanceCents, getLedger } from '@/lib/server/storeCredit';
import { toCents, toDollars } from '@/lib/storeCredit';
import { db } from '@/lib/server/db';
import type { Order } from '@/types/order';

export const dynamic = 'force-dynamic';

/** GET /api/account/store-credit: the logged in customer's store credit balance and history (no admin names or notes; credit given for items lists them). */
export async function GET(request: NextRequest) {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const decoded = jwtHandler.verifyToken(header.substring(7));
  if (!decoded.success || !decoded.payload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const userId = String(decoded.payload.userId);

  const [balanceCents, ledger] = await Promise.all([getBalanceCents(userId), getLedger(userId, 50)]);

  // a full-order credit shows only its total: the items, Platform Fee and tip that made it up stay with NikFoods
  const fullCredits = new Set<string>();
  const issuedOrderIds = Array.from(new Set(ledger.filter((r) => r.type === 'issued' && r.orderId).map((r) => String(r.orderId))));
  if (issuedOrderIds.length > 0) {
    const found = await db.read<Order>('orders', { orderId: { $in: issuedOrderIds }, user: userId } as never);
    for (const o of found.success && found.data ? found.data : []) {
      for (const c of o.creditsIssued ?? []) if (c.entireOrder) fullCredits.add(`${o.orderId}:${toCents(c.amount)}`);
    }
  }
  return NextResponse.json({
    success: true,
    data: {
      balance: toDollars(balanceCents),
      history: ledger.map((r) => ({
        at: r.at,
        amount: toDollars(r.cents),
        type: r.type,
        orderId: r.orderId,
        // the note the admin wrote for the customer (credit given for items; never the internal note or an admin's reason for an adjustment)
        ...(r.type === 'issued' && r.reason ? { note: r.reason } : {}),
        // what the credit was for (credit given for items of an order)
        ...(r.items && r.items.length > 0 && !(r.type === 'issued' && fullCredits.has(`${r.orderId}:${r.cents}`)) ? { items: r.items.map((i) => ({ name: i.name, quantity: i.quantity, amount: toDollars(i.cents) })) } : {}),
      })),
    },
  });
}

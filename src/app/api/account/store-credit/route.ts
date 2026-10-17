import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { getBalanceCents, getLedger } from '@/lib/server/storeCredit';
import { toDollars } from '@/lib/storeCredit';

export const dynamic = 'force-dynamic';

/** GET /api/account/store-credit: the logged in customer's store credit balance and history (no admin names or notes). */
export async function GET(request: NextRequest) {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const decoded = jwtHandler.verifyToken(header.substring(7));
  if (!decoded.success || !decoded.payload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const userId = String(decoded.payload.userId);

  const [balanceCents, ledger] = await Promise.all([getBalanceCents(userId), getLedger(userId, 50)]);
  return NextResponse.json({
    success: true,
    data: {
      balance: toDollars(balanceCents),
      history: ledger.map((r) => ({ at: r.at, amount: toDollars(r.cents), type: r.type, orderId: r.orderId })),
    },
  });
}

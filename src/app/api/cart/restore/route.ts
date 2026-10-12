import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';
import { getRestorableCart } from '@/lib/server/cartRestore';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cart/restore: the cart lines of the logged-in customer's latest unfinished checkout, to put back in an empty cart
 * (the "Complete your order" button of the reminder email). Read only; only ever returns the caller's own lines.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const decoded = jwtHandler.verifyToken(authHeader.substring(7));
    if (!decoded.success || !decoded.payload?.userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const result = await getRestorableCart(String(decoded.payload.userId));
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[cart-restore] failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'Could not read your saved cart' }, { status: 500 });
  }
}

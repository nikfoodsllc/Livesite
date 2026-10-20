import { NextRequest, NextResponse } from 'next/server';
import { userIdFrom } from '@/lib/server/push/auth';
import { getUserCart, putUserCart, validateCart } from '@/lib/server/userCart';

export const dynamic = 'force-dynamic';

/** GET /api/cart/sync: the customer's saved cart ({ cart, rev }; cart is null when empty or never saved). */
export async function GET(request: NextRequest) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const doc = await getUserCart(userId);
  return NextResponse.json({ success: true, data: { cart: doc?.cart ?? null, rev: doc?.rev ?? 0 } });
}

/** PUT /api/cart/sync { cart, source? }: save the customer's cart (cart null = emptied). Returns the new rev. */
export async function PUT(request: NextRequest) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { cart?: unknown; source?: unknown } | null;
  if (!body || !('cart' in body)) return NextResponse.json({ success: false, error: 'Send { cart }' }, { status: 400 });
  const checked = validateCart(body.cart);
  if (!checked.ok) return NextResponse.json({ success: false, error: checked.error }, { status: 400 });
  const source = body.source === 'app' || body.source === 'web' ? body.source : 'web';
  const doc = await putUserCart(userId, checked.cart, source);
  return NextResponse.json({ success: true, data: { rev: doc.rev } });
}

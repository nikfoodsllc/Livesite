import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { cleanInstructions, saveInstructionsOnAddress } from '@/lib/server/deliveryInstructions';

/**
 * PATCH /api/orders/{orderId}/delivery-instructions
 * Body: { deliveryInstructions: string, addressId?: string }
 * Changes the delivery instructions of the customer's own order that is not paid yet (the checkout retries a payment on the
 * same order, and the customer may have edited the instructions in between). Also saves them on the address.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const header = request.headers.get('authorization');
  if (!header) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  const verified = jwtHandler.verifyToken(header.replace('Bearer ', ''));
  if (!verified.success || !verified.payload) return NextResponse.json({ success: false, error: 'Invalid authentication token' }, { status: 401 });
  const userId = String(verified.payload.userId);

  const { orderId } = await params;
  const body = await request.json().catch(() => null);
  const instructions = cleanInstructions(body?.deliveryInstructions);
  if (instructions === undefined) return NextResponse.json({ success: false, error: 'deliveryInstructions is required' }, { status: 400 });

  const found = await db.readOne<{ paymentStatus?: string; status?: string }>('orders', { orderId, user: userId } as never);
  if (!found.success || !found.data) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  if (found.data.paymentStatus === 'paid' || found.data.status === 'cancelled') {
    return NextResponse.json({ success: false, error: 'This order can no longer be changed here' }, { status: 409 });
  }

  const update = instructions
    ? { $set: { 'address.floor': instructions, updatedAt: new Date() } }
    : { $unset: { 'address.floor': '' }, $set: { updatedAt: new Date() } };
  const saved = await db.updateOne('orders', { orderId, user: userId } as never, update as never);
  if (!saved.success) return NextResponse.json({ success: false, error: 'Could not save' }, { status: 500 });

  await saveInstructionsOnAddress(userId, body?.addressId, instructions);
  return NextResponse.json({ success: true, data: { deliveryInstructions: instructions } });
}

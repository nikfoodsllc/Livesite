import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { resendPaymentLink } from '@/lib/server/offlineOrderService';

export const dynamic = 'force-dynamic';

/** POST /api/admin/offline-orders/{orderId}/resend: a fresh pay link, emailed to the customer. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { orderId } = await params;
  const result = await resendPaymentLink(decodeURIComponent(orderId));
  if (!result.ok) {
    const { status, ...rest } = result;
    return NextResponse.json({ success: false, ...rest }, { status });
  }
  return NextResponse.json({ success: true, data: { payLink: result.payLink, emailSent: result.emailSent, emailError: result.emailError } });
}

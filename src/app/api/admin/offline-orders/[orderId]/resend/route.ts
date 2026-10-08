import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { resendPaymentLink } from '@/lib/server/offlineOrderService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/offline-orders/{orderId}/resend
 * { sendEmail?: boolean (default true), keepCurrent?: boolean (default false) }
 * Default: a fresh pay link, emailed to the customer (the old link stops working).
 * keepCurrent: the SAME link again (a reminder when emailed, the current link when not emailed).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { orderId } = await params;
  let body: { sendEmail?: boolean; keepCurrent?: boolean; allowRefresh?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // no body: email the new link
  }
  const result = await resendPaymentLink(decodeURIComponent(orderId), { sendEmail: body.sendEmail !== false, keepCurrent: body.keepCurrent === true, allowRefresh: body.allowRefresh === true });
  if (!result.ok) {
    const { status, ...rest } = result;
    return NextResponse.json({ success: false, ...rest }, { status });
  }
  return NextResponse.json({ success: true, data: { payLink: result.payLink, emailSent: result.emailSent, emailError: result.emailError, refreshed: result.refreshed } });
}

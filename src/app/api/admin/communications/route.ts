import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { listCampaigns } from '@/lib/server/communications';
import { smsMode } from '@/lib/sms/config';

export const dynamic = 'force-dynamic';

/** GET /api/admin/communications (admin only): the messages sent or scheduled, newest first, with counts per channel. */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json({ success: true, data: { smsMode: smsMode(), messages: await listCampaigns(50) } });
}

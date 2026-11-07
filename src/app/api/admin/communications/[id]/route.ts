import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getCampaign } from '@/lib/server/communications';

export const dynamic = 'force-dynamic';

/** GET /api/admin/communications/{id} (admin only): one message with every recipient and what happened to it. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  const found = await getCampaign(id);
  if (!found) return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ success: true, data: found });
}

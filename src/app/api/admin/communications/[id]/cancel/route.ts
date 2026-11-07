import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { cancelCampaign } from '@/lib/server/communications';

export const dynamic = 'force-dynamic';

/** POST /api/admin/communications/{id}/cancel (admin only): stops a scheduled or running message; what has not gone out is not sent. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  const result = await cancelCampaign(id);
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  return NextResponse.json({ success: true });
}

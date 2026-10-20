import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { sendMenuCampaign } from '@/lib/server/push/campaigns';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** POST { title, body, confirmAgain? }: send "the menu is up" to everyone on the menu alerts list who has the app. */
export async function POST(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const body = (await request.json().catch(() => ({}))) as { title?: unknown; body?: unknown; confirmAgain?: unknown; adminName?: unknown };
  const r = await sendMenuCampaign({ title: body.title, body: body.body, adminId: auth.adminId, adminName: typeof body.adminName === 'string' ? body.adminName.slice(0, 60) : undefined, confirmAgain: body.confirmAgain === true });
  if (!r.ok) return NextResponse.json({ success: false, error: r.error, code: r.code }, { status: r.status });
  const { summary } = r;
  return NextResponse.json({ success: true, data: { campaignId: r.campaignId, mode: summary.mode, audience: summary.users, phones: summary.tokens, sent: summary.sent, failed: summary.failed, removed: summary.removed } });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { sendMenuCampaign, sendSelectedCampaign } from '@/lib/server/push/campaigns';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST { title, body, confirmAgain? }: send "the menu is up" to everyone who has the app.
 * With `userIds` (customer ids): send to just those customers instead.
 */
export async function POST(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const body = (await request.json().catch(() => ({}))) as { title?: unknown; body?: unknown; confirmAgain?: unknown; adminName?: unknown; userIds?: unknown };
  const adminName = typeof body.adminName === 'string' ? body.adminName.slice(0, 60) : undefined;
  if (body.userIds !== undefined) {
    const sel = await sendSelectedCampaign({ title: body.title, body: body.body, userIds: body.userIds, adminId: auth.adminId, adminName });
    if (!sel.ok) return NextResponse.json({ success: false, error: sel.error, code: sel.code }, { status: sel.status });
    const s = sel.summary;
    return NextResponse.json({ success: true, data: { campaignId: sel.campaignId, mode: s.mode, audience: s.users, allowed: s.allowed, skipped: s.users - s.allowed, unavailable: sel.unavailable ?? 0, phones: s.tokens, sent: s.sent, failed: s.failed, removed: s.removed } });
  }
  const r = await sendMenuCampaign({ title: body.title, body: body.body, adminId: auth.adminId, adminName: typeof body.adminName === 'string' ? body.adminName.slice(0, 60) : undefined, confirmAgain: body.confirmAgain === true });
  if (!r.ok) return NextResponse.json({ success: false, error: r.error, code: r.code }, { status: r.status });
  const { summary } = r;
  return NextResponse.json({ success: true, data: { campaignId: r.campaignId, mode: summary.mode, audience: summary.users, phones: summary.tokens, sent: summary.sent, failed: summary.failed, removed: summary.removed } });
}

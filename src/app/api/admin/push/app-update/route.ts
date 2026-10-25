import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { getLatestAppVersion, sendUpdateCampaign, setLatestAppVersion, updateAudience, UPDATE_BODY, UPDATE_TITLE } from '@/lib/server/push/campaigns';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET: the newest app version the admin saved, the standard text, and how many phones are on an older version. */
export async function GET(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const latestVersion = await getLatestAppVersion();
  const audience = await updateAudience(latestVersion);
  return NextResponse.json({ success: true, data: { latestVersion, ...audience, title: UPDATE_TITLE, body: UPDATE_BODY } });
}

/** PUT { latestVersion }: save the newest version that is on the App Store ('' clears it). The app shows "Update available" to older versions. */
export async function PUT(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const body = (await request.json().catch(() => ({}))) as { latestVersion?: unknown };
  const r = await setLatestAppVersion(body.latestVersion, auth.adminId);
  if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
  return NextResponse.json({ success: true, data: { latestVersion: r.value, ...(await updateAudience(r.value)) } });
}

/** POST { title?, body?, confirmAgain? }: send "update the app" to the phones on an older version than the saved one. */
export async function POST(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const body = (await request.json().catch(() => ({}))) as { title?: unknown; body?: unknown; confirmAgain?: unknown; adminName?: unknown };
  const r = await sendUpdateCampaign({ title: body.title, body: body.body, adminId: auth.adminId, adminName: typeof body.adminName === 'string' ? body.adminName.slice(0, 60) : '', confirmAgain: body.confirmAgain === true });
  if (!r.ok) return NextResponse.json({ success: false, error: r.error, code: r.code }, { status: r.status });
  const { summary } = r;
  return NextResponse.json({ success: true, data: { campaignId: r.campaignId, mode: summary.mode, audience: summary.users, phones: summary.tokens, sent: summary.sent, failed: summary.failed, errors: summary.errors } });
}

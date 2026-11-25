import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { getLatestAppVersion, sendUpdateCampaign, setLatestAppVersion, updateAudience, UPDATE_BODY, UPDATE_BODY_ANDROID, UPDATE_TITLE, type StorePlatform } from '@/lib/server/push/campaigns';

const platformOf = (v: unknown): StorePlatform => (v === 'android' ? 'android' : 'ios');

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET: the newest app version the admin saved, the standard text, and how many phones are on an older version. The top-level
 * fields are the iPhone app (as before); `android` holds the same for the Android app.
 */
export async function GET(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const latestVersion = await getLatestAppVersion('ios');
  const audience = await updateAudience(latestVersion, 'ios');
  const androidVersion = await getLatestAppVersion('android');
  const androidAudience = await updateAudience(androidVersion, 'android');
  return NextResponse.json({ success: true, data: { latestVersion, ...audience, title: UPDATE_TITLE, body: UPDATE_BODY, android: { latestVersion: androidVersion, ...androidAudience, title: UPDATE_TITLE, body: UPDATE_BODY_ANDROID } } });
}

/** PUT { latestVersion, platform? }: save the newest version in the App Store (or Google Play with platform 'android'; '' clears it). That app shows "Update available" to older versions. */
export async function PUT(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const body = (await request.json().catch(() => ({}))) as { latestVersion?: unknown; platform?: unknown };
  const platform = platformOf(body.platform);
  const r = await setLatestAppVersion(body.latestVersion, auth.adminId, platform);
  if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
  return NextResponse.json({ success: true, data: { platform, latestVersion: r.value, ...(await updateAudience(r.value, platform)) } });
}

/** POST { title?, body?, confirmAgain?, platform? }: send "update the app" to the phones of that app on an older version than the saved one. */
export async function POST(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const body = (await request.json().catch(() => ({}))) as { title?: unknown; body?: unknown; confirmAgain?: unknown; adminName?: unknown; platform?: unknown };
  const r = await sendUpdateCampaign({ title: body.title, body: body.body, adminId: auth.adminId, adminName: typeof body.adminName === 'string' ? body.adminName.slice(0, 60) : '', confirmAgain: body.confirmAgain === true, platform: platformOf(body.platform) });
  if (!r.ok) return NextResponse.json({ success: false, error: r.error, code: r.code }, { status: r.status });
  const { summary } = r;
  return NextResponse.json({ success: true, data: { campaignId: r.campaignId, mode: summary.mode, audience: summary.users, phones: summary.tokens, sent: summary.sent, failed: summary.failed, errors: summary.errors } });
}

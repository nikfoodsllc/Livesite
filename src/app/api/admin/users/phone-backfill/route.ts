import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { backfillUserPhones } from '@/lib/server/userPhone';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/users/phone-backfill { dryRun?: boolean }  (admin only)
 * Fills the customer profiles that have no phone number with the one the customer gave us on their newest order, else on their
 * newest address. Profiles that already have a number are never changed. A dry run (the default; send { "dryRun": false } to
 * really write) only counts. Returns counts only, no personal details. Safe to run again.
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  let dryRun = true;
  try {
    const body = await request.json();
    if (body?.dryRun === false) dryRun = false;
  } catch {
    // no body: dry run
  }
  try {
    return NextResponse.json({ success: true, data: await backfillUserPhones(dryRun) });
  } catch (error) {
    console.error('[user-phone] backfill failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'The clean-up failed. Nothing that cannot be repeated was changed.' }, { status: 500 });
  }
}

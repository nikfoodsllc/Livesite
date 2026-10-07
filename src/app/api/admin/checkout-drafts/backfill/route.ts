import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAdmin } from '@/lib/adminAuth';
import { backfillDraftsFromStripe } from '@/lib/server/checkoutDrafts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/checkout-drafts/backfill { days?: number }  (admin only)
 * Creates checkout drafts for the open checkout payments Stripe already holds from the last `days` days (default 14,
 * at most 60): contact and totals only, no items. Safe to run again: drafts that exist are left untouched.
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ success: false, error: 'Stripe is not configured on the site' }, { status: 500 });
  let days = 14;
  try {
    const body = await request.json();
    if (typeof body?.days === 'number' && body.days >= 1) days = Math.min(60, Math.floor(body.days));
  } catch {
    // no body: use the default
  }
  try {
    const stripe = new Stripe(key, { apiVersion: '2025-10-29.clover' });
    const result = await backfillDraftsFromStripe(stripe, days);
    return NextResponse.json({ success: true, data: { days, ...result } });
  } catch (error) {
    console.error('[checkout-drafts] backfill failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'The backfill failed. Nothing was changed that cannot be repeated.' }, { status: 500 });
  }
}

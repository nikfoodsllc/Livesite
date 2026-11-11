import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { parseAudienceFilter } from '@/lib/communications/rules';
import { loadAudience } from '@/lib/server/communications';
import { smsMode } from '@/lib/sms/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/communications/audience { filter }: the customers a filter picks (admin only), one row per customer, with
 * whether we can email and whether we can text them. Sends nothing.
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const parsed = parseAudienceFilter(body?.filter);
  if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  try {
    const customers = await loadAudience(parsed.filter);
    const rows = customers.map((c) => ({ key: c.key, name: c.name, email: c.email, phone: c.phone, orders: c.orderIds, textOk: c.textOk, textReason: c.textReason ?? null, unsubscribed: Boolean(c.unsubscribed), ...(c.added ? { added: true } : {}) }));
    return NextResponse.json({
      success: true,
      data: {
        filter: parsed.filter,
        smsMode: smsMode(),
        customers: rows,
        counts: { customers: rows.length, emailable: rows.filter((r) => r.email && !r.unsubscribed).length, textable: rows.filter((r) => r.textOk).length },
      },
    });
  } catch (error) {
    console.error('[communications] audience failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Could not look up the customers.' }, { status: 500 });
  }
}

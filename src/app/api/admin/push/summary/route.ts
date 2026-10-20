import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/lib/server/db';
import { pushMode } from '@/lib/server/push/config';
import { recentCampaigns } from '@/lib/server/push/campaigns';
import { menuAudience } from '@/lib/server/push/menuAudience';
import { countTokenUsers } from '@/lib/server/push/store';
import { listTemplates } from '@/lib/server/push/templates';

export const dynamic = 'force-dynamic';

/** GET /api/admin/push/summary: the Notifications page: switch state, who can be reached, the saved texts, history. Counts only. */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const [audience, devices, templates, campaigns] = await Promise.all([menuAudience(), countTokenUsers(), listTemplates(), recentCampaigns(10)]);
    const events = await db.getCollectionForOperations<Record<string, unknown>>('pushEvents');
    const since = new Date(Date.now() - 7 * 24 * 3_600_000);
    const rows = await events
      .aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$event', messages: { $sum: 1 }, sent: { $sum: '$sent' }, failed: { $sum: '$failed' } } }])
      .toArray();
    const last7 = rows.map((r) => ({ event: String(r._id ?? 'other'), messages: Number(r.messages), sent: Number(r.sent), failed: Number(r.failed) })).sort((a, b) => b.sent - a.sent);
    return NextResponse.json({
      success: true,
      data: { mode: pushMode(), customersWithApp: devices, menu: { subscribers: audience.subscribers, subscribersWithApp: audience.withApp, reachable: audience.userIds.length }, templates, campaigns, last7 },
    });
  } catch (error) {
    console.error('[push] summary failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Could not load notifications' }, { status: 500 });
  }
}

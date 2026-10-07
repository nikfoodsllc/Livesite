import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/lib/server/db';
import { deliveryFromLastEvent } from '@/lib/server/confirmationEmailTracking';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PAUSE_MS = 450; // Resend allows about 2 requests a second

/**
 * POST /api/admin/email-status/backfill { days?: 14, limit?: 80, dryRun?: true }  (admin only)
 * For the orders of the last `days` days whose confirmation email has no delivery record yet, asks Resend what happened to the
 * email (its last event: delivered, opened, bounced...) and saves it on the order. Newest first, at most `limit` per call (run it
 * again for more). Orders already filled are skipped, so it is safe to repeat. A dry run only counts what it would save.
 * Returns counts only, no personal details.
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  let body: { days?: number; limit?: number; dryRun?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // no body: defaults
  }
  const days = Math.min(60, Math.max(1, Math.floor(Number(body.days ?? 14)) || 14));
  const limit = Math.min(150, Math.max(1, Math.floor(Number(body.limit ?? 80)) || 80));
  const dryRun = body.dryRun !== false;
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ success: false, error: 'Resend is not configured on this site' }, { status: 500 });

  const resend = new Resend(key);
  const orders = await db.getCollectionForOperations('orders');
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const candidates = await orders
    .find({ createdAt: { $gte: since }, 'emailStatus.messageId': { $exists: true, $ne: null }, emailDelivery: { $exists: false } } as never)
    .project({ orderId: 1, 'emailStatus.messageId': 1 })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const result = { dryRun, days, looked: candidates.length, saved: 0, stillSent: 0, notFound: 0, errors: 0, byStatus: {} as Record<string, number>, rateLimited: false, errorSamples: [] as string[] };
  for (const order of candidates) {
    const messageId = String((order as { emailStatus?: { messageId?: string } }).emailStatus?.messageId ?? '');
    if (!messageId) continue;
    try {
      const response = await resend.emails.get(messageId);
      if (response.error) {
        const status = (response.error as { statusCode?: number }).statusCode;
        if (status === 429) {
          result.rateLimited = true;
          break;
        }
        if (status === 404) result.notFound += 1;
        else {
          result.errors += 1;
          // what went wrong, without any order or customer detail (a few different messages at most)
          const message = `${status ?? ''} ${(response.error as { name?: string }).name ?? ''}: ${String((response.error as { message?: string }).message ?? '').slice(0, 140)}`.trim();
          if (result.errorSamples.length < 3 && !result.errorSamples.includes(message)) result.errorSamples.push(message);
        }
      } else {
        const delivery = deliveryFromLastEvent((response.data as { last_event?: string } | null)?.last_event);
        if (!delivery) result.stillSent += 1;
        else {
          result.byStatus[delivery.openCount ? 'opened' : delivery.status ?? 'unknown'] = (result.byStatus[delivery.openCount ? 'opened' : delivery.status ?? 'unknown'] ?? 0) + 1;
          if (!dryRun) {
            // only if nothing arrived meanwhile from the webhook
            const saved = await orders.updateOne({ orderId: (order as { orderId: string }).orderId, emailDelivery: { $exists: false } } as never, { $set: { emailDelivery: delivery } } as never);
            if (saved.modifiedCount > 0) result.saved += 1;
          }
        }
      }
    } catch (error) {
      result.errors += 1;
      const message = `thrown: ${error instanceof Error ? error.message.slice(0, 140) : 'unknown'}`;
      if (result.errorSamples.length < 3 && !result.errorSamples.includes(message)) result.errorSamples.push(message);
    }
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  }
  return NextResponse.json({ success: true, data: result });
}

import { NextRequest, NextResponse, after } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdminWithId } from '@/lib/adminAuth';
import { db } from '@/lib/server/db';
import { createCampaign, processCampaign } from '@/lib/server/communications';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/admin/communications/send (admin only)
 *   { filter, channels: { email, text }, subject, emailBody, textBody, excludeKeys?, scheduledFor? }
 * Sends now (the answer comes straight away, the sending carries on in the background) or, with `scheduledFor` (an ISO time), later.
 */
export async function POST(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const body = await request.json().catch(() => ({}));
  let name: string | undefined;
  if (ObjectId.isValid(auth.adminId)) {
    const admin = await db.readOne<{ name?: string; email?: string }>('users', { _id: new ObjectId(auth.adminId) } as never);
    name = admin.success ? admin.data?.name || admin.data?.email : undefined;
  }
  try {
    const result = await createCampaign({
      filter: body?.filter,
      email: Boolean(body?.channels?.email),
      text: Boolean(body?.channels?.text),
      subject: body?.subject,
      emailBody: body?.emailBody,
      textBody: body?.textBody,
      excludeKeys: body?.excludeKeys,
      scheduledFor: body?.scheduledFor,
      admin: { id: auth.adminId, name },
    });
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    if (result.status === 'sending') {
      // keep sending after the answer has gone back (up to the function's time limit); the 5 minute cron picks up anything left
      after(async () => {
        try {
          await processCampaign(result.id);
        } catch (error) {
          console.error('[communications] sending stopped', error instanceof Error ? error.message : String(error));
        }
      });
    }
    return NextResponse.json({ success: true, data: { id: result.id, status: result.status, recipients: result.recipients ?? null } });
  } catch (error) {
    console.error('[communications] send failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Could not start the message.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { sendCommunicationEmail } from '@/lib/communicationEmail';
import { EMAIL_HTML_MAX, htmlProblem, parseEmailFormat, renderHtmlMessage, renderMessage } from '@/lib/communications/rules';
import { usableEmail } from '@/lib/server/communications';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/communications/test { to, subject, emailBody, date? } (admin only): sends ONE email, to the address given, with sample
 * values in the placeholders, so the admin sees what customers will get. Creates no message and no history.
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const to = usableEmail(body?.to);
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  const text = typeof body?.emailBody === 'string' ? body.emailBody.trim() : '';
  if (!to) return NextResponse.json({ success: false, error: 'Give an email address to send the test to.' }, { status: 400 });
  const format = parseEmailFormat(body?.emailFormat);
  if (!subject || !text || subject.length > 150 || text.length > (format === 'html' ? EMAIL_HTML_MAX : 5000)) return NextResponse.json({ success: false, error: 'Write the subject and the email first.' }, { status: 400 });
  if (format === 'html') {
    const bad = htmlProblem(text);
    if (bad) return NextResponse.json({ success: false, error: bad }, { status: 400 });
  }
  const ctx = { firstName: 'Alex', orderNumber: 'ORD-0000000000000', date: typeof body?.date === 'string' ? body.date : '' };
  const result = await sendCommunicationEmail({ to, subject: renderMessage(subject, ctx), text: format === 'html' ? renderHtmlMessage(text, ctx) : renderMessage(text, ctx), format });
  if (!result.success) return NextResponse.json({ success: false, error: result.error ?? 'The test could not be sent.' }, { status: 502 });
  return NextResponse.json({ success: true, data: { messageId: result.messageId } });
}

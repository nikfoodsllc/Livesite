/**
 * Twilio webhook: delivery receipts for our texts (MessageStatus) and replies from customers (Body, OptOutType).
 * Every request must carry a valid X-Twilio-Signature; without TWILIO_AUTH_TOKEN nothing is trusted.
 */
import { NextRequest, NextResponse } from 'next/server';
import { validTwilioSignature } from '@/lib/sms/twilio';
import { replyKind } from '@/lib/sms/consent';
import { applyDeliveryReceipt, applyTextReply } from '@/lib/server/smsService';

export const dynamic = 'force-dynamic';

const EMPTY_REPLY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

export async function POST(request: NextRequest) {
  const authToken = (process.env.TWILIO_AUTH_TOKEN ?? '').trim();
  if (!authToken) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === 'string') params[key] = value;
  });

  // Twilio signs the exact public URL it called
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const url = `${proto}://${host}${request.nextUrl.pathname}`;
  if (!validTwilioSignature(authToken, url, params, request.headers.get('x-twilio-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    if (params.MessageStatus && params.MessageSid && !params.Body) {
      await applyDeliveryReceipt(params.MessageSid, params.MessageStatus, params.ErrorCode);
    } else if (params.Body !== undefined && params.From) {
      const kind = replyKind(params.Body, params.OptOutType);
      if (kind === 'stop' || kind === 'start') await applyTextReply(params.From, kind);
    }
  } catch (error) {
    console.error('[twilio webhook] could not apply the event', error instanceof Error ? error.message : error);
  }
  // an empty answer: Twilio itself sends the STOP / START / HELP confirmations
  return new NextResponse(EMPTY_REPLY, { status: 200, headers: { 'Content-Type': 'text/xml' } });
}

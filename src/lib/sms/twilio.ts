import crypto from 'crypto';
import { twilioSettings } from './config';

export interface SendResult {
  ok: boolean;
  sid?: string;
  status?: string;
  error?: string;
  /** Twilio's own error code when it refused (for example 21610 = the number replied STOP) */
  code?: number;
}

/** '+1' plus 10 digits. */
export function toE164(tenDigits: string): string {
  return `+1${tenDigits}`;
}

/** Hands one text to Twilio. Never throws. */
export async function sendViaTwilio(toTenDigits: string, body: string, statusCallback?: string): Promise<SendResult> {
  const settings = twilioSettings();
  if (!settings) return { ok: false, error: 'Text messages are not configured' };
  try {
    const form = new URLSearchParams({ To: toE164(toTenDigits), MessagingServiceSid: settings.messagingServiceSid, Body: body });
    if (statusCallback) form.set('StatusCallback', statusCallback);
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${settings.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${settings.accountSid}:${settings.authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    const json = (await response.json().catch(() => ({}))) as { sid?: string; status?: string; message?: string; code?: number };
    if (!response.ok) return { ok: false, error: json.message || `Twilio answered ${response.status}`, code: json.code };
    return { ok: true, sid: json.sid, status: json.status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Twilio could not be reached' };
  }
}

/**
 * Checks the X-Twilio-Signature of a webhook: HMAC-SHA1 (key = auth token) of the full URL followed by every form field
 * name and value, sorted by name, base64 encoded.
 */
export function validTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string | null): boolean {
  if (!signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  const expected = crypto.createHmac('sha1', authToken).update(data).digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

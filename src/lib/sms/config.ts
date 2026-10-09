/**
 * Text messages (SMS). Everything is OFF until SMS_MODE is set and the provider is configured:
 *   off  (default) nothing is sent and no provider call is made
 *   dry  messages are written to the log (collection smsMessages, status 'dry') but never handed to the provider
 *   on   messages are sent through Twilio
 * Needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_MESSAGING_SERVICE_SID (a Messaging Service whose sender is the
 * registered US business number; opt-out words and the STOP reply are handled by Twilio itself).
 */
export type SmsMode = 'off' | 'dry' | 'on';

export function smsMode(env: Record<string, string | undefined> = process.env): SmsMode {
  const value = (env.SMS_MODE ?? '').trim().toLowerCase();
  return value === 'on' || value === 'dry' ? value : 'off';
}

export interface TwilioSettings {
  accountSid: string;
  authToken: string;
  messagingServiceSid: string;
}

export function twilioSettings(env: Record<string, string | undefined> = process.env): TwilioSettings | null {
  const accountSid = (env.TWILIO_ACCOUNT_SID ?? '').trim();
  const authToken = (env.TWILIO_AUTH_TOKEN ?? '').trim();
  const messagingServiceSid = (env.TWILIO_MESSAGING_SERVICE_SID ?? '').trim();
  return accountSid && authToken && messagingServiceSid ? { accountSid, authToken, messagingServiceSid } : null;
}

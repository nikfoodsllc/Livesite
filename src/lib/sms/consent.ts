/**
 * What a customer agrees to when they tick the text-message box, and the words the box shows. The version is stored with
 * every consent so we can always show exactly what the customer saw when they agreed.
 */
export const SMS_CONSENT_VERSION = '2026-10-09';

/** The label next to the box. Short on purpose; the legal detail is on the Terms and Privacy pages. */
export const SMS_CONSENT_LABEL = 'Text me order updates';

/** The small print under the label (required on every place that collects the opt-in). */
export const SMS_CONSENT_SMALL_PRINT = 'Msg & data rates may apply. Reply STOP to cancel.';

export type SmsConsentSource = 'checkout' | 'profile' | 'text_reply';

export interface SmsConsent {
  optedIn: boolean;
  /** The 10 digit number the customer agreed for; texts only ever go to this number */
  phone?: string;
  optedInAt?: Date;
  source?: SmsConsentSource;
  /** SMS_CONSENT_VERSION at the time of agreeing */
  version?: string;
  optedOutAt?: Date;
  optedOutVia?: 'profile' | 'checkout' | 'text_reply';
}

/** Opt-out and opt-in words (Twilio recognises these itself; we mirror them so the website shows the same state). */
export const STOP_WORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
export const START_WORDS = ['START', 'YES', 'UNSTOP'];

export function replyKind(body: unknown, optOutType?: unknown): 'stop' | 'start' | 'help' | 'other' {
  const type = typeof optOutType === 'string' ? optOutType.trim().toUpperCase() : '';
  if (type === 'STOP') return 'stop';
  if (type === 'START') return 'start';
  if (type === 'HELP') return 'help';
  const word = typeof body === 'string' ? body.trim().toUpperCase() : '';
  if (STOP_WORDS.includes(word)) return 'stop';
  if (START_WORDS.includes(word)) return 'start';
  if (word === 'HELP' || word === 'INFO') return 'help';
  return 'other';
}

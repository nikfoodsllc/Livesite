/**
 * Where a customer's reply to one of our emails goes. The emails are sent from a no-reply style address, so every customer
 * email carries this Reply-To: pressing Reply opens a message to support. Override with EMAIL_REPLY_TO.
 */
export const DEFAULT_REPLY_TO = 'support@nikfoods.com';

export function getReplyTo(env: Record<string, string | undefined> = process.env): string {
  const value = (env.EMAIL_REPLY_TO ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : DEFAULT_REPLY_TO;
}

import type { MovedDelivery } from '@/templates/deliveryDateChanged';

/**
 * The words of each text. Plain characters only (no accents, arrows or symbols) so a message stays in the cheap 160-character
 * segments, and no marketing: transactional order updates only.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** 'Fri, Oct 9' for 'YYYY-MM-DD' (no time zone maths: the date is a calendar day). */
export function shortDay(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day);
  if (!m) return day;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Keeps only characters of the basic GSM alphabet that we use; anything else becomes a plain space or letter. */
export function plainText(value: string): string {
  return value
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/×/g, 'x')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * "your delivery date changed" text. One line per different date pair (at most two, then "and more"), the order link, and
 * how to stop. The program name opens the message, as carriers require.
 */
export function deliveryDateChangedText(orderId: string, moves: MovedDelivery[], link: string): string {
  const id = plainText(orderId.replace(/^#/, ''));
  const pairs: string[] = [];
  const seen = new Set<string>();
  for (const m of moves) {
    if (!m.fromDate || !m.toDate || m.fromDate === m.toDate) continue;
    const key = `${m.fromDate}>${m.toDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push(`${shortDay(m.fromDate)} to ${shortDay(m.toDate)}`);
  }
  const shown = pairs.slice(0, 2).join('; ');
  const more = pairs.length > 2 ? ' and more' : '';
  return `NikFoods: delivery date changed for order ${id}: ${shown}${more}. Details: ${link} Reply STOP to opt out.`;
}

/** Sent once when a customer agrees to texts: the confirmation carriers expect. */
export function welcomeText(): string {
  return 'NikFoods: You are signed up for order updates. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to cancel.';
}

/** The answer to HELP (Twilio sends its own default; this is the text we set on the Messaging Service). */
export const HELP_TEXT = 'NikFoods order updates. Questions: support@nikfoods.com. Msg & data rates may apply. Reply STOP to cancel.';

/**
 * A customer's search in My Orders. Every word has to match something about the order: its number, a dish in it, a delivery
 * date ("oct 21", "oct", "2026-10-21", "21") or its status ("delivered", "cancelled", "out for delivery"...).
 * Returns a MongoDB filter to add to the customer's own orders (or null when there is nothing to search for).
 */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MAX_WORDS = 5;
const MAX_WORD = 30;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = (s: string) => ({ $regex: escapeRegex(s), $options: 'i' });

const DATE_FIELDS = ['items.deliveryDate', 'items.actualDeliveryDate'];

export function searchWords(q: string | null | undefined): string[] {
  return String(q ?? '')
    .replace(/#/g, ' ')
    .toLowerCase()
    .split(/[\s,]+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, MAX_WORDS)
    .map((w) => w.slice(0, MAX_WORD));
}

/** The ways one word can match one order. */
export function matchesForWord(word: string): Array<Record<string, unknown>> {
  const any: Array<Record<string, unknown>> = [{ orderId: re(word) }, { 'items.items.food.name': re(word) }];
  if (word.length >= 3) any.push({ status: re(word.replace(/-/g, '_')) });
  // dates are stored as YYYY-MM-DD
  const month = word.length >= 3 ? MONTHS.findIndex((m) => word.startsWith(m)) : -1;
  if (month >= 0) for (const f of DATE_FIELDS) any.push({ [f]: { $regex: `-${String(month + 1).padStart(2, '0')}-` } });
  if (/^\d{1,2}$/.test(word) && Number(word) >= 1 && Number(word) <= 31) {
    for (const f of DATE_FIELDS) any.push({ [f]: { $regex: `-${word.padStart(2, '0')}$` } });
  }
  if (/^\d{4}(-\d{1,2}){0,2}$/.test(word)) for (const f of DATE_FIELDS) any.push({ [f]: { $regex: `^${escapeRegex(word)}` } });
  return any;
}

export function orderSearchFilter(q: string | null | undefined): Record<string, unknown> | null {
  const words = searchWords(q);
  if (words.length === 0) return null;
  return { $and: words.map((w) => ({ $or: matchesForWord(w) })) };
}

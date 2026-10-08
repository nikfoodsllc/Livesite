/** A cart line the server refused because ordering for it has closed (its kind of item closed for that day). */
export interface ClosedItemInfo {
  date: string;
  foodItemId?: string;
  /** The item's name, when the server sent it */
  name?: string;
  closesAt: string;
}

/** The closed lines from a refused checkout response (anything that is not a date + closing moment is ignored). */
export function parseClosedItems(value: unknown): ClosedItemInfo[] {
  if (!Array.isArray(value)) return [];
  const out: ClosedItemInfo[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const { date, foodItemId, closesAt, name } = entry as { date?: unknown; foodItemId?: unknown; closesAt?: unknown; name?: unknown };
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (typeof closesAt !== 'string' || Number.isNaN(new Date(closesAt).getTime())) continue;
    out.push({ date, foodItemId: typeof foodItemId === 'string' ? foodItemId : undefined, name: typeof name === 'string' && name.trim() ? name.trim() : undefined, closesAt });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The red banner shown on checkout when items in the cart can no longer be ordered, with one item name per line:
 *
 *   The ordering cutoff has passed for the following items, so they’ve been removed from your cart:
 *
 *   Item 1
 *   Item 2
 *
 * (the banner shows line breaks as they are). Without any item names it falls back to what the server said.
 */
export function closedItemsNotice(serverMessage: string, removedCount: number, linesLeft: number, closed: ClosedItemInfo[] = []): string {
  const names: string[] = [];
  for (const line of closed) if (line.name && !names.includes(line.name)) names.push(line.name);
  if (names.length > 0) {
    return `The ordering cutoff has passed for the following items, so they’ve been removed from your cart:\n\n${names.join('\n')}`;
  }
  const base = serverMessage && serverMessage.trim() ? serverMessage.trim() : 'Ordering has closed for some of the items in your cart.';
  if (removedCount === 0) return `${base} Please remove them from your cart to continue.`;
  const removed = `We removed ${removedCount > 1 ? 'them' : 'it'} from your cart`;
  return linesLeft > 0
    ? `${base} ${removed}, so you can continue with the rest of your order.`
    : `${base} ${removed}, so your cart is now empty.`;
}

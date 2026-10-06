/**
 * Fields the admin panel keeps on a document for its own reporting. The customer site must never
 * return them (not in the menu, the cart, an order snapshot or anywhere else), so every database read
 * removes them before the document goes any further.
 *
 *  - fooditems.preparationType: 'cooked' | 'ready_to_eat', how the kitchen prepares the item.
 */
export const ADMIN_ONLY_FIELDS: Record<string, readonly string[]> = {
  fooditems: ['preparationType'],
};

/** The same document without the admin-only fields of its collection (the input is not changed). */
export function withoutAdminOnlyFields<T>(collectionName: string, doc: T): T {
  const fields = ADMIN_ONLY_FIELDS[collectionName];
  if (!fields || !doc || typeof doc !== 'object' || Array.isArray(doc)) return doc;
  if (!fields.some((f) => Object.prototype.hasOwnProperty.call(doc, f))) return doc;
  const copy = { ...(doc as Record<string, unknown>) };
  for (const f of fields) delete copy[f];
  return copy as T;
}

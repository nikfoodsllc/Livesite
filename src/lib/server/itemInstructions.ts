import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { cleanItemInstructions } from '@/lib/itemInstructions';

interface LineLike {
  food?: { _id?: unknown };
  notes?: string;
}
interface DayLike<T extends LineLike> {
  items: T[];
}

/**
 * Keeps a line's instructions only when its food item has the Special instructions box switched on (set in the admin), and tidies
 * them (one line, at most INSTRUCTIONS_MAX characters). An old page, a stale cart or a hand-made request cannot add instructions to an
 * item that does not take them. Never throws: if the menu cannot be read, no instructions are kept (the order itself still goes through).
 */
export async function keepAllowedInstructions<T extends LineLike, D extends DayLike<T>>(days: D[]): Promise<D[]> {
  const ids = new Set<string>();
  for (const day of days) for (const line of day.items) if (line.notes && line.food?._id) ids.add(String(line.food._id));
  let allowed = new Set<string>();
  if (ids.size > 0) {
    try {
      const valid = [...ids].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
      const result = valid.length > 0 ? await db.read('fooditems', { _id: { $in: valid }, allowInstructions: true }) : null;
      const docs = result && result.success && result.data ? (result.data as Array<{ _id: unknown }>) : [];
      allowed = new Set(docs.map((d) => String(d._id)));
    } catch (error) {
      console.error('[instructions] could not read the menu', error instanceof Error ? error.message : error);
    }
  }
  for (const day of days) {
    for (const line of day.items) {
      const text = line.notes && line.food?._id && allowed.has(String(line.food._id)) ? cleanItemInstructions(line.notes) : undefined;
      if (text) line.notes = text;
      else delete line.notes;
    }
  }
  return days;
}

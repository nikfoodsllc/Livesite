import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';

/** Delivery instructions are free text kept on the address (its `floor` field) and copied onto each order. */
export const MAX_DELIVERY_INSTRUCTIONS = 100;

/**
 * Cleans what the customer typed: trimmed, line breaks and runs of spaces become one space, cut to the limit.
 * Returns undefined when nothing was sent at all (so "not provided" is different from "cleared": '').
 */
export function cleanInstructions(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  return input.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_DELIVERY_INSTRUCTIONS);
}

/**
 * Saves the instructions on the customer's saved address so they are filled in at the next checkout. Only an address that
 * belongs to this customer is touched; an empty text clears them. Best effort: never throws.
 */
export async function saveInstructionsOnAddress(userId: string, addressId: unknown, instructions: string): Promise<boolean> {
  try {
    if (typeof addressId !== 'string' || !ObjectId.isValid(addressId) || !ObjectId.isValid(userId)) return false;
    const collection = await db.getCollectionForOperations('addresses');
    const owner = { $in: [userId, new ObjectId(userId)] };
    const update = instructions
      ? { $set: { floor: instructions, updatedAt: new Date() } }
      : { $unset: { floor: '' }, $set: { updatedAt: new Date() } };
    const result = await collection.updateOne({ _id: new ObjectId(addressId), user: owner } as never, update as never);
    return result.matchedCount > 0;
  } catch (error) {
    console.warn('[delivery-instructions] could not save on the address', error instanceof Error ? error.message : error);
    return false;
  }
}

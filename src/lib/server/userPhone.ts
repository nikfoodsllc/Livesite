import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';

/**
 * One phone number per customer profile (`users.phone`, stored as 10 digits). A person may sign up without one; as soon as
 * they give a phone number anywhere (an address, a checkout, an order an admin enters for them) it is saved to their profile
 * so it can be filled in everywhere else. A number already on the profile is NEVER replaced here: an address or an order may
 * carry another contact (a spouse, an office), the profile page is where the person changes their own number.
 * Saving is best effort and never makes an address, order or payment fail.
 */

/** 10 digits for a US number typed in any common way ("(206) 555-0100", "1-206-555-0100", "206.555.0100"), else null. */
export function normalizeUsPhone(input: unknown): string | null {
  if (typeof input !== 'string' && typeof input !== 'number') return null;
  const digits = String(input).replace(/\D/g, '');
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return /^\d{10}$/.test(ten) ? ten : null;
}

/** True when the profile has no usable phone (missing, empty, or not a 10 digit number). */
export function profileLacksPhone(phone: unknown): boolean {
  return normalizeUsPhone(phone) === null;
}

/**
 * Saves `phone` on the profile of `userId` when the profile has none. Returns the saved number, or null when nothing was
 * changed (already has one, not a valid number, unknown user, or a database problem).
 */
export async function rememberUserPhone(userId: string, phone: unknown): Promise<string | null> {
  const normalized = normalizeUsPhone(phone);
  if (!normalized || !ObjectId.isValid(userId)) return null;
  try {
    const collection = await db.getCollectionForOperations('users');
    const _id = new ObjectId(userId);
    const current = await collection.findOne({ _id }, { projection: { phone: 1, role: 1 } });
    if (!current || current.role === 'admin' || current.role === 'ADMIN') return null;
    if (!profileLacksPhone(current.phone)) return null;
    // the filter repeats the check, so two requests at once cannot both write
    const result = await collection.updateOne(
      { _id, $or: [{ phone: { $exists: false } }, { phone: null }, { phone: '' }, { phone: { $not: /^\+?1?\D*(\d\D*){10}$/ } }] },
      { $set: { phone: normalized, updatedAt: new Date() } }
    );
    return result.modifiedCount > 0 ? normalized : null;
  } catch (error) {
    console.warn('[user-phone] could not save the phone to the profile', error instanceof Error ? error.message : error);
    return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// One-off clean-up of existing profiles

export interface PhoneBackfillResult {
  dryRun: boolean;
  /** Customers whose profile has no usable phone */
  withoutPhone: number;
  /** Of those, how many have a usable number on an order or an address */
  fillable: number;
  /** Profiles changed (0 for a dry run) */
  filled: number;
  /** Customers with no number anywhere: someone has to ask them */
  noNumberAnywhere: number;
}

/**
 * Fills the profiles that have no phone with the number the customer gave us: the one on their newest order, else on their
 * newest address. Profiles that already have a number are never touched. `dryRun` only counts.
 */
export async function backfillUserPhones(dryRun: boolean): Promise<PhoneBackfillResult> {
  const users = await db.getCollectionForOperations('users');
  const addresses = await db.getCollectionForOperations('addresses');
  const orders = await db.getCollectionForOperations('orders');

  const result: PhoneBackfillResult = { dryRun, withoutPhone: 0, fillable: 0, filled: 0, noNumberAnywhere: 0 };
  const candidates = await users
    .find({ role: 'USER', $or: [{ phone: { $exists: false } }, { phone: null }, { phone: '' }, { phone: { $not: /^\+?1?\D*(\d\D*){10}$/ } }] })
    .project({ _id: 1 })
    .toArray();
  result.withoutPhone = candidates.length;
  const ids = candidates.map((u) => String(u._id));

  // newest order phone per customer, then newest address phone
  const orderRows = await orders.find({ user: { $in: ids } }).project({ user: 1, 'customerInfo.phone': 1, createdAt: 1 }).sort({ createdAt: -1 }).toArray();
  const addressRows = await addresses.find({ user: { $in: ids } }).project({ user: 1, phone: 1, createdAt: 1 }).sort({ createdAt: -1 }).toArray();
  const found = new Map<string, string>();
  for (const o of orderRows) {
    const p = normalizeUsPhone((o as { customerInfo?: { phone?: string } }).customerInfo?.phone);
    if (p && !found.has(String(o.user))) found.set(String(o.user), p);
  }
  for (const a of addressRows) {
    const p = normalizeUsPhone((a as { phone?: string }).phone);
    if (p && !found.has(String(a.user))) found.set(String(a.user), p);
  }
  result.fillable = found.size;
  result.noNumberAnywhere = ids.length - found.size;

  if (!dryRun) {
    for (const [userId, phone] of found) {
      const saved = await rememberUserPhone(userId, phone);
      if (saved) result.filled += 1;
    }
  }
  return result;
}

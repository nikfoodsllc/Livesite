import { db } from '@/lib/server/db';
import { cleanOptOutEmail } from '@/lib/emailOptOut';

const COLLECTION = 'emailOptOuts';

interface OptOutDoc {
  email: string;
  createdAt: Date;
  source: string;
}

/**
 * Notes that an address unsubscribed from the Wix menu update emails. It is only a record (for the team to remove the person from
 * Wix): nothing we send ourselves reads it. Safe to repeat (the first date stays).
 * `valid` is false for an address that is not an email; `isNew` is true only the first time this address is recorded.
 */
export async function recordOptOut(rawEmail: unknown, source = 'unsubscribe_page'): Promise<{ valid: boolean; isNew: boolean; email: string }> {
  const email = cleanOptOutEmail(rawEmail);
  if (!email) return { valid: false, isNew: false, email: '' };
  const optOuts = await db.getCollectionForOperations<OptOutDoc & Record<string, unknown>>(COLLECTION);
  await optOuts.createIndex({ email: 1 }, { unique: true });
  const result = await optOuts.updateOne({ email } as never, { $setOnInsert: { email, createdAt: new Date(), source } } as never, { upsert: true });
  return { valid: true, isNew: result.upsertedCount === 1, email };
}

export async function listOptOuts(): Promise<Array<{ email: string; createdAt: Date; source: string }>> {
  const optOuts = await db.getCollectionForOperations<OptOutDoc & Record<string, unknown>>(COLLECTION);
  return (await optOuts.find({} as never).sort({ createdAt: -1 }).limit(20000).toArray()).map((d) => ({ email: d.email, createdAt: d.createdAt, source: d.source }));
}

/** Which of these addresses are on the unsubscribe list (lower case in, lower case out). One query per 1,000 addresses. */
export async function optedOutEmails(emails: string[]): Promise<Set<string>> {
  const wanted = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const found = new Set<string>();
  if (wanted.length === 0) return found;
  const optOuts = await db.getCollectionForOperations<OptOutDoc & Record<string, unknown>>(COLLECTION);
  for (let i = 0; i < wanted.length; i += 1000) {
    const rows = await optOuts.find({ email: { $in: wanted.slice(i, i + 1000) } } as never, { projection: { email: 1 } }).toArray();
    for (const r of rows) found.add(String(r.email));
  }
  return found;
}

/**
 * Switches off the menu alerts email subscription of an address (and of the account that uses it), so "subscribed to emails" turns off
 * the moment someone unsubscribes. Safe to repeat. Returns how many subscriptions were switched off.
 */
export async function turnOffEmailSubscription(rawEmail: unknown): Promise<number> {
  const email = cleanOptOutEmail(rawEmail);
  if (!email) return 0;
  const users = await db.getCollectionForOperations<Record<string, unknown>>('users');
  const accounts = await users.find({ email } as never, { projection: { _id: 1 } }).limit(5).toArray();
  const subs = await db.getCollectionForOperations<Record<string, unknown>>('menu_subscriptions');
  const now = new Date();
  const or: Array<Record<string, unknown>> = [{ email }, ...accounts.map((a) => ({ userId: String(a._id) }))];
  const result = await subs.updateMany({ isActive: true, $or: or } as never, { $set: { isActive: false, unsubscribedAt: now, updatedAt: now } } as never);
  return result.modifiedCount;
}

import { db } from '@/lib/server/db';
import { cleanOptOutEmail } from '@/lib/emailOptOut';

const COLLECTION = 'emailOptOuts';

interface OptOutDoc {
  email: string;
  createdAt: Date;
  source: string;
}

/**
 * Puts an address on the do-not-email list and turns off its menu alerts. Safe to repeat (the first date stays).
 * Returns false only for an address that is not an email.
 */
export async function recordOptOut(rawEmail: unknown, source = 'unsubscribe_page'): Promise<boolean> {
  const email = cleanOptOutEmail(rawEmail);
  if (!email) return false;
  const optOuts = await db.getCollectionForOperations<OptOutDoc & Record<string, unknown>>(COLLECTION);
  await optOuts.createIndex({ email: 1 }, { unique: true });
  await optOuts.updateOne({ email } as never, { $setOnInsert: { email, createdAt: new Date(), source } } as never, { upsert: true });
  const subs = await db.getCollectionForOperations<Record<string, unknown>>('menu_subscriptions');
  await subs.updateMany({ email } as never, { $set: { isActive: false, updatedAt: new Date() } } as never);
  return true;
}

/** Which of these addresses asked not to be emailed (lower case). */
export async function optedOutAmong(emails: string[]): Promise<Set<string>> {
  const clean = emails.map((e) => cleanOptOutEmail(e)).filter((e): e is string => Boolean(e));
  if (clean.length === 0) return new Set();
  const optOuts = await db.getCollectionForOperations<OptOutDoc & Record<string, unknown>>(COLLECTION);
  const found = await optOuts.find({ email: { $in: clean } } as never, { projection: { email: 1 } }).toArray();
  return new Set(found.map((d) => d.email));
}

export async function listOptOuts(): Promise<Array<{ email: string; createdAt: Date; source: string }>> {
  const optOuts = await db.getCollectionForOperations<OptOutDoc & Record<string, unknown>>(COLLECTION);
  return (await optOuts.find({} as never).sort({ createdAt: -1 }).limit(20000).toArray()).map((d) => ({ email: d.email, createdAt: d.createdAt, source: d.source }));
}

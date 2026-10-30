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

import type { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { wants } from './config';
import { prefsForUsers, usersWithTokens } from './store';

interface SubDoc {
  email?: string;
  userId?: string;
  consentGiven?: boolean;
  isActive?: boolean;
}
interface UserDoc {
  _id: ObjectId;
  email?: string;
}

/** Is this customer on the menu alerts list (by account or by email)? */
export async function isMenuSubscribed(userId: string, email?: string): Promise<boolean> {
  const col = await db.getCollectionForOperations<SubDoc & Record<string, unknown>>('menu_subscriptions');
  const or: Array<Record<string, unknown>> = [{ userId }];
  if (email) or.push({ email: email.trim().toLowerCase() });
  const found = await col.findOne({ $or: or, isActive: true, consentGiven: true } as never, { projection: { _id: 1 } });
  return Boolean(found);
}

/** Puts the customer's email on the menu alerts list (or turns an old entry back on). */
export async function subscribeMenu(userId: string, email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  const col = await db.getCollectionForOperations<SubDoc & Record<string, unknown>>('menu_subscriptions');
  const now = new Date();
  const existing = await col.findOne({ email: normalized } as never, { projection: { _id: 1 } });
  if (existing) {
    await col.updateOne({ _id: existing._id } as never, { $set: { isActive: true, consentGiven: true, userId, updatedAt: now } } as never);
    return;
  }
  await col.insertOne({ email: normalized, userId, subscribedAt: now, consentGiven: true, isActive: true, source: 'app', createdAt: now, updatedAt: now } as never);
}

/**
 * Who gets a "the menu is up" notification: customers on the menu alerts list (consent given, still active) who have the app
 * with a phone registered and have not switched menu notifications off. Counts and ids only, never emails.
 */
export async function menuAudience(): Promise<{ userIds: string[]; subscribers: number; withApp: number }> {
  const subs = await db.getCollectionForOperations<SubDoc & Record<string, unknown>>('menu_subscriptions');
  const rows = await subs.find({ isActive: true, consentGiven: true } as never, { projection: { email: 1, userId: 1 } }).toArray();
  const ids = new Set<string>();
  const emails: string[] = [];
  for (const r of rows) {
    if (r.userId) ids.add(String(r.userId));
    else if (r.email) emails.push(String(r.email).toLowerCase());
  }
  if (emails.length > 0) {
    const users = await db.getCollectionForOperations<UserDoc & Record<string, unknown>>('users');
    const found = await users.find({ email: { $in: emails } } as never, { projection: { _id: 1 } }).toArray();
    for (const u of found) ids.add(String(u._id));
  }
  const subscribedUsers = [...ids];
  const withApp = await usersWithTokens(subscribedUsers);
  const prefs = await prefsForUsers(withApp);
  const userIds = withApp.filter((id) => wants(prefs.get(id), 'menu'));
  return { userIds, subscribers: rows.length, withApp: withApp.length };
}

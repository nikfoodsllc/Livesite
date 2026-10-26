import { db } from '@/lib/server/db';
import { wants, type PushPrefs } from './config';
import { prefsForUsers, usersWithTokens } from './store';

interface SubDoc {
  email?: string;
  userId?: string;
  consentGiven?: boolean;
  isActive?: boolean;
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

/** Customers who have the app and have not switched menu notifications off (an unset choice counts as on). */
export function pickMenuAudience(withApp: string[], prefs: Map<string, Partial<PushPrefs>>): string[] {
  return withApp.filter((id) => wants(prefs.get(id), 'menu'));
}

/**
 * Who gets a "the menu is up" notification: every customer who has the app with a phone registered (they allowed notifications
 * and are signed in) and has not switched menu notifications off in the app. Being on the menu alerts email list is NOT needed:
 * allowing notifications in the app is their consent. Counts and ids only, never emails.
 * `subscribers` (the email list) is only reported for information.
 */
export async function menuAudience(): Promise<{ userIds: string[]; subscribers: number; withApp: number }> {
  const subs = await db.getCollectionForOperations<SubDoc & Record<string, unknown>>('menu_subscriptions');
  const subscribers = await subs.countDocuments({ isActive: true, consentGiven: true } as never);
  const withApp = await usersWithTokens();
  const prefs = await prefsForUsers(withApp);
  return { userIds: pickMenuAudience(withApp, prefs), subscribers, withApp: withApp.length };
}

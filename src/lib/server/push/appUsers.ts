import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { wants, type PushPrefs } from './config';
import { prefsForUsers } from './store';

/**
 * The admin's "App customers" list: every customer who has the app with notifications allowed on the phone (a phone is only
 * registered after the customer said yes to Apple's question, so a phone on file = the phone permission is granted), and the
 * three switches they chose inside the app. Customers who said no to Apple, or never opened the app, are not on file.
 */

export interface AppPhone {
  platform: string;
  deviceName: string;
  appVersion: string;
  /** The last time the app told us about this phone (each time a customer signs in or opens the app signed in). */
  lastSeenAt: string | null;
  firstSeenAt: string | null;
}

export interface AppUserRow {
  userId: string;
  name: string;
  email: string;
  phone: string;
  phones: AppPhone[];
  lastSeenAt: string | null;
  /** Order updates switch (on unless the customer turned it off) */
  orders: boolean;
  /** Menu alerts switch inside the app */
  menuSwitch: boolean;
  /** On the menu alerts email list with consent (needed as well, for the menu alert to reach them) */
  menuSubscribed: boolean;
  /** Cart reminders switch (off unless the customer turned it on) */
  reminders: boolean;
}

export interface AppUserCounts {
  customers: number;
  phones: number;
  /** customers with order updates on */
  orders: number;
  /** customers who will get a menu alert: switch on AND subscribed */
  menu: number;
  reminders: number;
  /** customers with all three off (they only get what the customer cannot switch off) */
  allOff: number;
}

export interface TokenRow {
  userId: string;
  platform?: string;
  deviceName?: string;
  appVersion?: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}
export interface UserInfo {
  name?: string;
  email?: string;
  phone?: string;
}

const iso = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Puts the phones, the customer records, the switches and the menu list together. Customers without a record are left out. Newest activity first. */
export function buildAppUsers(input: {
  tokens: TokenRow[];
  users: Map<string, UserInfo>;
  prefs: Map<string, PushPrefs>;
  menuSubscribed: Set<string>;
}): { customers: AppUserRow[]; counts: AppUserCounts } {
  const byUser = new Map<string, AppPhone[]>();
  for (const t of input.tokens) {
    const list = byUser.get(t.userId) ?? [];
    list.push({ platform: t.platform || 'ios', deviceName: t.deviceName || '', appVersion: t.appVersion || '', lastSeenAt: iso(t.updatedAt), firstSeenAt: iso(t.createdAt) });
    byUser.set(t.userId, list);
  }
  const customers: AppUserRow[] = [];
  for (const [userId, phones] of byUser) {
    const info = input.users.get(userId);
    if (!info) continue;
    phones.sort((a, b) => (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? ''));
    const prefs = input.prefs.get(userId);
    customers.push({
      userId,
      name: String(info.name ?? '').trim(),
      email: String(info.email ?? '').trim(),
      phone: String(info.phone ?? '').trim(),
      phones,
      lastSeenAt: phones[0]?.lastSeenAt ?? null,
      orders: wants(prefs, 'orders'),
      menuSwitch: wants(prefs, 'menu'),
      menuSubscribed: input.menuSubscribed.has(userId),
      reminders: wants(prefs, 'reminders'),
    });
  }
  customers.sort((a, b) => (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? '') || a.name.localeCompare(b.name));
  const counts: AppUserCounts = {
    customers: customers.length,
    phones: customers.reduce((n, c) => n + c.phones.length, 0),
    orders: customers.filter((c) => c.orders).length,
    menu: customers.filter((c) => c.menuSwitch && c.menuSubscribed).length,
    reminders: customers.filter((c) => c.reminders).length,
    allOff: customers.filter((c) => !c.orders && !(c.menuSwitch && c.menuSubscribed) && !c.reminders).length,
  };
  return { customers, counts };
}

const MAX_PHONES = 5000;

/** Reads the phones, the customers, their switches and the menu alerts list, and builds the list. */
export async function listAppUsers(): Promise<{ customers: AppUserRow[]; counts: AppUserCounts }> {
  const tokenCol = await db.getCollectionForOperations<Record<string, unknown>>('pushTokens');
  const rows = await tokenCol.find({} as never, { projection: { userId: 1, platform: 1, deviceName: 1, appVersion: 1, createdAt: 1, updatedAt: 1 } }).limit(MAX_PHONES).toArray();
  const tokens: TokenRow[] = rows.map((r) => ({
    userId: String(r.userId ?? ''),
    platform: r.platform as string | undefined,
    deviceName: r.deviceName as string | undefined,
    appVersion: r.appVersion as string | undefined,
    createdAt: r.createdAt as Date | undefined,
    updatedAt: r.updatedAt as Date | undefined,
  })).filter((t) => t.userId);
  const ids = [...new Set(tokens.map((t) => t.userId))];

  const users = new Map<string, UserInfo>();
  const emails = new Map<string, string>(); // lower-case email -> user id
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (objectIds.length > 0) {
    const userCol = await db.getCollectionForOperations<Record<string, unknown>>('users');
    const found = await userCol.find({ _id: { $in: objectIds } } as never, { projection: { name: 1, email: 1, phone: 1 } }).toArray();
    for (const u of found) {
      const id = String(u._id);
      users.set(id, { name: u.name as string, email: u.email as string, phone: u.phone as string });
      if (u.email) emails.set(String(u.email).trim().toLowerCase(), id);
    }
  }
  const prefs = await prefsForUsers(ids);

  const menuSubscribed = new Set<string>();
  if (ids.length > 0) {
    const subs = await db.getCollectionForOperations<Record<string, unknown>>('menu_subscriptions');
    const found = await subs
      .find({ isActive: true, consentGiven: true, $or: [{ userId: { $in: ids } }, { email: { $in: [...emails.keys()] } }] } as never, { projection: { userId: 1, email: 1 } })
      .toArray();
    for (const s of found) {
      if (s.userId && ids.includes(String(s.userId))) menuSubscribed.add(String(s.userId));
      else if (s.email) {
        const id = emails.get(String(s.email).trim().toLowerCase());
        if (id) menuSubscribed.add(id);
      }
    }
  }
  return buildAppUsers({ tokens, users, prefs, menuSubscribed });
}

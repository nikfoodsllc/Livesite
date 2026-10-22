import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { wants, type PushPrefs } from './config';
import { prefsForUsers } from './store';
import { allDevices, type DevicePermission } from './devices';

/**
 * The admin's "App customers" list: every customer who uses the app signed in, whether the phone allows notifications
 * (a registered push token means yes; newer app versions also report No and "not asked yet"), and the three switches they chose
 * inside the app. Customers who never signed in on the app are not on file. Older app versions report nothing, so a customer
 * with only a token is shown as allowed.
 */

/** Allowed = a phone can get notifications, denied = said No in iPhone Settings / to Apple, notAsked = the question was never answered. */
export type AppPermission = 'allowed' | 'denied' | 'notAsked';

export interface AppPhone {
  permission: AppPermission;
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
  /** Whether the customer's phone(s) allow notifications: allowed if any phone does */
  permission: AppPermission;
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
  /** everyone who uses the app signed in */
  customers: number;
  allowed: number;
  denied: number;
  notAsked: number;
  phones: number;
  /** among the customers who allowed notifications: with order updates on */
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
export interface DeviceRow {
  userId: string;
  permission: DevicePermission;
  platform?: string;
  deviceName?: string;
  appVersion?: string;
  firstSeenAt?: Date | string | null;
  lastSeenAt?: Date | string | null;
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

const permissionOf = (p: DevicePermission): AppPermission => (p === 'granted' ? 'allowed' : p === 'denied' ? 'denied' : 'notAsked');

/**
 * Puts the phones, the reports from the app, the customer records, the switches and the menu list together. Customers without
 * a record are left out. Newest activity first. The phones of a customer are their push tokens (allowed) plus the installs that
 * said No or were not asked (and an install that says allowed but has no token yet, when the customer has no token at all).
 */
export function buildAppUsers(input: {
  tokens: TokenRow[];
  devices?: DeviceRow[];
  users: Map<string, UserInfo>;
  prefs: Map<string, PushPrefs>;
  menuSubscribed: Set<string>;
}): { customers: AppUserRow[]; counts: AppUserCounts } {
  const phonesOf = new Map<string, AppPhone[]>();
  const add = (userId: string, phone: AppPhone) => {
    const list = phonesOf.get(userId) ?? [];
    list.push(phone);
    phonesOf.set(userId, list);
  };
  const withToken = new Set<string>();
  for (const t of input.tokens) {
    withToken.add(t.userId);
    add(t.userId, { permission: 'allowed', platform: t.platform || 'ios', deviceName: t.deviceName || '', appVersion: t.appVersion || '', lastSeenAt: iso(t.updatedAt), firstSeenAt: iso(t.createdAt) });
  }
  for (const d of input.devices ?? []) {
    if (d.permission === 'granted' && withToken.has(d.userId)) continue; // already listed through its token
    add(d.userId, { permission: permissionOf(d.permission), platform: d.platform || 'ios', deviceName: d.deviceName || '', appVersion: d.appVersion || '', lastSeenAt: iso(d.lastSeenAt), firstSeenAt: iso(d.firstSeenAt) });
  }
  const customers: AppUserRow[] = [];
  for (const [userId, phones] of phonesOf) {
    const info = input.users.get(userId);
    if (!info) continue;
    phones.sort((a, b) => (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? ''));
    const prefs = input.prefs.get(userId);
    const permission: AppPermission = phones.some((p) => p.permission === 'allowed') ? 'allowed' : phones.some((p) => p.permission === 'denied') ? 'denied' : 'notAsked';
    customers.push({
      userId,
      name: String(info.name ?? '').trim(),
      email: String(info.email ?? '').trim(),
      phone: String(info.phone ?? '').trim(),
      phones,
      lastSeenAt: phones[0]?.lastSeenAt ?? null,
      permission,
      orders: wants(prefs, 'orders'),
      menuSwitch: wants(prefs, 'menu'),
      menuSubscribed: input.menuSubscribed.has(userId),
      reminders: wants(prefs, 'reminders'),
    });
  }
  customers.sort((a, b) => (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? '') || a.name.localeCompare(b.name));
  const allowed = customers.filter((c) => c.permission === 'allowed');
  const counts: AppUserCounts = {
    customers: customers.length,
    allowed: allowed.length,
    denied: customers.filter((c) => c.permission === 'denied').length,
    notAsked: customers.filter((c) => c.permission === 'notAsked').length,
    phones: customers.reduce((n, c) => n + c.phones.length, 0),
    orders: allowed.filter((c) => c.orders).length,
    menu: allowed.filter((c) => c.menuSwitch && c.menuSubscribed).length,
    reminders: allowed.filter((c) => c.reminders).length,
    allOff: allowed.filter((c) => !c.orders && !(c.menuSwitch && c.menuSubscribed) && !c.reminders).length,
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
  const deviceDocs = await allDevices(MAX_PHONES);
  const devices: DeviceRow[] = deviceDocs.map((d) => ({ userId: String(d.userId), permission: d.permission, platform: d.platform, deviceName: d.deviceName, appVersion: d.appVersion, firstSeenAt: d.firstSeenAt, lastSeenAt: d.lastSeenAt }));
  const ids = [...new Set([...tokens.map((t) => t.userId), ...devices.map((d) => d.userId)])];

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
  return buildAppUsers({ tokens, devices, users, prefs, menuSubscribed });
}

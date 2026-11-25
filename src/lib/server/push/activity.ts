import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { allDevices } from './devices';

/**
 * How the app is used, for the admin's All Users page.
 *
 * What we can know: the app tells the site about itself every time it opens signed in (see devices.ts). Each of those reports now
 * also leaves one small record per customer, install and day (`appActivity`), so the number of customers who came to the app each
 * day builds up from the day recording started. Before that, only the latest "last seen" time of each install exists, which is
 * enough for "opened in the last 7 / 30 days" but not for a daily history.
 * What we cannot know: how many people downloaded the app (that number is in App Store Connect), people who never signed in on the
 * app, and phones running an older app version that does not report.
 */

const ACTIVITY = 'appActivity';
const ZONE = 'America/Los_Angeles';

export interface ActivityDoc {
  userId: string;
  installId: string;
  /** Pacific day, YYYY-MM-DD */
  day: string;
  opens: number;
  appVersion?: string;
  firstAt: Date;
  lastAt: Date;
}

let indexReady = false;
async function activity() {
  const col = await db.getCollectionForOperations<ActivityDoc & Record<string, unknown>>(ACTIVITY);
  if (!indexReady) {
    indexReady = true;
    await col.createIndex({ userId: 1, installId: 1, day: 1 }, { unique: true }).catch(() => undefined);
    await col.createIndex({ day: 1 }).catch(() => undefined);
  }
  return col;
}

/** The business runs on Pacific time: a "day" is a Pacific calendar day (YYYY-MM-DD). */
// one formatter for every call: building a new one each time is very slow when thousands of orders are bucketed
const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
export function pacificDay(date: Date | string): string {
  return DAY_FORMAT.format(date instanceof Date ? date : new Date(date));
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, 12));
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/** Notes that this customer's install opened the app today. Quiet: never throws (a failure must not break the app's report). */
export async function recordAppOpen(userId: string, installId: string, appVersion?: string, platform?: 'ios' | 'android'): Promise<void> {
  try {
    if (!userId || !installId) return;
    const now = new Date();
    const col = await activity();
    await col.updateOne(
      { userId, installId, day: pacificDay(now) } as never,
      {
        $inc: { opens: 1 },
        $set: { lastAt: now, ...(appVersion ? { appVersion: String(appVersion).slice(0, 20) } : {}), ...(platform ? { platform } : {}) },
        $setOnInsert: { userId, installId, day: pacificDay(now), firstAt: now },
      } as never,
      { upsert: true }
    );
  } catch (error) {
    console.error('[app-activity] could not record an open', error instanceof Error ? error.message : String(error));
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// The numbers (a plain function: easy to check on its own)
// ---------------------------------------------------------------------------------------------------------------------------

export interface ActivityDevice {
  userId: string;
  installId: string;
  appVersion?: string;
  /** 'ios' or 'android' (phones from before Android count as iPhone) */
  platform?: string;
  firstSeenAt: Date | string;
  lastSeenAt: Date | string;
}
export interface ActivityRow {
  userId: string;
  installId?: string;
  day: string;
  opens?: number;
}
export interface ActivityOrder {
  createdAt: Date | string;
  user?: string;
  channel?: string;
  appPlatform?: string;
}

export interface AppActivity {
  generatedAt: string;
  /** today (Pacific) */
  today: string;
  /** the days shown, oldest first */
  days: string[];
  /** customers who have the app (signed in on it at least once) and the phones they use it on */
  onApp: { customers: number; installs: number };
  /** the same, and who opened it in the last 30 days, for the iPhone app and the Android app */
  platforms: Record<'ios' | 'android', { customers: number; installs: number; last30: number }>;
  /** customers whose app was opened today / in the last 7 days / in the last 30 days (from each phone's last open) */
  active: { today: number; last7: number; last30: number };
  /** new phones that signed in for the first time, per day */
  newInstalls: Array<{ day: string; installs: number }>;
  /** customers who opened the app each day; null for days before recording started */
  daily: Array<{ day: string; customers: number | null }>;
  /** the first day with a record, or null when nothing has been recorded yet */
  recordingSince: string | null;
  /** customers who opened the app on 2 or more different days within the last 7 days (null until 2 days are recorded) */
  returning7: number | null;
  /** paid orders per day: placed in the app (of which on Android), and all (website and app); orders an admin entered are left out */
  orders: Array<{ day: string; app: number; appAndroid: number; all: number; appCustomers: number }>;
  /** the app versions on phones opened in the last 30 days, per app (iPhone / Android) */
  versions: Array<{ version: string; platform: 'ios' | 'android'; customers: number }>;
  /** who is behind each number (customer ids; the details of each are in `people`) */
  lists: {
    have: string[];
    today: string[];
    last7: string[];
    last30: string[];
    returning7: string[];
    /** openers per day, only for days with a record */
    byDay: Record<string, string[]>;
    /** customers whose phone signed in for the first time that day */
    newByDay: Record<string, string[]>;
  };
  people: Record<string, ActivityPerson>;
}

export interface ActivityPerson {
  name: string;
  email: string;
  phone: string;
  /** the last time any of their phones opened the app */
  lastSeenAt: string | null;
  /** how many days (of the days shown) they opened the app, from the daily records */
  daysOpened: number;
}
export interface ActivityUser {
  name?: string;
  email?: string;
  phone?: string;
}

export function buildAppActivity(input: {
  now: Date;
  days: number;
  devices: ActivityDevice[];
  rows: ActivityRow[];
  recordingSince: string | null;
  orders: ActivityOrder[];
  users?: Map<string, ActivityUser>;
}): AppActivity {
  const today = pacificDay(input.now);
  const n = Math.max(1, Math.floor(input.days));
  const days = Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
  const inWindow = new Set(days);

  const customers = new Set(input.devices.map((d) => d.userId));
  const dayOf = (v: Date | string) => pacificDay(v);

  const activeSince = (from: string) => new Set(input.devices.filter((d) => dayOf(d.lastSeenAt) >= from).map((d) => d.userId)).size;
  const active = { today: activeSince(today), last7: activeSince(addDays(today, -6)), last30: activeSince(addDays(today, -29)) };

  const firstByDay = new Map<string, number>();
  for (const d of input.devices) {
    const day = dayOf(d.firstSeenAt);
    firstByDay.set(day, (firstByDay.get(day) ?? 0) + 1);
  }
  const newInstalls = days.map((day) => ({ day, installs: firstByDay.get(day) ?? 0 }));

  const perDay = new Map<string, Set<string>>();
  for (const r of input.rows) {
    if (!perDay.has(r.day)) perDay.set(r.day, new Set());
    perDay.get(r.day)!.add(r.userId);
  }
  const since = input.recordingSince;
  const daily = days.map((day) => ({ day, customers: since && day >= since ? perDay.get(day)?.size ?? 0 : null }));

  // came back on a different day: 2 or more distinct days with a record, in the last 7 days
  const recordedDays = since ? Math.min(7, Math.max(0, Date.parse(today) / 86400000 - Date.parse(since) / 86400000 + 1)) : 0;
  let returning7: number | null = null;
  if (recordedDays >= 2) {
    const last7 = new Set(Array.from({ length: 7 }, (_, i) => addDays(today, -i)));
    const daysByUser = new Map<string, Set<string>>();
    for (const r of input.rows) {
      if (!last7.has(r.day)) continue;
      if (!daysByUser.has(r.userId)) daysByUser.set(r.userId, new Set());
      daysByUser.get(r.userId)!.add(r.day);
    }
    returning7 = [...daysByUser.values()].filter((s) => s.size >= 2).length;
  }

  // each order's day is worked out once (not once per day shown)
  const byDay = new Map<string, { app: number; appAndroid: number; all: number; appUsers: Set<string> }>();
  for (const o of input.orders) {
    const day = dayOf(o.createdAt);
    if (!inWindow.has(day)) continue;
    const b = byDay.get(day) ?? { app: 0, appAndroid: 0, all: 0, appUsers: new Set<string>() };
    b.all += 1;
    if (o.channel === 'mobile') {
      b.app += 1;
      if (o.appPlatform === 'android') b.appAndroid += 1;
      b.appUsers.add(o.user ?? '');
    }
    byDay.set(day, b);
  }
  const orders = days.map((day) => {
    const b = byDay.get(day);
    return { day, app: b?.app ?? 0, appAndroid: b?.appAndroid ?? 0, all: b?.all ?? 0, appCustomers: b?.appUsers.size ?? 0 };
  });

  const platformOf = (d: ActivityDevice): 'ios' | 'android' => (d.platform === 'android' ? 'android' : 'ios');
  const recent = input.devices.filter((d) => dayOf(d.lastSeenAt) >= addDays(today, -29));
  const platforms = { ios: { customers: 0, installs: 0, last30: 0 }, android: { customers: 0, installs: 0, last30: 0 } };
  for (const p of ['ios', 'android'] as const) {
    const mine = input.devices.filter((d) => platformOf(d) === p);
    platforms[p] = { customers: new Set(mine.map((d) => d.userId)).size, installs: mine.length, last30: new Set(recent.filter((d) => platformOf(d) === p).map((d) => d.userId)).size };
  }
  const byVersion = new Map<string, { version: string; platform: 'ios' | 'android'; users: Set<string> }>();
  for (const d of recent) {
    const v = (d.appVersion || '').trim() || 'Not reported';
    const key = `${platformOf(d)}|${v}`;
    if (!byVersion.has(key)) byVersion.set(key, { version: v, platform: platformOf(d), users: new Set() });
    byVersion.get(key)!.users.add(d.userId);
  }
  const versions = [...byVersion.values()].map((x) => ({ version: x.version, platform: x.platform, customers: x.users.size })).sort((a, b) => b.customers - a.customers || b.version.localeCompare(a.version, undefined, { numeric: true }));

  // who is behind each number
  const idsWhere = (test: (d: ActivityDevice) => boolean) => [...new Set(input.devices.filter(test).map((d) => d.userId))];
  const lastSeenOf = new Map<string, string>();
  for (const d of input.devices) {
    const t = new Date(d.lastSeenAt).toISOString();
    if (!lastSeenOf.has(d.userId) || t > lastSeenOf.get(d.userId)!) lastSeenOf.set(d.userId, t);
  }
  const byDayLists: Record<string, string[]> = {};
  const daysOpenedBy = new Map<string, number>();
  for (const day of days) {
    if (!since || day < since) continue;
    byDayLists[day] = [...(perDay.get(day) ?? [])];
    for (const u of byDayLists[day]) daysOpenedBy.set(u, (daysOpenedBy.get(u) ?? 0) + 1);
  }
  const newByDay: Record<string, string[]> = {};
  for (const day of days) newByDay[day] = idsWhere((d) => dayOf(d.firstSeenAt) === day);
  const returningIds: string[] = [];
  if (returning7 !== null) {
    const last7set = new Set(Array.from({ length: 7 }, (_, i) => addDays(today, -i)));
    const seen = new Map<string, Set<string>>();
    for (const r of input.rows) {
      if (!last7set.has(r.day)) continue;
      if (!seen.has(r.userId)) seen.set(r.userId, new Set());
      seen.get(r.userId)!.add(r.day);
    }
    for (const [u, set] of seen) if (set.size >= 2) returningIds.push(u);
  }
  const lists = {
    have: [...customers],
    today: idsWhere((d) => dayOf(d.lastSeenAt) >= today),
    last7: idsWhere((d) => dayOf(d.lastSeenAt) >= addDays(today, -6)),
    last30: idsWhere((d) => dayOf(d.lastSeenAt) >= addDays(today, -29)),
    returning7: returningIds,
    byDay: byDayLists,
    newByDay,
  };
  const everyone = new Set<string>([...lists.have, ...Object.values(byDayLists).flat(), ...returningIds]);
  const people: Record<string, ActivityPerson> = {};
  for (const id of everyone) {
    const u = input.users?.get(id);
    people[id] = { name: String(u?.name ?? '').trim(), email: String(u?.email ?? '').trim(), phone: String(u?.phone ?? '').trim(), lastSeenAt: lastSeenOf.get(id) ?? null, daysOpened: daysOpenedBy.get(id) ?? 0 };
  }

  return {
    generatedAt: input.now.toISOString(),
    today,
    days,
    onApp: { customers: customers.size, installs: input.devices.length },
    platforms,
    active,
    newInstalls,
    daily,
    recordingSince: since,
    returning7,
    orders,
    versions,
    lists,
    people,
  };
}

/** Gathers what the numbers need and builds them. */
export async function loadAppActivity(daysWanted: number): Promise<AppActivity> {
  const now = new Date();
  const days = Math.min(60, Math.max(7, Math.floor(daysWanted) || 14));
  const today = pacificDay(now);
  const from = addDays(today, -(days - 1));

  const devices = (await allDevices(20000)).map((d) => ({ userId: d.userId, installId: d.installId, appVersion: d.appVersion, platform: d.platform, firstSeenAt: d.firstSeenAt, lastSeenAt: d.lastSeenAt }));

  const col = await activity();
  const rows = (await col.find({ day: { $gte: from } } as never, { projection: { userId: 1, installId: 1, day: 1, opens: 1 } }).toArray()) as unknown as ActivityRow[];
  const first = (await col.find({} as never, { projection: { day: 1 } }).sort({ day: 1 }).limit(1).toArray()) as unknown as Array<{ day: string }>;
  const recordingSince = first[0]?.day ?? null;

  // a day's buffer on each side: the Pacific day of an order is worked out in buildAppActivity
  const ordersCol = await db.getCollectionForOperations<Record<string, unknown>>('orders');
  const start = new Date(`${addDays(from, -1)}T00:00:00Z`);
  const orders = (await ordersCol
    .find({ createdAt: { $gte: start }, paymentStatus: 'paid', source: { $ne: 'admin' } } as never, { projection: { createdAt: 1, user: 1, channel: 1, appPlatform: 1 } })
    .toArray()) as unknown as ActivityOrder[];

  // names for the lists: only customers who have the app
  const users = new Map<string, ActivityUser>();
  const objectIds = [...new Set(devices.map((d) => d.userId))].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (objectIds.length > 0) {
    const userCol = await db.getCollectionForOperations<Record<string, unknown>>('users');
    const found = await userCol.find({ _id: { $in: objectIds } } as never, { projection: { name: 1, email: 1, phone: 1 } }).toArray();
    for (const u of found) users.set(String(u._id), { name: u.name as string, email: u.email as string, phone: u.phone as string });
  }

  return buildAppActivity({ now, days, devices, rows, recordingSince, orders, users });
}

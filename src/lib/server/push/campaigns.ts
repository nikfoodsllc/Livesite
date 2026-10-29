import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { pushMode } from './config';
import { cleanVersion } from './appVersion';
import { menuAudience } from './menuAudience';
import { phonesOnOlderVersion, usersWithTokens } from './store';
import { sendPush, type PushSummary } from './send';
import { checkText } from './templates';

const MIN_GAP_MINUTES = 30;

export interface CampaignRow {
  _id: string;
  title: string;
  body: string;
  sentAt: string;
  by: string;
  audience: number;
  sent: number;
  failed: number;
  mode: string;
  /** sent to customers the admin picked by hand */
  selected: boolean;
}

async function campaigns() {
  return db.getCollectionForOperations<Record<string, unknown>>('pushCampaigns');
}

export async function recentCampaigns(limit = 10): Promise<CampaignRow[]> {
  const c = await campaigns();
  const rows = await c.find({} as never).sort({ sentAt: -1 }).limit(limit).toArray();
  return rows.map((r) => ({
    _id: String(r._id),
    title: String(r.title ?? ''),
    body: String(r.body ?? ''),
    sentAt: r.sentAt instanceof Date ? r.sentAt.toISOString() : String(r.sentAt ?? ''),
    by: String(r.byName ?? ''),
    audience: Number(r.audience ?? 0),
    sent: Number(r.sent ?? 0),
    failed: Number(r.failed ?? 0),
    mode: String(r.mode ?? ''),
    selected: r.selected === true,
  }));
}

export type CampaignResult =
  | { ok: true; summary: PushSummary; campaignId: string }
  | { ok: false; status: number; error: string; code?: 'off' | 'recent' | 'nobody' };

/** Sends "the menu is up" (or any text the admin chose) to everyone on the menu alerts list who has the app. */
export async function sendMenuCampaign(input: { title: unknown; body: unknown; adminId: string; adminName?: string; confirmAgain?: boolean }): Promise<CampaignResult> {
  const text = checkText(input.title, input.body);
  if (!text.ok) return { ok: false, status: 400, error: text.error };
  const mode = pushMode();
  if (mode === 'off') return { ok: false, status: 409, code: 'off', error: 'Notifications are switched off on this site (PUSH).' };
  const c = await campaigns();
  if (!input.confirmAgain) {
    const last = await c.findOne({ testOnly: { $ne: true }, mode: 'on' } as never, { sort: { sentAt: -1 } });
    const at = last?.sentAt instanceof Date ? last.sentAt.getTime() : 0;
    if (at && Date.now() - at < MIN_GAP_MINUTES * 60_000) {
      return { ok: false, status: 409, code: 'recent', error: `A menu notification went out ${Math.max(1, Math.round((Date.now() - at) / 60_000))} minutes ago. Send another anyway?` };
    }
  }
  const audience = await menuAudience();
  if (audience.userIds.length === 0) return { ok: false, status: 409, code: 'nobody', error: 'Nobody can get this yet: no customer has the app with notifications on.' };
  const _id = new ObjectId();
  const campaignId = String(_id);
  const summary = await sendPush({ userIds: audience.userIds, kind: 'menu', title: text.title, body: text.body, data: { type: 'menu' }, log: { campaignId, event: 'menu_campaign' } });
  await c.insertOne({ _id, kind: 'menu', title: text.title, body: text.body, sentAt: new Date(), by: input.adminId, byName: input.adminName ?? '', audience: audience.userIds.length, sent: summary.sent, failed: summary.failed, removed: summary.removed, mode: summary.mode, errors: summary.errors } as never);
  return { ok: true, summary, campaignId };
}

/** Most customers one hand-picked send can go to. */
export const MAX_SELECTED = 500;

/** Keeps the picked customers who really have the app with a phone registered; counts the rest. Ids only. */
export function pickSelectedAudience(selected: unknown, withApp: string[]): { userIds: string[]; unavailable: number } {
  const wanted = Array.isArray(selected) ? [...new Set(selected.map((v) => String(v ?? '').trim()).filter(Boolean))] : [];
  const have = new Set(withApp);
  const userIds = wanted.filter((id) => have.has(id)).slice(0, MAX_SELECTED);
  return { userIds, unavailable: wanted.length - userIds.length };
}

/**
 * Sends the admin's text to customers chosen by hand (not the whole list). Only customers with the app and a phone registered can be
 * reached; a customer who switched menu alerts off in the app is skipped, like in a send to everyone (the summary says how many).
 * No "sent a moment ago" guard: a different set of people is a different message.
 */
export async function sendSelectedCampaign(input: { title: unknown; body: unknown; userIds: unknown; adminId: string; adminName?: string }): Promise<CampaignResult & { unavailable?: number }> {
  const text = checkText(input.title, input.body);
  if (!text.ok) return { ok: false, status: 400, error: text.error };
  if (!Array.isArray(input.userIds) || input.userIds.length === 0) return { ok: false, status: 400, error: 'Choose at least one customer.' };
  if (input.userIds.length > MAX_SELECTED) return { ok: false, status: 400, error: `Choose at most ${MAX_SELECTED} customers at a time.` };
  const mode = pushMode();
  if (mode === 'off') return { ok: false, status: 409, code: 'off', error: 'Notifications are switched off on this site (PUSH).' };
  const picked = pickSelectedAudience(input.userIds, await usersWithTokens());
  if (picked.userIds.length === 0) return { ok: false, status: 409, code: 'nobody', error: 'None of the chosen customers can get a notification right now (they need the app with notifications allowed).' };
  const _id = new ObjectId();
  const campaignId = String(_id);
  const summary = await sendPush({ userIds: picked.userIds, kind: 'menu', title: text.title, body: text.body, data: { type: 'menu' }, log: { campaignId, event: 'selected_campaign' } });
  const c = await campaigns();
  await c.insertOne({ _id, kind: 'selected', title: text.title, body: text.body, sentAt: new Date(), by: input.adminId, byName: input.adminName ?? '', audience: picked.userIds.length, sent: summary.sent, failed: summary.failed, removed: summary.removed, mode: summary.mode, errors: summary.errors, selected: true } as never);
  return { ok: true, summary, campaignId, unavailable: picked.unavailable };
}

// ---------------------------------------------------------------------------------------------
// "A new version of the app is ready"
// ---------------------------------------------------------------------------------------------

export const UPDATE_TITLE = 'New NikFoods update';
export const UPDATE_BODY = 'A new version of the app is ready. Update it in the App Store.';

async function appSettingsDoc() {
  return db.getCollectionForOperations<Record<string, unknown>>('appSettings');
}

/** The newest iPhone app version the admin said is on the App Store, or '' when none is set. */
export async function getLatestAppVersion(): Promise<string> {
  const col = await appSettingsDoc();
  const doc = (await col.findOne({ key: 'app' } as never)) as { latestVersion?: unknown } | null;
  return cleanVersion(doc?.latestVersion) ?? '';
}

export async function setLatestAppVersion(input: unknown, adminId: string): Promise<{ ok: true; value: string } | { ok: false; error: string }> {
  const raw = typeof input === 'string' ? input.trim() : '';
  const value = raw === '' ? '' : cleanVersion(raw);
  if (value === null) return { ok: false, error: 'Write the version like 1.0.3' };
  const col = await appSettingsDoc();
  await col.updateOne({ key: 'app' } as never, { $set: { latestVersion: value, updatedAt: new Date(), updatedBy: adminId }, $setOnInsert: { key: 'app' } } as never, { upsert: true });
  return { ok: true, value };
}

/** Who is on an older version than `latest`: phones, and the customers behind them. */
export async function updateAudience(latest: string): Promise<{ phones: number; customers: number; allPhones: number }> {
  if (!latest) return { phones: 0, customers: 0, allPhones: 0 };
  const older = await phonesOnOlderVersion(latest);
  const allCustomers = await usersWithTokens();
  return { phones: older.length, customers: new Set(older.map((p) => p.userId)).size, allPhones: allCustomers.length };
}

/** Sends "update the app" to the phones that are on a version older than the one the admin saved. Tapping it opens the App Store. */
export async function sendUpdateCampaign(input: { title?: unknown; body?: unknown; adminId: string; adminName?: string; confirmAgain?: boolean }): Promise<CampaignResult> {
  const text = checkText(input.title || UPDATE_TITLE, input.body || UPDATE_BODY);
  if (!text.ok) return { ok: false, status: 400, error: text.error };
  const latest = await getLatestAppVersion();
  if (!latest) return { ok: false, status: 409, error: 'Save the newest app version first.' };
  const mode = pushMode();
  if (mode === 'off') return { ok: false, status: 409, code: 'off', error: 'Notifications are switched off on this site (PUSH).' };
  const c = await campaigns();
  if (!input.confirmAgain) {
    const last = await c.findOne({ kind: 'update', testOnly: { $ne: true }, mode: 'on' } as never, { sort: { sentAt: -1 } });
    const at = last?.sentAt instanceof Date ? last.sentAt.getTime() : 0;
    if (at && Date.now() - at < MIN_GAP_MINUTES * 60_000) {
      return { ok: false, status: 409, code: 'recent', error: `An update notification went out ${Math.max(1, Math.round((Date.now() - at) / 60_000))} minutes ago. Send another anyway?` };
    }
  }
  const older = await phonesOnOlderVersion(latest);
  if (older.length === 0) return { ok: false, status: 409, code: 'nobody', error: `Every phone with the app is already on ${latest} or newer.` };
  const userIds = [...new Set(older.map((p) => p.userId))];
  const _id = new ObjectId();
  const campaignId = String(_id);
  const summary = await sendPush({ userIds, kind: 'updates', title: text.title, body: text.body, data: { type: 'update' }, onlyTokens: older.map((p) => p.token), log: { campaignId, event: 'update_campaign' } });
  await c.insertOne({ _id, kind: 'update', title: text.title, body: text.body, latestVersion: latest, sentAt: new Date(), by: input.adminId, byName: input.adminName ?? '', audience: userIds.length, sent: summary.sent, failed: summary.failed, mode: summary.mode } as never);
  return { ok: true, summary, campaignId };
}


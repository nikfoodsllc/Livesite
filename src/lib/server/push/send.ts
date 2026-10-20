import { db } from '@/lib/server/db';
import { pushMode, wants, type PushKind, type PushMode } from './config';
import { isDeadTokenError, sendExpoMessages, type PushMessage } from './expo';
import { prefsForUsers, removeTokens, tokensForUsers } from './store';

export interface PushSummary {
  mode: PushMode;
  /** customers asked about */
  users: number;
  /** of them, how many allow this kind of message */
  allowed: number;
  /** phones the message went to (or would go to in dry mode) */
  tokens: number;
  sent: number;
  failed: number;
  /** phones Expo said are gone, now forgotten */
  removed: number;
  /** most common failure codes, for the admin */
  errors: Record<string, number>;
}

export interface PushRequest {
  userIds: string[];
  kind: PushKind;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** For an admin's test message: send to the customer's phones whatever they chose in settings */
  ignorePrefs?: boolean;
  /** What this message belongs to, written in the log (never who it went to) */
  log?: { orderId?: string; campaignId?: string; event?: string };
}

const emptySummary = (mode: PushMode, users: number): PushSummary => ({ mode, users, allowed: 0, tokens: 0, sent: 0, failed: 0, removed: 0, errors: {} });

/**
 * Sends one message to customers: only those who allow this kind of message, to every phone they registered.
 * Writes one line in `pushEvents` (counts only). Never throws: a push is an extra, it must not break an order.
 */
export async function sendPush(req: PushRequest): Promise<PushSummary> {
  const mode = pushMode();
  const userIds = [...new Set(req.userIds.filter(Boolean).map(String))];
  const summary = emptySummary(mode, userIds.length);
  if (mode === 'off' || userIds.length === 0) return summary;
  try {
    const prefs = await prefsForUsers(userIds);
    const allowedUsers = req.ignorePrefs ? userIds : userIds.filter((id) => wants(prefs.get(id), req.kind));
    summary.allowed = allowedUsers.length;
    const list = await tokensForUsers(allowedUsers);
    summary.tokens = list.length;
    if (list.length > 0 && mode === 'on') {
      const messages: PushMessage[] = list.map((t) => ({ to: t.token, title: req.title, body: req.body, data: { ...(req.data ?? {}), kind: req.kind } }));
      const tickets = await sendExpoMessages(messages);
      const dead: string[] = [];
      tickets.forEach((t, i) => {
        if (t.ok) summary.sent += 1;
        else {
          summary.failed += 1;
          const code = t.error ?? 'Unknown';
          summary.errors[code] = (summary.errors[code] ?? 0) + 1;
          if (isDeadTokenError(t.error)) dead.push(list[i].token);
        }
      });
      if (dead.length > 0) summary.removed = await removeTokens(dead);
    }
    await db
      .getCollectionForOperations<Record<string, unknown>>('pushEvents')
      .then((c) => c.insertOne({ kind: req.kind, ...req.log, ...summary, createdAt: new Date() } as never))
      .catch(() => undefined);
  } catch (error) {
    console.error('[push] send failed', error instanceof Error ? error.message : String(error));
  }
  return summary;
}

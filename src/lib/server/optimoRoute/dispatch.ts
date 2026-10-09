import { db } from '@/lib/server/db';
import { optimoMode } from './config';
import { dispatchStatus, plannedStopCount, sendRoutes } from './client';
import { decideDispatch, type DispatchRecord } from './dispatchRules';
import { pacificToday } from './sync';

/**
 * Sends today's routes to the drivers and the customers' notifications at 10:00 AM Pacific (user decision 2026-10-08, which
 * reverses the earlier "never notify customers"). One call to OptimoRoute does both. It never overrides a send that is
 * already scheduled in OptimoRoute's own app, and it never sends twice (our record `optimoDispatches` per date, plus
 * OptimoRoute's own state).
 *
 *   OPTIMOROUTE_SEND unset or 'off'  nothing is sent (the default)
 *   OPTIMOROUTE_SEND=dry             only reports what it would do
 *   OPTIMOROUTE_SEND=on              sends (also needs OPTIMOROUTE_SYNC=on)
 */
const DISPATCHES = 'optimoDispatches';

export type SendMode = 'off' | 'dry' | 'on';

export function sendMode(env: Record<string, string | undefined> = process.env): SendMode {
  if (optimoMode(env) !== 'on') return 'off';
  const flag = (env.OPTIMOROUTE_SEND ?? 'off').trim().toLowerCase();
  return flag === 'on' ? 'on' : flag === 'dry' ? 'dry' : 'off';
}

export interface DispatchReport {
  mode: SendMode;
  date: string;
  action: string;
  routesState?: string;
  plannedStops?: number;
  error?: string;
}

export async function runAutoDispatch(now: Date = new Date()): Promise<DispatchReport> {
  const mode = sendMode();
  const date = pacificToday(now);
  const report: DispatchReport = { mode, date, action: 'nothing' };
  if (mode === 'off') return report;
  try {
    const col = await db.getCollectionForOperations<DispatchRecord & { lastError?: string; sentAt?: Date; updatedAt?: Date; unplanned?: number }>(DISPATCHES);
    await col.createIndex({ date: 1 }, { unique: true }).catch(() => undefined);
    const record = (await col.findOne({ date })) as DispatchRecord | null;
    if (record && record.state !== 'failed') {
      report.action = 'nothing:done';
      return report;
    }
    const status = await dispatchStatus(date);
    if (!status.ok) {
      report.action = 'nothing:status_unavailable';
      report.error = `${status.code ?? ''} ${status.message ?? ''}`.trim();
      return report;
    }
    const planned = await plannedStopCount(date);
    report.routesState = status.data?.routes?.state;
    report.plannedStops = planned.data ?? 0;
    const action = decideDispatch({ now, routesState: status.data?.routes?.state, scheduledForUtc: status.data?.routes?.scheduledForUtc, plannedStops: planned.data ?? 0, record });
    if (action.do === 'nothing') {
      report.action = `nothing:${action.why}`;
      if (mode === 'on' && action.why === 'sent_already') await col.updateOne({ date }, { $set: { state: 'already', updatedAt: now }, $setOnInsert: { attempts: 0 } }, { upsert: true });
      return report;
    }
    if (action.do === 'missed') {
      report.action = 'missed';
      console.error('[optimoroute] routes were not sent by noon and nothing is scheduled', { date });
      if (mode === 'on') await col.updateOne({ date }, { $set: { state: 'missed', updatedAt: now }, $setOnInsert: { attempts: 0 } }, { upsert: true });
      return report;
    }
    report.action = 'send';
    if (mode === 'dry') return report;
    // claim the send first, so two overlapping calls cannot both send (customers would be notified twice)
    const claimed = await col.findOneAndUpdate(
      record
        ? { date, state: 'failed', $or: [{ lastError: { $ne: 'sending' } }, { updatedAt: { $lt: new Date(now.getTime() - 5 * 60_000) } }] }
        : { date },
      { $set: { state: 'failed', updatedAt: now, lastError: 'sending' }, $inc: { attempts: 1 } },
      { upsert: !record, returnDocument: 'after' }
    ).catch(() => null);
    if (!claimed) {
      report.action = 'nothing:claimed_elsewhere';
      return report;
    }
    const sent = await sendRoutes(date, true);
    if (sent.ok || sent.code === 'ERR_NOTHING_TO_SEND') {
      await col.updateOne({ date }, { $set: { state: sent.ok ? 'sent' : 'already', sentAt: now, updatedAt: now }, $unset: { lastError: '' } });
      report.action = sent.ok ? 'sent' : 'nothing:nothing_to_send';
    } else {
      const error = `${sent.code ?? ''} ${sent.message ?? ''}`.trim().slice(0, 300);
      await col.updateOne({ date }, { $set: { state: 'failed', lastError: error, updatedAt: now } });
      console.error('[optimoroute] could not send the routes', { date, error });
      report.action = 'failed';
      report.error = error;
    }
    return report;
  } catch (error) {
    console.error('[optimoroute] dispatch step failed', { date, error: error instanceof Error ? error.message : String(error) });
    return { ...report, action: 'error', error: 'dispatch step failed' };
  }
}

export async function dispatchRecord(date: string): Promise<unknown> {
  const col = await db.getCollectionForOperations<Record<string, unknown>>(DISPATCHES);
  return col.findOne({ date }, { projection: { _id: 0 } });
}

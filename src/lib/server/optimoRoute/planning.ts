import { db } from '@/lib/server/db';
import { addDays } from '@/lib/orderReschedule';
import { optimoMode } from './config';
import { driversWithRoutes, plannedStopCount, planningStatus, startPlanning } from './client';
import { decidePlan, planOutcome, type PlanRecord } from './planningRules';
import { pacificToday } from './sync';

/**
 * Automatic route planning (user decision 2026-10-08): the routes of tomorrow's deliveries are planned once, shortly after
 * 5 PM Pacific, with the drivers OptimoRoute has available that day. PLANNING ONLY: routes are never sent to drivers and no
 * customer is notified (the team reviews and sends them in OptimoRoute). Late stops are placed with existing routes kept.
 *
 *   OPTIMOROUTE_PLAN unset or 'off'  nothing planned (the default)
 *   OPTIMOROUTE_PLAN=dry             only reports what it would do
 *   OPTIMOROUTE_PLAN=on              plans (also needs OPTIMOROUTE_SYNC=on, because the stops must be in OptimoRoute)
 *
 * Our record per day is the `optimoPlans` collection (one document per date).
 */
const PLANS = 'optimoPlans';
const STOPS = 'optimoStops';

export type PlanMode = 'off' | 'dry' | 'on';

export function planMode(env: Record<string, string | undefined> = process.env): PlanMode {
  const sync = optimoMode(env);
  if (sync !== 'on') return 'off';
  const flag = (env.OPTIMOROUTE_PLAN ?? 'off').trim().toLowerCase();
  return flag === 'on' ? 'on' : flag === 'dry' ? 'dry' : 'off';
}

export interface PlanReport {
  mode: PlanMode;
  date: string;
  action: string;
  planningId?: number;
  state?: string;
  error?: string;
}

async function plansCollection() {
  const c = await db.getCollectionForOperations<PlanRecord & { planningId?: number; lastError?: string; lock?: { at: Date }; updatedAt?: Date }>(PLANS);
  await c.createIndex({ date: 1 }, { unique: true }).catch(() => undefined);
  return c;
}

async function stopCounts(date: string, since?: Date): Promise<{ total: number; fresh: number }> {
  const stops = await db.getCollectionForOperations<{ date: string; state: string; updatedAt?: Date }>(STOPS);
  const total = await stops.countDocuments({ date, state: { $in: ['sent', 'adopted'] } });
  // stops WE sent after the last plan finished; adopted ones are the team's own entries
  const fresh = since ? await stops.countDocuments({ date, state: 'sent', updatedAt: { $gt: since } }) : 0;
  return { total, fresh };
}

/**
 * The drivers to plan with. OptimoRoute's API cannot list the drivers of a day, so they are (1) OPTIMOROUTE_DRIVERS, a comma
 * separated list of driver serial numbers, if set, otherwise (2) the drivers that had a route on the most recent day before
 * this one that has routes (looking back up to 14 days): the team that has been delivering.
 */
export async function driversToPlanWith(date: string, env: Record<string, string | undefined> = process.env): Promise<{ serials: string[]; error?: string }> {
  const fixed = (env.OPTIMOROUTE_DRIVERS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (fixed.length > 0) return { serials: fixed };
  for (let back = 1; back <= 14; back++) {
    const found = await driversWithRoutes(addDays(date, -back));
    if (!found.ok) return { serials: [], error: `${found.code ?? ''} ${found.message ?? ''}`.trim() || 'could not read the routes' };
    if ((found.data ?? []).length > 0) return { serials: found.data ?? [] };
  }
  return { serials: [], error: 'No route in the last 14 days to learn the drivers from. Set OPTIMOROUTE_DRIVERS (driver serial numbers, comma separated).' };
}

/** Plans one date now (or advances a running plan). `force` skips the time-of-day rule (admin button, tests). */
export async function planDate(date: string, options: { now?: Date; force?: boolean; onlyAdvance?: boolean } = {}): Promise<PlanReport> {
  const mode = planMode();
  const report: PlanReport = { mode, date, action: 'nothing' };
  if (mode === 'off') return report;
  const now = options.now ?? new Date();
  const plans = await plansCollection();
  const record = (await plans.findOne({ date })) as (PlanRecord & { planningId?: number }) | null;
  const counts = await stopCounts(date, record?.finishedAt);
  const action = decidePlan({ now, record, stopCount: counts.total, newStopsSinceFinish: counts.fresh, ignoreTime: options.force });
  // a plan that is still running is followed to its end, but a day is only STARTED the evening before (never on its delivery day)
  if (options.onlyAdvance && action.do === 'start') {
    report.action = 'nothing:not_started_today';
    return report;
  }

  if (action.do === 'check_running') {
    const status = await planningStatus(record!.planningId ?? 0);
    const outcome = planOutcome(status.data?.status, record!.startedAt, now);
    report.action = `check:${outcome}`;
    report.planningId = record!.planningId;
    if (mode === 'dry') return report;
    if (outcome === 'finished') await plans.updateOne({ date }, { $set: { state: 'finished', finishedAt: now, updatedAt: now } });
    else if (outcome === 'failed') await plans.updateOne({ date }, { $set: { state: 'failed', lastError: `OptimoRoute status ${status.data?.status ?? status.code ?? 'unknown'}`, updatedAt: now }, $inc: { failures: 1 } });
    report.state = outcome;
    return report;
  }
  if (action.do === 'nothing') {
    report.action = `nothing:${action.why}`;
    return report;
  }
  report.action = `start:${action.why}`;
  // the stops are all on routes already (the team planned the day by hand): nothing to place, so leave their routes alone
  const planned = await plannedStopCount(date);
  if (planned.ok && (planned.data ?? 0) >= counts.total && counts.total > 0) {
    report.action = 'nothing:already_planned';
    if (mode === 'on' && !record) await plans.updateOne({ date }, { $set: { state: 'finished', finishedAt: now, updatedAt: now, byHand: true }, $setOnInsert: { runs: 0, failures: 0 } }, { upsert: true });
    return report;
  }
  if (mode === 'dry') return report;

  // claim the run so two overlapping cron calls cannot both start a plan
  const claimed = await plans.findOneAndUpdate(
    { date, $or: [{ lock: { $exists: false } }, { 'lock.at': { $lt: new Date(now.getTime() - 120_000) } }], ...(record ? { state: { $ne: 'running' } } : {}) },
    { $set: { lock: { at: now }, updatedAt: now }, $setOnInsert: { runs: 0, failures: 0 } },
    { upsert: true, returnDocument: 'after' }
  ).catch(() => null);
  if (!claimed) {
    report.action = 'nothing:claimed_elsewhere';
    return report;
  }
  const drivers = await driversToPlanWith(date);
  const started = drivers.serials.length > 0 ? await startPlanning(date, drivers.serials) : { ok: false as const, code: 'NO_DRIVERS', message: drivers.error, data: undefined };
  if (!started.ok || !started.data?.planningId) {
    const error = `${started.code ?? ''} ${started.message ?? ''}`.trim().slice(0, 300) || 'start_planning failed';
    await plans.updateOne({ date }, { $set: { state: 'failed', lastError: error, updatedAt: now }, $inc: { runs: 1, failures: 1 }, $unset: { lock: '' } });
    console.error('[optimoroute] planning could not start', { date, error });
    report.state = 'failed';
    report.error = error;
    return report;
  }
  await plans.updateOne({ date }, { $set: { state: 'running', planningId: started.data.planningId, startedAt: now, updatedAt: now }, $inc: { runs: 1 }, $unset: { lock: '', lastError: '' } });
  report.state = 'running';
  report.planningId = started.data.planningId;
  return report;
}

/** The cron step: tomorrow's routes (and today's plan, if it is still running). Never throws. */
export async function runAutoPlanning(now: Date = new Date()): Promise<PlanReport[]> {
  if (planMode() === 'off') return [];
  const reports: PlanReport[] = [];
  const today = pacificToday(now);
  for (const date of [today, addDays(today, 1)]) {
    try {
      reports.push(await planDate(date, { now, onlyAdvance: date === today }));
    } catch (error) {
      console.error('[optimoroute] planning step failed', { date, error: error instanceof Error ? error.message : String(error) });
      reports.push({ mode: planMode(), date, action: 'error', error: 'planning step failed' });
    }
  }
  return reports;
}

export async function planRecord(date: string): Promise<unknown> {
  const plans = await plansCollection();
  return plans.findOne({ date }, { projection: { _id: 0 } });
}

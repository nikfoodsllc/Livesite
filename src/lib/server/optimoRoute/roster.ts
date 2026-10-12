import { db } from '@/lib/server/db';
import { addDays } from '@/lib/orderReschedule';
import { optimoMode } from './config';
import { routesForDate } from './client';
import { rosterSignature, type RosterRoute } from './rosterRules';
import { pacificToday } from './sync';

/**
 * Keeps a copy of the roster (the drivers and their stops, in route order) of today and tomorrow, taken from OptimoRoute
 * after it has planned the routes (the 30-minute cron step runs this). The Packing Report in the admin reads this copy,
 * so it is the same for everyone and is there at 10 AM when packing starts. READ ONLY towards OptimoRoute.
 *
 * Collection `optimoRosters`, one document per delivery date:
 *   { date, routes, signature, fetchedAt, changedAt }
 * `fetchedAt` = the last time OptimoRoute was asked, `changedAt` = the last time the drivers or stops were different.
 */
const ROSTERS = 'optimoRosters';

export interface RosterRecord {
  date: string;
  routes: RosterRoute[];
  signature: string;
  fetchedAt: Date;
  changedAt: Date;
}

async function rosters() {
  const c = await db.getCollectionForOperations<RosterRecord>(ROSTERS);
  await c.createIndex({ date: 1 }, { unique: true }).catch(() => undefined);
  return c;
}

export interface RosterReport {
  date: string;
  action: 'saved' | 'unchanged' | 'no_routes' | 'error';
  routes?: number;
  stops?: number;
  error?: string;
}

/** Asks OptimoRoute for one day's routes and saves them (nothing is saved when the day has no routes yet). */
export async function snapshotRoster(date: string, now: Date = new Date()): Promise<RosterReport> {
  const result = await routesForDate(date);
  if (!result.ok) return { date, action: 'error', error: `${result.code ?? ''} ${result.message ?? ''}`.trim().slice(0, 200) || 'could not read the routes' };
  const routes = result.data ?? [];
  if (routes.length === 0) return { date, action: 'no_routes', routes: 0, stops: 0 };
  const signature = rosterSignature(routes);
  const stops = routes.reduce((sum, r) => sum + r.stops.length, 0);
  const collection = await rosters();
  const previous = await collection.findOne({ date }, { projection: { signature: 1 } });
  const changed = !previous || previous.signature !== signature;
  await collection.updateOne(
    { date },
    { $set: { routes, signature, fetchedAt: now, ...(changed ? { changedAt: now } : {}) }, $setOnInsert: { date } },
    { upsert: true }
  );
  return { date, action: changed ? 'saved' : 'unchanged', routes: routes.length, stops };
}

/** The cron step: today's and tomorrow's roster. Never throws. A no-op unless OPTIMOROUTE_SYNC is on. */
export async function runRosterSnapshots(now: Date = new Date()): Promise<RosterReport[]> {
  if (optimoMode() !== 'on') return [];
  const today = pacificToday(now);
  const reports: RosterReport[] = [];
  for (const date of [today, addDays(today, 1)]) {
    try {
      reports.push(await snapshotRoster(date, now));
    } catch (error) {
      console.error('[optimoroute] roster step failed', { date, error: error instanceof Error ? error.message : String(error) });
      reports.push({ date, action: 'error', error: 'roster step failed' });
    }
  }
  return reports;
}

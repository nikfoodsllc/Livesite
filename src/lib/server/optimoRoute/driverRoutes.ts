import { db } from '@/lib/server/db';
import { getRoutesRaw } from './client';
import { pacificToday } from './sync';

/**
 * Planned routes per day for the admin Dashboard's driver pay: for each route the driver, the planned time (OptimoRoute's route
 * `duration`, minutes) and the number of stops. Read only towards OptimoRoute. Days before today are kept in `optimoRouteDays`
 * after the first read (a finished day does not change), so a long range only asks OptimoRoute for days it has not seen.
 */
export interface DriverRoute {
  date: string;
  driverName: string;
  driverSerial: string;
  plannedMinutes: number;
  deliveries: number;
}

interface DayRecord {
  date: string;
  routes: DriverRoute[];
  savedAt: Date;
}

const COLLECTION = 'optimoRouteDays';
const PARALLEL = 3; // OptimoRoute allows 5 calls at once per account; the sync may be using some

export function routesFromRaw(date: string, raw: Array<{ driverName?: unknown; driverSerial?: unknown; duration?: unknown; stops?: unknown[] }> | undefined): DriverRoute[] {
  return (raw ?? [])
    .map((r) => ({
      date,
      driverName: typeof r.driverName === 'string' ? r.driverName.trim() : '',
      driverSerial: r.driverSerial === undefined || r.driverSerial === null ? '' : String(r.driverSerial),
      plannedMinutes: Number.isFinite(Number(r.duration)) ? Math.max(0, Number(r.duration)) : 0,
      deliveries: Array.isArray(r.stops) ? r.stops.length : 0,
    }))
    .filter((r) => r.deliveries > 0);
}

function daysOf(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to && days.length < 400; d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
  return days;
}

export async function driverRoutes(from: string, to: string): Promise<{ ok: true; routes: DriverRoute[] } | { ok: false; error: string }> {
  const today = pacificToday();
  const days = daysOf(from, to).filter((d) => d <= today);
  const c = await db.getCollectionForOperations<DayRecord>(COLLECTION);
  const saved = new Map((await c.find({ date: { $in: days } }).toArray()).map((r) => [r.date, r.routes]));
  const missing = days.filter((d) => !saved.has(d));
  const fetched = new Map<string, DriverRoute[]>();
  let failure: string | null = null;
  for (let i = 0; i < missing.length && !failure; i += PARALLEL) {
    await Promise.all(missing.slice(i, i + PARALLEL).map(async (date) => {
      const result = await getRoutesRaw(date);
      if (!result.ok) {
        failure = result.code === 'NO_KEY' ? 'OptimoRoute is not connected on this site.' : `OptimoRoute did not answer (${result.code ?? 'error'}).`;
        return;
      }
      fetched.set(date, routesFromRaw(date, result.data?.routes));
    }));
  }
  if (failure) return { ok: false, error: failure };
  const finished = [...fetched].filter(([date]) => date < today);
  if (finished.length > 0) {
    await c.bulkWrite(finished.map(([date, routes]) => ({ updateOne: { filter: { date }, update: { $set: { date, routes, savedAt: new Date() } }, upsert: true } })));
  }
  const routes = days.flatMap((d) => saved.get(d) ?? fetched.get(d) ?? []);
  return { ok: true, routes };
}

/**
 * When the routes of a delivery day are planned, as pure rules (no database, no OptimoRoute) so they can be tested.
 *
 * Routes for tomorrow are planned once, shortly after the 5 PM Pacific cutoff of the flat items. After that, any stop added
 * later (a late admin-entered order) is placed with the same routes kept (a top-up). Nothing is ever planned for a day
 * that has no stops, and a failed plan is retried a few times.
 */
export const PLAN_AFTER_MINUTES = 17 * 60 + 10; // 5:10 PM Pacific
export const MAX_RUNS_PER_DAY = 6;
export const MAX_FAILED_TRIES = 3;
export const STALE_RUNNING_MS = 25 * 60 * 1000;

export type PlanState = 'running' | 'finished' | 'failed';

export interface PlanRecord {
  date: string;
  state: PlanState;
  runs: number;
  failures: number;
  startedAt?: Date;
  finishedAt?: Date;
}

export type PlanAction =
  | { do: 'nothing'; why: 'before_time' | 'no_stops' | 'done' | 'running' | 'gave_up' }
  | { do: 'start'; why: 'first' | 'top_up' | 'retry' }
  | { do: 'check_running' };

/** Minutes after midnight in Pacific time. */
export function pacificMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get('hour') * 60 + get('minute');
}

/**
 * What to do for one delivery day.
 * `stopCount`: stops OptimoRoute has for the day (ours: sent or adopted). `newStopsSinceFinish`: stops we sent after the last
 * plan finished (not the ones the team entered by hand).
 */
export function decidePlan(args: { now: Date; record: PlanRecord | null; stopCount: number; newStopsSinceFinish: number; ignoreTime?: boolean }): PlanAction {
  const { now, record, stopCount, newStopsSinceFinish } = args;
  if (record?.state === 'running') {
    return { do: 'check_running' };
  }
  if (!args.ignoreTime && pacificMinutes(now) < PLAN_AFTER_MINUTES) return { do: 'nothing', why: 'before_time' };
  if (stopCount === 0) return { do: 'nothing', why: 'no_stops' };
  if (!record) return { do: 'start', why: 'first' };
  if (record.runs >= MAX_RUNS_PER_DAY) return { do: 'nothing', why: 'gave_up' };
  if (record.state === 'failed') return record.failures >= MAX_FAILED_TRIES ? { do: 'nothing', why: 'gave_up' } : { do: 'start', why: 'retry' };
  if (record.state === 'finished') return newStopsSinceFinish > 0 ? { do: 'start', why: 'top_up' } : { do: 'nothing', why: 'done' };
  return { do: 'nothing', why: 'done' };
}

/** What a status answer from OptimoRoute means for a running plan. */
export function planOutcome(status: string | undefined, startedAt: Date | undefined, now: Date): 'running' | 'finished' | 'failed' {
  if (status === 'F') return 'finished';
  if (status === 'E' || status === 'C') return 'failed';
  if (startedAt && now.getTime() - startedAt.getTime() > STALE_RUNNING_MS) return 'failed';
  return 'running';
}

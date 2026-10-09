import { pacificMinutes } from './planningRules';

/**
 * When the routes of a delivery day are sent to the drivers (and the customers are notified), as pure rules.
 *
 * The send happens at 10:00 AM Pacific on the delivery day. OptimoRoute can also send on a schedule that someone sets in its
 * own app: if the day is already scheduled or sent there, this does nothing, so nobody is notified twice. If the clock is
 * past 10:00 and nothing is scheduled or sent, it sends (up to noon; later than that the day is left alone and flagged).
 */
export const SEND_AT_MINUTES = 10 * 60;
export const SEND_UNTIL_MINUTES = 12 * 60;
export const MAX_SEND_TRIES = 3;
/** A schedule that is still 'scheduled' this long after its time is treated as stuck */
export const STUCK_SCHEDULE_MS = 30 * 60 * 1000;

export interface DispatchRecord {
  date: string;
  state: 'sent' | 'failed' | 'missed' | 'already';
  attempts: number;
}

export type DispatchAction =
  | { do: 'nothing'; why: 'before_time' | 'sent_already' | 'scheduled_in_optimoroute' | 'no_routes' | 'done' | 'gave_up' }
  | { do: 'send' }
  | { do: 'missed' };

export function decideDispatch(args: {
  now: Date;
  /** OptimoRoute's own state of the day's routes: not_sent, scheduled or sent */
  routesState: string | undefined;
  scheduledForUtc?: string | null;
  /** stops that are on a driver's route today */
  plannedStops: number;
  record: DispatchRecord | null;
}): DispatchAction {
  const { now, routesState, scheduledForUtc, plannedStops, record } = args;
  if (record && (record.state === 'sent' || record.state === 'already' || record.state === 'missed')) return { do: 'nothing', why: 'done' };
  if (routesState === 'sent') return { do: 'nothing', why: 'sent_already' };
  const minutes = pacificMinutes(now);
  if (minutes < SEND_AT_MINUTES) return { do: 'nothing', why: 'before_time' };
  if (routesState === 'scheduled') {
    const at = scheduledForUtc ? Date.parse(scheduledForUtc.endsWith('Z') ? scheduledForUtc : `${scheduledForUtc}Z`) : NaN;
    const stuck = Number.isFinite(at) && now.getTime() - at > STUCK_SCHEDULE_MS;
    if (!stuck) return { do: 'nothing', why: 'scheduled_in_optimoroute' };
  }
  if (plannedStops === 0) return { do: 'nothing', why: 'no_routes' };
  if (minutes >= SEND_UNTIL_MINUTES) return { do: 'missed' };
  if (record && record.attempts >= MAX_SEND_TRIES) return { do: 'nothing', why: 'gave_up' };
  return { do: 'send' };
}

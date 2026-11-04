import { pacificMinutes } from './planningRules';

/**
 * When the team hears about a delivery stop that could not be created in OptimoRoute.
 *  - first:    the moment a stop is seen failed
 *  - reminder: from 7 PM Pacific the evening before delivery (an hour before the 8 PM planning), if still not fixed
 *  - urgent:   from 7 AM Pacific on delivery day (an hour before the 8 AM planning cut-off), if still not fixed
 *  - fixed:    once, when a stop that was reported finally goes through
 * Each is sent once per stop.
 */
export type StopAlertKind = 'first' | 'reminder' | 'urgent' | 'fixed';

export const REMINDER_FROM_MINUTES = 19 * 60;
export const URGENT_FROM_MINUTES = 7 * 60;
/** Routes are sent to drivers at 10 AM, so an "urgent" after that is only noise. */
export const URGENT_UNTIL_MINUTES = 10 * 60;

export interface StopAlertState {
  first?: Date | string | null;
  reminder?: Date | string | null;
  urgent?: Date | string | null;
  fixed?: Date | string | null;
}

const dayBefore = (date: string): string => new Date(Date.parse(`${date}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

/** Which email a FAILED stop (delivery `date`, Pacific today `today`) is due, if any. */
export function dueForFailedStop(args: { date: string; today: string; now: Date; alerts?: StopAlertState }): StopAlertKind | null {
  const { date, today, now, alerts = {} } = args;
  if (date < today) return null; // a day that is over
  const minutes = pacificMinutes(now);
  if (date === today && minutes >= URGENT_FROM_MINUTES && minutes < URGENT_UNTIL_MINUTES && !alerts.urgent) return alerts.first || alerts.reminder ? 'urgent' : 'first';
  if (today === dayBefore(date) && minutes >= REMINDER_FROM_MINUTES && !alerts.reminder && alerts.first) return 'reminder';
  if (!alerts.first) return 'first';
  return null;
}

/** A stop that was reported and has since gone through is announced fixed once. */
export function fixedDue(args: { state: string; alerts?: StopAlertState }): boolean {
  const { state, alerts = {} } = args;
  return (state === 'sent' || state === 'adopted') && !!alerts.first && !alerts.fixed;
}

/** What went wrong, in words for the person who has to fix it. */
export function plainReason(error: string | undefined): string {
  const text = (error ?? '').trim();
  if (/GEOCOD/i.test(text)) return "OptimoRoute could not find the address exactly. Check the street, city and zip.";
  if (/ERR_LOC|LOCATION|ADDRESS/i.test(text)) return 'OptimoRoute did not accept the address. Check the street, city and zip.';
  if (/PHONE/i.test(text)) return 'OptimoRoute did not accept the phone number.';
  if (/ERR_AUTH|API key|KEY/i.test(text)) return 'The OptimoRoute connection was refused (key problem). Tell Shrey.';
  if (/timeout|network|fetch|50\d|ECONN|unavailable/i.test(text)) return 'OptimoRoute could not be reached. We keep trying every 30 minutes.';
  return text ? 'OptimoRoute rejected the stop.' : 'The stop could not be created.';
}

/** The words that say how much time is left, for the footer line of the email. */
export const PLANNING_NOTE = 'Routes are planned at 8 PM the evening before and sent to drivers at 10 AM.';

/** A problem on OptimoRoute's side that usually clears by itself: the team is told only if it lasts (3 tries, about an hour). */
export function isTransientError(error: string | undefined): boolean {
  return /timeout|network|fetch|50\d|ECONN|unavailable|ERR_RATE|429/i.test(error ?? '');
}
export const TRANSIENT_ATTEMPTS_BEFORE_ALERT = 3;

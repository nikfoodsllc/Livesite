/**
 * Order cutoff helpers: when does ordering for a delivery date close?
 *
 * The standard rule is 1:00 PM Pacific on the day before the delivery date. An admin can set a custom
 * cutoff for one date (`cutoffAt`, an absolute moment) to close earlier or to extend / reopen it.
 *
 * Pure functions with no imports, so they can be tested on their own. Dates are 'YYYY-MM-DD' strings
 * (the delivery date in Pacific time), moments are `Date` objects.
 */

export const CUTOFF_TIMEZONE = 'America/Los_Angeles';
/** Standard cutoff: this hour (24h clock, Pacific) on the day before the delivery date. */
export const DEFAULT_CUTOFF_HOUR = 13;

const DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

/** The 'YYYY-MM-DD' part of a date string (also accepts a full ISO string), or null if it is not one. */
export function normalizeDateString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const head = value.trim().slice(0, 10);
  return DATE_PATTERN.test(head) ? head : null;
}

/** How many ms the zone is ahead of UTC at this moment (negative for Pacific). */
function zoneOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The moment at which the wall clock in `timeZone` reads this date and time (daylight saving aware). */
export function zonedWallTimeToInstant(dateString: string, hour: number, minute = 0, timeZone = CUTOFF_TIMEZONE): Date {
  const match = DATE_PATTERN.exec(dateString);
  if (!match) throw new Error(`Invalid date: ${dateString}`);
  const guess = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour, minute);
  let instant = guess - zoneOffsetMs(new Date(guess), timeZone);
  // the offset can differ at the corrected moment (around a daylight saving change): settle on it
  instant = guess - zoneOffsetMs(new Date(instant), timeZone);
  return new Date(instant);
}

/** The calendar day before `dateString`. */
export function previousDay(dateString: string): string {
  const match = DATE_PATTERN.exec(dateString);
  if (!match) throw new Error(`Invalid date: ${dateString}`);
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) - 1));
  return d.toISOString().slice(0, 10);
}

/** The standard cutoff for a delivery date: 1:00 PM Pacific on the day before. */
export function defaultCutoffInstant(deliveryDate: string): Date {
  return zonedWallTimeToInstant(previousDay(deliveryDate), DEFAULT_CUTOFF_HOUR);
}

/** A stored custom cutoff as a valid `Date`, or null (missing / empty / unreadable values mean "standard"). */
export function parseCutoffOverride(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

export interface CutoffInfo {
  /** When ordering for the date closes (custom if set, otherwise the standard cutoff). */
  closesAt: Date;
  /** True when an admin set a custom cutoff for this date. */
  overridden: boolean;
}

export function cutoffInfo(deliveryDate: string, override?: unknown): CutoffInfo {
  const custom = parseCutoffOverride(override);
  return custom ? { closesAt: custom, overridden: true } : { closesAt: defaultCutoffInstant(deliveryDate), overridden: false };
}

/** True when a custom cutoff exists and it has passed. (Only used with a custom cutoff; the standard rule keeps its own check.) */
export function isPastCustomCutoff(override: unknown, now: Date = new Date()): boolean {
  const custom = parseCutoffOverride(override);
  return custom !== null && now.getTime() >= custom.getTime();
}

/**
 * How long a cached menu may live: the normal lifetime, but never past the next moment ordering
 * closes for some date (so a cutoff takes effect on time, not up to 5 minutes late). At least 1 second.
 */
export function cacheLifetimeMs(closesAt: Array<Date | string | null | undefined>, now: Date, maxMs: number): number {
  let lifetime = maxMs;
  for (const value of closesAt) {
    const when = parseCutoffOverride(value);
    if (!when) continue;
    const wait = when.getTime() - now.getTime();
    if (wait > 0 && wait < lifetime) lifetime = wait;
  }
  return Math.max(1000, lifetime);
}

const dayFormat = { weekday: 'long', month: 'short', day: 'numeric' } as const;

/** 'Wednesday, Oct 7' for a delivery date string. */
export function formatDeliveryDate(dateString: string): string {
  return new Date(dateString + 'T12:00:00.000Z').toLocaleDateString('en-US', { ...dayFormat, timeZone: 'UTC' });
}

/** 'Tuesday, Oct 6 at 1:00 PM' in Pacific time. */
export function formatPacificMoment(instant: Date): string {
  const day = instant.toLocaleDateString('en-US', { ...dayFormat, timeZone: CUTOFF_TIMEZONE });
  const time = instant.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: CUTOFF_TIMEZONE });
  return `${day} at ${time}`;
}

export interface ClosedDate {
  date: string;
  closesAt: string;
}

/** The sentence shown to a customer whose cart contains days that are no longer open. */
export function closedDatesMessage(closed: ClosedDate[]): string {
  const sorted = [...closed].sort((a, b) => a.date.localeCompare(b.date));
  const parts = sorted.map((c) => `${formatDeliveryDate(c.date)} (closed ${formatPacificMoment(new Date(c.closesAt))} Pacific time)`);
  const list = parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  return `Ordering has closed for ${list}. Please go back to your cart and remove ${sorted.length === 1 ? 'that day' : 'those days'} to continue.`;
}

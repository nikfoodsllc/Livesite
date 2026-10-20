/**
 * What a customer sees about today's delivery, as pure rules (no network). The numbers come from OptimoRoute: the driver's
 * live arrival estimate once the routes were sent to drivers, and what the driver reported for the stop.
 */
export type TrackingState = 'none' | 'later' | 'today' | 'on_the_way' | 'delivered' | 'not_delivered';

export interface TrackingInput {
  /** the order's delivery days (actual dates), YYYY-MM-DD */
  dates: string[];
  /** today in Pacific time */
  today: string;
  orderStatus?: string;
  /** what OptimoRoute knows about today's stop (undefined: nothing, or the sync is not connected) */
  stop?: {
    /** 'YYYY-MM-DD HH:MM:SS' Pacific wall clock; null until routes were sent to drivers */
    liveArrival?: string | null;
    status?: string;
    /** UTC ISO when the driver finished the stop */
    endUtc?: string;
    trackingUrl?: string;
  };
}

export interface Tracking {
  state: TrackingState;
  /** the delivery day this is about */
  date?: string;
  /** arrival window, Pacific wall clock 'HH:MM' (24 h) */
  etaFrom?: string;
  etaTo?: string;
  /** when it was delivered, Pacific 'HH:MM' */
  deliveredAt?: string;
  trackingUrl?: string;
}

const WINDOW_MINUTES = 15; // the window is the estimate -15 / +15 minutes

function hhmm(totalMinutes: number): string {
  const m = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD HH:MM:SS' -> minutes since midnight (the date part is checked against the delivery day by the caller). */
export function minutesOfDay(stamp: string | null | undefined): number | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/.exec(stamp ?? '');
  return m ? Number(m[2]) * 60 + Number(m[3]) : null;
}

export function arrivalWindow(stamp: string | null | undefined): { from: string; to: string } | null {
  const mins = minutesOfDay(stamp);
  return mins === null ? null : { from: hhmm(mins - WINDOW_MINUTES), to: hhmm(mins + WINDOW_MINUTES) };
}

/** UTC ISO -> Pacific 'HH:MM' */
export function pacificHHMM(utcIso: string | undefined): string | undefined {
  if (!utcIso) return undefined;
  const d = new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(utcIso) ? utcIso : `${utcIso}Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return parts;
}

export function trackingFor(input: TrackingInput): Tracking {
  const dates = [...new Set(input.dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
  if (dates.length === 0) return { state: 'none' };
  const { today } = input;
  if (!dates.includes(today)) {
    const next = dates.find((d) => d > today);
    if (next) return { state: 'later', date: next };
    // every delivery day is behind us
    return input.orderStatus === 'delivered' ? { state: 'delivered', date: dates[dates.length - 1] } : { state: 'none', date: dates[dates.length - 1] };
  }
  const stop = input.stop;
  const status = stop?.status;
  if (status === 'success') return { state: 'delivered', date: today, deliveredAt: pacificHHMM(stop?.endUtc) };
  if (status === 'failed' || status === 'rejected') return { state: 'not_delivered', date: today };
  const window = arrivalWindow(stop?.liveArrival);
  if (window || status === 'on_route') {
    return { state: 'on_the_way', date: today, ...(window ? { etaFrom: window.from, etaTo: window.to } : {}), ...(stop?.trackingUrl ? { trackingUrl: stop.trackingUrl } : {}) };
  }
  // nothing from OptimoRoute: trust the order's own status
  if (input.orderStatus === 'delivered') return { state: 'delivered', date: today };
  return { state: 'today', date: today };
}

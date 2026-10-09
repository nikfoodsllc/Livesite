import { optimoApiKey } from './config';
import type { ExistingOptimoOrder, OptimoOrderPayload } from './stops';

/**
 * The few OptimoRoute calls the sync needs (https://optimoroute.com/api/). The key goes in the query string as the API
 * requires, so URLs are never logged. Calls are one at a time (the API allows 5 at once per account) and retried a
 * couple of times on network errors, server errors and "too many connections".
 */
const BASE = 'https://api.optimoroute.com/v1/';
const TIMEOUT_MS = 8000;

export interface OptimoResult<T> {
  ok: boolean;
  /** OptimoRoute's own code, e.g. ERR_ORD_EXISTS */
  code?: string;
  message?: string;
  data?: T;
}

async function call<T>(path: string, body?: unknown): Promise<OptimoResult<T>> {
  const key = optimoApiKey();
  if (!key) return { ok: false, code: 'NO_KEY', message: 'OPTIMOROUTE_API_KEY is not set' };
  let last: OptimoResult<T> = { ok: false, code: 'NETWORK', message: 'No answer from OptimoRoute' };
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    try {
      const response = await fetch(`${BASE}${path}?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body ?? {}),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      });
      const json = (await response.json().catch(() => ({}))) as { success?: boolean; code?: string; message?: string };
      if (response.status >= 500 || json.code === 'ERR_TOO_MANY_CONNECTIONS') {
        last = { ok: false, code: json.code ?? `HTTP_${response.status}`, message: json.message };
        continue;
      }
      return { ok: json.success === true, code: json.code, message: json.message, data: json as T };
    } catch (error) {
      last = { ok: false, code: 'NETWORK', message: error instanceof Error ? error.message : String(error) };
    }
  }
  return last;
}

interface RawOrder {
  id?: string;
  data?: { orderNo?: string; date?: string; phone?: string; location?: { address?: string; locationName?: string } };
}

/** Every order OptimoRoute has for one day (read only). */
export async function searchOrdersForDate(date: string): Promise<OptimoResult<ExistingOptimoOrder[]>> {
  const result = await call<{ orders?: RawOrder[] }>('search_orders', { dateRange: { from: date, to: date }, includeOrderData: true });
  if (!result.ok) return { ok: false, code: result.code, message: result.message };
  const orders = (result.data?.orders ?? []).map((o) => ({
    id: o.id,
    orderNo: o.data?.orderNo,
    phone: o.data?.phone,
    address: o.data?.location?.address,
    name: o.data?.location?.locationName,
  }));
  return { ok: true, data: orders };
}

export async function createStop(payload: OptimoOrderPayload): Promise<OptimoResult<{ id?: string }>> {
  const result = await call<{ id?: string }>('create_order', payload);
  return { ok: result.ok, code: result.code, message: result.message, data: result.data };
}

/** Removes a stop by OptimoRoute id (or by order number when we only know that). Never forces: a stop in a running plan is refused. */
export async function deleteStop(ref: { id?: string; orderNo?: string }): Promise<OptimoResult<undefined>> {
  const target = ref.id ? { id: ref.id } : ref.orderNo ? { orderNo: ref.orderNo } : null;
  if (!target) return { ok: false, code: 'NO_REF', message: 'No OptimoRoute id or order number to remove' };
  const result = await call<{ orders?: Array<{ success?: boolean; code?: string; message?: string }> }>('delete_orders', { orders: [target], forceDelete: false });
  const first = result.data?.orders?.[0];
  if (result.ok && first && first.success === false) return { ok: false, code: first.code, message: first.message };
  return { ok: result.ok, code: result.code ?? first?.code, message: result.message ?? first?.message };
}

async function getCall<T>(path: string, query: Record<string, string | number>): Promise<OptimoResult<T>> {
  const key = optimoApiKey();
  if (!key) return { ok: false, code: 'NO_KEY', message: 'OPTIMOROUTE_API_KEY is not set' };
  const params = new URLSearchParams({ key, ...Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)])) });
  try {
    const response = await fetch(`${BASE}${path}?${params.toString()}`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
    const json = (await response.json().catch(() => ({}))) as { success?: boolean; code?: string; message?: string };
    return { ok: json.success === true, code: json.code, message: json.message, data: json as T };
  } catch (error) {
    return { ok: false, code: 'NETWORK', message: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Plans the routes of one day. `startWith: CURRENT` + `lockType: RESOURCES` keeps every stop with the driver it is already
 * assigned to (by hand or by an earlier run) and places the stops that have no driver yet. (`lockType: ROUTES` was tested
 * against the real account and freezes the routes completely, so a late stop is left unscheduled.) The order of the stops
 * inside a route may be re-optimised. Orders are spread evenly over the drivers (balance by number of stops). The drivers are given explicitly: left to
 * itself OptimoRoute uses every driver of the account, which can be more than the plan allows (ERR_OPT_RESOURCES_EXCEEDED).
 */
export async function startPlanning(date: string, driverSerials: string[]): Promise<OptimoResult<{ planningId?: number }>> {
  const result = await call<{ planningId?: number }>('start_planning', {
    date,
    startWith: 'CURRENT',
    lockType: 'RESOURCES',
    balancing: 'ON',
    balanceBy: 'NUM',
    useDrivers: driverSerials.map((driverSerial) => ({ driverSerial })),
  });
  return { ok: result.ok, code: result.code, message: result.message, data: result.data };
}

/** N new, R running, C cancelled, F finished, E error. */
export async function planningStatus(planningId: number): Promise<OptimoResult<{ status?: string; percentageComplete?: number }>> {
  const result = await getCall<{ status?: string; percentageComplete?: number }>('get_planning_status', { planningId });
  return { ok: result.ok, code: result.code, message: result.message, data: result.data };
}

/** The drivers that have a route on one day (empty when nothing is planned that day). */
export async function driversWithRoutes(date: string): Promise<OptimoResult<string[]>> {
  const result = await getCall<{ routes?: Array<{ driverSerial?: string; stops?: unknown[] }> }>('get_routes', { date });
  if (!result.ok) return { ok: false, code: result.code, message: result.message };
  const serials = new Set<string>();
  for (const route of result.data?.routes ?? []) if (route.driverSerial && (route.stops?.length ?? 0) > 0) serials.add(String(route.driverSerial));
  return { ok: true, data: [...serials] };
}

/** How many stops are on a driver's route on one day. */
export async function plannedStopCount(date: string): Promise<OptimoResult<number>> {
  const result = await getCall<{ routes?: Array<{ stops?: Array<{ orderNo?: string }> }> }>('get_routes', { date });
  if (!result.ok) return { ok: false, code: result.code, message: result.message };
  let count = 0;
  for (const route of result.data?.routes ?? []) count += (route.stops ?? []).filter((s) => s.orderNo).length;
  return { ok: true, data: count };
}

export interface DispatchStatus {
  live?: boolean;
  routes?: { state?: string; sentAtUtc?: string | null; scheduledForUtc?: string | null };
  notifications?: { state?: string; sentAtUtc?: string | null; scheduledForUtc?: string | null };
}

/** Whether the routes and customer notifications of a day are not_sent, scheduled or sent (read only). */
export async function dispatchStatus(date: string): Promise<OptimoResult<DispatchStatus>> {
  const result = await getCall<DispatchStatus>('get_dispatch_status', { date });
  return { ok: result.ok, code: result.code, message: result.message, data: result.data };
}

/**
 * Sends the routes of a day to the drivers' phones and, with `sendNotifications`, the customers' notifications the account
 * is set up for (OptimoRoute's Order Tracking settings; each order's own preference, 'both' by default).
 */
export async function sendRoutes(date: string, sendNotifications: boolean): Promise<OptimoResult<{ date?: string }>> {
  const result = await call<{ date?: string }>('send_routes', { date, sendNotifications });
  return { ok: result.ok, code: result.code, message: result.message, data: result.data };
}

export interface CompletionInfo {
  /** success, failed, rejected, unfinished, or while the day is running: scheduled, on_route ... */
  status?: string;
  /** When the driver finished the stop (UTC, 'YYYY-MM-DDTHH:MM:SS') */
  endUtc?: string;
}

/** What drivers reported for stops, by OptimoRoute order id (read only; up to 20 ids per call). */
export async function completionDetails(ids: string[]): Promise<OptimoResult<Record<string, CompletionInfo>>> {
  const out: Record<string, CompletionInfo> = {};
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    const result = await call<{ orders?: Array<{ success?: boolean; id?: string; data?: { status?: string; endTime?: { utcTime?: string } } }> }>('get_completion_details', { orders: chunk.map((id) => ({ id })) });
    if (!result.ok) return { ok: false, code: result.code, message: result.message };
    for (const o of result.data?.orders ?? []) {
      if (o.success && o.id) out[o.id] = { status: o.data?.status, endUtc: o.data?.endTime?.utcTime };
    }
  }
  return { ok: true, data: out };
}

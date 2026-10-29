import { optimoApiKey } from './config';
import type { ExistingOptimoOrder, OptimoOrderPayload } from './stops';
import { normalizeRoutes, type RosterRoute } from './rosterRules';

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
  data?: { orderNo?: string; date?: string; phone?: string; location?: { address?: string; locationName?: string; latitude?: number; longitude?: number; valid?: boolean } };
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
    lat: o.data?.location?.latitude,
    lng: o.data?.location?.longitude,
  }));
  return { ok: true, data: orders };
}

export async function createStop(payload: OptimoOrderPayload): Promise<OptimoResult<{ id?: string }>> {
  const result = await call<{ id?: string }>('create_order', payload);
  return { ok: result.ok, code: result.code, message: result.message, data: result.data };
}

/**
 * Changes the address details of a stop that is already in OptimoRoute (same stop, so a route it is on is kept). Found by
 * OptimoRoute id, or by our order number when that is all we know. Empty text clears a field. Verified live: UPDATE by
 * orderNo and by id both work, and storeInvalid is not allowed in an update. OptimoRoute geocodes the address text only
 * when a stop is created: an update with new text alone leaves the OLD coordinates (verified live), so a changed address
 * must come with its coordinates (`coords`, from geocodeAddress).
 */
export async function updateStopDetails(
  ref: { id?: string; orderNo?: string },
  details: { address: string; locationName: string; apartment: string; gate: string; instruction: string },
  coords?: { lat: number; lng: number }
): Promise<OptimoResult<undefined>> {
  const target = ref.id ? { id: ref.id } : ref.orderNo ? { orderNo: ref.orderNo } : null;
  if (!target) return { ok: false, code: 'NO_REF', message: 'No OptimoRoute id or order number to update' };
  const order = {
    operation: 'UPDATE',
    ...target,
    location: { address: details.address, locationName: details.locationName, ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}) },
    customField2: details.apartment,
    customField3: details.gate,
    customFields: { delivery_instruction: details.instruction },
  };
  return updateOrder(order);
}

/** Moves only the pin of a stop (address text, name and coordinates); the notes and custom fields are left as they are. */
export async function setStopPin(
  ref: { id?: string; orderNo?: string },
  location: { address: string; locationName: string; lat: number; lng: number }
): Promise<OptimoResult<undefined>> {
  const target = ref.id ? { id: ref.id } : ref.orderNo ? { orderNo: ref.orderNo } : null;
  if (!target) return { ok: false, code: 'NO_REF', message: 'No OptimoRoute id or order number to update' };
  return updateOrder({
    operation: 'UPDATE',
    ...target,
    location: { address: location.address, locationName: location.locationName, latitude: location.lat, longitude: location.lng },
  });
}

async function updateOrder(order: Record<string, unknown>): Promise<OptimoResult<undefined>> {
  const result = await call<{ orders?: Array<{ success?: boolean; code?: string; message?: string }> }>('create_or_update_orders', { orders: [order] });
  const first = result.data?.orders?.[0];
  if (result.ok && first && first.success === false) return { ok: false, code: first.code, message: first.message };
  return { ok: result.ok, code: result.code ?? first?.code, message: result.message ?? first?.message };
}

/** A day nobody delivers on: the probe stop for geocodeAddress lives there for a second. */
const PROBE_DATE = '2099-12-31';

/**
 * Asks OptimoRoute's own geocoder where an address is (the one that places Kunal's stops), by creating a stop on a far
 * future day, reading where it landed and deleting it again. null when the address cannot be placed or a call fails.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const orderNo = `ZZGEO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const created = await call('create_order', {
    operation: 'CREATE',
    orderNo,
    date: PROBE_DATE,
    type: 'D',
    duration: 1,
    location: { address, locationName: 'address check', storeInvalid: true },
  });
  if (!created.ok) return null;
  let spot: { lat: number; lng: number } | null = null;
  try {
    const read = await call<{ orders?: RawOrder[] }>('search_orders', { orders: [{ orderNo }], includeOrderData: true });
    const loc = read.data?.orders?.[0]?.data?.location as { latitude?: number; longitude?: number; valid?: boolean } | undefined;
    if (loc && loc.valid !== false && typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && !(loc.latitude === 0 && loc.longitude === 0)) {
      spot = { lat: loc.latitude, lng: loc.longitude };
    }
  } finally {
    const removed = await call('delete_orders', { orders: [{ orderNo }], forceDelete: false });
    if (!removed.ok) console.error('[optimoroute] address-check stop could not be deleted', { orderNo, code: removed.code });
  }
  return spot;
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
  const result = await getCall<{ routes?: Array<{ stops?: Array<{ id?: string; orderNo?: string }> }> }>('get_routes', { date });
  if (!result.ok) return { ok: false, code: result.code, message: result.message };
  let count = 0;
  // every stop has an id; only the stops this site created have an orderNo (the team's own uploads have none)
  for (const route of result.data?.routes ?? []) count += (route.stops ?? []).filter((s) => s.id || s.orderNo).length;
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
  /** OptimoRoute's live tracking page for this stop (what the customer's tracking link opens) */
  trackingUrl?: string;
}

/** What drivers reported for stops, by OptimoRoute order id (read only; up to 20 ids per call). */
export async function completionDetails(ids: string[]): Promise<OptimoResult<Record<string, CompletionInfo>>> {
  const out: Record<string, CompletionInfo> = {};
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    const result = await call<{ orders?: Array<{ success?: boolean; id?: string; data?: { status?: string; endTime?: { utcTime?: string }; tracking_url?: string } }> }>('get_completion_details', { orders: chunk.map((id) => ({ id })) });
    if (!result.ok) return { ok: false, code: result.code, message: result.message };
    for (const o of result.data?.orders ?? []) {
      if (o.success && o.id) out[o.id] = { status: o.data?.status, endUtc: o.data?.endTime?.utcTime, ...(o.data?.tracking_url ? { trackingUrl: o.data.tracking_url } : {}) };
    }
  }
  return { ok: true, data: out };
}

/** The planned and live arrival of one stop, by OptimoRoute order id (read only). liveArrival is null until routes were sent to drivers. */
export async function stopSchedule(id: string): Promise<OptimoResult<{ liveArrival: string | null; plannedArrival?: string; notificationPreference?: string }>> {
  const result = await call<{ orders?: Array<{ data?: { notificationPreference?: string }; scheduleInformation?: { arrivalTimeDt?: string; liveEstimate?: { arrivalTimeDt?: string | null } | null } }> }>('search_orders', { orders: [{ id }], includeOrderData: true, includeScheduleInformation: true });
  if (!result.ok) return { ok: false, code: result.code, message: result.message };
  const first = result.data?.orders?.[0];
  const info = first?.scheduleInformation;
  return { ok: true, data: { liveArrival: info?.liveEstimate?.arrivalTimeDt ?? null, plannedArrival: info?.arrivalTimeDt, notificationPreference: first?.data?.notificationPreference } };
}

/** The communication preference of stops (both, email, sms, dont_notify), by OptimoRoute order id (read only; 100 ids per call). */
export async function notificationPreferences(ids: string[]): Promise<OptimoResult<Record<string, string>>> {
  const out: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const result = await call<{ orders?: Array<{ id?: string | number; data?: { notificationPreference?: string } }> }>('search_orders', { orders: chunk.map((id) => ({ id })), includeOrderData: true });
    if (!result.ok) return { ok: false, code: result.code, message: result.message };
    for (const o of result.data?.orders ?? []) if (o.id !== undefined && o.data?.notificationPreference) out[String(o.id)] = o.data.notificationPreference;
  }
  return { ok: true, data: out };
}

/** The drivers and their stops, in route order, of one day (read only). */
export async function routesForDate(date: string): Promise<OptimoResult<RosterRoute[]>> {
  const result = await getCall<{ routes?: Parameters<typeof normalizeRoutes>[0] }>('get_routes', { date });
  if (!result.ok) return { ok: false, code: result.code, message: result.message };
  return { ok: true, data: normalizeRoutes(result.data?.routes) };
}

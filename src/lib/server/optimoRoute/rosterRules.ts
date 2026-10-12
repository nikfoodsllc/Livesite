/**
 * The roster of a delivery day: which driver has which stops, in which order, as OptimoRoute planned it. Pure helpers
 * (no network, no database) so they can be checked on their own.
 */
export interface RosterStop {
  /** 1, 2, 3 ... on the driver's route */
  number: number;
  /** OptimoRoute's id of the stop */
  id: string;
  /** The order number of the stop (only stops this site created have one) */
  orderNo: string;
  name: string;
  address: string;
  /** Planned arrival, 'HH:MM' as OptimoRoute gives it ('' when unknown) */
  scheduledAt: string;
}

export interface RosterRoute {
  driverSerial: string;
  driverName: string;
  vehicle: string;
  stops: RosterStop[];
}

interface RawStop {
  id?: unknown;
  orderNo?: unknown;
  locationName?: unknown;
  address?: unknown;
  stopNumber?: unknown;
  scheduledAt?: unknown;
}

interface RawRoute {
  driverSerial?: unknown;
  driverName?: unknown;
  vehicleLabel?: unknown;
  vehicleRegistration?: unknown;
  stops?: RawStop[];
}

const text = (value: unknown): string => (value === undefined || value === null ? '' : String(value).trim());

/** The routes of the answer of get_routes, cleaned up: routes without stops are left out, stops are in route order and numbered. */
export function normalizeRoutes(raw: RawRoute[] | undefined | null): RosterRoute[] {
  const routes: RosterRoute[] = [];
  for (const route of raw ?? []) {
    const stops = (route.stops ?? [])
      .map((s, index) => ({ s, order: Number.isFinite(Number(s.stopNumber)) ? Number(s.stopNumber) : index + 1 }))
      .sort((a, b) => a.order - b.order)
      .map(({ s }, index): RosterStop => ({ number: index + 1, id: text(s.id), orderNo: text(s.orderNo), name: text(s.locationName), address: text(s.address), scheduledAt: text(s.scheduledAt) }));
    if (stops.length === 0) continue;
    routes.push({ driverSerial: text(route.driverSerial), driverName: text(route.driverName), vehicle: text(route.vehicleLabel) || text(route.vehicleRegistration), stops });
  }
  // a stable order: by driver serial, so the same driver is always "Route 1"
  return routes.sort((a, b) => a.driverSerial.localeCompare(b.driverSerial, undefined, { numeric: true }));
}

/** A short text that changes whenever a driver, a stop or the order of stops changes (not when only times move). */
export function rosterSignature(routes: RosterRoute[]): string {
  return routes.map((r) => `${r.driverSerial}:${r.stops.map((s) => s.id || s.orderNo || s.name).join(',')}`).join('|');
}

/**
 * The pin of a stop is its latitude/longitude. OptimoRoute geocodes the address text only when a stop is CREATED: an
 * update that changes the text alone (our sync, or someone typing in OptimoRoute's Edit location box) leaves the old
 * coordinates, so the map and the routes keep following the old address. These rules spot that case.
 */

export interface Pin {
  address: string;
  lat: number;
  lng: number;
}

/** A pin that moved less than this is the same place (geocoders differ by a few metres). */
export const PIN_MOVE_METERS = 150;
/** Coordinates this close to the last ones we saw count as "did not move". */
const UNCHANGED_METERS = 25;

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const squash = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

export function sameAddressText(a: string | undefined, b: string | undefined): boolean {
  return squash(a ?? '') === squash(b ?? '');
}

export function hasCoordinates<T extends { lat?: number; lng?: number }>(p: T | undefined): p is T & { lat: number; lng: number } {
  return !!p && typeof p.lat === 'number' && typeof p.lng === 'number' && !(p.lat === 0 && p.lng === 0);
}

/**
 * What the pin we saw now means compared with the last one we recorded:
 *  - baseline: nothing recorded yet, record it (we cannot know whether it was right)
 *  - ok: same address text, same place
 *  - refreshed: something changed and the coordinates moved with it (someone re-geocoded), record it
 *  - stale: the address text changed but the coordinates did not (the bug), the pin must be moved
 */
export type PinVerdict = 'baseline' | 'ok' | 'refreshed' | 'stale';

export function judgePin(saved: Pin | undefined, seen: Pin): PinVerdict {
  if (!saved || !hasCoordinates(saved)) return 'baseline';
  const moved = distanceMeters(saved, seen) > UNCHANGED_METERS;
  if (sameAddressText(saved.address, seen.address)) return moved ? 'refreshed' : 'ok';
  return moved ? 'refreshed' : 'stale';
}

/** Whether a fresh geocode of the address is far enough from the current pin to be worth moving it. */
export function pinNeedsMove(current: { lat: number; lng: number }, geocoded: { lat: number; lng: number }): boolean {
  return distanceMeters(current, geocoded) > PIN_MOVE_METERS;
}

import type { AddressSnapshot } from '@/types/order';

/** Orders whose delivery address an admin may still change (not cancelled, not already delivered). */
export const ADDRESS_EDITABLE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'] as const;

/** Same limit as the delivery instructions at checkout. */
export const MAX_INSTRUCTION_LENGTH = 30;

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();

export type AddressInput = Partial<Record<'street' | 'apartment' | 'city' | 'state' | 'zipCode' | 'entrance' | 'floor', unknown>>;

export type AddressCheck = { ok: true; address: AddressSnapshot } | { ok: false; error: string };

/** Cleans what the admin typed. The street, city and a 5-digit zip are needed; apartment, gate code and instructions are optional. */
export function checkAddressInput(input: AddressInput, previous: AddressSnapshot): AddressCheck {
  const street = clean(input.street);
  const city = clean(input.city);
  const zipCode = clean(input.zipCode);
  if (!street) return { ok: false, error: 'Enter the street address.' };
  if (street.length > 200) return { ok: false, error: 'The street address is too long.' };
  if (!city) return { ok: false, error: 'Enter the city.' };
  if (city.length > 80) return { ok: false, error: 'The city is too long.' };
  if (!/^\d{5}$/.test(zipCode)) return { ok: false, error: 'Enter a 5-digit zip code.' };
  const apartment = clean(input.apartment);
  const entrance = clean(input.entrance);
  const floor = clean(input.floor);
  if (apartment.length > 40) return { ok: false, error: 'The apartment is too long.' };
  if (entrance.length > 40) return { ok: false, error: 'The gate code is too long.' };
  if (floor.length > MAX_INSTRUCTION_LENGTH) return { ok: false, error: `Delivery instructions can be ${MAX_INSTRUCTION_LENGTH} characters at most.` };
  // fields we do not edit (landmark, state) stay as they were
  const address: AddressSnapshot = { ...previous, street, city, state: clean(input.state) || previous.state || 'WA', zipCode, apartment, entrance, floor };
  return { ok: true, address };
}

const FIELDS = ['street', 'apartment', 'city', 'state', 'zipCode', 'entrance', 'floor'] as const;

const same = (a: unknown, b: unknown) => clean(a).toLowerCase() === clean(b).toLowerCase();

/** True when at least one editable field is different (case and spacing do not count). */
export function addressChanged(before: AddressSnapshot | undefined, after: AddressSnapshot): boolean {
  return FIELDS.some((f) => !same(before?.[f], after[f]));
}

/** Only the fields that differ, as {field: [before, after]}, for the history. */
export function addressDiff(before: AddressSnapshot | undefined, after: AddressSnapshot): Record<string, [string, string]> {
  const out: Record<string, [string, string]> = {};
  for (const f of FIELDS) if (!same(before?.[f], after[f])) out[f] = [clean(before?.[f]), clean(after[f])];
  return out;
}

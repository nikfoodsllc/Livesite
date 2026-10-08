import type { Order, OrderDay } from '@/types/order';

/**
 * Turns confirmed orders into OptimoRoute stops, the way Kunal's import sheet did: ONE stop per customer per delivery
 * day (the same customer + address on the same day is one stop, even with two orders). The stop carries the same
 * columns as the sheet: Location (customer name), Address (one line), Phone, Email, Apartment No., Gate Code and
 * Delivery Instruction. No time window, driver or notification setting is sent: OptimoRoute's own defaults apply, as
 * they do for the sheet import.
 */

export const STOP_DURATION_MINUTES = 3;

const norm = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
export const last10 = (value: unknown) => String(value ?? '').replace(/\D/g, '').slice(-10);

/** YYYY-MM-DD of a stored date (strings are kept as they are, a Date uses its UTC day). */
export function dayOf(value: Date | string | undefined | null): string {
  if (!value) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  const text = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : '';
}

/** An order that should be on the route: paid and not cancelled (a partial refund keeps it; a full refund marks it refunded). */
export function isRouteOrder(order: Pick<Order, 'status' | 'paymentStatus'>): boolean {
  return order.paymentStatus === 'paid' && order.status !== 'cancelled';
}

/** The address as one line, like the sheet: "street, city, WA 98109, USA". Our street is usually that already. */
export function addressLine(order: Pick<Order, 'address'>): string {
  const a = order.address;
  const street = clean(a?.street);
  const city = clean(a?.city);
  const state = clean(a?.state) || 'WA';
  const zip = clean(a?.zipCode);
  let line = street;
  if (city && !norm(street).includes(norm(city))) line = [street, city, `${state} ${zip}`.trim()].filter(Boolean).join(', ');
  else if (zip && !norm(street).includes(norm(zip))) line = `${street} ${zip}`.trim();
  if (!/\busa\s*$/i.test(line)) line = `${line}, USA`;
  return line;
}

export interface DeliveryDay {
  date: string;
  /** The menu day(s) the items were picked for, only for the log */
  menuDays: string[];
}

/** The days an order is delivered on: the delivery date after cart clubbing, grouped. */
export function deliveryDaysOf(order: Pick<Order, 'items'>): DeliveryDay[] {
  const byDate = new Map<string, DeliveryDay>();
  for (const day of (order.items ?? []) as OrderDay[]) {
    const date = dayOf(day.actualDeliveryDate) || dayOf(day.deliveryDate);
    if (!date) continue;
    const entry = byDate.get(date) ?? { date, menuDays: [] };
    const menu = dayOf(day.deliveryDate);
    if (menu && !entry.menuDays.includes(menu)) entry.menuDays.push(menu);
    byDate.set(date, entry);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Same customer, same address, same apartment, same day = same stop. */
export function stopKeyFor(order: Pick<Order, 'customerInfo' | 'address'>, date: string): string {
  return [date, norm(order.customerInfo?.name), norm(clean(order.address?.street).split(',')[0]), norm(order.address?.zipCode), norm(order.address?.apartment)].join('|');
}

/** The readable id of the stop in OptimoRoute: the first order's number and the day, e.g. ORD-1791435628597928-1009. */
export function orderNoFor(orderId: string, date: string): string {
  return `${String(orderId).replace(/^#/, '')}-${date.slice(5, 7)}${date.slice(8, 10)}`;
}

export interface OptimoOrderPayload {
  operation: 'CREATE';
  orderNo: string;
  type: 'D';
  date: string;
  duration: number;
  location: { address: string; locationName: string };
  phone?: string;
  email?: string;
  customField2?: string;
  customField3?: string;
  customFields?: { delivery_instruction: string };
  storeInvalid: boolean;
}

/** What is sent to OptimoRoute for one stop (empty values are left out, like the blanks in the sheet). */
export function buildOptimoOrder(order: Order, date: string): OptimoOrderPayload {
  const phone = last10(order.customerInfo?.phone);
  const apartment = clean(order.address?.apartment);
  const gate = clean(order.address?.entrance);
  const instruction = clean(order.address?.floor);
  const email = clean(order.customerInfo?.email);
  return {
    operation: 'CREATE',
    orderNo: orderNoFor(order.orderId, date),
    type: 'D',
    date,
    duration: STOP_DURATION_MINUTES,
    location: { address: addressLine(order), locationName: clean(order.customerInfo?.name) },
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
    ...(apartment ? { customField2: apartment } : {}),
    ...(gate ? { customField3: gate } : {}),
    ...(instruction ? { customFields: { delivery_instruction: instruction } } : {}),
    // keep a stop whose address could not be placed on the map (OptimoRoute flags it) instead of losing it
    storeInvalid: true,
  };
}

export interface ExistingOptimoOrder {
  orderNo?: string;
  id?: string;
  phone?: string;
  address?: string;
  name?: string;
}

/** An order OptimoRoute already has for this stop (Kunal's own upload): same phone and same street on that day. */
export function findExistingStop(existing: ExistingOptimoOrder[], order: Pick<Order, 'customerInfo' | 'address'>): ExistingOptimoOrder | undefined {
  const phone = last10(order.customerInfo?.phone);
  const street = norm(clean(order.address?.street).split(',')[0]);
  if (!phone || !street) return undefined;
  return existing.find((o) => last10(o.phone) === phone && norm(clean(o.address).split(',')[0]) === street);
}

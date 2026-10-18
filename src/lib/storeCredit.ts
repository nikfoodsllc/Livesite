/**
 * Store credit: money a customer holds with NikFoods, in WHOLE CENTS (no rounding drift).
 * Pure rules only; the database side is in lib/server/storeCredit.ts.
 */
import { TAX_RATE } from '@/lib/cartLogic';

/** Stripe refuses a card payment below 50 cents. */
export const STRIPE_MIN_CHARGE_CENTS = 50;

export const toCents = (dollars: number): number => Math.round((Number(dollars) || 0) * 100 + 1e-9);
export const toDollars = (cents: number): number => Math.round(cents) / 100;

/**
 * What a credited item is worth: its price (portion and eco container included, as stored on the order line)
 * times the quantity, plus (unless withheld) the 10.3% tax charged on it. The Platform Fee, the tax on that fee and the tip are
 * never credited.
 */
export function creditForItemCents(unitPrice: number, quantity: number, includeTax = true): number {
  const base = toCents(unitPrice) * Math.max(0, Math.floor(Number(quantity) || 0));
  return includeTax ? base + Math.round(base * TAX_RATE) : base;
}

/** What crediting the Platform Fee is worth: the fee plus the 10.3% tax charged on it. */
export function creditForFeeCents(platformFee: number): number {
  const base = toCents(platformFee);
  return base > 0 ? base + Math.round(base * TAX_RATE) : 0;
}

export interface CreditPlan {
  /** Credit used on this order */
  creditCents: number;
  /** What is left for the card (0 = the credit pays for everything) */
  cardCents: number;
}

/**
 * How much of an order the credit pays for. All of it when the balance covers the order; otherwise as much as the
 * balance allows, but never leaving the card with less than Stripe's 50 cent minimum.
 */
export function planCreditUse(totalCents: number, balanceCents: number): CreditPlan {
  const total = Math.max(0, Math.round(totalCents));
  const balance = Math.max(0, Math.round(balanceCents));
  if (total === 0 || balance === 0) return { creditCents: 0, cardCents: total };
  if (balance >= total) return { creditCents: total, cardCents: 0 };
  const left = total - balance;
  if (left >= STRIPE_MIN_CHARGE_CENTS) return { creditCents: balance, cardCents: left };
  // the card could not charge less than 50 cents: keep 50 cents for the card
  const credit = Math.max(0, total - STRIPE_MIN_CHARGE_CENTS);
  return { creditCents: credit, cardCents: total - credit };
}

/** The order total as the card sees it, after credit (dollars). */
export function cardTotalOf(order: { totalPaid?: number; storeCreditUsed?: number }): number {
  return Math.max(0, toDollars(toCents(order.totalPaid ?? 0) - toCents(order.storeCreditUsed ?? 0)));
}

export type CreditLedgerType = 'issued' | 'used' | 'restored' | 'adjusted';

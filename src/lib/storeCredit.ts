/**
 * Store credit: money a customer holds with NikFoods, in WHOLE CENTS (no rounding drift).
 * Pure rules only; the database side is in lib/server/storeCredit.ts.
 */
import { TAX_RATE, PLATFORM_FEE_FLAT, SERVICE_FEE_RATE, calculateTax, getPlatformFee } from '@/lib/cartLogic';

/** Stripe refuses a card payment below 50 cents. */
export const STRIPE_MIN_CHARGE_CENTS = 50;

export const toCents = (dollars: number): number => Math.round((Number(dollars) || 0) * 100 + 1e-9);
export const toDollars = (cents: number): number => Math.round(cents) / 100;

/**
 * The whole order was credited (the "entire order" button, or everything credited so far adds up to what was paid). The customer
 * then sees only the total: the items, Platform Fee, tax and tip that made it up stay with NikFoods.
 */
export function isFullyCredited(order: { totalPaid?: number; creditsIssued?: Array<{ amount?: number; entireOrder?: boolean }> }): boolean {
  const credits = order.creditsIssued ?? [];
  if (credits.some((c) => c.entireOrder)) return true;
  const total = toCents(order.totalPaid ?? 0);
  return total > 0 && credits.reduce((n, c) => n + toCents(c.amount ?? 0), 0) >= total;
}

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

export interface CreditedTotals {
  /** Credit used on this order (cents) */
  creditCents: number;
  /** What is left for the card (cents; 0 = the credit pays for everything) */
  cardCents: number;
  /** Platform Fee, tax and total of the order AFTER the credit decision (dollars) */
  platformFee: number;
  tax: number;
  total: number;
}

/**
 * Store credit and the Platform Fee together. The fee exists to cover Stripe's cut, so it is charged only on the part of
 * the order that goes through Stripe: credit pays the items (with their tax) and then the tip, and the fee is 4% of the
 * subtotal still left for the card + 31 cents (0 when the credit covers everything, because there is no card payment).
 * The tax on the fee follows it. The card is never asked for less than Stripe's 50 cent minimum.
 *
 * `balanceCents` 0 gives the ordinary totals. Dollars in (subtotal, deliveryFee, tip), cents for credit.
 */
export function planCreditForOrder(input: { subtotal: number; deliveryFee?: number; tip: number; waiveFee?: boolean; balanceCents: number }): CreditedTotals {
  const subtotal = Math.round(input.subtotal * 100 + 1e-9) / 100;
  const delivery = input.deliveryFee ?? 0;
  const tip = input.tip;
  const feeOn = (cardBase: number) => (input.waiveFee ? 0 : Math.round((cardBase * SERVICE_FEE_RATE + PLATFORM_FEE_FLAT) * 100 + 1e-9) / 100);
  const build = (creditCents: number): CreditedTotals => {
    const taxNoFee = calculateTax(subtotal, 0);
    const noFeeTotalCents = toCents(subtotal) + toCents(taxNoFee) + toCents(delivery) + toCents(tip);
    if (creditCents >= noFeeTotalCents) {
      return { creditCents: noFeeTotalCents, cardCents: 0, platformFee: 0, tax: taxNoFee, total: toDollars(noFeeTotalCents) };
    }
    const cardBase = Math.max(0, subtotal - creditCents / 100 / (1 + TAX_RATE));
    const platformFee = creditCents > 0 ? feeOn(cardBase) : input.waiveFee ? 0 : getPlatformFee(subtotal);
    const tax = calculateTax(subtotal, platformFee);
    const totalCents = toCents(subtotal) + toCents(tax) + toCents(platformFee) + toCents(delivery) + toCents(tip);
    return { creditCents, cardCents: totalCents - creditCents, platformFee, tax, total: toDollars(totalCents) };
  };
  const plain = build(0);
  const balance = Math.max(0, Math.round(input.balanceCents));
  if (balance === 0 || !(subtotal > 0)) return plain;
  let credit = balance;
  for (let i = 0; i < 8 && credit > 0; i += 1) {
    const result = build(credit);
    if (result.cardCents === 0 || result.cardCents >= STRIPE_MIN_CHARGE_CENTS) return result;
    credit -= STRIPE_MIN_CHARGE_CENTS - result.cardCents;
  }
  return plain;
}

/** The order total as the card sees it, after credit (dollars). */
export function cardTotalOf(order: { totalPaid?: number; storeCreditUsed?: number }): number {
  return Math.max(0, toDollars(toCents(order.totalPaid ?? 0) - toCents(order.storeCreditUsed ?? 0)));
}

export type CreditLedgerType = 'issued' | 'used' | 'restored' | 'adjusted';

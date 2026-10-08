/**
 * How the price breakdown is shown to customers everywhere (checkout, order pages, pay page, emails): the tax, the
 * Platform Fee and any delivery fee are ONE line, "Taxes & Fees" with a small (i) on the website that says what is in it (the emails show the plain line). Lines that
 * are $0 (a missing tip, no delivery fee, no discount) are not shown at all.
 */
/** The line's name on the website (a small (i) next to it explains it on hover; see components/common/TaxesFeesLabel). */
export const TAXES_FEES_TEXT = 'Taxes & Fees';
export const TAXES_FEES_TOOLTIP = 'Includes applicable Washington State and local sales taxes, along with digital payment processing fees.';

const cents = (n: unknown) => Math.round((Number(n) || 0) * 100 + 1e-9);

/** Tax + Platform Fee + delivery fee, in dollars rounded to the cent. */
export function taxesAndFeesOf(parts: { taxes?: number | null; platformFee?: number | null; deliveryFee?: number | null }): number {
  return (cents(parts.taxes) + cents(parts.platformFee) + cents(parts.deliveryFee)) / 100;
}

/** True when an amount is worth a line: more than zero cents. */
export function hasAmount(n: unknown): boolean {
  return cents(n) > 0;
}

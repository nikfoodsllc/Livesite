/**
 * How the price breakdown is shown to customers everywhere (checkout, order pages, pay page, emails): the tax, the
 * Platform Fee and any delivery fee are ONE line, "Taxes & Fees*", with a footnote that says what is in it. Lines that
 * are $0 (a missing tip, no delivery fee, no discount) are not shown at all.
 */
export const TAXES_FEES_LABEL = 'Taxes & Fees*';
export const TAXES_FEES_FOOTNOTE = '* Taxes are 10.3%. The fee is a digital payment processing fee.';

const cents = (n: unknown) => Math.round((Number(n) || 0) * 100 + 1e-9);

/** Tax + Platform Fee + delivery fee, in dollars rounded to the cent. */
export function taxesAndFeesOf(parts: { taxes?: number | null; platformFee?: number | null; deliveryFee?: number | null }): number {
  return (cents(parts.taxes) + cents(parts.platformFee) + cents(parts.deliveryFee)) / 100;
}

/** True when an amount is worth a line: more than zero cents. */
export function hasAmount(n: unknown): boolean {
  return cents(n) > 0;
}

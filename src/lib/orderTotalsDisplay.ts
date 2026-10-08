/**
 * How the price breakdown is shown to customers everywhere (checkout, order pages, pay page, emails): the tax, the
 * Platform Fee and any delivery fee are ONE line, "Taxes & Fees" with a small (i) that says what is in it. Lines that
 * are $0 (a missing tip, no delivery fee, no discount) are not shown at all.
 */
/** The line's name on the website (a small (i) next to it explains it on hover; see components/common/TaxesFeesLabel). */
export const TAXES_FEES_TEXT = 'Taxes & Fees';
export const TAXES_FEES_TOOLTIP = 'Taxes are 10.3%. The fee is a digital payment processing fee.';

/**
 * The same small (i) for emails, drawn with plain HTML/CSS (a circle with an i, no image or font needed). Email apps cannot
 * show a hover, so the icon carries a title (desktop mail apps that show it do) and the same sentence is also printed
 * once as a small line under the payment summary, so phones see it too.
 */
export function infoIconHtml(color: string): string {
  const title = TAXES_FEES_TOOLTIP.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<span title="${title}" style="display:inline-block;width:13px;height:13px;line-height:13px;border:1px solid ${color};border-radius:50%;color:${color};font-size:9px;font-weight:700;font-style:normal;text-align:center;vertical-align:1px;margin-left:4px;cursor:help;">i</span>`;
}

const cents = (n: unknown) => Math.round((Number(n) || 0) * 100 + 1e-9);

/** Tax + Platform Fee + delivery fee, in dollars rounded to the cent. */
export function taxesAndFeesOf(parts: { taxes?: number | null; platformFee?: number | null; deliveryFee?: number | null }): number {
  return (cents(parts.taxes) + cents(parts.platformFee) + cents(parts.deliveryFee)) / 100;
}

/** True when an amount is worth a line: more than zero cents. */
export function hasAmount(n: unknown): boolean {
  return cents(n) > 0;
}

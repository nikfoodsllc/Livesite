import { Order, OrderDay } from '@/types/order';
import { getSiteUrl } from '@/lib/siteUrl';
import { EMAIL_LOGO_CID } from '@/lib/emailLogo';

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const money = (n: number, currency = 'usd') => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(n);

const C = {
  page: '#F3EBDD', card: '#FFFBF5', surface: '#FBF1E1', line: '#EADBC3', text: '#2B1D0E', body: '#54442F', muted: '#76664F',
  brand: '#F89C35', brandText: '#A85A00', onBrand: '#1A1106', tile: '#FFE7C2', noteBg: '#FFF1DC', noteLine: '#F3D8A8', noteText: '#5B3F10', strip: '#1E1409',
};
const SUPPORT = 'support@nikfoods.com';

export function getPaymentLinkEmailSubject(order: Order): string {
  return `NikFoods Order #${order.orderId} - Payment Link`;
}

function formatDay(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** The order's items grouped by the day they are delivered (an item picked for an earlier day but combined into a later delivery sits with it). */
function itemsByDeliveryDay(order: Order) {
  const byDate = new Map<string, OrderDay['items']>();
  for (const day of order.items) {
    const when = String(day.actualDeliveryDate ?? day.deliveryDate).slice(0, 10);
    byDate.set(when, [...(byDate.get(when) ?? []), ...day.items]);
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function itemLines(order: Order): string {
  return itemsByDeliveryDay(order)
    .map(([when, items]) => {
      const rows = items
        .map((it) => {
          const tags = [it.selectedPortion, it.spiceLevel, it.isEcoFriendlyContainer ? 'Eco container' : ''].filter(Boolean).join(' · ');
          return `<tr>
            <td style="padding:5px 0;font-size:14px;line-height:19px;color:${C.text};">${it.quantity} &times; ${esc(it.food.name)}${tags ? `<div style="font-size:12px;color:${C.muted};">${esc(tags)}</div>` : ''}</td>
            <td align="right" valign="top" style="padding:5px 0;font-size:14px;font-weight:700;color:${C.text};white-space:nowrap;">${money(it.price * it.quantity, order.currency)}</td>
          </tr>`;
        })
        .join('');
      return `<tr><td style="padding:8px 0 2px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:${C.brandText};border-top:1px solid ${C.line};" colspan="2">Delivery &middot; ${esc(formatDay(when))}</td></tr>${rows}`;
    })
    .join('');
}

/**
 * Email that carries the pay link of an order an admin entered for the customer (same look as the other
 * NikFoods emails: gold logo on a dark strip, every coloured block a table cell with a bgcolor).
 */
export function getPaymentLinkEmailTemplate(order: Order, payUrl: string, accountCreated: boolean): string {
  const logoUrl = `cid:${EMAIL_LOGO_CID}`;
  const siteUrl = getSiteUrl();
  const name = order.customerInfo?.name?.trim().split(/\s+/)[0] ?? '';
  const greeting = name ? `Hi ${esc(name)},` : 'Hi there,';
  const total = money(order.totalPaid, order.currency);
  const taxesAndFees = order.taxes + order.platformFee + order.deliveryFee;
  const accountNote = accountCreated
    ? `<tr><td class="px" bgcolor="${C.card}" style="padding:12px 32px 0;background:${C.card};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.noteBg}" style="background:${C.noteBg};border:1px solid ${C.noteLine};border-radius:16px;border-collapse:separate;"><tr><td style="padding:9px 14px;font-size:13px;line-height:19px;color:${C.noteText};">
          We also set up a NikFoods account for you with this email address, so you can see your orders any time. To sign in, choose <strong>Forgot password</strong> on <a href="${esc(siteUrl)}" style="color:${C.brandText};font-weight:700;">${esc(siteUrl.replace(/^https?:\/\//, ''))}</a> and we will email you a code to set your own password.
        </td></tr></table>
      </td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" style="color-scheme:light dark;supported-color-schemes:light dark;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<title>Your NikFoods order is ready for payment</title>
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; }
  a { text-decoration:none; }
  @media only screen and (max-width: 620px) {
    .wrap { width:100% !important; border-radius:0 !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    .hero-h { font-size:25px !important; line-height:30px !important; }
    .btn a { display:block !important; }
    .outer { padding:0 !important; }
  }
</style>
</head>
<body bgcolor="${C.page}" style="margin:0;padding:0;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">Your order is ready. Tap to pay ${esc(total)} securely and we will start preparing it.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td class="outer" align="center" style="padding:16px 12px;">
<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:640px;max-width:640px;background:${C.card};border-radius:24px;overflow:hidden;border:1px solid ${C.line};border-collapse:separate;">
  <tr><td height="5" bgcolor="${C.brand}" style="height:5px;line-height:5px;font-size:1px;background:${C.brand};">&nbsp;</td></tr>
  <tr><td align="center" bgcolor="${C.strip}" style="padding:14px 32px;background:${C.strip};"><img src="${logoUrl}" alt="NikFoods" width="150" style="display:block;border:0;width:150px;height:auto;max-width:100%;margin:0 auto;font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:${C.brand};"></td></tr>

  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:16px 32px 8px;background:${C.card};">
    <div style="font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:4px;word-break:break-word;">Order # ${esc(order.orderId)}</div>
    <div class="hero-h" style="font-size:30px;line-height:36px;font-weight:800;color:${C.text};">${greeting} your order is ready to pay</div>
    <div style="font-size:15px;line-height:22px;color:${C.body};margin:6px auto 0;max-width:460px;">We have put your order together. Tap the button to pay securely by card (Apple Pay and Google Pay work too), and we will start preparing it right away.</div>
  </td></tr>

  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:12px 32px 4px;background:${C.card};">
    <table role="presentation" class="btn" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
      <td align="center" bgcolor="${C.brand}" style="border-radius:14px;background:${C.brand};border:2px solid ${C.brand};">
        <a href="${esc(payUrl)}" style="display:inline-block;padding:11px 34px;font-size:17px;font-weight:800;color:${C.onBrand};border-radius:14px;">Pay ${esc(total)} &rarr;</a>
      </td>
    </tr></table>
    <div style="font-size:12px;color:${C.muted};margin-top:6px;line-height:17px;">Button not working? Copy this link into your browser:<br><a href="${esc(payUrl)}" style="color:${C.brandText};word-break:break-all;">${esc(payUrl)}</a></div>
  </td></tr>

  <tr><td class="px" bgcolor="${C.card}" style="padding:12px 32px 0;background:${C.card};">
    <div style="font-size:18px;font-weight:800;color:${C.text};margin-bottom:4px;">Your order</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-radius:14px;border-collapse:separate;"><tr><td bgcolor="${C.card}" style="padding:6px 14px 10px;background:${C.card};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemLines(order)}</table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;border-top:1px solid ${C.line};">
        <tr><td style="padding:6px 0 2px;font-size:14px;color:${C.body};">Subtotal</td><td align="right" style="padding:6px 0 2px;font-size:14px;color:${C.body};">${money(order.subtotal, order.currency)}</td></tr>
        <tr><td style="padding:2px 0;font-size:14px;color:${C.body};">Taxes &amp; Fees</td><td align="right" style="padding:2px 0;font-size:14px;color:${C.body};">${money(taxesAndFees, order.currency)}</td></tr>
        ${order.tip > 0 ? `<tr><td style="padding:2px 0;font-size:14px;color:${C.body};">Tip &mdash; thank you!</td><td align="right" style="padding:2px 0;font-size:14px;color:${C.body};">${money(order.tip, order.currency)}</td></tr>` : ''}
        ${order.discount?.amount ? `<tr><td style="padding:2px 0;font-size:14px;color:${C.body};">Discount</td><td align="right" style="padding:2px 0;font-size:14px;color:${C.body};">-${money(order.discount.amount, order.currency)}</td></tr>` : ''}
        <tr><td bgcolor="${C.tile}" style="padding:9px 10px;margin-top:6px;font-size:15px;font-weight:800;color:${C.text};background:${C.tile};border-radius:10px 0 0 10px;">Total to pay</td><td align="right" bgcolor="${C.tile}" style="padding:9px 10px;font-size:18px;font-weight:800;color:${C.text};background:${C.tile};border-radius:0 10px 10px 0;">${esc(total)}</td></tr>
      </table>
    </td></tr></table>
  </td></tr>

  ${accountNote}

  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:12px 32px 8px;background:${C.card};">
    <div style="font-size:16px;font-weight:800;color:${C.text};">Questions?</div>
    <div style="font-size:14px;color:${C.body};line-height:20px;margin-top:3px;">Reply to this email or write to <a href="mailto:${SUPPORT}" style="color:${C.brandText};font-weight:800;">${SUPPORT}</a>.</div>
  </td></tr>

  <tr><td align="center" bgcolor="${C.strip}" style="padding:10px 32px 4px;background:${C.strip};"><img src="${logoUrl}" alt="NikFoods" width="100" style="display:block;border:0;width:100px;height:auto;max-width:100%;margin:0 auto;"></td></tr>
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:6px 32px 10px;background:${C.card};">
    <div style="font-size:13px;color:${C.body};font-style:italic;">Authentic Indian food delivered to your doorstep.</div>
    <div style="font-size:11px;color:${C.muted};margin-top:3px;">&copy; ${new Date().getFullYear()} NikFoods. All rights reserved.</div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

import { Order, OrderDay } from '@/types/order';
import { getSiteUrl } from '@/lib/siteUrl';
import { EMAIL_LOGO_CID } from '@/lib/emailLogo';

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const money = (n: number, currency = 'usd') => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(n);

const C = {
  page: '#F3EBDD', card: '#FFFBF5', surface: '#FBF1E1', line: '#EADBC3', text: '#2B1D0E', body: '#54442F', muted: '#76664F',
  brand: '#F89C35', brandText: '#A85A00', onBrand: '#1A1106', tile: '#FFE7C2', tileLine: '#F2B35E', green: '#14803C', noteBg: '#FFF1DC', noteLine: '#F3D8A8', noteText: '#5B3F10', strip: '#1E1409',
};
const SUPPORT = 'support@nikfoods.com';

export function getPaymentLinkEmailSubject(order: Order): string {
  return `NikFoods Order #${order.orderId} - Payment Link`;
}

function formatDay(date: string): string {
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const has = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const PST = 'America/Los_Angeles';

function toDate(d: Date | string): Date {
  if (typeof d === 'string') {
    const [y, m, day] = d.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, day, 20));
  }
  return d;
}
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', { ...o, timeZone: PST });

/** A coloured, bordered block as a table cell (bgcolor attribute survives where div backgrounds do not). */
function block(opts: { w: number; h: number; bg: string; border: string; radius: number; inner: string }): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
<td width="${opts.w}" height="${opts.h}" align="center" valign="middle" bgcolor="${opts.bg}" style="width:${opts.w}px;height:${opts.h}px;background:${opts.bg};border:2px solid ${opts.border};border-radius:${opts.radius}px;">${opts.inner}</td>
</tr></table>`;
}

/** The small tags under an item: portion (amber), spice level (red, with a chilli) and eco container (green), when selected. */
function chips(item: OrderDay['items'][number]): string {
  const tags: Array<{ text: string; bg: string; line: string; color: string }> = [];
  if (has(item.selectedPortion)) tags.push({ text: item.selectedPortion.trim(), bg: C.tile, line: C.tileLine, color: C.brandText });
  if (has(item.spiceLevel)) tags.push({ text: `\u{1F336}\uFE0F ${item.spiceLevel.trim()}`, bg: '#FDE7E2', line: '#EFA397', color: '#A12A14' });
  if (item.isEcoFriendlyContainer) tags.push({ text: '\u267B\uFE0F Eco', bg: '#E2F4E7', line: '#8CCB9B', color: '#126B2C' });
  return tags
    .map(
      (g) =>
        `<span class="tag" style="display:inline-block;margin:3px 6px 0 0;padding:1px 9px;border:1px solid ${g.line};border-radius:999px;background:${g.bg};color:${g.color};font-size:11px;font-weight:700;line-height:16px;">${esc(g.text)}</span>`
    )
    .join('');
}

/** What was chosen in a combo, one line per section: "Veg Curry of the Day: Kale Chane (12Oz)". */
function toppings(item: OrderDay['items'][number]): string {
  if (!item.comboSelections || !item.food.sections) return '';
  const lines = item.food.sections
    .map((s) => {
      const chosen = (item.comboSelections?.[s._id] ?? [])
        .map((id: string) => s.selectedItems.find((si) => si._id === id))
        .filter((si): si is NonNullable<typeof si> => !!si?.item?.name)
        .map((si) => `<span style="white-space:nowrap;font-weight:700;color:${C.body};">${esc(si.item.name)}${has(si.portion) ? ` (${esc(si.portion.trim())})` : ''}</span>`);
      if (!chosen.length) return '';
      return `<div style="margin-top:1px;color:${C.muted};font-size:12px;line-height:17px;"><span style="font-weight:400;">${esc(s.title)}:</span> ${chosen.join(', ')}</div>`;
    })
    .filter(Boolean);
  if (!lines.length) return '';
  return `<div style="margin-top:3px;">${lines.join('')}</div>`;
}

function itemRow(item: OrderDay['items'][number], currency: string, last: boolean): string {
  const b = last ? '' : `border-bottom:1px solid ${C.line};`;
  const num = `padding:7px 0;${b}font-size:15px;line-height:21px;color:${C.text};white-space:nowrap;`;
  return `
<tr>
  <td valign="top" style="padding:7px 8px 7px 0;${b}">
    <div style="font-size:15px;font-weight:700;line-height:21px;color:${C.text};">${esc(item.food.name)}</div>
    ${chips(item)}${toppings(item)}
    ${has(item.notes) ? `<div style="margin-top:6px;color:${C.green};font-size:12px;font-style:italic;line-height:18px;">&ldquo;${esc(item.notes.trim())}&rdquo;</div>` : ''}
  </td>
  <td class="c-qty" width="64" align="center" valign="top" style="${num}font-weight:600;">${item.quantity}</td>
  <td class="c-total" width="90" align="right" valign="top" style="${num}font-weight:800;">${money(item.price * item.quantity, currency)}</td>
</tr>`;
}

/** A label / value line inside the customer and delivery boxes; `pad` is the space above and below it. */
function detail(label: string, value?: string | null, pad = 3): string {
  if (!has(value)) return '';
  return `<tr>
    <td class="dt" valign="top" style="padding:${pad}px 10px ${pad}px 0;font-size:12px;color:${C.muted};white-space:nowrap;line-height:18px;">${label}</td>
    <td class="dt" valign="top" style="padding:${pad}px 0;font-size:13px;color:${C.text};font-weight:600;line-height:18px;word-break:break-word;overflow-wrap:anywhere;">${esc(value.trim())}</td>
  </tr>`;
}

/** The customer / delivery details boxes: each is a table cell in one row, so both are always the same height. */
function detailCell(opts: { title: string; widthPct: number; body: string }): string {
  return `<td class="stack2" valign="top" width="${opts.widthPct}%" bgcolor="${C.surface}" style="width:${opts.widthPct}%;background:${C.surface};border:1px solid ${C.line};border-radius:16px;padding:9px 14px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:8px;">${opts.title}</div>
    ${opts.body}
  </td>`;
}

/** Two cells side by side (equal height) on a computer, one under the other on a phone. */
function sideBySideRow(left: string, right: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;"><tr>
    ${left}
    <td class="gap" width="16" style="width:16px;font-size:1px;line-height:1px;">&nbsp;</td>
    ${right}
  </tr></table>`;
}

function detailBoxes(order: Order): string {
  const a = order.address;
  const street = has(a.street) ? a.street.trim() : '';
  const cityLine = [a.city, a.state, a.zipCode].filter(has).join(', ');
  const addressText = street && has(a.city) && !street.toLowerCase().includes(a.city.trim().toLowerCase()) ? `${street}, ${cityLine}` : street || cityLine;
  const customerBox = detailCell({
    title: 'Customer Details',
    widthPct: 42,
    body: `<table role="presentation" cellpadding="0" cellspacing="0">${detail('Name', order.customerInfo.name, 7)}${detail('Mobile', order.customerInfo.phone, 7)}${detail('Email', order.customerInfo.email, 7)}</table>`,
  });
  const deliveryBox = detailCell({
    title: 'Delivery Details',
    widthPct: 56,
    body: `<table role="presentation" cellpadding="0" cellspacing="0">${detail('Customer Name', order.customerInfo.name)}${detail('Mobile', order.customerInfo.phone)}${detail('Address', addressText)}${detail('Apartment', a.apartment)}${detail('Gate Code', a.entrance)}${detail('Delivery Instruction', a.floor)}${detail('Landmark', a.landmark)}</table>`,
  });
  return sideBySideRow(customerBox, deliveryBox);
}

/** One card per menu day, like the order confirmation: date tile, "Deliver on ...", items with tags and combo choices, day total. */
function dayCards(order: Order): string {
  const currency = order.currency || 'usd';
  const days = [...order.items].sort((x, y) => toDate(x.deliveryDate || x.actualDeliveryDate || new Date(0)).getTime() - toDate(y.deliveryDate || y.actualDeliveryDate || new Date(0)).getTime());
  return days
    .map((day) => {
      const d = toDate(day.actualDeliveryDate || day.deliveryDate);
      const weekday = fmt(d, { weekday: 'long' });
      const full = fmt(d, { month: 'long', day: 'numeric', year: 'numeric' });
      // the tile shows the day the item was picked for; the text beside it says when it is delivered
      const picked = day.deliveryDate ? toDate(day.deliveryDate) : d;
      const month = fmt(picked, { month: 'short' }).toUpperCase();
      const dom = fmt(picked, { day: 'numeric' });
      const total = day.dayTotal ?? day.items.reduce((s, i) => s + i.price * i.quantity, 0);
      const n = day.items.reduce((s, i) => s + i.quantity, 0);
      const colHead = (txt: string, align: string, cls = '', w?: number) =>
        `<td ${cls ? `class="${cls}" ` : ''}${w ? `width="${w}" ` : ''}align="${align}" style="padding:6px 0 0;font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">${txt}</td>`;
      const qtyHead = '<span class="qty-long">Quantity</span><span class="qty-short" style="display:none;">Qty</span>';
      return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="margin-top:10px;border:1px solid ${C.line};border-radius:16px;border-collapse:separate;background:${C.card};">
  <tr><td class="dpx" bgcolor="${C.surface}" style="padding:8px 18px;background:${C.surface};border-bottom:1px solid ${C.line};border-radius:15px 15px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="64" valign="middle">${block({ w: 50, h: 50, bg: C.tile, border: C.brand, radius: 12, inner: `<div style="font-size:10px;font-weight:800;letter-spacing:0.12em;color:${C.brandText};line-height:12px;">${month}</div><div style="font-size:21px;font-weight:800;color:${C.text};line-height:23px;">${dom}</div>` })}</td>
      <td valign="middle">
        <div style="font-size:17px;font-weight:800;color:${C.text};line-height:24px;">${esc(day.day)}</div>
        <div style="font-size:13px;color:${C.muted};line-height:18px;">Deliver on <strong style="color:${C.text};">${esc(weekday)}</strong>, ${esc(full)}</div>
      </td>
      <td valign="middle" align="right" width="92">${block({ w: 84, h: 30, bg: C.tile, border: C.brand, radius: 16, inner: `<span style="font-size:12px;font-weight:800;line-height:26px;color:${C.brandText};white-space:nowrap;">${n} item${n === 1 ? '' : 's'}</span>` })}</td>
    </tr></table>
  </td></tr>
  <tr><td class="dpx" style="padding:0 18px 2px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>${colHead('Item', 'left')}${colHead(qtyHead, 'center', 'h-qty', 64)}${colHead('Price', 'right', 'h-total', 90)}</tr>
      ${day.items.map((it, i) => itemRow(it, currency, i === day.items.length - 1)).join('')}
    </table>
  </td></tr>
  <tr><td class="dpx" bgcolor="${C.surface}" style="padding:7px 18px;background:${C.surface};border-top:1px solid ${C.line};border-radius:0 0 15px 15px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="right" style="font-size:13px;font-weight:700;color:${C.body};">${esc(day.day)} total&nbsp;&nbsp;<span style="font-size:15px;font-weight:800;color:${C.text};">${money(total, currency)}</span></td>
    </tr></table>
  </td></tr>
</table>`;
    })
    .join('');
}

function sumRow(label: string, value: string, note?: string): string {
  return `<tr>
    <td style="padding:3px 0;font-size:14px;color:${C.body};line-height:20px;">${label}${note ? `<span style="color:${C.muted};font-size:12px;"> ${note}</span>` : ''}</td>
    <td align="right" style="padding:3px 0;font-size:14px;font-weight:700;color:${C.text};white-space:nowrap;">${value}</td>
  </tr>`;
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
    .dpx { padding-left:14px !important; padding-right:14px !important; }
    .stack2 { display:block !important; width:auto !important; }
    .gap { display:block !important; width:100% !important; height:14px !important; line-height:14px !important; }
    .dt { padding-top:2px !important; padding-bottom:2px !important; }
    .c-qty, .h-qty { width:22px !important; }
    .c-total, .h-total { width:64px !important; }
    .tag { font-size:10px !important; padding:2px 7px !important; margin-right:4px !important; }
    .c-total { font-size:14px !important; }
    .qty-long { display:none !important; }
    .qty-short { display:inline !important; }
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
    <div style="font-size:15px;line-height:22px;color:${C.body};margin:6px auto 0;max-width:460px;">We have put your order together. Tap the button to pay securely by card or Apple Pay, and we will start preparing it right away.</div>
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
    ${detailBoxes(order)}
  </td></tr>

  <tr><td class="px" bgcolor="${C.card}" style="padding:10px 32px 0;background:${C.card};">
    <div style="font-size:20px;font-weight:800;color:${C.text};line-height:26px;">Order Details</div>
    ${dayCards(order)}
  </td></tr>

  <tr><td class="px" bgcolor="${C.card}" style="padding:12px 32px 0;background:${C.card};">
    <div style="font-size:20px;font-weight:800;color:${C.text};line-height:26px;margin-bottom:12px;">Payment summary</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="border:1px solid ${C.line};border-radius:16px;border-collapse:separate;background:${C.card};">
      <tr><td style="padding:8px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${sumRow('Subtotal', money(order.subtotal, order.currency))}
          ${order.discount?.amount ? sumRow('Discount', `-${money(order.discount.amount, order.currency)}`) : ''}
          ${sumRow('Taxes &amp; Fees', money(taxesAndFees, order.currency))}
          ${order.tip > 0 ? sumRow('Tip', money(order.tip, order.currency), '&mdash; thank you!') : ''}
        </table>
      </td></tr>
      <tr><td bgcolor="${C.brand}" style="padding:11px 18px;background:${C.brand};border-radius:0 0 15px 15px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:15px;font-weight:800;color:${C.onBrand};">Total to pay</td>
          <td align="right" style="font-size:22px;font-weight:800;color:${C.onBrand};">${esc(total)}</td>
        </tr></table>
      </td></tr>
    </table>
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

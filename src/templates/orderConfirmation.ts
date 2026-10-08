// Order confirmation email: the structure of the original email (customer + delivery details, order details by day, price summary,
// track your order, how delivery works) in the redesigned light-first, inversion-safe look.
// Rules learned from a real phone test:
//  - mail apps expect light emails and recolour/flip dark ones badly -> design light, with dark text
//  - every coloured block is a table cell with a bgcolor attribute (styled <div> backgrounds get dropped)
//  - text on small coloured blocks is dark and the block has a border, so it stays readable even if the fill is dropped
//  - the gold logo sits on its own dark strip (an opaque image on a solid cell), never directly on a flipping page
import type { Order, OrderDay, OrderDayItem, CustomerInfo } from '@/types/order';
const PST = 'America/Los_Angeles';
import { getSiteUrl } from '@/lib/siteUrl';
import { EMAIL_LOGO_CID } from '@/lib/emailLogo';
import { TAXES_FEES_FOOTNOTE, hasAmount } from '@/lib/orderTotalsDisplay';
const SUPPORT = 'support@nikfoods.com';

const C = {
  page: '#F3EBDD',
  card: '#FFFBF5',
  surface: '#FBF1E1',
  line: '#EADBC3',
  text: '#2B1D0E',
  body: '#54442F',
  muted: '#76664F',
  brand: '#F89C35',
  brandText: '#A85A00',
  onBrand: '#1A1106',
  tile: '#FFE7C2',
  tileLine: '#F2B35E',
  green: '#14803C',
  noteBg: '#FFF1DC',
  noteLine: '#F3D8A8',
  noteText: '#5B3F10',
  strip: '#1E1409',
};

const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const has = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const money = (n: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(n);

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

/** The small tags under an item: portion (amber), spice level (red) and eco container (green), when selected. */
function chips(item: OrderDayItem): string {
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
function toppings(item: OrderDayItem): string {
  if (!item.comboSelections || !item.food.sections) return '';
  const lines = item.food.sections
    .map((s) => {
      const chosen = (item.comboSelections?.[s._id] ?? [])
        .map((id: string) => s.selectedItems.find((si) => si._id === id))
        .filter((si): si is NonNullable<typeof si> => !!si?.item?.name)
        // the chosen item is the important part: its name and its size are bold and dark; only the section title stays light
        .map((si) => `<span style="white-space:nowrap;font-weight:700;color:${C.body};">${esc(si.item.name)}${has(si.portion) ? ` (${esc(si.portion.trim())})` : ''}</span>`);
      if (!chosen.length) return '';
      return `<div style="margin-top:1px;color:${C.muted};font-size:12px;line-height:17px;"><span style="font-weight:400;">${esc(s.title)}:</span> ${chosen.join(', ')}</div>`;
    })
    .filter(Boolean);
  if (!lines.length) return '';
  return `<div style="margin-top:3px;">${lines.join('')}</div>`;
}

function itemRow(item: OrderDayItem, currency: string, last: boolean): string {
  // one price column: what this line costs (item.price already includes portion and eco charge, times the quantity)
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

/** A row of the price summary; `note` is a small muted addition after the label. */
function sumRow(label: string, value: string, note?: string): string {
  return `<tr>
    <td style="padding:3px 0;font-size:14px;color:${C.body};line-height:20px;">${label}${note ? `<span style="color:${C.muted};font-size:12px;"> ${note}</span>` : ''}</td>
    <td align="right" style="padding:3px 0;font-size:14px;font-weight:700;color:${C.text};white-space:nowrap;">${value}</td>
  </tr>`;
}

/** The customer / delivery details boxes: each is a table cell in one row, so both are always the same height. */
function detailCell(opts: { title: string; widthPct: number; body: string }): string {
  return `<td class="stack2" valign="top" width="${opts.widthPct}%" bgcolor="${C.surface}" style="width:${opts.widthPct}%;background:${C.surface};border:1px solid ${C.line};border-radius:16px;padding:9px 14px;">
    <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:8px;">${opts.title}</div>
    ${opts.body}
  </td>`;
}

/**
 * The "Track your order" / "How delivery works" boxes. Each box is itself a table cell, so two boxes in one
 * row are always the same height. A curved coloured top border, the title with a divider, and each point on
 * its own row with a small dot marker. The words are passed in unchanged.
 */
function noteCell(opts: { title: string; bg: string; line: string; accent: string; titleColor: string; textColor: string; items: string[] }): string {
  const dot = `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="8" height="8" bgcolor="${opts.accent}" style="width:8px;height:8px;background:${opts.accent};border-radius:4px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>`;
  const rows = opts.items
    .map((li, i) => {
      const top = i === 0 ? '0' : '5px';
      return `<tr>
        <td width="22" valign="top" style="padding:${top} 0 0 0;"><div style="padding-top:6px;">${dot}</div></td>
        <td valign="top" style="padding:${top} 0 0 0;font-size:14px;line-height:20px;color:${opts.textColor};" class="nt">${li}</td>
      </tr>`;
    })
    .join('');
  return `<td valign="top" width="100%" bgcolor="${opts.bg}" style="background:${opts.bg};border:1px solid ${opts.line};border-top:4px solid ${opts.accent};border-radius:16px;padding:8px 14px 10px;">
      <div style="font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${opts.titleColor};padding-bottom:6px;margin-bottom:7px;border-bottom:1px solid ${opts.line};">${opts.title}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
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

/** The two note boxes, one under the other at full width (no empty space inside the shorter one). */
function noteRow(top: string, bottom: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;">
    <tr>${top}</tr>
    <tr><td height="12" style="height:12px;font-size:1px;line-height:1px;">&nbsp;</td></tr>
    <tr>${bottom}</tr>
  </table>`;
}

function logoStrip(logoUrl: string, w: number, pad: string): string {
  return `<tr><td align="center" bgcolor="${C.strip}" style="padding:${pad};background:${C.strip};">
    <img src="${logoUrl}" alt="NikFoods" width="${w}" style="display:block;border:0;outline:none;width:${w}px;height:auto;max-width:100%;margin:0 auto;text-align:center;font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:${C.brand};">
  </td></tr>`;
}

/** Subject line: "NikFoods Order Confirmation #<order number> - <order date>". */
export function getOrderConfirmationEmailSubject(order: Pick<Order, 'orderId' | 'createdAt'>): string {
  const placed = fmt(toDate(order.createdAt || new Date()), { month: 'short', day: 'numeric', year: 'numeric' });
  return `NikFoods Order Confirmation #${order.orderId} - ${placed}`;
}

export function getOrderConfirmationEmailTemplate(order: Order, profileCustomerDetails?: CustomerInfo): string {
  const customer = profileCustomerDetails ?? order.customerInfo;
  const currency = order.currency || 'usd';
  // Tax, Platform Fee and any delivery fee shown as one line
  const feesAndTaxes = (order.taxes || 0) + (order.platformFee || 0) + (order.deliveryFee || 0);
  const first = has(customer.name) ? customer.name.trim().split(/\s+/)[0] : 'there';
  const SITE = getSiteUrl();
  // attached to the email as an inline image (see lib/emailLogo.ts), so it shows without "Load External Images"
  const logoUrl = `cid:${EMAIL_LOGO_CID}`;
  // days in date order (the day each item was picked for), whatever order they were stored in
  const dayKey = (d: OrderDay) => toDate(d.deliveryDate || d.actualDeliveryDate || new Date(0)).getTime();
  const days: OrderDay[] = [...order.items].sort((x, y) => dayKey(x) - dayKey(y));
  const dayLabels = days.map((d) => fmt(toDate(d.actualDeliveryDate || d.deliveryDate), { weekday: 'short', month: 'short', day: 'numeric' }));
  const uniqueLabels = dayLabels.filter((l, i) => dayLabels.indexOf(l) === i);
  const preheader = `Order ${order.orderId} is confirmed. Delivering ${uniqueLabels.join(' & ')}.`;
  const a = order.address;
  // the street usually holds the whole address already; add the city line only when it is missing
  const street = has(a.street) ? a.street.trim() : '';
  const cityLine = [a.city, a.state, a.zipCode].filter(has).join(', ');
  const addressText = street && has(a.city) && !street.toLowerCase().includes(a.city.trim().toLowerCase()) ? `${street}, ${cityLine}` : street || cityLine;
  const ordersLink = `${SITE}/account/orders?order=${encodeURIComponent(String(order.orderId ?? ''))}`;

  const dayBlocks = days
    .map((day) => {
      const d = toDate(day.actualDeliveryDate || day.deliveryDate);
      const weekday = fmt(d, { weekday: 'long' });
      const full = fmt(d, { month: 'long', day: 'numeric', year: 'numeric' });
      // the tile shows the day the item was picked for (e.g. Wednesday Oct 7); the text beside it says when it is delivered
      const picked = day.deliveryDate ? toDate(day.deliveryDate) : d;
      const month = fmt(picked, { month: 'short' }).toUpperCase();
      const dom = fmt(picked, { day: 'numeric' });
      const total = day.dayTotal ?? day.items.reduce((s: number, i: OrderDayItem) => s + i.price * i.quantity, 0);
      const n = day.items.reduce((s: number, i: OrderDayItem) => s + i.quantity, 0);
      const colHead = (txt: string, align: string, cls = '', w?: number) =>
        `<td ${cls ? `class="${cls}" ` : ''}${w ? `width="${w}" ` : ''}align="${align}" style="padding:6px 0 0;font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">${txt}</td>`;
      // "Quantity" on a computer, "Qty" on a phone (the column is narrow there)
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
      ${day.items.map((it: OrderDayItem, i: number) => itemRow(it, currency, i === day.items.length - 1)).join('')}
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

  // the delivery box is wider (its address and longer labels need the room), the customer box narrower
  const customerBox = detailCell({
    title: 'Customer Details',
    widthPct: 42,
    body: `<table role="presentation" cellpadding="0" cellspacing="0">${detail('Name', customer.name, 7)}${detail('Mobile', customer.phone, 7)}${detail('Email', customer.email, 7)}</table>`,
  });
  const deliveryBox = detailCell({
    title: 'Delivery Details',
    widthPct: 56,
    body: `<table role="presentation" cellpadding="0" cellspacing="0">${detail('Customer Name', order.customerInfo.name)}${detail('Mobile', order.customerInfo.phone)}${detail('Address', addressText)}${detail('Apartment', a.apartment)}${detail('Gate Code', a.entrance)}${detail('Delivery Instruction', a.floor)}${detail('Landmark', a.landmark)}</table>`,
  });
  const trackBox = noteCell({
    title: 'Track your order',
    bg: C.surface,
    line: C.line,
    accent: C.brand,
    titleColor: C.brandText,
    textColor: C.body,
    items: [
      'On the delivery day, we share tracking details via email/text in the morning, including a live tracking link.',
      'You&rsquo;ll also receive a confirmation email/text once the order is delivered, with a photo of the drop-off location.',
    ],
  });
  const howBox = noteCell({
    title: 'How delivery works',
    bg: C.noteBg,
    line: C.noteLine,
    accent: C.brand,
    titleColor: C.brandText,
    textColor: C.noteText,
    items: [
      'We review your order against the weekly menu.',
      'Delivery happens once the minimum order value for the selected day is met.',
      'If not, your order is combined with the next delivery day.',
      'For offices, condos, or apartments orders are delivered to the concierge, front desk, or mailroom.',
    ],
  });
  return `<!DOCTYPE html>
<html lang="en" style="color-scheme:light dark;supported-color-schemes:light dark;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Order ${esc(order.orderId)} confirmed</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; }
  a { text-decoration:none; }
  @media only screen and (max-width: 620px) {
    .wrap { width:100% !important; border-radius:0 !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    .stack { display:block !important; width:100% !important; padding:0 0 14px 0 !important; border:0 !important; }
    .stack2 { display:block !important; width:auto !important; }
    .dpx { padding-left:14px !important; padding-right:14px !important; }
    .hero-l { font-size:11px !important; letter-spacing:0.04em !important; }
    .outer { padding:0 !important; }
    .dt { padding-top:2px !important; padding-bottom:2px !important; }
    .nt { font-size:13px !important; line-height:18px !important; }
    .c-qty, .h-qty { width:22px !important; }
    .c-total, .h-total { width:64px !important; }
    .tag { font-size:10px !important; padding:2px 7px !important; margin-right:4px !important; }
    .c-total { font-size:14px !important; }
    .qty-long { display:none !important; }
    .qty-short { display:inline !important; }
    .gap { display:block !important; width:100% !important; height:14px !important; line-height:14px !important; }
    .hero-h { font-size:25px !important; line-height:30px !important; }
    .meta-cell { display:block !important; width:100% !important; border-right:0 !important; border-bottom:1px solid ${C.line} !important; padding:12px 0 !important; }
    .btn a { display:block !important; }
  }
</style>
</head>
<body bgcolor="${C.page}" style="margin:0;padding:0;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${esc(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td class="outer" align="center" style="padding:16px 12px;">

<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:640px;max-width:640px;background:${C.card};border-radius:24px;overflow:hidden;border:1px solid ${C.line};border-collapse:separate;">

  <tr><td height="5" bgcolor="${C.brand}" style="height:5px;line-height:5px;font-size:1px;background:${C.brand};">&nbsp;</td></tr>

  ${logoStrip(logoUrl, 150, '14px 32px')}

  <!-- Hero -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:12px 32px 12px;background:${C.card};">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 6px;"><tr><td>
      ${block({ w: 44, h: 44, bg: C.brand, border: C.tileLine, radius: 26, inner: `<span style="font-size:24px;font-weight:800;line-height:44px;color:${C.onBrand};">&#10003;</span>` })}
    </td></tr></table>
    <div class="hero-l" style="font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:4px;word-break:break-word;">Order # ${esc(order.orderId)} confirmed</div>
    <div class="hero-h" style="font-size:30px;line-height:36px;font-weight:800;color:${C.text};margin:0;">Thank you, ${esc(first)}!</div>
    <div style="font-size:15px;line-height:22px;color:${C.body};margin:4px auto 0;max-width:430px;">We&rsquo;ve got your order and our kitchen&nbsp;is&nbsp;on&nbsp;it.</div>
  </td></tr>

  <!-- Customer details + delivery details -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:12px 32px 0;background:${C.card};">
    ${sideBySideRow(customerBox, deliveryBox)}
  </td></tr>

  <!-- Order details -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:10px 32px 0;background:${C.card};">
    <div style="font-size:20px;font-weight:800;color:${C.text};line-height:26px;">Order Details</div>
    ${dayBlocks}
  </td></tr>

  <!-- Payment summary -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:12px 32px 0;background:${C.card};">
    <div style="font-size:20px;font-weight:800;color:${C.text};line-height:26px;margin-bottom:12px;">Payment summary</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="border:1px solid ${C.line};border-radius:16px;border-collapse:separate;background:${C.card};">
      <tr><td style="padding:8px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${sumRow('Subtotal', money(order.subtotal, currency))}
          ${order.discount && order.discount.amount > 0 ? sumRow(`Discount${has(order.discount.code) ? ` (${esc(order.discount.code.trim())})` : ''}`, `-${money(order.discount.amount, currency)}`) : ''}
          ${hasAmount(feesAndTaxes) ? sumRow('Taxes &amp; Fees*', money(feesAndTaxes, currency)) : ''}
          ${order.tip > 0 ? sumRow('Tip', money(order.tip, currency), '&mdash; thank you!') : ''}
        </table>
        ${hasAmount(feesAndTaxes) ? `<div style="padding:2px 0 4px;font-size:12px;line-height:17px;color:${C.muted};">${esc(TAXES_FEES_FOOTNOTE)}</div>` : ''}
      </td></tr>
      <tr><td bgcolor="${C.brand}" style="padding:11px 18px;background:${C.brand};border-radius:0 0 15px 15px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:15px;font-weight:800;color:${C.onBrand};">Total paid</td>
          <td align="right" style="font-size:22px;font-weight:800;color:${C.onBrand};">${money(order.totalPaid, currency)}</td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Track your order + how delivery works -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:10px 32px 0;background:${C.card};">
    ${noteRow(trackBox, howBox)}
  </td></tr>

  <!-- View my order -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:10px 32px 0;background:${C.card};">
    <table role="presentation" class="btn" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
      <td align="center" bgcolor="${C.brand}" style="border-radius:14px;background:${C.brand};border:2px solid ${C.brand};">
        <a href="${ordersLink}" style="display:inline-block;padding:9px 30px;font-size:16px;font-weight:800;color:${C.onBrand};border-radius:14px;">View my order &rarr;</a>
      </td>
    </tr></table>
  </td></tr>

  <!-- Help -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:10px 32px 8px;background:${C.card};">
    <div style="font-size:16px;font-weight:800;color:${C.text};">Questions about your order?</div>
    <div style="font-size:14px;color:${C.body};line-height:20px;margin-top:3px;">We&rsquo;re happy to help. Email us at<br><a href="mailto:${SUPPORT}" style="color:${C.brandText};font-weight:800;">${SUPPORT}</a> or see our <a href="${SITE}/faqs" style="color:${C.brandText};font-weight:800;">FAQs</a>.</div>
  </td></tr>

  <!-- Footer -->
  ${logoStrip(logoUrl, 100, '10px 32px 4px')}
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:6px 32px 10px;background:${C.card};">
    <div style="font-size:13px;color:${C.body};font-style:italic;">Authentic Indian food delivered to your doorstep.</div>
    <div style="font-size:12px;margin-top:4px;"><a href="${SITE}/terms" style="color:${C.brandText};">Terms</a> &nbsp;&middot;&nbsp; <a href="${SITE}/privacy" style="color:${C.brandText};">Privacy</a></div>
    <div style="font-size:11px;color:${C.muted};margin-top:3px;">&copy; ${new Date().getFullYear()} NikFoods. All rights reserved.</div>
  </td></tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}

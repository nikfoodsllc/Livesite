// Redesigned order confirmation email, v5: LIGHT-FIRST and inversion-safe (draft, scratch copy).
// Rules learned from a real phone test:
//  - mail apps expect light emails and recolour/flip dark ones badly -> design light, with dark text
//  - every coloured block is a table cell with a bgcolor attribute (styled <div> backgrounds get dropped)
//  - text on small coloured blocks is dark and the block has a border, so it stays readable even if the fill is dropped
//  - the gold logo sits on its own dark strip (an opaque image on a solid cell), never directly on a flipping page
import type { Order, OrderDay, OrderDayItem, CustomerInfo } from '@/types/order';
const PST = 'America/Los_Angeles';
const SITE = 'https://www.nikfoods.com';
const SUPPORT = 'nikfoodsllc@gmail.com';

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

function chips(item: OrderDayItem): string {
  const out: string[] = [];
  if (has(item.selectedPortion)) out.push(item.selectedPortion.trim());
  if (item.food.spiceLevel?.length && has(item.spiceLevel)) out.push(`${item.spiceLevel.trim()} spice`);
  return out
    .map(
      (t) =>
        `<span style="display:inline-block;margin:5px 6px 0 0;padding:2px 9px;border:1px solid ${C.tileLine};border-radius:999px;background:${C.tile};color:${C.brandText};font-size:11px;font-weight:700;line-height:16px;">${esc(t)}</span>`
    )
    .join('');
}

function toppings(item: OrderDayItem): string {
  if (!item.comboSelections || !item.food.sections) return '';
  const lines = item.food.sections
    .flatMap((s) =>
      (item.comboSelections?.[s._id] ?? []).map((id: string) => s.selectedItems.find((si) => si._id === id)?.item?.name)
    )
    .filter(Boolean);
  if (!lines.length) return '';
  return `<div style="margin-top:4px;color:${C.muted};font-size:12px;line-height:18px;">+ ${lines.map(esc).join(', ')}</div>`;
}

function itemRow(item: OrderDayItem, currency: string, last: boolean): string {
  const b = last ? '' : `border-bottom:1px solid ${C.line};`;
  return `
<tr>
  <td width="48" valign="top" style="padding:14px 0;${b}">${block({ w: 32, h: 28, bg: C.surface, border: C.line, radius: 9, inner: `<span style="font-size:13px;font-weight:800;line-height:28px;color:${C.text};">${item.quantity}&times;</span>` })}</td>
  <td valign="top" style="padding:14px 8px 14px 0;${b}">
    <div style="font-size:15px;font-weight:700;line-height:21px;color:${C.text};">${esc(item.food.name)}</div>
    ${chips(item)}${toppings(item)}
    ${has(item.notes) ? `<div style="margin-top:6px;color:${C.green};font-size:12px;font-style:italic;line-height:18px;">&ldquo;${esc(item.notes.trim())}&rdquo;</div>` : ''}
  </td>
  <td valign="top" align="right" style="padding:14px 0;${b}white-space:nowrap;font-size:15px;font-weight:700;color:${C.text};">${money(item.price * item.quantity, currency)}</td>
</tr>`;
}

function dayCard(day: OrderDay, currency: string): string {
  const d = toDate(day.actualDeliveryDate || day.deliveryDate);
  const month = fmt(d, { month: 'short' }).toUpperCase();
  const dom = fmt(d, { day: 'numeric' });
  const weekday = fmt(d, { weekday: 'long' });
  const full = fmt(d, { month: 'long', day: 'numeric', year: 'numeric' });
  const total = day.dayTotal ?? day.items.reduce((s: number, i: OrderDayItem) => s + i.price * i.quantity, 0);
  const n = day.items.reduce((s: number, i: OrderDayItem) => s + i.quantity, 0);
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="margin-top:16px;border:1px solid ${C.line};border-radius:16px;border-collapse:separate;background:${C.card};">
  <tr><td bgcolor="${C.surface}" style="padding:16px 18px;background:${C.surface};border-bottom:1px solid ${C.line};border-radius:15px 15px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="66" valign="middle">${block({ w: 52, h: 52, bg: C.tile, border: C.brand, radius: 12, inner: `<div style="font-size:10px;font-weight:800;letter-spacing:0.12em;color:${C.brandText};line-height:12px;">${month}</div><div style="font-size:22px;font-weight:800;color:${C.text};line-height:24px;">${dom}</div>` })}</td>
      <td valign="middle" style="padding-left:6px;">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};line-height:14px;">Delivery</div>
        <div style="font-size:17px;font-weight:800;color:${C.text};line-height:24px;">${weekday}</div>
        <div style="font-size:13px;color:${C.muted};line-height:18px;">${full} &middot; ${n} item${n === 1 ? '' : 's'}</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:2px 18px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${day.items.map((it: OrderDayItem, i: number) => itemRow(it, currency, i === day.items.length - 1)).join('')}
    </table>
  </td></tr>
  <tr><td bgcolor="${C.surface}" style="padding:12px 18px;background:${C.surface};border-top:1px solid ${C.line};border-radius:0 0 15px 15px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:13px;font-weight:700;color:${C.body};">${esc(weekday)} total</td>
      <td align="right" style="font-size:15px;font-weight:800;color:${C.text};">${money(total, currency)}</td>
    </tr></table>
  </td></tr>
</table>`;
}

function detail(label: string, value?: string | null): string {
  if (!has(value)) return '';
  return `<tr>
    <td valign="top" style="padding:3px 10px 3px 0;font-size:12px;color:${C.muted};white-space:nowrap;line-height:18px;">${label}</td>
    <td valign="top" style="padding:3px 0;font-size:13px;color:${C.text};font-weight:600;line-height:18px;">${esc(value.trim())}</td>
  </tr>`;
}

function sumRow(label: string, value: string, opts: { green?: boolean; note?: string } = {}): string {
  return `<tr>
    <td style="padding:6px 0;font-size:14px;color:${C.body};line-height:20px;">${label}${opts.note ? `<span style="color:${C.muted};font-size:12px;"> ${opts.note}</span>` : ''}</td>
    <td align="right" style="padding:6px 0;font-size:14px;font-weight:700;color:${opts.green ? C.green : C.text};white-space:nowrap;">${value}</td>
  </tr>`;
}

function step(n: number, title: string, text: string, done: boolean, last: boolean): string {
  const circle = block({
    w: 26, h: 26,
    bg: done ? C.brand : C.card,
    border: C.brand,
    radius: 15,
    inner: `<span style="font-size:14px;font-weight:800;line-height:26px;color:${done ? C.onBrand : C.brandText};">${done ? '&#10003;' : n}</span>`,
  });
  return `<tr>
    <td width="44" valign="top" align="center" style="padding:0;">
      ${circle}
      ${last ? '' : `<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td width="2" height="24" bgcolor="${C.line}" style="width:2px;height:24px;background:${C.line};font-size:1px;line-height:1px;">&nbsp;</td></tr></table>`}
    </td>
    <td valign="top" style="padding:4px 0 ${last ? '0' : '12px'} 8px;">
      <div style="font-size:15px;font-weight:800;color:${C.text};line-height:20px;">${title}</div>
      <div style="font-size:13px;color:${C.body};line-height:19px;margin-top:2px;">${text}</div>
    </td>
  </tr>`;
}

function logoStrip(logoUrl: string, w: number, pad: string): string {
  return `<tr><td align="center" bgcolor="${C.strip}" style="padding:${pad};background:${C.strip};">
    <img src="${logoUrl}" alt="NikFoods" width="${w}" style="display:block;border:0;outline:none;width:${w}px;height:auto;max-width:100%;font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:${C.brand};">
  </td></tr>`;
}

export function getOrderConfirmationEmailTemplate(order: Order, profileCustomerDetails?: CustomerInfo): string {
  const customer = profileCustomerDetails ?? order.customerInfo;
  const currency = order.currency || 'usd';
  const first = has(customer.name) ? customer.name.trim().split(/\s+/)[0] : 'there';
  const logoUrl = `${SITE}/images/logo.png`;
  const days: OrderDay[] = order.items;
  const dayLabels = days.map((d) => fmt(toDate(d.actualDeliveryDate || d.deliveryDate), { weekday: 'short', month: 'short', day: 'numeric' }));
  const preheader = `Order ${order.orderId} is confirmed. Delivering ${dayLabels.join(' & ')}.`;
  const placed = fmt(toDate(order.createdAt || new Date()), { month: 'short', day: 'numeric', year: 'numeric' });
  const totalItems = days.reduce((s, d) => s + d.items.reduce((x: number, i: OrderDayItem) => x + i.quantity, 0), 0);
  const a = order.address;
  const addressLine2 = [a.city, a.state, a.zipCode].filter(has).join(', ');

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
    .hero-h { font-size:28px !important; line-height:34px !important; }
    .meta-cell { display:block !important; width:100% !important; border-right:0 !important; border-bottom:1px solid ${C.line} !important; padding:12px 0 !important; }
    .btn a { display:block !important; }
  }
</style>
</head>
<body bgcolor="${C.page}" style="margin:0;padding:0;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${esc(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td align="center" style="padding:28px 12px;">

<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:640px;max-width:640px;background:${C.card};border-radius:24px;overflow:hidden;border:1px solid ${C.line};border-collapse:separate;">

  <tr><td height="5" bgcolor="${C.brand}" style="height:5px;line-height:5px;font-size:1px;background:${C.brand};">&nbsp;</td></tr>

  ${logoStrip(logoUrl, 170, '22px 32px')}

  <!-- Hero -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:34px 32px 36px;background:${C.card};">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 20px;"><tr><td>
      ${block({ w: 62, h: 62, bg: C.brand, border: C.tileLine, radius: 36, inner: `<span style="font-size:34px;font-weight:800;line-height:62px;color:${C.onBrand};">&#10003;</span>` })}
    </td></tr></table>
    <div style="font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${C.brandText};margin-bottom:10px;">Order confirmed</div>
    <div class="hero-h" style="font-size:34px;line-height:40px;font-weight:800;color:${C.text};margin:0;">Thank you, ${esc(first)}!</div>
    <div style="font-size:16px;line-height:25px;color:${C.body};margin:12px auto 0;max-width:430px;">We&rsquo;ve got your order and our kitchen is on it. Fresh, authentic Indian food is on its way to you.</div>
  </td></tr>

  <!-- Meta strip -->
  <tr><td class="px" bgcolor="${C.surface}" style="padding:0 32px;background:${C.surface};border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td class="meta-cell" style="padding:16px 8px 16px 0;border-right:1px solid ${C.line};">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">Order number</div>
        <div style="font-size:15px;font-weight:800;color:${C.text};margin-top:3px;">${esc(order.orderId)}</div>
      </td>
      <td class="meta-cell" style="padding:16px 8px 16px 16px;border-right:1px solid ${C.line};">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">Placed on</div>
        <div style="font-size:15px;font-weight:800;color:${C.text};margin-top:3px;">${placed}</div>
      </td>
      <td class="meta-cell" style="padding:16px 0 16px 16px;" align="left">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">Total paid</div>
        <div style="font-size:15px;font-weight:800;color:${C.brandText};margin-top:3px;">${money(order.totalPaid, currency)}</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- CTA -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:30px 32px 6px;background:${C.card};">
    <table role="presentation" class="btn" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
      <td align="center" bgcolor="${C.brand}" style="border-radius:14px;background:${C.brand};border:2px solid ${C.brand};">
        <a href="${SITE}/account/orders" style="display:inline-block;padding:14px 34px;font-size:16px;font-weight:800;color:${C.onBrand};border-radius:14px;">View my order &rarr;</a>
      </td>
    </tr></table>
    <div style="font-size:12px;color:${C.muted};margin-top:12px;">${totalItems} item${totalItems === 1 ? '' : 's'} &middot; ${days.length} delivery day${days.length === 1 ? '' : 's'}</div>
  </td></tr>

  <!-- Schedule -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:26px 32px 4px;background:${C.card};">
    <div style="font-size:20px;font-weight:800;color:${C.text};line-height:26px;">Your delivery schedule</div>
    <div style="font-size:14px;color:${C.body};line-height:21px;margin-top:2px;">Here&rsquo;s what&rsquo;s coming and when.</div>
    ${days.map((d) => dayCard(d, currency)).join('')}
  </td></tr>

  <!-- Payment summary -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:26px 32px 4px;background:${C.card};">
    <div style="font-size:20px;font-weight:800;color:${C.text};line-height:26px;margin-bottom:12px;">Payment summary</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="border:1px solid ${C.line};border-radius:16px;border-collapse:separate;background:${C.card};">
      <tr><td style="padding:12px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${sumRow('Subtotal', money(order.subtotal, currency))}
          ${order.platformFee > 0 ? sumRow('Service fee', money(order.platformFee, currency)) : ''}
          ${order.deliveryFee > 0 ? sumRow('Delivery', money(order.deliveryFee, currency)) : ''}
          ${order.tip > 0 ? sumRow('Tip', money(order.tip, currency), { note: '&mdash; thank you!' }) : ''}
          ${order.discount && order.discount.amount > 0 ? sumRow(`Discount${has(order.discount.code) ? ` (${esc(order.discount.code.trim())})` : ''}`, `&minus;${money(order.discount.amount, currency)}`, { green: true }) : ''}
          ${sumRow('Tax', money(order.taxes, currency))}
        </table>
      </td></tr>
      <tr><td bgcolor="${C.brand}" style="padding:16px 18px;background:${C.brand};border-radius:0 0 15px 15px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:15px;font-weight:800;color:${C.onBrand};">Total paid</td>
          <td align="right" style="font-size:24px;font-weight:800;color:${C.onBrand};">${money(order.totalPaid, currency)}</td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Delivering to + contact -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:26px 32px 4px;background:${C.card};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td class="stack" valign="top" width="50%" style="padding-right:8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.surface}" style="border:1px solid ${C.line};border-radius:16px;border-collapse:separate;background:${C.surface};"><tr><td style="padding:16px 18px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:8px;">Delivering to</div>
          <div style="font-size:15px;font-weight:800;color:${C.text};line-height:21px;">${esc(order.customerInfo.name)}</div>
          <div style="font-size:14px;color:${C.body};line-height:21px;margin-top:2px;">${esc(a.street)}${has(a.apartment) ? `, ${esc(a.apartment)}` : ''}<br>${esc(addressLine2)}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;">
            ${detail('Gate code', a.entrance)}${detail('Instructions', a.floor)}${detail('Landmark', a.landmark)}
          </table>
        </td></tr></table>
      </td>
      <td class="stack" valign="top" width="50%" style="padding-left:8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.surface}" style="border:1px solid ${C.line};border-radius:16px;border-collapse:separate;background:${C.surface};"><tr><td style="padding:16px 18px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:8px;">Contact details</div>
          <table role="presentation" cellpadding="0" cellspacing="0">
            ${detail('Name', customer.name)}${detail('Mobile', customer.phone)}${detail('Email', customer.email)}
          </table>
          <div style="font-size:12px;color:${C.muted};line-height:18px;margin-top:10px;">We&rsquo;ll use these to share delivery updates.</div>
        </td></tr></table>
      </td>
    </tr></table>
  </td></tr>

  <!-- What happens next -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:30px 32px 4px;background:${C.card};">
    <div style="font-size:20px;font-weight:800;color:${C.text};line-height:26px;margin-bottom:16px;">What happens next</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${step(1, 'Order received', 'Your payment went through and your order is in. You&rsquo;re all set.', true, false)}
      ${step(2, 'We check the weekly menu', 'We review your order against this week&rsquo;s menu and start planning your meal.', false, false)}
      ${step(3, 'Delivery day updates', 'That morning we&rsquo;ll send you a live tracking link by email or text.', false, false)}
      ${step(4, 'Delivered with a photo', 'Once your food arrives, we&rsquo;ll send a confirmation with a photo of the drop-off spot.', false, true)}
    </table>
  </td></tr>

  <!-- Good to know -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:24px 32px 6px;background:${C.card};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.noteBg}" style="background:${C.noteBg};border:1px solid ${C.noteLine};border-radius:16px;border-collapse:separate;"><tr><td style="padding:16px 18px;">
      <div style="font-size:14px;font-weight:800;color:${C.brandText};margin-bottom:6px;">Good to know</div>
      <div style="font-size:13px;color:${C.noteText};line-height:20px;">
        &bull; Each delivery day has a minimum order. If a day falls short, we&rsquo;ll combine it with your next delivery day and let you know.<br>
        &bull; Offices, condos and apartments: your order goes to the concierge, front desk or mailroom.
      </div>
    </td></tr></table>
  </td></tr>

  <!-- Help -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:28px 32px 30px;background:${C.card};">
    <div style="font-size:17px;font-weight:800;color:${C.text};">Questions about your order?</div>
    <div style="font-size:14px;color:${C.body};line-height:22px;margin-top:6px;">We&rsquo;re happy to help. Email us at<br><a href="mailto:${SUPPORT}" style="color:${C.brandText};font-weight:800;">${SUPPORT}</a> or see our <a href="${SITE}/faqs" style="color:${C.brandText};font-weight:800;">FAQs</a>.</div>
  </td></tr>

  <!-- Footer -->
  ${logoStrip(logoUrl, 130, '22px 32px 10px')}
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:16px 32px 26px;background:${C.card};">
    <div style="font-size:13px;color:${C.body};font-style:italic;">Authentic Indian food delivered to your doorstep.</div>
    <div style="font-size:12px;margin-top:12px;"><a href="${SITE}/account/orders" style="color:${C.brandText};">My orders</a> &nbsp;&middot;&nbsp; <a href="${SITE}/terms" style="color:${C.brandText};">Terms</a> &nbsp;&middot;&nbsp; <a href="${SITE}/privacy" style="color:${C.brandText};">Privacy</a></div>
    <div style="font-size:11px;color:${C.muted};margin-top:10px;">&copy; ${new Date().getFullYear()} NikFoods. All rights reserved.</div>
  </td></tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}

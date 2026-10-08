import { Order } from '@/types/order';
import { getSiteUrl } from '@/lib/siteUrl';
import { EMAIL_LOGO_CID } from '@/lib/emailLogo';
import { dateText } from '@/lib/orderReschedule';

/** One delivery that moved: the date it was on and the date it is on now. */
export interface MovedDelivery {
  fromDate: string;
  toDate: string;
  /** What moved, e.g. '2 \u00d7 Dosa Batter' (shown under the dates) */
  items?: string[];
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function getDeliveryDateChangedEmailSubject(order: Pick<Order, 'orderId'>): string {
  return `NikFoods Order #${String(order.orderId ?? '').replace(/^#/, '')} - Delivery Date Updated`;
}

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
  noteBg: '#FFF1DC',
  noteLine: '#F3D8A8',
  noteText: '#5B3F10',
  strip: '#1E1409',
};
const SUPPORT = 'support@nikfoods.com';

/** 'Friday, October 9, 2026' for '2026-10-09'. */
function longDate(date: string): string {
  const d = new Date(`${date}T12:00:00.000Z`);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** 'Fri, Oct 9' */
function shortDate(date: string): string {
  const d = new Date(`${date}T12:00:00.000Z`);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function firstName(order: Order): string {
  const name = order.customerInfo?.name?.trim();
  return name ? name.split(/\s+/)[0] : '';
}

function logoStrip(logoUrl: string, w: number, pad: string): string {
  return `<tr><td align="center" bgcolor="${C.strip}" style="padding:${pad};background:${C.strip};">
    <img src="${logoUrl}" alt="NikFoods" width="${w}" style="display:block;border:0;outline:none;width:${w}px;height:auto;max-width:100%;margin:0 auto;text-align:center;font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:${C.brand};">
  </td></tr>`;
}

/** The moved deliveries as one line each, with duplicates (several lines that moved the same way) merged. */
export function uniqueMoves(moves: MovedDelivery[]): MovedDelivery[] {
  const byKey = new Map<string, MovedDelivery>();
  for (const m of moves) {
    if (!m.fromDate || !m.toDate || m.fromDate === m.toDate) continue;
    const key = `${m.fromDate}>${m.toDate}`;
    const existing = byKey.get(key);
    if (existing) existing.items = [...(existing.items ?? []), ...(m.items ?? [])];
    else byKey.set(key, { ...m, items: [...(m.items ?? [])] });
  }
  const out = [...byKey.values()];
  return out.sort((a, b) => a.toDate.localeCompare(b.toDate) || a.fromDate.localeCompare(b.fromDate));
}

/** What the customer gets on each delivery date now: item names with quantities, oldest date first. */
function scheduleByDate(order: Order): Array<{ date: string; lines: string[] }> {
  const byDate = new Map<string, string[]>();
  for (const day of order.items ?? []) {
    const date = dateText(day.actualDeliveryDate) || dateText(day.deliveryDate);
    if (!date) continue;
    const lines = byDate.get(date) ?? [];
    for (const item of day.items ?? []) {
      const name = item.food?.name?.trim();
      if (name) lines.push(`${item.quantity} × ${name}`);
    }
    byDate.set(date, lines);
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, lines]) => ({ date, lines }));
}

/**
 * "Your delivery date has changed" email (same look as the order confirmation: light-first, every coloured
 * block is a table cell with a bgcolor, the gold logo sits on its own dark strip).
 */
export function getDeliveryDateChangedEmailTemplate(order: Order, movedDeliveries: MovedDelivery[]): string {
  const logoUrl = `cid:${EMAIL_LOGO_CID}`;
  const siteUrl = getSiteUrl();
  const orderId = escapeHtml(String(order.orderId ?? '').replace(/^#/, ''));
  const name = firstName(order);
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';
  const moves = uniqueMoves(movedDeliveries);
  const orderUrl = `${siteUrl}/account/orders?order=${encodeURIComponent(String(order.orderId ?? '').replace(/^#/, ''))}`;

  const moveRows = moves
    .map(
      (m) => `<tr><td style="padding:6px 0;">
        <div style="font-size:13px;color:${C.muted};text-decoration:line-through;line-height:18px;">${escapeHtml(longDate(m.fromDate))}</div>
        <div style="font-size:17px;font-weight:800;color:${C.text};line-height:24px;">&rarr; ${escapeHtml(longDate(m.toDate))}</div>
        ${(m.items ?? []).map((name) => `<div style="font-size:13px;color:${C.body};line-height:19px;">${escapeHtml(name)}</div>`).join('')}
      </td></tr>`
    )
    .join('');

  const scheduleCards = scheduleByDate(order)
    .map(
      (s) => `<tr><td style="padding:0 0 10px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.surface}" style="background:${C.surface};border:1px solid ${C.line};border-radius:14px;border-collapse:separate;"><tr><td style="padding:9px 14px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:4px;">${escapeHtml(shortDate(s.date))}</div>
          ${s.lines.map((l) => `<div style="font-size:14px;line-height:21px;color:${C.body};">${escapeHtml(l)}</div>`).join('')}
        </td></tr></table>
      </td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en" style="color-scheme:light dark;supported-color-schemes:light dark;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your NikFoods delivery date has changed</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; }
  a { text-decoration:none; }
  @media only screen and (max-width: 620px) {
    .wrap { width:100% !important; border-radius:0 !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    .hero-h { font-size:25px !important; line-height:30px !important; }
    .btn a { display:block !important; }
    .hero-l { font-size:11px !important; letter-spacing:0.04em !important; }
    .outer { padding:0 !important; }
  }
</style>
</head>
<body bgcolor="${C.page}" style="margin:0;padding:0;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">Your NikFoods delivery date has changed. See your new delivery date.&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td class="outer" align="center" style="padding:16px 12px;">

<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:640px;max-width:640px;background:${C.card};border-radius:24px;overflow:hidden;border:1px solid ${C.line};border-collapse:separate;">

  <tr><td height="5" bgcolor="${C.brand}" style="height:5px;line-height:5px;font-size:1px;background:${C.brand};">&nbsp;</td></tr>

  ${logoStrip(logoUrl, 150, '14px 32px')}

  <!-- Hero -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:12px 32px 12px;background:${C.card};">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 6px;"><tr><td>
      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
        <td width="44" height="44" align="center" valign="middle" bgcolor="${C.tile}" style="width:44px;height:44px;background:${C.tile};border:2px solid ${C.brand};border-radius:26px;"><span style="font-size:24px;font-weight:800;font-style:italic;font-family:Georgia,'Times New Roman',serif;line-height:44px;color:${C.brandText};">i</span></td>
      </tr></table>
    </td></tr></table>
    <div class="hero-l" style="font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:4px;word-break:break-word;">Order # ${orderId} updated</div>
    <div class="hero-h" style="font-size:30px;line-height:36px;font-weight:800;color:${C.text};margin:0;">${greeting} your delivery date has changed</div>
    <div style="font-size:15px;line-height:22px;color:${C.body};margin:4px auto 0;max-width:440px;">Your order, items and payment stay the same. Only the delivery date is different.</div>
  </td></tr>

  <!-- New date -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:12px 32px 0;background:${C.card};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.noteBg}" style="background:${C.noteBg};border:1px solid ${C.noteLine};border-radius:16px;border-collapse:separate;"><tr><td style="padding:9px 14px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:2px;">${moves.length > 1 ? 'New delivery dates' : 'New delivery date'}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${moveRows}</table>
    </td></tr></table>
  </td></tr>

  <!-- Schedule -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:14px 32px 0;background:${C.card};">
    <div style="font-size:16px;font-weight:800;color:${C.text};margin-bottom:8px;">Your delivery schedule</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${scheduleCards}</table>
  </td></tr>

  <!-- CTA -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:4px 32px 0;background:${C.card};">
    <table role="presentation" class="btn" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
      <td align="center" bgcolor="${C.brand}" style="border-radius:14px;background:${C.brand};border:2px solid ${C.brand};">
        <a href="${escapeHtml(orderUrl)}" style="display:inline-block;padding:9px 30px;font-size:16px;font-weight:800;color:${C.onBrand};border-radius:14px;">View my order &rarr;</a>
      </td>
    </tr></table>
  </td></tr>

  <!-- Help -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:12px 32px 8px;background:${C.card};">
    <div style="font-size:16px;font-weight:800;color:${C.text};">Questions about your order?</div>
    <div style="font-size:14px;color:${C.body};line-height:20px;margin-top:3px;">Just reply to this email or write to us at<br><a href="mailto:${SUPPORT}" style="color:${C.brandText};font-weight:800;">${SUPPORT}</a></div>
    <div style="font-size:12px;color:${C.muted};margin-top:6px;">We&rsquo;re sorry for the change and thank you for your patience.</div>
  </td></tr>

  <!-- Footer -->
  ${logoStrip(logoUrl, 100, '10px 32px 4px')}
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:6px 32px 10px;background:${C.card};">
    <div style="font-size:13px;color:${C.body};font-style:italic;">Authentic Indian food delivered to your doorstep.</div>
    <div style="font-size:12px;margin-top:4px;"><a href="${siteUrl}/terms" style="color:${C.brandText};">Terms</a> &nbsp;&middot;&nbsp; <a href="${siteUrl}/privacy" style="color:${C.brandText};">Privacy</a></div>
    <div style="font-size:11px;color:${C.muted};margin-top:3px;">&copy; ${new Date().getFullYear()} NikFoods. All rights reserved.</div>
  </td></tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}

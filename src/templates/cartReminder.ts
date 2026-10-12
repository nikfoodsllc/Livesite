import { getSiteUrl } from '@/lib/siteUrl';
import { EMAIL_LOGO_CID } from '@/lib/emailLogo';
import type { DraftItem } from '@/lib/server/checkoutDrafts';

/**
 * The gentle reminder for a cart that was left before paying. Same look as the other NikFoods emails (light-first, every
 * coloured block is a table cell with a bgcolor, the gold logo on its own dark strip). It names what was in the cart, says
 * there is no rush, links to the cart and promises only this one reminder: no countdowns, no discounts, no pressure.
 */

export interface CartReminderInput {
  /** The customer's name as saved; only the first name is used */
  name?: string | null;
  items: DraftItem[];
  /** The cart total when they left (items only; taxes and fees are worked out at checkout) */
  total: number;
}

export function getCartReminderEmailSubject(): string {
  return '\u{1F6D2} You Left Something Delicious Behind';
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
  tileLine: '#F3C27A',
  noteBg: '#FFF1DC',
  noteLine: '#F3D8A8',
  noteText: '#5B3F10',
  strip: '#1E1409',
};
const SUPPORT = 'support@nikfoods.com';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

const dayLabel = (date: string) => {
  const [y, m, d] = String(date).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(Date.UTC(y, m - 1, d, 12)));
};

function logoStrip(logoUrl: string, w: number, pad: string): string {
  return `<tr><td align="center" bgcolor="${C.strip}" style="padding:${pad};background:${C.strip};">
    <img src="${logoUrl}" alt="NikFoods" width="${w}" style="display:block;border:0;outline:none;width:${w}px;height:auto;max-width:100%;margin:0 auto;text-align:center;font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:${C.brand};">
  </td></tr>`;
}

/** The small tags under an item: size (amber), spice (red) and eco container (green). */
function chips(item: DraftItem): string {
  const tags: Array<{ text: string; bg: string; line: string; color: string }> = [];
  if (item.portion?.trim()) tags.push({ text: item.portion.trim(), bg: C.tile, line: C.tileLine, color: C.brandText });
  if (item.spice?.trim()) tags.push({ text: `\u{1F336}️ ${item.spice.trim()}`, bg: '#FDE7E2', line: '#EFA397', color: '#A12A14' });
  if (item.eco) tags.push({ text: '♻️ Eco', bg: '#E2F4E7', line: '#8CCB9B', color: '#126B2C' });
  return tags
    .map((g) => `<span style="display:inline-block;margin:3px 6px 0 0;padding:1px 9px;border:1px solid ${g.line};border-radius:999px;background:${g.bg};color:${g.color};font-size:11px;font-weight:700;line-height:16px;">${esc(g.text)}</span>`)
    .join('');
}

function itemRow(item: DraftItem, last: boolean): string {
  const b = last ? '' : `border-bottom:1px solid ${C.line};`;
  const choices = (item.choices ?? []).map((c) => `<div style="margin-top:1px;color:${C.muted};font-size:12px;line-height:17px;">${esc(c)}</div>`).join('');
  return `<tr>
  <td valign="top" style="padding:7px 8px 7px 0;${b}">
    <div style="font-size:15px;font-weight:700;line-height:21px;color:${C.text};">${esc(item.name)}</div>
    ${chips(item)}${choices}
  </td>
  <td width="48" align="center" valign="top" style="padding:7px 0;${b}font-size:15px;line-height:21px;font-weight:600;color:${C.text};white-space:nowrap;">${item.quantity}</td>
  <td width="84" align="right" valign="top" style="padding:7px 0;${b}font-size:15px;line-height:21px;font-weight:800;color:${C.text};white-space:nowrap;">${money(item.lineTotal)}</td>
</tr>`;
}

/** One card per delivery day, with its items. */
function dayCards(items: DraftItem[]): string {
  const byDate = new Map<string, DraftItem[]>();
  for (const it of items) byDate.set(it.date, [...(byDate.get(it.date) ?? []), it]);
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => {
      const label = dayLabel(date);
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="margin-top:10px;border:1px solid ${C.line};border-radius:16px;border-collapse:separate;background:${C.card};">
  <tr><td bgcolor="${C.surface}" style="padding:8px 16px;background:${C.surface};border-bottom:1px solid ${C.line};border-radius:15px 15px 0 0;font-size:13px;color:${C.muted};line-height:18px;">${label ? `Delivery on <strong style="color:${C.text};">${esc(label)}</strong>` : 'Your items'}</td></tr>
  <tr><td style="padding:0 16px 2px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${list.map((it, i) => itemRow(it, i === list.length - 1)).join('')}</table>
  </td></tr>
</table>`;
    })
    .join('');
}

export function getCartReminderEmailTemplate(input: CartReminderInput): string {
  const logoUrl = `cid:${EMAIL_LOGO_CID}`;
  const siteUrl = getSiteUrl();
  const cartUrl = `${siteUrl}/cart?restore=1`;
  const first = input.name?.trim().split(/\s+/)[0] ?? '';
  const greeting = first ? `Hi ${esc(first)},` : 'Hi there,';
  const count = input.items.reduce((n, i) => n + (Number(i.quantity) || 0), 0);

  return `<!DOCTYPE html>
<html lang="en" style="color-scheme:light dark;supported-color-schemes:light dark;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your NikFoods cart is saved</title>
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
    .outer { padding:0 !important; }
  }
</style>
</head>
<body bgcolor="${C.page}" style="margin:0;padding:0;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">Your items are saved. No rush &mdash; they&rsquo;ll be here whenever you&rsquo;re ready.&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td class="outer" align="center" style="padding:16px 12px;">

<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:640px;max-width:640px;background:${C.card};border-radius:24px;overflow:hidden;border:1px solid ${C.line};border-collapse:separate;">

  <tr><td height="5" bgcolor="${C.brand}" style="height:5px;line-height:5px;font-size:1px;background:${C.brand};">&nbsp;</td></tr>

  ${logoStrip(logoUrl, 150, '14px 32px')}

  <!-- Hero -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:14px 32px 12px;background:${C.card};">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 6px;"><tr><td>
      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
        <td width="44" height="44" align="center" valign="middle" bgcolor="${C.tile}" style="width:44px;height:44px;background:${C.tile};border:2px solid ${C.brand};border-radius:26px;"><span style="font-size:22px;line-height:44px;">&#128722;</span></td>
      </tr></table>
    </td></tr></table>
    <div style="font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:4px;">Your cart is saved</div>
    <div class="hero-h" style="font-size:30px;line-height:36px;font-weight:800;color:${C.text};margin:0;">${greeting} you left something delicious behind</div>
    <div style="font-size:15px;line-height:22px;color:${C.body};margin:6px auto 0;max-width:440px;">You left ${count === 1 ? 'something' : 'a few things'} in your cart. There&rsquo;s no rush at all &mdash; we&rsquo;ve kept ${count === 1 ? 'it' : 'them'} safe for you.</div>
  </td></tr>

  <!-- Cart -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:4px 32px 0;background:${C.card};">
    ${dayCards(input.items)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="right" style="padding:10px 4px 0;font-size:13px;color:${C.body};">Cart total&nbsp;&nbsp;<span style="font-size:16px;font-weight:800;color:${C.text};">${money(input.total)}</span></td>
    </tr></table>
    <div style="font-size:12px;color:${C.muted};text-align:right;padding:2px 4px 0;">Taxes and fees are added at checkout.</div>
  </td></tr>

  <!-- CTA -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:16px 32px 0;background:${C.card};">
    <table role="presentation" class="btn" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
      <td align="center" bgcolor="${C.brand}" style="border-radius:14px;background:${C.brand};border:2px solid ${C.brand};">
        <a href="${esc(cartUrl)}" style="display:inline-block;padding:10px 32px;font-size:16px;font-weight:800;color:${C.onBrand};border-radius:14px;">Complete your order &rarr;</a>
      </td>
    </tr></table>
  </td></tr>

  <!-- A gentle note -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:14px 32px 0;background:${C.card};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.noteBg}" style="background:${C.noteBg};border:1px solid ${C.noteLine};border-radius:16px;border-collapse:separate;"><tr><td style="padding:10px 14px;font-size:13px;line-height:20px;color:${C.noteText};">
      Ordering for each delivery day closes the day before, so choose the day that suits you best. If you&rsquo;ve already ordered or have changed your mind, simply ignore this email &mdash; we&rsquo;ll only send this one reminder.
    </td></tr></table>
  </td></tr>

  <!-- Help -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:12px 32px 8px;background:${C.card};">
    <div style="font-size:14px;color:${C.body};line-height:20px;">Questions? Just reply to this email or write to<br><a href="mailto:${SUPPORT}" style="color:${C.brandText};font-weight:800;">${SUPPORT}</a> &mdash; we&rsquo;re happy to help.</div>
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

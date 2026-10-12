import { getSiteUrl } from '@/lib/siteUrl';
import { EMAIL_LOGO_CID } from '@/lib/emailLogo';
import type { DraftItem } from '@/lib/server/checkoutDrafts';

/**
 * The gentle reminder for a cart that was left before paying. Same brand as the other NikFoods emails (gold logo on its dark strip, table cells
 * with a bgcolor) but a different layout from the order emails: an orange hero and only the first item names (no prices,
 * sizes, tags or days), so the customer has to open the cart to see the rest. Gentle: no countdowns, no discounts, no pressure.
 */

export interface CartReminderInput {
  /** The customer's name as saved; only the first name is used */
  name?: string | null;
  items: DraftItem[];
  /** The cart total when they left; kept on the input but deliberately not shown in the email */
  total: number;
  /** Secret in the button's link so the site can tell the customer came back from this email (see lib/server/cartReminderTracking.ts) */
  trackingToken?: string;
}

export function getCartReminderEmailSubject(): string {
  return '\u{1F6D2} You Left Something Delicious Behind';
}

const C = {
  page: '#070E26',
  card: '#101E4D',
  panel: '#18295F',
  line: '#3A509B',
  text: '#FFFFFF',
  body: '#D9E0F7',
  muted: '#9AA8D6',
  brand: '#FF5A4F',
  onBrand: '#0A1230',
  gold: '#FFD166',
};
const SUPPORT = 'support@nikfoods.com';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function logo(logoUrl: string, w: number, pad: string): string {
  return `<tr><td align="center" bgcolor="${C.card}" style="padding:${pad};background:${C.card};">
    <img src="${logoUrl}" alt="NikFoods" width="${w}" style="display:block;border:0;outline:none;width:${w}px;height:auto;max-width:100%;margin:0 auto;text-align:center;font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:${C.brand};">
  </td></tr>`;
}

/** Item names only (no prices, sizes, tags or days): the point is to bring them back to the cart, not to repeat it. */
const PEEK_MAX = 3;

function peekNames(items: DraftItem[]): { names: string[]; more: number } {
  const seen: string[] = [];
  for (const it of items) {
    const n = String(it.name ?? '').trim();
    if (n && !seen.includes(n)) seen.push(n);
  }
  return { names: seen.slice(0, PEEK_MAX), more: Math.max(0, seen.length - PEEK_MAX) };
}

function peekList(items: DraftItem[]): string {
  const { names, more } = peekNames(items);
  const rows = names
    .map(
      (n) => `<tr>
    <td width="24" valign="top" style="padding:5px 0;font-size:13px;line-height:22px;color:${C.brand};">&#10022;</td>
    <td valign="top" style="padding:5px 0;font-size:16px;line-height:22px;font-weight:700;color:${C.text};">${esc(n)}</td>
  </tr>`
    )
    .join('');
  const tail = more
    ? `<tr><td width="24" style="padding:5px 0;">&nbsp;</td><td style="padding:5px 0;font-size:14px;line-height:22px;color:${C.muted};">and ${more} more waiting in your cart</td></tr>`
    : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}${tail}</table>`;
}

export function getCartReminderEmailTemplate(input: CartReminderInput): string {
  const logoUrl = `cid:${EMAIL_LOGO_CID}`;
  const siteUrl = getSiteUrl();
  const cartUrl = `${siteUrl}/cart?restore=1${input.trackingToken ? `&r=${encodeURIComponent(input.trackingToken)}` : ''}`;
  const first = input.name?.trim().split(/\s+/)[0] ?? '';
  const count = input.items.reduce((n, i) => n + (Number(i.quantity) || 0), 0);

  return `<!DOCTYPE html>
<html lang="en" style="color-scheme:dark;supported-color-schemes:dark;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Your NikFoods cart is saved</title>
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; }
  a { text-decoration:none; }
  @media only screen and (max-width: 620px) {
    .wrap { width:100% !important; border-radius:0 !important; border-left:0 !important; border-right:0 !important; }
    .px { padding-left:22px !important; padding-right:22px !important; }
    .hero-h { font-size:30px !important; line-height:35px !important; }
    .outer { padding:0 !important; }
  }
</style>
</head>
<body bgcolor="${C.page}" style="margin:0;padding:0;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">Your items are saved and ready when you are.&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td class="outer" align="center" style="padding:20px 12px;">

<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:600px;max-width:600px;background:${C.card};border:1px solid ${C.line};border-radius:6px;border-collapse:separate;overflow:hidden;">

  <tr><td height="4" bgcolor="${C.brand}" style="height:4px;line-height:4px;font-size:1px;background:${C.brand};">&nbsp;</td></tr>
  ${logo(logoUrl, 140, '22px 32px 4px')}

  <!-- Hero -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:16px 32px 6px;background:${C.card};">
    <div style="font-size:32px;line-height:32px;margin-bottom:10px;">&#128722;</div>
    <div class="hero-h" style="font-size:34px;line-height:38px;font-weight:800;color:${C.text};margin:0;">${first ? `${esc(first)}, your cart<br>is waiting` : 'Your cart<br>is waiting'}</div>
    <div style="font-size:16px;line-height:24px;color:${C.body};margin:10px auto 0;max-width:400px;">${count === 1 ? 'An item is' : `${count} items are`} saved and ready<br>when you are.</div>
  </td></tr>

  <!-- A glimpse, names only -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:18px 32px 0;background:${C.card};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:2px dashed ${C.line};font-size:1px;line-height:1px;height:1px;">&nbsp;</td></tr></table>
    <div style="font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${C.gold};padding:14px 0 4px;">Saved for you</div>
    ${peekList(input.items)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:2px dashed ${C.line};font-size:1px;line-height:1px;height:1px;">&nbsp;</td></tr></table>
  </td></tr>

  <!-- CTA -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:20px 32px 0;background:${C.card};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
      <td align="center" bgcolor="${C.brand}" style="border-radius:999px;background:${C.brand};">
        <a href="${esc(cartUrl)}" style="display:block;padding:16px 32px;font-size:18px;font-weight:800;color:${C.onBrand};border-radius:999px;">Complete your order &rarr;</a>
      </td>
    </tr></table>
    <div style="font-size:13px;line-height:19px;color:${C.muted};padding-top:12px;">Already ordered? Just ignore this. It&rsquo;s the only reminder we&rsquo;ll send.</div>
  </td></tr>

  <!-- Help + footer -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:20px 32px 22px;background:${C.card};">
    <div style="font-size:14px;color:${C.body};line-height:20px;">Questions? Reply to this email or write to<br><a href="mailto:${SUPPORT}" style="color:${C.gold};font-weight:800;">${SUPPORT}</a></div>
    <div style="font-size:13px;color:${C.muted};font-style:italic;margin-top:14px;">Authentic Indian food delivered to your doorstep.</div>
    <div style="font-size:12px;margin-top:4px;"><a href="${siteUrl}/terms" style="color:${C.gold};">Terms</a> &nbsp;&middot;&nbsp; <a href="${siteUrl}/privacy" style="color:${C.gold};">Privacy</a></div>
    <div style="font-size:11px;color:${C.muted};margin-top:3px;">&copy; ${new Date().getFullYear()} NikFoods. All rights reserved.</div>
  </td></tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}

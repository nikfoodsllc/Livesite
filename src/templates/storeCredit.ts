import { Order } from '@/types/order';
import { getSiteUrl } from '@/lib/siteUrl';
import { EMAIL_LOGO_CID } from '@/lib/emailLogo';

export interface CreditEmailItem {
  name: string;
  quantity: number;
  amount: number;
}

export interface CreditEmailData {
  /** Credit given in this go, dollars */
  amount: number;
  items: CreditEmailItem[];
  /** The customer's balance after it, dollars */
  balance: number;
  note?: string;
  /** The whole order has now been credited (every item, the Platform Fee and the tip): a separate email says so */
  full?: boolean;
  /** What the customer paid for the order, dollars (shown on the full-credit email) */
  orderTotal?: number;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

export function getStoreCreditEmailSubject(order: Pick<Order, 'orderId'>, amount: number, full = false): string {
  const id = String(order.orderId ?? '').replace(/^#/, '');
  return full ? `Full Order Credited ${money(amount)} NikFoods - Order #${id}` : `Store Credit ${money(amount)} NikFoods - Order #${id}`;
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


function firstName(order: Order): string {
  const name = order.customerInfo?.name?.trim();
  return name ? name.split(/\s+/)[0] : '';
}

function logoStrip(logoUrl: string, w: number, pad: string): string {
  return `<tr><td align="center" bgcolor="${C.strip}" style="padding:${pad};background:${C.strip};">
    <img src="${logoUrl}" alt="NikFoods" width="${w}" style="display:block;border:0;outline:none;width:${w}px;height:auto;max-width:100%;margin:0 auto;text-align:center;font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:${C.brand};">
  </td></tr>`;
}


/**
 * "You have store credit" email (same look as the other order emails: light-first, every coloured block is a table cell
 * with a bgcolor, the gold logo sits on its own dark strip).
 */
export function getStoreCreditEmailTemplate(order: Order, credit: CreditEmailData): string {
  const logoUrl = `cid:${EMAIL_LOGO_CID}`;
  const siteUrl = getSiteUrl();
  const orderId = escapeHtml(String(order.orderId ?? '').replace(/^#/, ''));
  const name = firstName(order);
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';

  // a full credit shows only the total: the item, Platform Fee and tax breakdown stays with NikFoods
  const itemRows = (credit.full ? [] : credit.items)
    .map(
      (i) => `<tr>
        <td style="padding:3px 0;font-size:14px;line-height:20px;color:${C.body};">${escapeHtml(credit.full && i.quantity === 1 ? i.name : `${i.quantity} \u00d7 ${i.name}`)}</td>
        <td align="right" style="padding:3px 0 3px 12px;font-size:14px;line-height:20px;font-weight:700;color:${C.text};white-space:nowrap;">${money(i.amount)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en" style="color-scheme:light dark;supported-color-schemes:light dark;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${credit.full ? 'Your order was credited in full' : 'Store credit from NikFoods'}</title>
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
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${credit.full ? `The full ${money(credit.amount)} for order ${orderId} was added to your store credit.` : `You have ${money(credit.balance)} in store credit. It is used automatically on your next order.`}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td class="outer" align="center" style="padding:16px 12px;">

<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:640px;max-width:640px;background:${C.card};border-radius:24px;overflow:hidden;border:1px solid ${C.line};border-collapse:separate;">

  <tr><td height="5" bgcolor="${C.brand}" style="height:5px;line-height:5px;font-size:1px;background:${C.brand};">&nbsp;</td></tr>

  ${logoStrip(logoUrl, 150, '14px 32px')}

  <!-- Hero -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:12px 32px 12px;background:${C.card};">
    <div class="hero-l" style="font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:4px;word-break:break-word;">Order # ${orderId}</div>
    ${
      credit.full
        ? `<div class="hero-h" style="font-size:30px;line-height:36px;font-weight:800;color:${C.text};margin:0;">${greeting} your full order has been store credited</div>
    <div style="font-size:15px;line-height:22px;color:${C.body};margin:4px auto 0;max-width:460px;">The full amount of ${money(credit.orderTotal ?? credit.amount)} was added to your store credit. This order will not be delivered.</div>`
        : `<div class="hero-h" style="font-size:30px;line-height:36px;font-weight:800;color:${C.text};margin:0;">${greeting} you have ${money(credit.amount)} store credit</div>
    <div style="font-size:15px;line-height:22px;color:${C.body};margin:4px auto 0;max-width:440px;">It is used automatically on your next order.</div>`
    }
  </td></tr>

  <!-- What it is for -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:12px 32px 0;background:${C.card};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.surface}" style="background:${C.surface};border:1px solid ${C.line};border-radius:16px;border-collapse:separate;"><tr><td style="padding:9px 14px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:4px;">${credit.full ? 'Everything credited' : 'Credit for'}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}${
        credit.full
          ? `<tr><td style="padding:8px 0 0;border-top:1px solid ${C.line};font-size:15px;font-weight:800;color:${C.text};">Total credited</td><td align="right" style="padding:8px 0 0 12px;border-top:1px solid ${C.line};font-size:15px;font-weight:800;color:${C.text};white-space:nowrap;">${money(credit.amount)}</td></tr>`
          : ''
      }</table>
      ${credit.note ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid ${C.line};font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};">Note from NikFoods</div><div style="font-size:14px;line-height:20px;color:${C.body};margin-top:3px;">${escapeHtml(credit.note)}</div>` : ''}
    </td></tr></table>
  </td></tr>

  ${
    credit.full
      ? ''
      : `  <!-- Balance -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:10px 32px 0;background:${C.card};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.noteBg}" style="background:${C.noteBg};border:1px solid ${C.noteLine};border-radius:16px;border-collapse:separate;"><tr>
      <td style="padding:10px 14px;font-size:15px;font-weight:800;color:${C.noteText};">Your store credit</td>
      <td align="right" style="padding:10px 14px;font-size:20px;font-weight:800;color:${C.noteText};">${money(credit.balance)}</td>
    </tr></table>
  </td></tr>`
  }

  <!-- CTA -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:14px 32px 0;background:${C.card};">
    <table role="presentation" class="btn" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
      <td align="center" bgcolor="${C.brand}" style="border-radius:14px;background:${C.brand};border:2px solid ${C.brand};">
        <a href="${siteUrl}" style="display:inline-block;padding:9px 30px;font-size:16px;font-weight:800;color:${C.onBrand};border-radius:14px;">Order now &rarr;</a>
      </td>
    </tr></table>
  </td></tr>

  <!-- Help -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:12px 32px 8px;background:${C.card};">
    <div style="font-size:16px;font-weight:800;color:${C.text};">Questions?</div>
    <div style="font-size:14px;color:${C.body};line-height:20px;margin-top:3px;">Just reply to this email or write to us at<br><a href="mailto:${SUPPORT}" style="color:${C.brandText};font-weight:800;">${SUPPORT}</a></div>
    <div style="font-size:12px;color:${C.muted};margin-top:6px;">We are sorry for the trouble with your order.</div>
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

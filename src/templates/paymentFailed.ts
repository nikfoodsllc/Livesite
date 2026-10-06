import { Order } from '@/types/order';
import { getSiteUrl, LIVE_SITE_URL } from '@/lib/siteUrl';
import { EMAIL_LOGO_CID } from '@/lib/emailLogo';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatOrderAmount(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

function getGracefulFailureMessage(failureReason?: string): string {
  const reason = failureReason?.trim().toLowerCase() || '';

  if (reason.includes('declined') || reason.includes('insufficient')) {
    return 'Your card was declined.';
  }
  if (reason.includes('expired') || reason.includes('session')) {
    return 'Your payment session expired.';
  }
  if (reason.includes('timeout') || reason.includes('timed out')) {
    return 'Payment authorization timed out.';
  }
  if (failureReason?.trim()) {
    const trimmed = failureReason.trim();
    return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  }

  return 'Your card was declined, payment authorization timed out, or your session expired.';
}

export function getPaymentFailedEmailSubject(_order?: Order): string {
  return 'Oops, NikFoods Order Submission Failed - Please Resubmit';
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
 * Payment failed email HTML template (same look as the order confirmation email: light-first, every
 * coloured block is a table cell with a bgcolor, the gold logo sits on its own dark strip).
 */
export function getPaymentFailedEmailTemplate(
  order: Order,
  failureReason?: string
): string {
  // attached to the email as an inline image (see lib/emailLogo.ts), so it shows without "Load External Images"
  const logoUrl = `cid:${EMAIL_LOGO_CID}`;
  // The live site keeps its existing address; the test site (livesite-dev) links to itself instead of the live site.
  const siteUrl = getSiteUrl();
  const checkoutUrl = `${process.env.NEXT_PUBLIC_BASE_URL || (siteUrl === LIVE_SITE_URL ? 'https://nikfoods.com' : siteUrl)}/checkout`;
  const amount = formatOrderAmount(order.totalPaid, order.currency);
  const gracefulFailureMessage = getGracefulFailureMessage(failureReason);
  const name = firstName(order);
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';
  const orderId = escapeHtml(String(order.orderId ?? ''));

  return `<!DOCTYPE html>
<html lang="en" style="color-scheme:light dark;supported-color-schemes:light dark;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your NikFoods order could not be placed</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; }
  a { text-decoration:none; }
  @media only screen and (max-width: 620px) {
    .wrap { width:100% !important; border-radius:0 !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    .hero-h { font-size:25px !important; line-height:30px !important; }
    .meta-cell { display:block !important; width:100% !important; border-right:0 !important; border-bottom:1px solid ${C.line} !important; padding:12px 0 !important; }
    .btn a { display:block !important; }
    .hero-l { font-size:11px !important; letter-spacing:0.04em !important; }
    .outer { padding:0 !important; }
  }
</style>
</head>
<body bgcolor="${C.page}" style="margin:0;padding:0;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">Your payment didn&rsquo;t go through, and your card has not been charged. Tap to try again.&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td class="outer" align="center" style="padding:16px 12px;">

<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:640px;max-width:640px;background:${C.card};border-radius:24px;overflow:hidden;border:1px solid ${C.line};border-collapse:separate;">

  <tr><td height="5" bgcolor="${C.brand}" style="height:5px;line-height:5px;font-size:1px;background:${C.brand};">&nbsp;</td></tr>

  ${logoStrip(logoUrl, 150, '14px 32px')}

  <!-- Hero -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:12px 32px 12px;background:${C.card};">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 6px;"><tr><td>
      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
        <td width="44" height="44" align="center" valign="middle" bgcolor="${C.tile}" style="width:44px;height:44px;background:${C.tile};border:2px solid ${C.brand};border-radius:26px;"><span style="font-size:24px;font-weight:800;line-height:44px;color:${C.brandText};">!</span></td>
      </tr></table>
    </td></tr></table>
    <div class="hero-l" style="font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:4px;word-break:break-word;">Order # ${orderId} not placed</div>
    <div class="hero-h" style="font-size:30px;line-height:36px;font-weight:800;color:${C.text};margin:0;">${greeting} your payment didn&rsquo;t go through</div>
    <div style="font-size:15px;line-height:22px;color:${C.body};margin:4px auto 0;max-width:440px;">Don&rsquo;t worry &mdash; <strong style="color:${C.text};">your card has not been charged.</strong> It only takes a moment to try again.</div>
  </td></tr>

  <!-- What went wrong -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:12px 32px 0;background:${C.card};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.noteBg}" style="background:${C.noteBg};border:1px solid ${C.noteLine};border-radius:16px;border-collapse:separate;"><tr><td style="padding:9px 14px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.brandText};margin-bottom:4px;">What went wrong</div>
      <div style="font-size:15px;font-weight:700;color:${C.noteText};line-height:21px;">${escapeHtml(gracefulFailureMessage)}</div>
      <div style="font-size:13px;color:${C.noteText};line-height:20px;margin-top:4px;">Order total: <strong>${escapeHtml(amount)}</strong> (not charged)</div>
    </td></tr></table>
  </td></tr>

  <!-- CTA -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:12px 32px 0;background:${C.card};">
    <div style="font-size:15px;line-height:22px;color:${C.body};margin:0 0 10px;">Tap below to head back to checkout and try again. You can use the same card or a different one. If your cart is empty (for example, if you open this on a different phone), just add your items again.</div>
    <table role="presentation" class="btn" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
      <td align="center" bgcolor="${C.brand}" style="border-radius:14px;background:${C.brand};border:2px solid ${C.brand};">
        <a href="${escapeHtml(checkoutUrl)}" style="display:inline-block;padding:9px 30px;font-size:16px;font-weight:800;color:${C.onBrand};border-radius:14px;">Back to checkout &rarr;</a>
      </td>
    </tr></table>
    <div style="font-size:12px;color:${C.muted};margin-top:6px;">We&rsquo;re sorry for the trouble and appreciate your patience.</div>
  </td></tr>

  <!-- Help -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:10px 32px 8px;background:${C.card};">
    <div style="font-size:16px;font-weight:800;color:${C.text};">Still having trouble?</div>
    <div style="font-size:14px;color:${C.body};line-height:20px;margin-top:3px;">Just reply to this email or write to us at<br><a href="mailto:${SUPPORT}" style="color:${C.brandText};font-weight:800;">${SUPPORT}</a> &mdash; we&rsquo;re happy to help.</div>
  </td></tr>

  <!-- Footer -->
  ${logoStrip(logoUrl, 100, '10px 32px 4px')}
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:6px 32px 10px;background:${C.card};">
    <div style="font-size:13px;color:${C.body};font-style:italic;">Authentic Indian food delivered to your doorstep.</div>
    <div style="font-size:12px;margin-top:4px;"><a href="${siteUrl}/account/orders" style="color:${C.brandText};">My orders</a> &nbsp;&middot;&nbsp; <a href="${siteUrl}/terms" style="color:${C.brandText};">Terms</a> &nbsp;&middot;&nbsp; <a href="${siteUrl}/privacy" style="color:${C.brandText};">Privacy</a></div>
    <div style="font-size:11px;color:${C.muted};margin-top:3px;">&copy; ${new Date().getFullYear()} NikFoods. All rights reserved.</div>
  </td></tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}

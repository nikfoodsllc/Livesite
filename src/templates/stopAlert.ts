import { getSiteUrl } from '@/lib/siteUrl';
import { EMAIL_LOGO_CID } from '@/lib/emailLogo';

export type StopAlertTemplateKind = 'first' | 'reminder' | 'urgent' | 'fixed';

/** What the delivery-stop email says. The customer's details are for the team only: they never go in the subject. */
export interface StopAlertInfo {
  kind: StopAlertTemplateKind;
  orderId: string;
  /** "Wed Nov 4" */
  dayShort: string;
  /** "Wednesday, November 4" */
  dayLong: string;
  customerName: string;
  customerPhone: string;
  /** the address as saved, one line */
  address: string;
  /** plain words: what is wrong */
  reason: string;
  /** the raw answer from OptimoRoute, small print */
  detail: string;
  /** more than one order shares this stop */
  otherOrders: number;
  /** where the button goes: the Orders page in the admin */
  adminUrl: string;
  /** the planning / sending times */
  planningNote: string;
}

const esc = (v: string): string => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const PREFIX: Record<StopAlertTemplateKind, string> = {
  first: '[ACTION NEEDED]',
  reminder: '[REMINDER]',
  urgent: '[URGENT]',
  fixed: '[FIXED]',
};

/** The prefix is fixed on purpose: one Gmail filter on it stars and labels these emails. */
export function getStopAlertSubject(info: Pick<StopAlertInfo, 'kind' | 'orderId' | 'dayShort'>): string {
  return info.kind === 'fixed'
    ? `${PREFIX.fixed} Delivery stop created - Order #${info.orderId} - ${info.dayShort}`
    : `${PREFIX[info.kind]} Delivery stop failed - Order #${info.orderId} - ${info.dayShort}`;
}

const C = {
  page: '#F3EBDD', card: '#FFFBF5', surface: '#FBF1E1', line: '#EADBC3', text: '#2B1D0E', body: '#54442F', muted: '#76664F',
  brandText: '#A85A00', strip: '#1E1409', brand: '#F89C35',
  red: '#C0392B', redText: '#8E2418', redNote: '#FDEEEA', redLine: '#F2C4BC',
  green: '#1E8449', greenText: '#126B2C', greenNote: '#E2F4E7', greenLine: '#B7DFC2',
};

export function getStopAlertTemplate(info: StopAlertInfo): string {
  const fixed = info.kind === 'fixed';
  const accent = fixed ? C.green : C.red;
  const accentText = fixed ? C.greenText : C.redText;
  const noteBg = fixed ? C.greenNote : C.redNote;
  const noteLine = fixed ? C.greenLine : C.redLine;
  const label = { first: 'Action needed', reminder: 'Reminder - still not fixed', urgent: 'Urgent - still not fixed', fixed: 'Fixed' }[info.kind];
  const heading = fixed ? 'The delivery stop was created' : 'This order is not on any driver’s route';
  const sub = fixed
    ? `Order #${esc(info.orderId)} is now in OptimoRoute for ${esc(info.dayLong)}. Nothing more to do.`
    : `Order #${esc(info.orderId)} is paid and confirmed for <strong style="color:${C.text};">${esc(info.dayLong)}</strong>, but its stop could not be created in OptimoRoute. It is <strong style="color:${C.text};">not on the packing list</strong> and no driver will get it until this is fixed.`;
  const preview = fixed ? `Order #${info.orderId} is on the route now.` : `Order #${info.orderId} is not on any route. ${info.reason}`;
  const logoUrl = `cid:${EMAIL_LOGO_CID}`;
  const row = (title: string, value: string) =>
    value ? `<tr><td valign="top" style="padding:3px 12px 3px 0;font-size:12px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:${C.muted};white-space:nowrap;">${title}</td><td valign="top" style="padding:3px 0;font-size:15px;line-height:21px;color:${C.text};word-break:break-word;">${esc(value)}</td></tr>` : '';
  const steps = fixed
    ? ''
    : `<tr><td class="px" bgcolor="${C.card}" style="padding:12px 24px 0;background:${C.card};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${noteBg}" style="background:${noteBg};border:1px solid ${noteLine};border-radius:16px;border-collapse:separate;"><tr><td style="padding:10px 14px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${accentText};margin-bottom:4px;">What is wrong</div>
      <div style="font-size:14px;line-height:21px;color:${accentText};">${esc(info.reason)}</div>
      <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${accentText};margin:10px 0 4px;">What to do (about 2 minutes)</div>
      <div style="font-size:14px;line-height:22px;color:${accentText};">1. Open Orders in the admin and search the order number.<br>2. Fix the street, city or zip (call the customer if unsure).<br>3. The stop is created within 30 minutes, or add it by hand in OptimoRoute.</div>
    </td></tr></table>
  </td></tr>`;
  const button = fixed ? '' : `<tr><td class="px" align="center" bgcolor="${C.card}" style="padding:14px 24px 0;background:${C.card};">
    <table role="presentation" class="btn" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
      <td align="center" bgcolor="${accent}" style="border-radius:14px;background:${accent};border:2px solid ${accent};"><a href="${esc(info.adminUrl)}" style="display:inline-block;padding:11px 30px;font-size:16px;font-weight:800;color:#FFFFFF;border-radius:14px;">Open Orders in admin &rarr;</a></td>
    </tr></table></td></tr>`;

  return `<!DOCTYPE html>
<html lang="en" style="color-scheme:light dark;supported-color-schemes:light dark;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(getStopAlertSubject(info))}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; }
  a { text-decoration:none; }
  @media only screen and (max-width: 620px) {
    .wrap { width:100% !important; border-radius:0 !important; }
    .px { padding-left:16px !important; padding-right:16px !important; }
    .hero-h { font-size:23px !important; line-height:28px !important; }
    .btn a { display:block !important; }
    .outer { padding:0 !important; }
  }
</style>
</head>
<body bgcolor="${C.page}" style="margin:0;padding:0;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${esc(preview)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td class="outer" align="center" style="padding:16px 12px;">
<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:640px;max-width:640px;background:${C.card};border-radius:24px;overflow:hidden;border:1px solid ${C.line};border-collapse:separate;">

  <tr><td align="center" bgcolor="${accent}" style="padding:9px 16px;background:${accent};font-size:13px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#FFFFFF;">${fixed ? '&#10003;' : '&#9888;'} ${label}</td></tr>
  <tr><td align="center" bgcolor="${C.strip}" style="padding:12px 32px;background:${C.strip};"><img src="${logoUrl}" alt="NikFoods" width="130" style="display:block;border:0;width:130px;height:auto;max-width:100%;margin:0 auto;font-family:Arial,sans-serif;font-size:24px;font-weight:800;color:${C.brand};"></td></tr>

  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:16px 24px 8px;background:${C.card};">
    <div class="hero-h" style="font-size:26px;line-height:32px;font-weight:800;color:${C.text};">${heading}</div>
    <div style="font-size:15px;line-height:22px;color:${C.body};margin:8px auto 0;max-width:500px;">${sub}</div>
  </td></tr>

  <tr><td class="px" bgcolor="${C.card}" style="padding:6px 24px 0;background:${C.card};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.surface}" style="background:${C.surface};border:1px solid ${C.line};border-radius:16px;border-collapse:separate;"><tr><td style="padding:10px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row('Order', '#' + info.orderId)}
        ${row('Delivery', info.dayLong)}
        ${row('Customer', info.customerName)}
        ${row('Phone', info.customerPhone)}
        ${row('Address', info.address)}
        ${info.otherOrders > 0 ? row('Shared stop', `${info.otherOrders} other order${info.otherOrders === 1 ? ' is' : 's are'} on this stop`) : ''}
      </table>
    </td></tr></table>
  </td></tr>
  ${steps}
  ${button}
  ${fixed || !info.detail ? '' : `<tr><td class="px" align="center" bgcolor="${C.card}" style="padding:10px 24px 0;background:${C.card};"><div style="font-size:11px;line-height:16px;color:${C.muted};word-break:break-word;">OptimoRoute said: ${esc(info.detail)}</div></td></tr>`}

  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:12px 24px 14px;background:${C.card};">
    <div style="font-size:12px;line-height:18px;color:${C.muted};">${esc(info.planningNote)}</div>
    <div style="font-size:12px;color:${C.muted};margin-top:4px;">NikFoods team notice &middot; <a href="${getSiteUrl()}" style="color:${C.brandText};">nikfoods.com</a></div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

import { getSiteUrl } from '@/lib/siteUrl';
import { EMAIL_LOGO_CID } from '@/lib/emailLogo';

/** What the two stock emails (low stock, sold out) say. Everything is already worded for reading ("2", "1.5 lb"). */
export interface StockAlertInfo {
  kind: 'low' | 'out';
  itemName: string;
  imageUrl?: string;
  /** the order limit: "20", "5 lb" */
  limitText: string;
  /** what has been ordered since the count started */
  orderedText: string;
  /** what is left */
  leftText: string;
  /** share of the limit that has been ordered, 0 to 100 */
  usedPercent: number;
  /** the alert share the admin chose (10 = alert at 10% left) */
  alertPercent: number;
  /** "Resets by hand" / "Resets every day at 3:00 AM (Pacific)" */
  resetText: string;
  /** where the button goes */
  adminUrl: string;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function getStockAlertEmailSubject(info: Pick<StockAlertInfo, 'kind' | 'itemName' | 'leftText'>): string {
  return info.kind === 'out' ? `Sold out: ${info.itemName}` : `Low stock: ${info.itemName} (${info.leftText} left)`;
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
  strip: '#1E1409',
  amberTile: '#FFE7C2',
  amberNote: '#FFF1DC',
  amberLine: '#F3D8A8',
  amberText: '#5B3F10',
  redTile: '#FDE3DF',
  redMain: '#C0392B',
  redText: '#8E2418',
  redNote: '#FDEEEA',
  redLine: '#F2C4BC',
};

function logoStrip(logoUrl: string, w: number, pad: string): string {
  return `<tr><td align="center" bgcolor="${C.strip}" style="padding:${pad};background:${C.strip};">
    <img src="${logoUrl}" alt="NikFoods" width="${w}" style="display:block;border:0;outline:none;width:${w}px;height:auto;max-width:100%;margin:0 auto;text-align:center;font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:${C.brand};">
  </td></tr>`;
}

/**
 * The email the team gets when an item with an order limit is running low or sells out. Same look as the other NikFoods emails:
 * light first, every coloured block is a table cell with a bgcolor (so mail apps in dark mode keep it readable), the gold logo
 * sits on its own dark strip.
 */
export function getStockAlertEmailTemplate(info: StockAlertInfo): string {
  const logoUrl = `cid:${EMAIL_LOGO_CID}`;
  const siteUrl = getSiteUrl();
  const out = info.kind === 'out';
  const accent = out ? C.redMain : C.brand;
  const accentText = out ? C.redText : C.brandText;
  const tile = out ? C.redTile : C.amberTile;
  const noteBg = out ? C.redNote : C.amberNote;
  const noteLine = out ? C.redLine : C.amberLine;
  const noteText = out ? C.redText : C.amberText;
  const name = escapeHtml(info.itemName);
  const used = Math.max(0, Math.min(100, Math.round(info.usedPercent)));
  const heading = out ? `${name} is sold out` : `${name} is running low`;
  const label = out ? 'Sold out' : 'Low stock';
  const sub = out
    ? `The limit of <strong style="color:${C.text};">${escapeHtml(info.limitText)}</strong> was reached. It now shows <strong style="color:${C.text};">Out of stock</strong> on the website and in the app and cannot be ordered.`
    : `Only <strong style="color:${C.text};">${escapeHtml(info.leftText)}</strong> left of ${escapeHtml(info.limitText)} &mdash; ${100 - used}% of the limit.`;
  const preview = out ? `${info.itemName} is sold out and can no longer be ordered.` : `${info.itemName}: only ${info.leftText} left.`;
  const todo = out
    ? 'To sell it again, open the item in Food Items and press <strong>Reset count</strong> in its Order limit settings, or raise the limit.'
    : 'If you want to keep selling it, raise the limit in Food Items. When the count is reset, alerts start again.';

  const image = info.imageUrl
    ? `<td width="76" valign="middle" style="width:76px;padding:0 14px 0 0;"><img src="${escapeHtml(info.imageUrl)}" alt="" width="76" height="76" style="display:block;border:0;width:76px;height:76px;border-radius:38px;object-fit:cover;background:${C.line};"></td>`
    : '';
  const usedCell = used > 0 ? `<td width="${used}%" height="12" bgcolor="${accent}" style="width:${used}%;height:12px;line-height:12px;font-size:1px;background:${accent};">&nbsp;</td>` : '';
  const restCell = used < 100 ? `<td width="${100 - used}%" height="12" bgcolor="${C.line}" style="width:${100 - used}%;height:12px;line-height:12px;font-size:1px;background:${C.line};">&nbsp;</td>` : '';
  const stat = (title: string, value: string, strong = false) =>
    `<td class="stat" width="33%" align="center" valign="top" style="padding:0 4px;"><div style="font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:${C.muted};">${title}</div><div style="font-size:${strong ? 22 : 18}px;line-height:28px;font-weight:800;color:${strong ? accentText : C.text};word-break:break-word;">${escapeHtml(value)}</div></td>`;

  return `<!DOCTYPE html>
<html lang="en" style="color-scheme:light dark;supported-color-schemes:light dark;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(getStockAlertEmailSubject(info))}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; }
  a { text-decoration:none; }
  @media only screen and (max-width: 620px) {
    .wrap { width:100% !important; border-radius:0 !important; }
    .px { padding-left:18px !important; padding-right:18px !important; }
    .hero-h { font-size:25px !important; line-height:30px !important; }
    .btn a { display:block !important; }
    .outer { padding:0 !important; }
    .stat div:last-child { font-size:17px !important; }
  }
</style>
</head>
<body bgcolor="${C.page}" style="margin:0;padding:0;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${escapeHtml(preview)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td class="outer" align="center" style="padding:16px 12px;">

<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:640px;max-width:640px;background:${C.card};border-radius:24px;overflow:hidden;border:1px solid ${C.line};border-collapse:separate;">

  <tr><td height="5" bgcolor="${accent}" style="height:5px;line-height:5px;font-size:1px;background:${accent};">&nbsp;</td></tr>

  ${logoStrip(logoUrl, 150, '14px 32px')}

  <!-- Hero -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:14px 32px 12px;background:${C.card};">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 6px;"><tr><td>
      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
        <td width="44" height="44" align="center" valign="middle" bgcolor="${tile}" style="width:44px;height:44px;background:${tile};border:2px solid ${accent};border-radius:26px;"><span style="font-size:${out ? 26 : 24}px;font-weight:800;line-height:44px;color:${accentText};">${out ? '&times;' : '!'}</span></td>
      </tr></table>
    </td></tr></table>
    <div style="font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${accentText};margin-bottom:4px;">${label}</div>
    <div class="hero-h" style="font-size:28px;line-height:34px;font-weight:800;color:${C.text};margin:0;">${heading}</div>
    <div style="font-size:15px;line-height:22px;color:${C.body};margin:6px auto 0;max-width:460px;">${sub}</div>
  </td></tr>

  <!-- The numbers -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:6px 32px 0;background:${C.card};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.surface}" style="background:${C.surface};border:1px solid ${C.line};border-radius:16px;border-collapse:separate;"><tr><td style="padding:14px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${image}
        <td valign="middle" style="font-size:17px;line-height:23px;font-weight:800;color:${C.text};word-break:break-word;">${name}</td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 4px;border-radius:6px;overflow:hidden;border-collapse:separate;"><tr>${usedCell}${restCell}</tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;"><tr>
        ${stat('Limit', info.limitText)}
        ${stat('Ordered', info.orderedText)}
        ${stat('Left', out ? '0' : info.leftText, true)}
      </tr></table>
    </td></tr></table>
  </td></tr>

  <!-- What to do -->
  <tr><td class="px" bgcolor="${C.card}" style="padding:12px 32px 0;background:${C.card};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${noteBg}" style="background:${noteBg};border:1px solid ${noteLine};border-radius:16px;border-collapse:separate;"><tr><td style="padding:10px 14px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${accentText};margin-bottom:4px;">What to do</div>
      <div style="font-size:14px;line-height:21px;color:${noteText};">${todo}</div>
      <div style="font-size:13px;line-height:20px;color:${noteText};margin-top:6px;">${escapeHtml(info.resetText)}.</div>
    </td></tr></table>
  </td></tr>

  <!-- CTA -->
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:14px 32px 0;background:${C.card};">
    <table role="presentation" class="btn" cellpadding="0" cellspacing="0" style="border-collapse:separate;"><tr>
      <td align="center" bgcolor="${accent}" style="border-radius:14px;background:${accent};border:2px solid ${accent};">
        <a href="${escapeHtml(info.adminUrl)}" style="display:inline-block;padding:10px 30px;font-size:16px;font-weight:800;color:${out ? '#FFFFFF' : C.onBrand};border-radius:14px;">Open Food Items &rarr;</a>
      </td>
    </tr></table>
    <div style="font-size:12px;line-height:18px;color:${C.muted};margin-top:8px;max-width:440px;">You get this email once each time an item reaches its alert level. Change the level (now ${info.alertPercent}%) in the item&rsquo;s Order limit settings.</div>
  </td></tr>

  <!-- Footer -->
  ${logoStrip(logoUrl, 100, '14px 32px 4px')}
  <tr><td class="px" align="center" bgcolor="${C.card}" style="padding:6px 32px 12px;background:${C.card};">
    <div style="font-size:12px;color:${C.muted};">NikFoods team notice &middot; <a href="${siteUrl}" style="color:${C.brandText};">nikfoods.com</a></div>
    <div style="font-size:11px;color:${C.muted};margin-top:3px;">&copy; ${new Date().getFullYear()} NikFoods. All rights reserved.</div>
  </td></tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}

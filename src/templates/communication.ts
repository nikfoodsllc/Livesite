import { EMAIL_LOGO_CID } from '@/lib/emailLogo';
import { bodyToHtml } from '@/lib/communications/rules';

const C = {
  page: '#F3EBDD',
  card: '#FFFBF5',
  line: '#EADBC3',
  text: '#2B1D0E',
  body: '#54442F',
  muted: '#76664F',
  brand: '#F89C35',
  brandText: '#A85A00',
  strip: '#1E1409',
};
const SUPPORT = 'support@nikfoods.com';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * An update an admin writes in the Communication tab: same shell as the order emails (the gold logo on its own dark strip, every
 * coloured block a table cell with a bgcolor so dark mode keeps it light), then the message as plain paragraphs.
 */
export function getCommunicationEmailTemplate(subject: string, bodyText: string): string {
  const logo = `cid:${EMAIL_LOGO_CID}`;
  const preview = escapeHtml(bodyText.replace(/\s+/g, ' ').trim().slice(0, 110));
  return `<!DOCTYPE html>
<html lang="en" style="color-scheme:light dark;supported-color-schemes:light dark;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  table { border-collapse:collapse; }
  a { text-decoration:none; }
  @media only screen and (max-width: 620px) {
    .wrap { width:100% !important; border-radius:0 !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    .h { font-size:24px !important; line-height:30px !important; }
    .outer { padding:0 !important; }
  }
</style>
</head>
<body bgcolor="${C.page}" style="margin:0;padding:0;background:${C.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${preview}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td class="outer" align="center" style="padding:16px 12px;">
<table role="presentation" class="wrap" width="640" cellpadding="0" cellspacing="0" bgcolor="${C.card}" style="width:640px;max-width:640px;background:${C.card};border-radius:24px;overflow:hidden;border:1px solid ${C.line};border-collapse:separate;">
  <tr><td height="5" bgcolor="${C.brand}" style="height:5px;line-height:5px;font-size:1px;background:${C.brand};">&nbsp;</td></tr>
  <tr><td align="center" bgcolor="${C.strip}" style="padding:14px 32px;background:${C.strip};">
    <img src="${logo}" alt="NikFoods" width="150" style="display:block;border:0;outline:none;width:150px;height:auto;max-width:100%;margin:0 auto;text-align:center;font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:#F6D58E;">
  </td></tr>
  <tr><td class="px" bgcolor="${C.card}" style="padding:24px 32px 6px;background:${C.card};">
    <div class="h" style="font-size:26px;line-height:32px;font-weight:800;color:${C.text};margin:0 0 14px 0;">${escapeHtml(subject)}</div>
    ${bodyToHtml(bodyText)}
  </td></tr>
  <tr><td class="px" bgcolor="${C.card}" style="padding:6px 32px 22px;background:${C.card};">
    <div style="border-top:1px solid ${C.line};padding-top:12px;font-size:13px;line-height:19px;color:${C.muted};">Questions? Write to <a href="mailto:${SUPPORT}" style="color:${C.brandText};font-weight:700;">${SUPPORT}</a>.</div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

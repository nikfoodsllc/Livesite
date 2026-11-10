import { Resend } from 'resend';
import { MailtrapClient } from 'mailtrap';
import { getCommunicationEmailTemplate } from '@/templates/communication';
import { EMAIL_LOGO_CID, EMAIL_LOGO_FILENAME, EMAIL_LOGO_PNG_BASE64 } from '@/lib/emailLogo';
import { markTestSubject } from '@/lib/emailSubject';
import { getReplyTo } from '@/lib/replyTo';
import { htmlToText, wrapHtmlDocument } from '@/lib/communications/rules';
import { getSiteUrl } from '@/lib/siteUrl';

/** The page where a customer stops our emails (it records the address on the unsubscribe list). */
export function unsubscribeUrlFor(email: string): string {
  return `${getSiteUrl()}/unsubscribe?email=${encodeURIComponent(email.trim().toLowerCase())}`;
}

/** Fills {unsubscribeUrl}; a design without it gets a small footer line before </body>. */
export function withUnsubscribe(html: string, url: string): string {
  if (html.includes('{unsubscribeUrl}')) return html.replace(/\{unsubscribeUrl\}/g, url);
  if (html.includes(url) || /href=["'][^"']*\/unsubscribe/i.test(html)) return html;
  const line = `<div style="padding:16px 12px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#76664F;">Do not want these emails? <a href="${url.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" style="color:#76664F;text-decoration:underline;">Unsubscribe</a></div>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${line}</body>`) : html + line;
}

/**
 * Sends one Communication-tab email to one customer. Same own-small-sender pattern as the pay-link and delivery-date emails
 * (the order emails are not touched; provider, keys and from address are the same settings). No team copy: a campaign has its
 * own history in the admin. Never throws.
 */
export async function sendCommunicationEmail(args: { to: string; subject: string; text: string; format?: 'text' | 'html'; unsubscribeUrl?: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const subject = markTestSubject(args.subject);
    // 'html': the admin's own HTML goes out as written (wrapped in a page if it is only a snippet) with a plain-text twin;
    // the logo is attached only when the HTML uses it (cid:nikfoods-logo)
    const custom = args.format === 'html';
    // every email carries an Unsubscribe link: the template has it; a custom design uses {unsubscribeUrl}, else one is added at the bottom
    const unsubscribe = args.unsubscribeUrl ?? unsubscribeUrlFor(args.to);
    const html = custom ? withUnsubscribe(wrapHtmlDocument(args.text, args.subject), unsubscribe) : getCommunicationEmailTemplate(args.subject, args.text, unsubscribe);
    const headers = { 'List-Unsubscribe': `<${unsubscribe}>, <mailto:${getReplyTo()}?subject=unsubscribe>` };
    const plain = custom ? htmlToText(args.text) : undefined;
    const withLogo = !custom || html.includes(`cid:${EMAIL_LOGO_CID}`);
    const logo = Buffer.from(EMAIL_LOGO_PNG_BASE64, 'base64');

    if (process.env.EMAIL_PROVIDER === 'mailtrap') {
      const token = process.env.MAILTRAP_API_TOKEN;
      if (!token) return { success: false, error: 'Email service not configured' };
      const useSandbox = process.env.MAILTRAP_USE_SANDBOX === 'true';
      const inbox = process.env.MAILTRAP_INBOX_ID ? Number(process.env.MAILTRAP_INBOX_ID) : undefined;
      if (useSandbox && !inbox) return { success: false, error: 'Email service not configured' };
      const client = new MailtrapClient({ token, sandbox: useSandbox, testInboxId: useSandbox ? inbox : undefined });
      const sent = await client.send({
        from: { email: process.env.MAILTRAP_FROM_EMAIL || 'hello@demomailtrap.co', name: process.env.MAILTRAP_FROM_NAME || 'Nikfoods Test' },
        to: [{ email: args.to }],
        reply_to: { email: getReplyTo() },
        subject,
        html,
        headers,
        ...(plain ? { text: plain } : {}),
        category: 'Communication',
        ...(withLogo ? { attachments: [{ filename: EMAIL_LOGO_FILENAME, type: 'image/png', content: logo, disposition: 'inline' as const, content_id: EMAIL_LOGO_CID }] } : {}),
      });
      return { success: true, messageId: sent.message_ids[0] };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { success: false, error: 'Email service not configured' };
    const result = await new Resend(apiKey).emails.send({
      from: process.env.RESEND_FROM_EMAIL || '"Nikfoods" <no-reply@nikfoods-email.synngular.com>',
      to: [args.to],
      replyTo: getReplyTo(),
      subject,
      html,
      headers,
      ...(plain ? { text: plain } : {}),
      ...(withLogo ? { attachments: [{ filename: EMAIL_LOGO_FILENAME, contentType: 'image/png', content: logo, contentId: EMAIL_LOGO_CID }] } : {}),
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Email failed' };
  }
}

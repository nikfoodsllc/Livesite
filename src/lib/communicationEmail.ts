import { Resend } from 'resend';
import { MailtrapClient } from 'mailtrap';
import { getCommunicationEmailTemplate } from '@/templates/communication';
import { EMAIL_LOGO_CID, EMAIL_LOGO_FILENAME, EMAIL_LOGO_PNG_BASE64 } from '@/lib/emailLogo';
import { markTestSubject } from '@/lib/emailSubject';
import { getReplyTo } from '@/lib/replyTo';

/**
 * Sends one Communication-tab email to one customer. Same own-small-sender pattern as the pay-link and delivery-date emails
 * (the order emails are not touched; provider, keys and from address are the same settings). No team copy: a campaign has its
 * own history in the admin. Never throws.
 */
export async function sendCommunicationEmail(args: { to: string; subject: string; text: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const subject = markTestSubject(args.subject);
    const html = getCommunicationEmailTemplate(args.subject, args.text);
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
        category: 'Communication',
        attachments: [{ filename: EMAIL_LOGO_FILENAME, type: 'image/png', content: logo, disposition: 'inline', content_id: EMAIL_LOGO_CID }],
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
      attachments: [{ filename: EMAIL_LOGO_FILENAME, contentType: 'image/png', content: logo, contentId: EMAIL_LOGO_CID }],
    });
    if (result.error) return { success: false, error: result.error.message };
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Email failed' };
  }
}

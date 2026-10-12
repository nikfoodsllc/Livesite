import { Resend } from 'resend';
import { MailtrapClient } from 'mailtrap';
import { getCartReminderEmailSubject, getCartReminderEmailTemplate, type CartReminderInput } from '@/templates/cartReminder';
import { EMAIL_LOGO_CID, EMAIL_LOGO_FILENAME, EMAIL_LOGO_PNG_BASE64 } from '@/lib/emailLogo';
import { markTestSubject } from '@/lib/emailSubject';
import { getReplyTo } from '@/lib/replyTo';

/**
 * Sends the cart reminder email. Its own small sender (like lib/offlineOrderEmail.ts) so the existing order emails are not
 * touched: same provider settings, inline logo, test-site subject marker, and the team's copy as a separate identical email
 * (not a Bcc), so opening the team's copy can never mark the customer's email as opened.
 */
export type CartReminderSendResult = { success: boolean; error?: string; messageId?: string; provider?: 'resend' | 'mailtrap' };

export async function sendCartReminderEmail(to: string, input: CartReminderInput): Promise<CartReminderSendResult> {
  try {
    if (!to) return { success: false, error: 'No customer email' };
    const subject = markTestSubject(getCartReminderEmailSubject());
    const html = getCartReminderEmailTemplate(input);
    const bcc = (process.env.ORDER_CONFIRMATION_BCC_EMAIL || 'support@nikfoods.com')
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e && e.toLowerCase() !== to.toLowerCase());
    const logo = Buffer.from(EMAIL_LOGO_PNG_BASE64, 'base64');

    if (process.env.EMAIL_PROVIDER === 'mailtrap') {
      const token = process.env.MAILTRAP_API_TOKEN;
      if (!token) return { success: false, error: 'Email service not configured' };
      const useSandbox = process.env.MAILTRAP_USE_SANDBOX === 'true';
      const inbox = process.env.MAILTRAP_INBOX_ID ? Number(process.env.MAILTRAP_INBOX_ID) : undefined;
      if (useSandbox && !inbox) return { success: false, error: 'Email service not configured' };
      const client = new MailtrapClient({ token, sandbox: useSandbox, testInboxId: useSandbox ? inbox : undefined });
      const sendTo = (recipient: string) =>
        client.send({
          from: { email: process.env.MAILTRAP_FROM_EMAIL || 'hello@demomailtrap.co', name: process.env.MAILTRAP_FROM_NAME || 'Nikfoods Test' },
          to: [{ email: recipient }],
          reply_to: { email: getReplyTo() },
          subject,
          html,
          category: 'Cart Reminder',
          attachments: [{ filename: EMAIL_LOGO_FILENAME, type: 'image/png', content: logo, disposition: 'inline', content_id: EMAIL_LOGO_CID }],
        });
      const sent = await sendTo(to);
      for (const copy of bcc) {
        try {
          await sendTo(copy);
        } catch (copyError) {
          console.error('[cart-reminder] Could not send the team copy', copyError instanceof Error ? copyError.message : String(copyError));
        }
      }
      return { success: true, messageId: sent.message_ids[0], provider: 'mailtrap' };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { success: false, error: 'Email service not configured' };
    const resend = new Resend(apiKey);
    const sendTo = (recipient: string) =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || '"Nikfoods" <no-reply@nikfoods-email.synngular.com>',
        to: [recipient],
        replyTo: getReplyTo(),
        subject,
        html,
        attachments: [{ filename: EMAIL_LOGO_FILENAME, contentType: 'image/png', content: logo, contentId: EMAIL_LOGO_CID }],
      });
    const result = await sendTo(to);
    if (result.error) return { success: false, error: result.error.message };
    for (const copy of bcc) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 700)); // Resend allows about 2 sends a second
        const sentCopy = await sendTo(copy);
        if (sentCopy.error) console.error('[cart-reminder] The team copy was rejected', sentCopy.error.message);
      } catch (copyError) {
        console.error('[cart-reminder] Could not send the team copy', copyError instanceof Error ? copyError.message : String(copyError));
      }
    }
    return { success: true, messageId: result.data?.id, provider: 'resend' };
  } catch (error) {
    console.error('[cart-reminder] Failed to send the cart reminder email', error instanceof Error ? error.message : String(error));
    return { success: false, error: error instanceof Error ? error.message : 'Email failed' };
  }
}

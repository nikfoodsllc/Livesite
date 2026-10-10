import { Resend } from 'resend';
import { MailtrapClient } from 'mailtrap';
import { Order } from '@/types/order';
import { getDeliveryDateChangedEmailSubject, getDeliveryDateChangedEmailTemplate, type MovedDelivery } from '@/templates/deliveryDateChanged';
import { EMAIL_LOGO_CID, EMAIL_LOGO_FILENAME, EMAIL_LOGO_PNG_BASE64 } from '@/lib/emailLogo';
import { markTestSubject } from '@/lib/emailSubject';
import { getReplyTo } from '@/lib/replyTo';

/**
 * Sends the "your delivery date has changed" email when an admin presses the button. Same own-small-sender pattern as
 * the pay-link email (lib/offlineOrderEmail.ts): the existing order emails are not touched, and the settings (provider,
 * API keys, from address, team copy address) are the same ones.
 */
export async function sendDeliveryDateChangedEmail(
  order: Order,
  moves: MovedDelivery[]
): Promise<{ success: boolean; error?: string; messageId?: string; provider?: 'resend' | 'mailtrap' }> {
  try {
    const to = order.customerInfo?.email;
    if (!to) return { success: false, error: 'The order has no customer email' };

    const subject = markTestSubject(getDeliveryDateChangedEmailSubject(order));
    // support gets an identical copy (a separate email, not a Bcc, so opening it cannot mark the customer's email as opened)
    const copies = (process.env.ORDER_CONFIRMATION_BCC_EMAIL || 'support@nikfoods.com')
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e && e.toLowerCase() !== to.toLowerCase());
    const html = getDeliveryDateChangedEmailTemplate(order, moves);
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
          category: 'Delivery Date Changed',
          attachments: [{ filename: EMAIL_LOGO_FILENAME, type: 'image/png', content: logo, disposition: 'inline', content_id: EMAIL_LOGO_CID }],
        });
      const sent = await sendTo(to);
      for (const copy of copies) {
        try {
          await sendTo(copy);
        } catch (copyError) {
          console.error('[reschedule] Could not send the team copy of the delivery date email', { orderId: order.orderId, error: copyError instanceof Error ? copyError.message : String(copyError) });
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
    for (const copy of copies) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 700)); // Resend allows about 2 sends a second
        const sentCopy = await sendTo(copy);
        if (sentCopy.error) console.error('[reschedule] Team copy of the delivery date email was rejected', { orderId: order.orderId, error: sentCopy.error.message });
      } catch (copyError) {
        console.error('[reschedule] Could not send the team copy of the delivery date email', { orderId: order.orderId, error: copyError instanceof Error ? copyError.message : String(copyError) });
      }
    }
    return { success: true, messageId: result.data?.id, provider: 'resend' };
  } catch (error) {
    console.error('[reschedule] Failed to send the delivery date email', { orderId: order.orderId, error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: error instanceof Error ? error.message : 'Email failed' };
  }
}

import { Resend } from 'resend';
import { MailtrapClient } from 'mailtrap';
import { Order } from '@/types/order';
import { getPaymentLinkEmailSubject, getPaymentLinkEmailTemplate, getZelleInstructionsEmailSubject, getZelleInstructionsEmailTemplate } from '@/templates/paymentLink';
import { EMAIL_LOGO_CID, EMAIL_LOGO_FILENAME, EMAIL_LOGO_PNG_BASE64 } from '@/lib/emailLogo';
import { markTestSubject } from '@/lib/emailSubject';
import { getReplyTo } from '@/lib/replyTo';

/**
 * Sends the pay-link email of an admin-entered order. It has its own small sender on purpose, so the
 * existing order emails (lib/email.ts) are not touched by the Create Order feature; it reads the same settings
 * (provider, API keys, from address) and marks test-site subjects the same way.
 */
type SendResult = { success: boolean; error?: string; messageId?: string; provider?: 'resend' | 'mailtrap' };

export async function sendPaymentLinkEmail(order: Order, payUrl: string, accountCreated: boolean): Promise<SendResult> {
  return deliverOfflineEmail(order, {
    subject: getPaymentLinkEmailSubject(order),
    html: getPaymentLinkEmailTemplate(order, payUrl, accountCreated),
    category: 'Payment Link',
    label: 'payment link',
  });
}

/** The Zelle instructions of an admin-entered order the customer pays by Zelle (no Stripe, no link). Same sender, tracking and team copy. */
export async function sendZelleInstructionsEmail(order: Order, accountCreated: boolean): Promise<SendResult> {
  return deliverOfflineEmail(order, {
    subject: getZelleInstructionsEmailSubject(order),
    html: getZelleInstructionsEmailTemplate(order, accountCreated),
    category: 'Zelle Instructions',
    label: 'Zelle instructions',
  });
}

async function deliverOfflineEmail(order: Order, email: { subject: string; html: string; category: string; label: string }): Promise<SendResult> {
  try {
    const to = order.customerInfo?.email;
    if (!to) return { success: false, error: 'The order has no customer email' };

    const subject = markTestSubject(email.subject);
    // support gets a copy of every pay-link email (same setting as the order confirmation copy; support@nikfoods.com if unset)
    const bcc = (process.env.ORDER_CONFIRMATION_BCC_EMAIL || 'support@nikfoods.com')
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e && e.toLowerCase() !== to.toLowerCase());
    const html = email.html;
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
          category: email.category,
          attachments: [{ filename: EMAIL_LOGO_FILENAME, type: 'image/png', content: logo, disposition: 'inline', content_id: EMAIL_LOGO_CID }],
        });
      const sent = await sendTo(to);
      for (const copy of bcc) {
        try {
          await sendTo(copy);
        } catch (copyError) {
          console.error(`[offline-order] Could not send the team copy of the ${email.label} email`, { orderId: order.orderId, error: copyError instanceof Error ? copyError.message : String(copyError) });
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
    // the team's copy is its own identical email (not a Bcc) so opening it cannot mark the customer's email as opened; best effort
    for (const copy of bcc) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 700)); // Resend allows about 2 sends a second
        const sentCopy = await sendTo(copy);
        if (sentCopy.error) console.error('[offline-order] Team copy of the payment link email was rejected', { orderId: order.orderId, error: sentCopy.error.message });
      } catch (copyError) {
        console.error(`[offline-order] Could not send the team copy of the ${email.label} email`, { orderId: order.orderId, error: copyError instanceof Error ? copyError.message : String(copyError) });
      }
    }
    return { success: true, messageId: result.data?.id, provider: 'resend' };
  } catch (error) {
    console.error(`[offline-order] Failed to send the ${email.label} email`, { orderId: order.orderId, error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: error instanceof Error ? error.message : 'Email failed' };
  }
}

import { Resend } from 'resend';
import { MailtrapClient } from 'mailtrap';
import { getStopAlertSubject, getStopAlertTemplate, type StopAlertInfo } from '@/templates/stopAlert';
import { EMAIL_LOGO_CID, EMAIL_LOGO_FILENAME, EMAIL_LOGO_PNG_BASE64 } from '@/lib/emailLogo';
import { markTestSubject } from '@/lib/emailSubject';
import { isTestSite } from '@/lib/siteUrl';

/**
 * The email support gets when a paid order's delivery stop could not be created in OptimoRoute. Its own small sender (like the
 * stock email), so the customer emails are not touched. It goes ONLY to support@nikfoods.com. `to` replaces that for samples.
 */
type SendResult = { success: boolean; error?: string };

export const STOP_ALERT_TO = 'support@nikfoods.com';

/** Where the button goes: the Orders page of the admin (the test admin when this is the test site). */
export function adminOrdersUrl(env: Record<string, string | undefined> = process.env): string {
  const base = (env.ADMIN_URL || (isTestSite(env) ? 'https://nikfoodsadmin-dev.vercel.app' : 'https://nikfoodsadmin.vercel.app')).replace(/\/+$/, '');
  return `${base}/admin/orders`;
}

/** Sends one delivery-stop email. Never throws. */
export async function sendStopAlertEmail(info: StopAlertInfo, to?: string[]): Promise<SendResult> {
  try {
    const recipients = to && to.length > 0 ? to : [STOP_ALERT_TO];
    const subject = markTestSubject(getStopAlertSubject(info));
    const html = getStopAlertTemplate(info);
    const logo = Buffer.from(EMAIL_LOGO_PNG_BASE64, 'base64');
    const important = { Importance: 'high', 'X-Priority': '1' };

    if (process.env.EMAIL_PROVIDER === 'mailtrap') {
      const token = process.env.MAILTRAP_API_TOKEN;
      if (!token) return { success: false, error: 'Email service not configured' };
      const useSandbox = process.env.MAILTRAP_USE_SANDBOX === 'true';
      const inbox = process.env.MAILTRAP_INBOX_ID ? Number(process.env.MAILTRAP_INBOX_ID) : undefined;
      if (useSandbox && !inbox) return { success: false, error: 'Email service not configured' };
      const client = new MailtrapClient({ token, sandbox: useSandbox, testInboxId: useSandbox ? inbox : undefined });
      for (const recipient of recipients) {
        await client.send({
          from: { email: process.env.MAILTRAP_FROM_EMAIL || 'hello@demomailtrap.co', name: process.env.MAILTRAP_FROM_NAME || 'Nikfoods Test' },
          to: [{ email: recipient }],
          subject,
          html,
          headers: important,
          category: 'Delivery stop alert',
          attachments: [{ filename: EMAIL_LOGO_FILENAME, type: 'image/png', content: logo, disposition: 'inline', content_id: EMAIL_LOGO_CID }],
        });
      }
      return { success: true };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { success: false, error: 'Email service not configured' };
    const resend = new Resend(apiKey);
    for (const recipient of recipients) {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || '"Nikfoods" <no-reply@nikfoods-email.synngular.com>',
        to: [recipient],
        subject,
        html,
        headers: important,
        attachments: [{ filename: EMAIL_LOGO_FILENAME, contentType: 'image/png', content: logo, contentId: EMAIL_LOGO_CID }],
      });
      if (result.error) return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('[stop-alert] Could not send the email', error instanceof Error ? error.message : error);
    return { success: false, error: error instanceof Error ? error.message : 'Email failed' };
  }
}

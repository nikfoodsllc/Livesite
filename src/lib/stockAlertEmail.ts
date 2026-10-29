import { Resend } from 'resend';
import { MailtrapClient } from 'mailtrap';
import { getStockAlertEmailSubject, getStockAlertEmailTemplate, type StockAlertInfo } from '@/templates/stockAlert';
import { EMAIL_LOGO_CID, EMAIL_LOGO_FILENAME, EMAIL_LOGO_PNG_BASE64 } from '@/lib/emailLogo';
import { markTestSubject } from '@/lib/emailSubject';
import { isTestSite } from '@/lib/siteUrl';

/**
 * The team's stock emails (an item running low, an item sold out). They have their own small sender, like the pay-link email, so the
 * customer emails (lib/email.ts) are not touched. They go to STOCK_ALERT_EMAIL (comma separated), or support@nikfoods.com when unset.
 */
type SendResult = { success: boolean; error?: string };

export const STOCK_ALERT_DEFAULT_TO = 'support@nikfoods.com';

export function stockAlertRecipients(env: Record<string, string | undefined> = process.env): string[] {
  const list = (env.STOCK_ALERT_EMAIL || STOCK_ALERT_DEFAULT_TO).split(',').map((e) => e.trim()).filter(Boolean);
  return list.length > 0 ? list : [STOCK_ALERT_DEFAULT_TO];
}

/** Where the button in the email goes: the admin's Food Items page (the test admin when this is the test site). */
export function adminFoodItemsUrl(env: Record<string, string | undefined> = process.env): string {
  const base = (env.ADMIN_URL || (isTestSite(env) ? 'https://nikfoodsadmin-dev.vercel.app' : 'https://nikfoodsadmin.vercel.app')).replace(/\/+$/, '');
  return `${base}/admin/food-items`;
}

/** Sends one stock email to the team. Never throws. `to` replaces the usual team address (used for samples). */
export async function sendStockAlertEmail(info: StockAlertInfo, to?: string[]): Promise<SendResult> {
  try {
    const recipients = to && to.length > 0 ? to : stockAlertRecipients();
    const subject = markTestSubject(getStockAlertEmailSubject(info));
    const html = getStockAlertEmailTemplate(info);
    const logo = Buffer.from(EMAIL_LOGO_PNG_BASE64, 'base64');

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
          category: 'Stock alert',
          attachments: [{ filename: EMAIL_LOGO_FILENAME, type: 'image/png', content: logo, disposition: 'inline', content_id: EMAIL_LOGO_CID }],
        });
      }
      return { success: true };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { success: false, error: 'Email service not configured' };
    const resend = new Resend(apiKey);
    let first = true;
    for (const recipient of recipients) {
      if (!first) await new Promise((resolve) => setTimeout(resolve, 700)); // Resend allows about 2 sends a second
      first = false;
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || '"Nikfoods" <no-reply@nikfoods-email.synngular.com>',
        to: [recipient],
        subject,
        html,
        attachments: [{ filename: EMAIL_LOGO_FILENAME, contentType: 'image/png', content: logo, contentId: EMAIL_LOGO_CID }],
      });
      if (result.error) return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('[stock-alert] Could not send the email', error instanceof Error ? error.message : error);
    return { success: false, error: error instanceof Error ? error.message : 'Email failed' };
  }
}

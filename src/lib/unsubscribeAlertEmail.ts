import { Resend } from 'resend';
import { MailtrapClient } from 'mailtrap';
import { markTestSubject } from '@/lib/emailSubject';

/**
 * Tells the team that someone unsubscribed from the Wix menu emails, so they can take that person off the Wix list.
 * Own small sender (like the stock emails), so the customer emails in lib/email.ts are not touched.
 * Goes to UNSUBSCRIBE_ALERT_EMAIL (comma separated), or support@nikfoods.com when unset.
 */
type SendResult = { success: boolean; error?: string };

export const UNSUBSCRIBE_ALERT_DEFAULT_TO = 'support@nikfoods.com';

export function unsubscribeAlertRecipients(env: Record<string, string | undefined> = process.env): string[] {
  const list = (env.UNSUBSCRIBE_ALERT_EMAIL || UNSUBSCRIBE_ALERT_DEFAULT_TO).split(',').map((e) => e.trim()).filter(Boolean);
  return list.length > 0 ? list : [UNSUBSCRIBE_ALERT_DEFAULT_TO];
}

export const getUnsubscribeAlertSubject = (email: string) => `Unsubscribed: ${email}`;

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function getUnsubscribeAlertHtml(email: string): string {
  const safe = escapeHtml(email);
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#FFFBF5;font-family:Arial,Helvetica,sans-serif;color:#1f1f1f;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #eadfce;border-radius:12px;padding:24px;">
<p style="margin:0 0 12px;font-size:16px;line-height:24px;"><strong>${safe}</strong> unsubscribed from the NikFoods menu emails.</p>
<p style="margin:0;font-size:16px;line-height:24px;">Please take them off the mailing list in Wix.</p>
</div></body></html>`;
}

/** Sends the team email. Never throws. */
export async function sendUnsubscribeAlertEmail(email: string): Promise<SendResult> {
  try {
    const recipients = unsubscribeAlertRecipients();
    const subject = markTestSubject(getUnsubscribeAlertSubject(email));
    const html = getUnsubscribeAlertHtml(email);

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
          category: 'Unsubscribe alert',
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
      });
      if (result.error) return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('[unsubscribe-alert] Could not send the email', error instanceof Error ? error.message : error);
    return { success: false, error: error instanceof Error ? error.message : 'Email failed' };
  }
}

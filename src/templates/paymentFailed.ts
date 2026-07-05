import { Order } from '@/types/order';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatOrderAmount(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

function getGracefulFailureMessage(failureReason?: string): string {
  const reason = failureReason?.trim().toLowerCase() || '';

  if (reason.includes('declined') || reason.includes('insufficient')) {
    return 'Your card was declined.';
  }
  if (reason.includes('expired') || reason.includes('session')) {
    return 'Your payment session expired.';
  }
  if (reason.includes('timeout') || reason.includes('timed out')) {
    return 'Payment authorization timed out.';
  }
  if (failureReason?.trim()) {
    const trimmed = failureReason.trim();
    return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
  }

  return 'Your card was declined, payment authorization timed out, or your session expired.';
}

export function getPaymentFailedEmailSubject(order: Order): string {
  const amount = formatOrderAmount(order.totalPaid, order.currency);
  return `Action Required: Your Recent Nikfoods Order for ${amount} Could Not Be Placed – Please Resubmit`;
}

/**
 * Payment failed email HTML template
 */
export function getPaymentFailedEmailTemplate(
  order: Order,
  failureReason?: string
): string {
  const logoUrl =
    process.env.EMAIL_LOGO_URL ||
    'https://res.cloudinary.com/dz30kdodd/image/upload/v1780207579/nikfoods/qwcozcqazeb8cuna8j2q.png';
  const checkoutUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://nikfoods.com'}/checkout`;
  const amount = formatOrderAmount(order.totalPaid, order.currency);
  const gracefulFailureMessage = getGracefulFailureMessage(failureReason);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Could Not Be Placed</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 24px 12px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">

              <tr>
                <td style="padding: 24px 32px 0 32px; text-align: left;">
                  <img
                    src="${logoUrl}"
                    alt="Nikfoods"
                    width="100"
                    style="display: block; border: 0; outline: none; text-decoration: none;"
                  />
                </td>
              </tr>

              <tr>
                <td style="padding: 24px 32px 28px 32px; color: #374151; font-size: 15px; line-height: 1.7;">
                  <p style="margin: 0 0 16px 0; color: #1A1106;">Dear Customer,</p>

                  <p style="margin: 0 0 16px 0;">
                    Unfortunately, we were unable to process your recent order for <strong style="color: #1A1106;">${amount}</strong>, and <strong style="color: #1A1106;">your card has not been charged.</strong>
                  </p>

                  <p style="margin: 0 0 8px 0; color: #1A1106; font-weight: 700;">
                    What went wrong?
                  </p>
                  <p style="margin: 0 0 16px 0;">
                    ${escapeHtml(gracefulFailureMessage)}
                  </p>

                  <p style="margin: 0 0 16px 0;">
                    To complete your order, please click the link below and <strong style="color: #1A1106;">resubmit your order</strong>
                  </p>

                  <p style="margin: 0 0 16px 0; color: #1A1106;">
                    👉 <strong>Resubmit My Order:</strong>
                    <a href="${escapeHtml(checkoutUrl)}" style="color: #FF9F0D; font-weight: 400; text-decoration: underline;">${escapeHtml(checkoutUrl.replace(/^https?:\/\//, ''))}</a>
                  </p>

                  <p style="margin: 0 0 16px 0;">
                    We apologise for the inconvenience and appreciate your understanding.
                  </p>

                  <p style="margin: 0 0 16px 0;">
                    If you continue to experience any issues, simply reply to this email or contact our support team—we'll be happy to help.
                  </p>

                  <p style="margin: 0 0 16px 0;">
                    Thank you for choosing Nikfoods. We look forward to serving you soon!
                  </p>

                  <p style="margin: 0 0 8px 0; color: #1A1106;">Warm regards,</p>
                  <p style="margin: 0 0 8px 0; color: #1A1106; font-weight: 700;">Team Nikfoods</p>
                  <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.5;">
                    Fresh Homemade Meals Delivered Across Greater Seattle
                  </p>
                </td>
              </tr>

              <tr>
                <td style="background-color: #f9f9f9; padding: 16px 32px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    © ${new Date().getFullYear()} NikFoods. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

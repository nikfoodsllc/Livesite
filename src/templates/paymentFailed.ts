import { Order } from '@/types/order';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Payment failed email HTML template
 */
export function getPaymentFailedEmailTemplate(
  order: Order,
  failureReason?: string
): string {
  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const logoUrl =
    process.env.EMAIL_LOGO_URL ||
    'https://res.cloudinary.com/dz30kdodd/image/upload/v1780207579/nikfoods/qwcozcqazeb8cuna8j2q.png';
  const reason = failureReason?.trim() || 'Your payment could not be processed.';
  const customerName = order.customerInfo.name?.trim() || 'there';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Failed - ${escapeHtml(order.orderId)}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f5f5; line-height: 1.6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">

              <tr>
                <td style="padding: 32px 40px 0 40px; text-align: left;">
                  <img
                    src="${logoUrl}"
                    alt="Nikfoods"
                    width="120"
                    style="display: block; border: 0; outline: none; text-decoration: none;"
                  />
                </td>
              </tr>

              <tr>
                <td style="padding: 24px 40px 20px 40px;">
                  <h2 style="margin: 0 0 16px 0; color: #dc2626; font-size: 22px; font-weight: 700;">
                    Payment could not be completed
                  </h2>

                  <p style="margin: 0 0 24px 0; color: #1A1106; font-size: 16px;">
                    Hi ${escapeHtml(customerName)}, we were unable to process payment for order <strong>${escapeHtml(order.orderId)}</strong>.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background-color: #FEF2F2; border-left: 4px solid #dc2626; border-radius: 8px;">
                    <tr>
                      <td style="padding: 16px;">
                        <p style="margin: 0 0 8px 0; color: #991B1B; font-size: 14px; font-weight: 700; text-transform: uppercase;">
                          What went wrong
                        </p>
                        <p style="margin: 0; color: #7F1D1D; font-size: 15px;">
                          ${escapeHtml(reason)}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 8px 0; color: #6B7280; font-size: 14px; width: 40%; font-weight: 600;">Order ID</td>
                      <td style="padding: 8px 0; color: #1A1106; font-size: 15px;">${escapeHtml(order.orderId)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6B7280; font-size: 14px; width: 40%; font-weight: 600;">Amount</td>
                      <td style="padding: 8px 0; color: #1A1106; font-size: 15px; font-weight: 600;">${formatCurrency(order.totalPaid, order.currency)}</td>
                    </tr>
                  </table>

                  <p style="margin: 0 0 30px 0; color: #666666; font-size: 15px;">
                    Your order was not confirmed and you have not been charged. You can try again with the same or a different payment method.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF4E4; border-left: 4px solid #FFB82E; border-radius: 8px;">
                    <tr>
                      <td style="padding: 16px;">
                        <p style="margin: 0 0 8px 0; color: #996B00; font-size: 14px; font-weight: 700;">
                          Need help?
                        </p>
                        <p style="margin: 0; color: #996B00; font-size: 14px; line-height: 1.6;">
                          Double-check your card details, ensure sufficient balance, or contact your bank if the issue continues.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
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

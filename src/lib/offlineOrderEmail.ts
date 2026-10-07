import { Order } from '@/types/order';
import { sendTransactionalEmail } from '@/lib/email';
import { getPaymentLinkEmailSubject, getPaymentLinkEmailTemplate } from '@/templates/paymentLink';

/** Emails the pay link of an admin-entered order to the customer. Never throws: returns what happened. */
export async function sendPaymentLinkEmail(
  order: Order,
  payUrl: string,
  accountCreated: boolean
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const email = order.customerInfo?.email;
    if (!email) return { success: false, error: 'The order has no customer email' };
    const result = await sendTransactionalEmail({
      to: [email],
      subject: getPaymentLinkEmailSubject(order),
      html: getPaymentLinkEmailTemplate(order, payUrl, accountCreated),
      category: 'Payment Link',
      inlineLogo: true,
    });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[offline-order] Failed to send the payment link email', { orderId: order.orderId, error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: error instanceof Error ? error.message : 'Email failed' };
  }
}

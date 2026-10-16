import type { Order } from '@/types/order';

/** The payment method of a quote: an order an admin enters as paid (like cash) that sends no email to the customer or to support. */
export const QUOTE_METHOD = 'Quote';

export function isQuoteOrder(order: Pick<Order, 'paymentMethod'> | null | undefined): boolean {
  return order?.paymentMethod === QUOTE_METHOD;
}

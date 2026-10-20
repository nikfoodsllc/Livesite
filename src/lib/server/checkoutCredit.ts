import { db } from '@/lib/server/db';
import type { Order } from '@/types/order';
import { planCreditForOrder, planCreditUse, toCents, toDollars, type CreditedTotals } from '@/lib/storeCredit';
import { getBalanceCents } from '@/lib/server/storeCredit';

export interface CheckoutCredit extends CreditedTotals {
  balanceCents: number;
}

/**
 * How much store credit pays for this checkout, and the Platform Fee, tax and total that go with it (the fee is charged only
 * on what goes through Stripe, see planCreditForOrder). The customer's own choice (`useStoreCredit`) and balance decide, except
 * when the order already exists (a card payment is being retried): then the credit and totals it was created with are kept,
 * because that credit is already taken off the balance.
 */
export async function creditForCheckout(input: {
  userId: string;
  cart: { subtotal: number; platformFee: number; deliveryFee: number; tax: number };
  tipAmount: number;
  discount?: number;
  useStoreCredit?: boolean;
  orderId?: string;
}): Promise<CheckoutCredit> {
  const { cart, tipAmount } = input;
  const discount = input.discount ?? 0;
  const plainTotal = toDollars(toCents(cart.subtotal) + toCents(cart.platformFee) + toCents(cart.deliveryFee) + toCents(cart.tax) + toCents(tipAmount) - toCents(discount));
  const plain = { platformFee: cart.platformFee, tax: cart.tax, total: plainTotal };

  if (input.orderId) {
    const found = await db.readOne<Order>('orders', { orderId: input.orderId } as never);
    const order = found.success ? found.data : null;
    if (order && String(order.user) === input.userId) {
      const totalCents = toCents(order.totalPaid);
      const creditCents = Math.min(totalCents, toCents(order.storeCreditUsed ?? 0));
      return { creditCents, cardCents: totalCents - creditCents, platformFee: order.platformFee, tax: order.taxes, total: order.totalPaid, balanceCents: await getBalanceCents(input.userId) };
    }
  }
  const balanceCents = await getBalanceCents(input.userId);
  if (!input.useStoreCredit) return { creditCents: 0, cardCents: toCents(plain.total), ...plain, balanceCents };
  if (discount > 0) {
    // a discount changes what the fee is worked out on: keep the old rule (the fee stays whole) for such a cart
    const old = planCreditUse(toCents(plain.total), balanceCents);
    return { ...old, ...plain, balanceCents };
  }
  return { ...planCreditForOrder({ subtotal: cart.subtotal, deliveryFee: cart.deliveryFee, tip: tipAmount, balanceCents }), balanceCents };
}

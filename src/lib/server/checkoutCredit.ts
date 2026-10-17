import { db } from '@/lib/server/db';
import type { Order } from '@/types/order';
import { planCreditUse, toCents, type CreditPlan } from '@/lib/storeCredit';
import { getBalanceCents } from '@/lib/server/storeCredit';

export interface CheckoutCredit extends CreditPlan {
  balanceCents: number;
}

/**
 * How much store credit pays for this checkout. The customer's own choice (`useStoreCredit`) and balance decide, except when
 * the order already exists (a card payment is being retried): then the credit it was created with is kept, because that
 * credit is already taken off the balance.
 */
export async function creditForCheckout(input: { userId: string; totalDollars: number; useStoreCredit?: boolean; orderId?: string }): Promise<CheckoutCredit> {
  const totalCents = toCents(input.totalDollars);
  if (input.orderId) {
    const found = await db.readOne<Order>('orders', { orderId: input.orderId } as never);
    const order = found.success ? found.data : null;
    if (order && String(order.user) === input.userId) {
      const creditCents = Math.min(totalCents, toCents(order.storeCreditUsed ?? 0));
      return { creditCents, cardCents: totalCents - creditCents, balanceCents: await getBalanceCents(input.userId) };
    }
  }
  const balanceCents = await getBalanceCents(input.userId);
  if (!input.useStoreCredit) return { creditCents: 0, cardCents: totalCents, balanceCents };
  return { ...planCreditUse(totalCents, balanceCents), balanceCents };
}

/** The words of every order notification, kept short (a notification shows about 40 + 100 characters). Pure, so it can be tested. */
export type OrderEvent = 'confirmed' | 'payment_failed' | 'on_the_way' | 'delivered' | 'rescheduled' | 'payment_link' | 'store_credit';

/** "2026-10-21" -> "Wed, Oct 21" */
export function dayLabel(date: string): string {
  const d = new Date(`${String(date).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export interface OrderMessageContext {
  orderId: string;
  /** every delivery day of the order (YYYY-MM-DD), sorted */
  dates: string[];
  /** the day this message is about (on the way / delivered) */
  date?: string;
  /** replaces the default words of a rescheduled message */
  note?: string;
  url?: string;
}

export interface OrderMessage {
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export function orderMessage(event: OrderEvent, ctx: OrderMessageContext): OrderMessage {
  const order = { type: 'order', orderId: ctx.orderId };
  const multi = ctx.dates.length > 1;
  switch (event) {
    case 'confirmed':
      return {
        title: 'Order confirmed',
        body: ctx.dates.length === 0 ? 'We have your order.' : multi ? `Delivering on ${ctx.dates.length} days, starting ${dayLabel(ctx.dates[0])}.` : `Delivering ${dayLabel(ctx.dates[0])}.`,
        data: order,
      };
    case 'payment_failed':
      return { title: "Payment didn't go through", body: "Your order wasn't placed. Open the app to try again.", data: { type: 'cart' } };
    case 'on_the_way':
      return { title: 'Out for delivery', body: ctx.date && multi ? `Your ${dayLabel(ctx.date)} delivery is on its way.` : 'Your order is on its way.', data: order };
    case 'delivered':
      return {
        title: 'Delivered',
        body: ctx.date && multi ? `Your ${dayLabel(ctx.date)} delivery has arrived. Enjoy!` : 'Enjoy your meal! Thanks for ordering from NikFoods.',
        data: order,
      };
    case 'rescheduled':
      return { title: 'Delivery date changed', body: ctx.note?.trim() || 'We moved your delivery. Open the app for the new date.', data: order };
    case 'store_credit':
      return { title: 'Store credit added', body: ctx.note?.trim() || 'We added store credit to your account.', data: order };
    case 'payment_link':
      return { title: 'Payment link', body: 'Tap to pay for your NikFoods order.', data: { type: 'pay', orderId: ctx.orderId, ...(ctx.url ? { url: ctx.url } : {}) } };
  }
}

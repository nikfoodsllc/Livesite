import { sendPush } from './send';

/** The words of the cart reminder notification: the first item, and how many more. Pure. */
export function cartReminderText(items: Array<{ name?: unknown }> | undefined): { title: string; body: string } {
  const names = (items ?? []).map((i) => String(i?.name ?? '').trim()).filter(Boolean);
  const first = names[0];
  const body = !first ? 'Finish your order before the day closes.' : names.length > 1 ? `${first} and ${names.length - 1} more are waiting.` : `${first} is waiting.`;
  return { title: 'Your cart is waiting', body };
}

/**
 * The cart reminder as a notification, for a customer who has the app AND turned reminders on (they are off until the customer
 * chooses). Returns true when it went out; then no email is sent for this cart. False means "use the email as before".
 */
export async function tryCartReminderPush(draft: { userId?: unknown; items?: unknown[] }): Promise<boolean> {
  const userId = draft.userId ? String(draft.userId) : '';
  if (!userId) return false;
  const text = cartReminderText(draft.items as Array<{ name?: unknown }>);
  const summary = await sendPush({ userIds: [userId], kind: 'reminders', ...text, data: { type: 'cart' }, log: { event: 'cart_reminder' } });
  return summary.mode === 'on' && summary.sent > 0;
}

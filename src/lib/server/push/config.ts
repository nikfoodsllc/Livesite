/**
 * Push notifications for the NikFoods iOS app (sent through Expo's push service, which hands them to Apple).
 *
 * Switch PUSH = off (default) | dry (builds and counts the messages, sends nothing) | on.
 * EXPO_ACCESS_TOKEN is only needed when "enhanced push security" is turned on in the Expo project.
 */
export type PushMode = 'off' | 'dry' | 'on';
export function pushMode(env: Record<string, string | undefined> = process.env): PushMode {
  const v = (env.PUSH ?? '').trim().toLowerCase();
  return v === 'on' || v === 'dry' ? v : 'off';
}

/**
 * What a message is about. A customer can switch each kind off in the app:
 *  orders    - confirmed, on the way, delivered, delivery date changed, payment problems, the payment link (on by default)
 *  menu      - "the new menu is up" (on by default, but only for people subscribed to menu alerts)
 *  reminders - a nudge about a cart left behind (OFF until the customer turns it on: it is a marketing message)
 */
export type PushKind = 'orders' | 'menu' | 'reminders';
export const PUSH_KINDS: PushKind[] = ['orders', 'menu', 'reminders'];

export interface PushPrefs {
  orders: boolean;
  menu: boolean;
  reminders: boolean;
}
export const DEFAULT_PREFS: PushPrefs = { orders: true, menu: true, reminders: false };

/** Does this customer want this kind of message? (an unset choice uses the default) */
export function wants(prefs: Partial<PushPrefs> | null | undefined, kind: PushKind): boolean {
  const v = prefs?.[kind];
  return typeof v === 'boolean' ? v : DEFAULT_PREFS[kind];
}

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** Expo accepts at most 100 messages per request. */
export const EXPO_BATCH = 100;

/** An Expo push token looks like ExponentPushToken[xxxxxxxx] (or ExpoPushToken[...]). */
export function isExpoToken(token: unknown): token is string {
  return typeof token === 'string' && /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$/.test(token.trim());
}

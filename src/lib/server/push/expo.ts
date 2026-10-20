import { EXPO_BATCH, EXPO_PUSH_URL } from './config';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  /** What the app does when the notification is tapped, e.g. { type: 'order', orderId } */
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
}

export interface PushTicket {
  ok: boolean;
  /** Expo's receipt id (not used yet) */
  id?: string;
  /** Expo's error code, e.g. DeviceNotRegistered, MessageRateExceeded, InvalidCredentials */
  error?: string;
  message?: string;
}

/** True when Expo says this token will never work again, so it should be forgotten. */
export const isDeadTokenError = (error?: string) => error === 'DeviceNotRegistered';

/** Sends messages to Expo in batches of 100 and returns one ticket per message, in the same order. Never throws. */
export async function sendExpoMessages(messages: PushMessage[], fetchImpl: typeof fetch = fetch): Promise<PushTicket[]> {
  const tickets: PushTicket[] = [];
  for (let i = 0; i < messages.length; i += EXPO_BATCH) {
    const batch = messages.slice(i, i + EXPO_BATCH);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      const token = process.env.EXPO_ACCESS_TOKEN?.trim();
      const response = await fetchImpl(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(batch.map((m) => ({ sound: 'default', priority: 'high', ...m }))),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      const json = (await response.json().catch(() => ({}))) as { data?: Array<{ status?: string; id?: string; message?: string; details?: { error?: string } }>; errors?: Array<{ message?: string }> };
      if (!response.ok || !Array.isArray(json.data)) {
        const message = json.errors?.[0]?.message ?? `Expo answered ${response.status}`;
        for (let j = 0; j < batch.length; j++) tickets.push({ ok: false, error: 'RequestFailed', message });
        continue;
      }
      for (let j = 0; j < batch.length; j++) {
        const t = json.data[j];
        if (t?.status === 'ok') tickets.push({ ok: true, id: t.id });
        else tickets.push({ ok: false, error: t?.details?.error ?? 'Unknown', message: t?.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (let j = 0; j < batch.length; j++) tickets.push({ ok: false, error: 'RequestFailed', message });
    }
  }
  return tickets;
}

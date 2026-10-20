import type { LocalCart } from '@/types/localCart';
import * as localCart from '@/lib/localStorageCart';

/**
 * Keeps the cart the same on every device a customer is signed in on (the website and the app). The cart still lives on the device
 * (so nothing about adding items changes); a copy is saved on the server and compared when the customer signs in and whenever the
 * page or app comes back into view. A cart emptied by a paid order is emptied everywhere.
 */

const MARKER_KEY = localCart.CART_SYNC_MARKER_KEY;
const PUSH_DELAY_MS = 1500;

export interface SyncMarker {
  userId: string;
  /** the server's version of the cart this device last matched */
  rev: number;
  /** this device changed the cart since then */
  dirty: boolean;
}

export type SyncDecision = 'none' | 'adopt' | 'push';

export interface SyncInput {
  userId: string;
  local: { empty: boolean; lastUpdated?: string };
  server: { empty: boolean; rev: number; lastUpdated?: string };
  marker: SyncMarker | null;
}

const ms = (v?: string) => {
  const t = v ? new Date(v).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
};

/** What to do about the cart now: nothing, take the server's, or send this device's. */
export function decideSync({ userId, local, server, marker }: SyncInput): SyncDecision {
  const mine = marker && marker.userId === userId ? marker : null;
  if (mine) {
    if (mine.dirty) return 'push'; // this device changed it since the last match: its cart wins
    return server.rev !== mine.rev ? 'adopt' : 'none'; // someone else changed (or emptied) it
  }
  // first time this device meets this account's saved cart
  if (local.empty && server.empty) return 'none';
  if (local.empty) return 'adopt';
  if (server.empty) return 'push';
  return ms(server.lastUpdated) >= ms(local.lastUpdated) ? 'adopt' : 'push';
}

function readMarker(): SyncMarker | null {
  try {
    const raw = localStorage.getItem(MARKER_KEY);
    return raw ? (JSON.parse(raw) as SyncMarker) : null;
  } catch {
    return null;
  }
}
function writeMarker(m: SyncMarker | null): void {
  try {
    if (m) localStorage.setItem(MARKER_KEY, JSON.stringify(m));
    else localStorage.removeItem(MARKER_KEY);
  } catch {
    // the next sync just starts from scratch
  }
}

function isEmpty(cart: LocalCart | null | undefined): boolean {
  if (!cart || !cart.days) return true;
  return Object.values(cart.days).every((d) => !d || !d.items || Object.keys(d.items).length === 0);
}

interface Session {
  userId: string;
}

/** The app runs this same code; the saved cart notes which one changed it last. */
const SOURCE: 'web' | 'app' = typeof navigator !== 'undefined' && (navigator as { product?: string }).product === 'ReactNative' ? 'app' : 'web';

let session: Session | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<void> | null = null;
let rerun = false;
/** counts the changes made on this device, so a change that happens during a sync is never lost */
let changes = 0;
let onAdopted: (() => void) | null = null;

function token(): string {
  try {
    return localStorage.getItem('accessToken') || '';
  } catch {
    return '';
  }
}

async function call(method: 'GET' | 'PUT', body?: unknown): Promise<{ ok: boolean; status: number; json: { data?: { cart?: LocalCart | null; rev?: number } } }> {
  const response = await fetch('/api/cart/sync', {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}

/** Compare this device's cart with the saved one and do what decideSync says. Quiet: a problem just leaves things as they are. */
async function reconcile(): Promise<void> {
  const s = session;
  if (!s || !token()) return;
  try {
    const seen = changes;
    const got = await call('GET');
    if (!got.ok || !got.json.data) return;
    const serverCart = got.json.data.cart ?? null;
    const rev = Number(got.json.data.rev) || 0;
    const local = localCart.getCart();
    const decision = decideSync({
      userId: s.userId,
      local: { empty: isEmpty(local), lastUpdated: local.lastUpdated },
      server: { empty: isEmpty(serverCart), rev, lastUpdated: serverCart?.lastUpdated },
      marker: readMarker(),
    });
    if (decision === 'adopt') {
      // the cart was changed here while we asked: that change is newer, send it instead
      if (session?.userId !== s.userId || changes !== seen) {
        rerun = true;
        return;
      }
      if (serverCart && !isEmpty(serverCart)) localCart.replaceCartQuietly(serverCart);
      else localCart.clearCart();
      writeMarker({ userId: s.userId, rev, dirty: false });
      onAdopted?.();
    } else if (decision === 'push') {
      const sentAt = changes;
      const saved = await call('PUT', { cart: isEmpty(local) ? null : local, source: SOURCE });
      if (saved.ok && saved.json.data?.rev) {
        const stillSame = changes === sentAt;
        writeMarker({ userId: s.userId, rev: Number(saved.json.data.rev), dirty: !stillSame });
        if (!stillSame) rerun = true;
      }
    } else {
      writeMarker({ userId: s.userId, rev, dirty: false });
    }
  } catch {
    // offline or the site is busy: try again at the next change or when the app is shown again
  }
}

function run(): Promise<void> {
  if (running) {
    rerun = true;
    return running;
  }
  running = reconcile().finally(() => {
    running = null;
    if (rerun) {
      rerun = false;
      void run();
    }
  });
  return running;
}

/** Called after every real change of the local cart (not when we copy the saved cart in). */
function onLocalChange(): void {
  if (!session) return;
  changes += 1;
  const m = readMarker();
  writeMarker({ userId: session.userId, rev: m && m.userId === session.userId ? m.rev : 0, dirty: true });
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void run();
  }, PUSH_DELAY_MS);
}

/** Start (customer signed in) or stop (signed out) syncing. `refresh` is called when the saved cart replaced this device's. */
export function setCartSyncSession(next: Session | null, refresh?: () => void): void {
  onAdopted = refresh ?? null;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  session = next;
  localCart.setCartChangeListener(next ? onLocalChange : null);
  if (next) void run();
}

/** The page or app came back into view: look again. */
export function syncCartNow(): void {
  if (session) void run();
}

/**
 * The customer ordered: empty this device's cart and the saved one right away (the server also empties it when the payment is
 * confirmed; doing it here as well means no device can bring the paid cart back in between).
 */
export async function emptyCartEverywhere(): Promise<void> {
  localCart.clearCart();
  const s = session;
  if (!s || !token()) return;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  try {
    const saved = await call('PUT', { cart: null, source: SOURCE });
    if (saved.ok && saved.json.data?.rev) writeMarker({ userId: s.userId, rev: Number(saved.json.data.rev), dirty: false });
  } catch {
    // the server empties it when the payment is confirmed
  }
}

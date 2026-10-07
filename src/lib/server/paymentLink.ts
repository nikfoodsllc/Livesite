import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { getSiteUrl } from '@/lib/siteUrl';

/**
 * The pay link of an order an admin entered: /pay/<orderId>?t=<secret>. The secret is random (192 bits), only
 * its SHA-256 hash is saved on the order, and anyone holding the link can pay that one order, nothing else.
 * Sending the link again makes a new secret, which stops the old link working.
 */
export function newPaymentToken(): string {
  return randomBytes(24).toString('hex');
}

export function hashPaymentToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function paymentTokenMatches(token: string | null | undefined, savedHash: string | null | undefined): boolean {
  if (!token || !savedHash || !/^[0-9a-f]{48}$/.test(token)) return false;
  const a = Buffer.from(hashPaymentToken(token), 'hex');
  const b = Buffer.from(savedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Base address of the site that serves the pay page (override with PAY_LINK_BASE_URL for local testing). */
export function payLinkBase(env: Record<string, string | undefined> = process.env): string {
  const override = (env.PAY_LINK_BASE_URL ?? '').trim().replace(/\/+$/, '');
  return override || getSiteUrl(env);
}

export function buildPayLink(orderId: string, token: string, env: Record<string, string | undefined> = process.env): string {
  return `${payLinkBase(env)}/pay/${encodeURIComponent(orderId)}?t=${token}`;
}

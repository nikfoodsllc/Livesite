/**
 * The key that signs login and reset tokens. There is deliberately no fallback value:
 * a site started without PRIVATE_KEY must fail loudly, never sign with a key that is
 * visible in the (public) repository. Read lazily so `next build` works without it.
 */
export function getJwtSecret(): string {
  const secret = process.env.PRIVATE_KEY;
  if (!secret) throw new Error('PRIVATE_KEY environment variable is not defined');
  return secret;
}

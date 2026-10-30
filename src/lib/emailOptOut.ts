/** Pure helpers for the marketing email opt-out list (the /unsubscribe page). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Trimmed, lower case address, or null when it is not a usable email. */
export function cleanOptOutEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}

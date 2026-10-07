import { isTestSite } from '@/lib/siteUrl';

export const TEST_SUBJECT_PREFIX = '[TEST \u2013 DEV SITE] ';

/**
 * Every email sent from the test site starts its subject with a clear test marker, so nobody mistakes a
 * test email for a real one. On the live site the subject is returned unchanged.
 */
export function markTestSubject(subject: string, env: Record<string, string | undefined> = process.env): string {
  if (!isTestSite(env) || subject.startsWith(TEST_SUBJECT_PREFIX)) return subject;
  return TEST_SUBJECT_PREFIX + subject;
}

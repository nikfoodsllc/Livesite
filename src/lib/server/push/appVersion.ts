/**
 * App version numbers (1.0.3). A phone counts as "older" than the latest version when its number is lower, and also
 * when it never told us its version (the oldest builds did not).
 */
export function cleanVersion(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const v = input.trim();
  return /^\d{1,3}(\.\d{1,3}){1,2}$/.test(v) ? v : null;
}

/** -1 when a is lower than b, 0 when equal, 1 when higher. A missing part counts as 0 (1.0 = 1.0.0). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length, 3); i += 1) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export function isOlderVersion(installed: unknown, latest: string): boolean {
  const have = cleanVersion(installed);
  return have === null ? true : compareVersions(have, latest) < 0;
}

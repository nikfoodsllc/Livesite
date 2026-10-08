/**
 * OptimoRoute sync switch. Kept off unless asked for, because OptimoRoute has no test mode: a stop created from a test
 * order would land in the real route planner.
 *
 *   OPTIMOROUTE_SYNC unset or 'off'  nothing happens (the default; also what dev uses)
 *   OPTIMOROUTE_SYNC=dry             works out what it would send and reads OptimoRoute, but writes nothing there
 *   OPTIMOROUTE_SYNC=on              sends / removes stops
 *
 * OPTIMOROUTE_API_KEY is the account's API key (Vercel env var, never in code).
 */
export type OptimoMode = 'off' | 'dry' | 'on';

export function optimoMode(env: Record<string, string | undefined> = process.env): OptimoMode {
  const key = env.OPTIMOROUTE_API_KEY?.trim();
  if (!key) return 'off';
  const flag = (env.OPTIMOROUTE_SYNC ?? 'off').trim().toLowerCase();
  return flag === 'on' ? 'on' : flag === 'dry' ? 'dry' : 'off';
}

export function optimoApiKey(env: Record<string, string | undefined> = process.env): string | null {
  return env.OPTIMOROUTE_API_KEY?.trim() || null;
}

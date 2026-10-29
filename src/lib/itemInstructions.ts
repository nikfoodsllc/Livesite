/** Most characters a customer can write in an item's special instructions box. */
export const INSTRUCTIONS_MAX = 40;

/** One tidy line: spaces and line breaks squeezed to single spaces, cut to the limit. Empty text gives undefined. */
export function cleanItemInstructions(text: unknown): string | undefined {
  if (typeof text !== 'string') return undefined;
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, INSTRUCTIONS_MAX).trim();
  return clean || undefined;
}

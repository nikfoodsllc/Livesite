import { formatSpiceLevel } from '@/utils/formatters';
import { getSectionSpice } from '@/lib/comboSpice';

/** " · Medium" after a combo line when the customer picked spice for that section; '' when not. */
export function comboSpiceText(
  selections: Record<string, string[]> | null | undefined,
  section: { _id?: string } | null | undefined,
): string {
  const level = getSectionSpice(selections, section?._id);
  return level ? ` · ${formatSpiceLevel(level)}` : '';
}

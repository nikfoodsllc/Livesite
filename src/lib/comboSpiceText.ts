import { formatSpiceLevel } from '@/utils/formatters';
import { getOptionSpice, getSectionSpice } from '@/lib/comboSpice';

/**
 * " · Medium" after a combo line when the customer picked spice for it; '' when not. Pass the picked item (`option`) to get
 * the level picked for that item itself (combos with a spice mode); a level picked for the whole section is the fallback.
 */
export function comboSpiceText(
  selections: Record<string, string[]> | null | undefined,
  section: { _id?: string } | null | undefined,
  option?: { _id?: string } | null,
): string {
  const level = (option ? getOptionSpice(selections, section?._id, option._id) : null) ?? getSectionSpice(selections, section?._id);
  return level ? ` · ${formatSpiceLevel(level)}` : '';
}

'use client';

import { Box, Typography } from '@mui/material';
import { allergenInfo, cleanAllergens } from '@/lib/allergens';
import AllergenIcon from './AllergenIcon';

/** The allergen badges of a dish in the standard order; renders nothing for a dish with none. */
export default function AllergenRow({ allergens, size = 16, gap = 0.5 }: { allergens?: unknown; size?: number; gap?: number }) {
  const list = cleanAllergens(allergens);
  if (list.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap }}>
      {list.map((k) => (
        <AllergenIcon key={k} allergen={k} size={size} />
      ))}
    </Box>
  );
}

/** For the dish popup: the badges and, next to them, the plain line "Contains: Milk, Gluten". */
export function AllergenContains({ allergens }: { allergens?: unknown }) {
  const list = cleanAllergens(allergens);
  if (list.length === 0) return null;
  const names = list.map((k) => allergenInfo(k)?.label ?? k).join(', ');
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
      <AllergenRow allergens={list} size={22} gap={0.75} />
      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1F1712' }}>
        Contains: {names}
      </Typography>
    </Box>
  );
}

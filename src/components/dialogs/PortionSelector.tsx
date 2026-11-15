import { Box, Radio, RadioGroup, Typography } from '@mui/material';
import { IconCheck } from '@tabler/icons-react';

interface PortionSelectorProps {
  portions: string[];
  portionPrices: number[];
  selectedPortion: number;
  onPortionChange: (index: number) => void;
}

const GOLD = '#B8893B';
const ACCENT = '#8A6420';
const HAIRLINE = 'rgba(60, 35, 10, 0.1)';
const EASE = 'cubic-bezier(0.32,0.72,0,1)';

/**
 * The size choices, drawn like a combo's single-choice list: one card with hairline dividers, a round mark that fills with a
 * check on the chosen row, and the whole row as the tap target (the real radio fills the row but stays invisible).
 */
export default function PortionSelector({
  portions,
  portionPrices,
  selectedPortion,
  onPortionChange,
}: PortionSelectorProps) {
  if (!portions || portions.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" id="portion-label" sx={{ fontWeight: 600, mb: 1.25 }}>
        Select Your Portion
      </Typography>
      <RadioGroup
        aria-labelledby="portion-label"
        value={selectedPortion}
        onChange={(e) => onPortionChange(Number(e.target.value))}
        sx={{ border: `1px solid rgba(60, 35, 10, 0.14)`, borderRadius: '16px', overflow: 'hidden', backgroundColor: '#fff' }}
      >
        {portions.map((portion, index) => {
          const selected = selectedPortion === index;
          return (
            <Box
              key={index}
              component="label"
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                minHeight: 48,
                cursor: 'pointer',
                backgroundColor: selected ? 'rgba(184, 137, 59, 0.09)' : 'transparent',
                transition: `background-color 280ms ${EASE}`,
                '&:not(:last-of-type)': { borderBottom: `1px solid ${HAIRLINE}` },
                '&:hover': { backgroundColor: selected ? 'rgba(184, 137, 59, 0.12)' : 'rgba(184, 137, 59, 0.05)' },
                '&:has(input:focus-visible)': { outline: `2px solid ${GOLD}`, outlineOffset: -2 },
              }}
            >
              <Radio
                value={index}
                disableRipple
                sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', m: 0, p: 0, opacity: 0, cursor: 'inherit' }}
              />
              <Box
                aria-hidden
                sx={{
                  width: 20,
                  height: 20,
                  flexShrink: 0,
                  borderRadius: '50%',
                  border: '1.5px solid',
                  borderColor: selected ? ACCENT : '#CBBFA9',
                  backgroundColor: selected ? ACCENT : '#fff',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  transition: `background-color 280ms ${EASE}, border-color 280ms ${EASE}`,
                }}
              >
                {selected && <IconCheck size={13} stroke={3} />}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', columnGap: 1, flex: 1, minWidth: 0 }}>
                <Typography component="span" sx={{ color: '#1F1712', fontWeight: 500, fontSize: '0.9375rem' }}>
                  {portion}
                </Typography>
                <Typography component="span" sx={{ fontSize: '0.9375rem', fontWeight: 600, color: ACCENT, ml: 'auto' }}>
                  ${portionPrices[index]?.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </RadioGroup>
    </Box>
  );
}

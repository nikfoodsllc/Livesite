import { Box, FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material';
import { formatSpiceLevel, normalizeSpiceLevelKey } from '@/utils/formatters';

interface SpiceLevelSelectorProps {
  spiceLevels?: string[];
  selectedSpiceLevel: string;
  onSpiceLevelChange: (level: string) => void;
  /** Heading (default 'Select Spice Level'); a combo section uses a shorter one */
  label?: string;
  /** Keeps the radio group ids unique when several selectors are on screen */
  idSuffix?: string;
  /** 'chips' = one row of small pills (used inside a combo section); default = the full-width list */
  variant?: 'list' | 'chips';
}

const spiceLevelConfig: Record<string, { dots: number; colors: string[] }> = {
  // Original keys
  'mild': { dots: 1, colors: ['#22c55e'] },
  'normal': { dots: 2, colors: ['#22c55e', '#84cc16'] },
  'medium': { dots: 3, colors: ['#22c55e', '#84cc16', '#eab308'] },
  'semi-spicy': { dots: 4, colors: ['#22c55e', '#84cc16', '#eab308', '#f97316'] },
  'super-spicy': { dots: 5, colors: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'] },
  // Admin project variations
  'mild (kid friendly)': { dots: 1, colors: ['#22c55e'] },
  'medium spice': { dots: 3, colors: ['#22c55e', '#84cc16', '#eab308'] },
  'spicy': { dots: 4, colors: ['#22c55e', '#84cc16', '#eab308', '#f97316'] },
  // Additional common variations
  'semi spicy': { dots: 4, colors: ['#22c55e', '#84cc16', '#eab308', '#f97316'] },
  'super spicy': { dots: 5, colors: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'] },
  'extra spicy': { dots: 5, colors: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'] },
};

/**
 * Gets the spice config for a given level, handling case-insensitive lookup
 * and normalizing underscores to hyphens.
 * Returns a fallback config with no colored dots if the level is not recognized.
 */
function getSpiceConfig(level: string) {
  const normalizedKey = normalizeSpiceLevelKey(level);
  return spiceLevelConfig[normalizedKey] || { dots: 0, colors: [] };
}

export default function SpiceLevelSelector({
  spiceLevels = ['mild', 'normal', 'medium', 'Semi-Spicy', 'Super-Spicy'],
  selectedSpiceLevel,
  onSpiceLevelChange,
  label = 'Select Spice Level',
  idSuffix = '',
  variant = 'list',
}: SpiceLevelSelectorProps) {
  if (variant === 'chips') {
    return (
      <Box sx={{ mb: 0 }}>
        <Typography id={`spice-level-label${idSuffix}`} component="label" sx={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A6420', mb: 0.75 }}>
          {label}
          <Box component="span" aria-hidden sx={{ color: '#d32f2f', ml: 0.5 }}>
            *
          </Box>
        </Typography>
        <RadioGroup row aria-labelledby={`spice-level-label${idSuffix}`} aria-required value={selectedSpiceLevel} onChange={(e) => onSpiceLevelChange(e.target.value)} sx={{ gap: 0.75, flexWrap: 'wrap' }}>
          {spiceLevels.map((level) => {
            const config = getSpiceConfig(level);
            const selected = selectedSpiceLevel === level;
            return (
              <Box
                key={level}
                component="label"
                sx={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  height: 40,
                  px: { xs: 1.25, sm: 1.5 },
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                  fontWeight: selected ? 600 : 500,
                  color: selected ? '#3C230A' : '#4B5563',
                  backgroundColor: selected ? 'rgba(184, 137, 59, 0.16)' : '#fff',
                  border: '1px solid',
                  borderColor: selected ? '#B8893B' : 'rgba(60, 35, 10, 0.14)',
                  transition: 'background-color 280ms cubic-bezier(0.32,0.72,0,1), border-color 280ms cubic-bezier(0.32,0.72,0,1), transform 200ms cubic-bezier(0.32,0.72,0,1)',
                  '&:active': { transform: 'scale(0.97)' },
                  '&:hover': { borderColor: '#B8893B' },
                  '&:has(input:focus-visible)': { outline: '2px solid #B8893B', outlineOffset: 2 },
                }}
              >
                <Radio value={level} disableRipple tabIndex={0} sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', m: 0, p: 0, opacity: 0, cursor: 'pointer' }} />
                {formatSpiceLevel(level)}
                {config.dots > 0 && (
                  <Box aria-hidden sx={{ display: 'inline-flex', gap: '3px' }}>
                    {config.colors.slice(0, config.dots).map((color, index) => (
                      <Box key={index} sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </RadioGroup>
      </Box>
    );
  }
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" component="label" id={`spice-level-label${idSuffix}`} sx={{ fontWeight: 600, mb: 1.5 }}>
        {label}{' '}
        <Typography
          component="span"
          sx={{
            color: '#d32f2f',
            fontWeight: 700,
            lineHeight: 1,
          }}
          aria-hidden
        >
          *
        </Typography>
      </Typography>
      <RadioGroup
        aria-labelledby={`spice-level-label${idSuffix}`}
        aria-required
        value={selectedSpiceLevel}
        onChange={(e) => onSpiceLevelChange(e.target.value)}
      >
        {spiceLevels.map((level) => {
          const config = getSpiceConfig(level);
          return (
            <FormControlLabel
              key={level}
              value={level}
              control={
                <Radio
                  sx={{
                    color: '#d1d5db',
                    '&.Mui-checked': {
                      color: '#8A6420',
                    },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Typography>{formatSpiceLevel(level)}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Box
                        key={index}
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: index < config.dots ? config.colors[index] : '#e5e7eb',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              }
              sx={{
                width: '100%',
                border: '1px solid rgba(60, 35, 10, 0.12)',
                borderRadius: 1,
                mb: 1,
                ml: 0,
                mr: 0,
                py: 0.5,
                px: 1.5,
                '&:hover': {
                  backgroundColor: '#F7F0E3',
                  borderColor: '#B8893B',
                },
              }}
            />
          );
        })}
      </RadioGroup>
    </Box>
  );
}

import { Box, FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material';
import { formatSpiceLevel, normalizeSpiceLevelKey } from '@/utils/formatters';

interface SpiceLevelSelectorProps {
  spiceLevels?: string[];
  selectedSpiceLevel: string;
  onSpiceLevelChange: (level: string) => void;
}

const spiceLevelConfig: Record<string, { dots: number; colors: string[] }> = {
  'mild': { dots: 1, colors: ['#22c55e'] },
  'normal': { dots: 2, colors: ['#22c55e', '#84cc16'] },
  'medium': { dots: 3, colors: ['#22c55e', '#84cc16', '#eab308'] },
  'semi-spicy': { dots: 4, colors: ['#22c55e', '#84cc16', '#eab308', '#f97316'] },
  'super-spicy': { dots: 5, colors: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'] },
};

/**
 * Gets the spice config for a given level, handling case-insensitive lookup
 * and normalizing underscores to hyphens.
 */
function getSpiceConfig(level: string) {
  const normalizedKey = normalizeSpiceLevelKey(level);
  return spiceLevelConfig[normalizedKey];
}

export default function SpiceLevelSelector({
  spiceLevels = ['mild', 'normal', 'medium', 'Semi-Spicy', 'Super-Spicy'],
  selectedSpiceLevel,
  onSpiceLevelChange,
}: SpiceLevelSelectorProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Select Spice Level
      </Typography>
      <RadioGroup
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
                      color: '#f89c35',
                    },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Typography>{formatSpiceLevel(level)}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
                    {config && Array.from({ length: 5 }).map((_, index) => (
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
                border: '1px solid #e5e7eb',
                borderRadius: 1,
                mb: 1,
                ml: 0,
                mr: 0,
                py: 0.5,
                px: 1.5,
                '&:hover': {
                  backgroundColor: '#fef3e7',
                  borderColor: '#f89c35',
                },
              }}
            />
          );
        })}
      </RadioGroup>
    </Box>
  );
}

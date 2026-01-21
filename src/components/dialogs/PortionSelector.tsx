import { Box, FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material';

interface PortionSelectorProps {
  portions: string[];
  portionPrices: number[];
  selectedPortion: number;
  onPortionChange: (index: number) => void;
}

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
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Select Your Portion
      </Typography>
      <RadioGroup
        value={selectedPortion}
        onChange={(e) => onPortionChange(Number(e.target.value))}
      >
        {portions.map((portion, index) => (
          <FormControlLabel
            key={index}
            value={index}
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <Typography>{portion}</Typography>
                <Typography sx={{ fontWeight: 600, color: '#f89c35', ml: 2 }}>
                  ${portionPrices[index]?.toFixed(2)}
                </Typography>
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
        ))}
      </RadioGroup>
    </Box>
  );
}

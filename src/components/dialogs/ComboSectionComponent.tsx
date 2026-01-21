'use client';

import { Box, FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material';
import { ComboSection } from '@/types/food';

interface ComboSectionComponentProps {
  section: ComboSection;
  selectedValue: string;
  onSelect: (sectionId: string, itemId: string) => void;
}

export default function ComboSectionComponent({
  section,
  selectedValue,
  onSelect,
}: ComboSectionComponentProps) {
  // Defensive: ensure selectedValue is always a string, never undefined/null
  const safeSelectedValue = selectedValue || '';

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>, value: string) => {
    // Ensure we call onSelect with valid values
    if (section?._id && value) {
      onSelect(section._id, value);
    }
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        {section.title}
      </Typography>
      {section.description && (
        <Typography variant="body2" sx={{ color: '#6B7280', mb: 1.5 }}>
          {section.description}
        </Typography>
      )}
      <RadioGroup
        value={safeSelectedValue}
        onChange={handleChange}
      >
        {section.selectedItems.map((item) => (
          <FormControlLabel
            key={item._id}
            value={item._id}
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
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', cursor: 'pointer' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ color: '#374151', fontWeight: 500 }}>
                    {item.item.name}
                  </Typography>
                  {item.portion && (
                    <Typography sx={{ fontSize: '0.875rem', color: '#6B7280' }}>
                      ({item.portion})
                    </Typography>
                  )}
                </Box>
                {item.price > 0 && (
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#f89c35' }}>
                    +${item.price.toFixed(2)}
                  </Typography>
                )}
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
              cursor: 'pointer',
              // Visual styling for selected items
              ...(safeSelectedValue === item._id && {
                borderColor: '#f89c35',
                backgroundColor: '#fef9f3',
              }),
              '&:hover': {
                backgroundColor: '#fef3e7',
                borderColor: '#f89c35',
                cursor: 'pointer',
              },
            }}
          />
        ))}
      </RadioGroup>
    </Box>
  );
}

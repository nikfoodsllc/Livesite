'use client';

import { Box, Checkbox, FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material';
import { ComboSection } from '@/types/food';

interface ComboSectionComponentProps {
  section: ComboSection;
  selectedValue: string | string[];
  onSelect: (sectionId: string, itemIds: string | string[]) => void;
}

export default function ComboSectionComponent({
  section,
  selectedValue,
  onSelect,
}: ComboSectionComponentProps) {
  // Determine if this section should use checkboxes or radio buttons
  const useCheckboxes = !section.isRequired || (section.maxSelection !== undefined && section.maxSelection > 1);

  // Normalize selectedValue based on control type
  // Note: Parent always passes arrays (string[]), so for radio buttons we extract the first element
  const selectedItems = useCheckboxes
    ? (Array.isArray(selectedValue) ? selectedValue : [])
    : (Array.isArray(selectedValue)
        ? (selectedValue.length > 0 ? selectedValue[0] : '')
        : (typeof selectedValue === 'string' ? selectedValue : ''));

  const handleSelectionChange = (itemId: string, checked: boolean) => {
    if (!section?._id) return;

    if (useCheckboxes) {
      // Multi-select logic for checkboxes
      const currentSelections = Array.isArray(selectedValue) ? selectedValue : [];
      let newSelections: string[];

      if (checked) {
        // Enforce maxSelection limit
        if (section.maxSelection && currentSelections.length >= section.maxSelection) {
          return; // Don't add more than max
        }
        newSelections = [...currentSelections, itemId];
      } else {
        // Enforce minSelection limit
        const newLength = currentSelections.length - 1;
        if (section.minSelection && newLength < section.minSelection) {
          return; // Don't remove below min
        }
        newSelections = currentSelections.filter((id) => id !== itemId);
      }

      onSelect(section._id, newSelections);
    } else {
      // Single-select logic for radio buttons
      onSelect(section._id, itemId);
    }
  };

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>, value: string) => {
    // Ensure we call onSelect with valid values
    if (section?._id && value) {
      onSelect(section._id, value);
    }
  };

  // Helper text for selection limits
  const getHelperText = () => {
    if (!section.isRequired) {
      return `Optional (up to ${section.maxSelection || section.selectedItems.length})`;
    }

    // Required section
    const min = section.minSelection || 1;
    const max = section.maxSelection || 1;

    if (min === max) {
      return `Select up to ${max}`;
    }
    return `Select ${min}-${max}`;
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {section.title}
          {section.isRequired && (
            <Typography component="span" sx={{ color: '#f89c35', ml: 0.5 }}>
              *
            </Typography>
          )}
        </Typography>
        <Typography variant="caption" sx={{ color: '#6B7280' }}>
          {getHelperText()}
        </Typography>
      </Box>

      {section.description && (
        <Typography variant="body2" sx={{ color: '#6B7280', mb: 1.5 }}>
          {section.description}
        </Typography>
      )}

      {useCheckboxes ? (
        // Checkbox Group for optional/multi-select sections
        <Box>
          {section.selectedItems.map((item) => {
            const isSelected = Array.isArray(selectedItems) && selectedItems.includes(item._id);
            return (
              <FormControlLabel
                key={item._id}
                control={
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => handleSelectionChange(item._id, e.target.checked)}
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
                  ...(isSelected && {
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
            );
          })}
        </Box>
      ) : (
        // Radio Group for required single-select sections
        <RadioGroup value={selectedItems} onChange={handleRadioChange}>
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
                ...(selectedItems === item._id && {
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
      )}
    </Box>
  );
}

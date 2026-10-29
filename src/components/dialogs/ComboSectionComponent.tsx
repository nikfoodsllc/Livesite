'use client';

import { Box, Checkbox, FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material';
import { ComboSection } from '@/types/food';
import { comboItemQuantity } from '@/lib/comboQuantity';
import { sectionOwnsSpice, type PickedSpiceOption } from '@/lib/comboSpice';
import SpiceLevelSelector from './SpiceLevelSelector';

interface ComboSectionComponentProps {
  section: ComboSection;
  selectedValue: string | string[];
  onSelect: (sectionId: string, itemIds: string | string[]) => void;
  /** The combo's spice levels, when it has any: a section with its own spice choice then shows them after its items */
  spiceLevels?: string[];
  /** The level picked for this section ('' = none yet) */
  spiceValue?: string;
  onSpiceChange?: (sectionId: string, level: string) => void;
  /** Combos with a spice mode: the picked items of this section that need their own spice level */
  itemSpice?: PickedSpiceOption<ComboSection>[];
  onItemSpiceChange?: (sectionId: string, optionId: string, level: string) => void;
}

export default function ComboSectionComponent({
  section,
  selectedValue,
  onSelect,
  spiceLevels,
  spiceValue = '',
  onSpiceChange,
  itemSpice = [],
  onItemSpiceChange,
}: ComboSectionComponentProps) {
  const hasPick = Array.isArray(selectedValue) ? selectedValue.length > 0 : Boolean(selectedValue);
  const showSpice = Boolean(onSpiceChange && spiceLevels && spiceLevels.length > 0 && sectionOwnsSpice(section) && hasPick);
  const spicePicker = showSpice ? (
    <Box sx={{ mt: 1.5 }}>
      <SpiceLevelSelector
        spiceLevels={spiceLevels}
        selectedSpiceLevel={spiceValue}
        onSpiceLevelChange={(level) => onSpiceChange?.(section._id, level)}
        label="Spice level"
        idSuffix={`-${section._id}`}
      />
    </Box>
  ) : null;

  // one spice choice for each picked item that can have spice (rice and bread never show one)
  const itemSpicePickers = itemSpice.length > 0 ? (
    <Box sx={{ mt: 1.5 }}>
      {itemSpice.map((p) => (
        <SpiceLevelSelector
          key={p.option._id}
          spiceLevels={p.levels}
          selectedSpiceLevel={p.level ?? ''}
          onSpiceLevelChange={(level) => onItemSpiceChange?.(section._id, p.option._id ?? '', level)}
          label={`${p.option.item?.name ?? 'Item'} spice`}
          idSuffix={`-${section._id}-${p.option._id}`}
        />
      ))}
    </Box>
  ) : null;

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
            <Typography component="span" sx={{ color: '#8A6420', ml: 0.5 }}>
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
                        color: '#8A6420',
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
                      {comboItemQuantity(item.quantity) > 1 && (
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151' }}>
                          × {comboItemQuantity(item.quantity)}
                        </Typography>
                      )}
                    </Box>
                    {item.price > 0 && (
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#8A6420' }}>
                        +${item.price.toFixed(2)}
                      </Typography>
                    )}
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
                  cursor: 'pointer',
                  ...(isSelected && {
                    borderColor: '#B8893B',
                    backgroundColor: '#fef9f3',
                  }),
                  '&:hover': {
                    backgroundColor: '#F7F0E3',
                    borderColor: '#B8893B',
                    cursor: 'pointer',
                  },
                }}
              />
            );
          })}
        {spicePicker}
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
                      color: '#8A6420',
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
                    {comboItemQuantity(item.quantity) > 1 && (
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151' }}>
                        × {comboItemQuantity(item.quantity)}
                      </Typography>
                    )}
                  </Box>
                  {item.price > 0 && (
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#8A6420' }}>
                      +${item.price.toFixed(2)}
                    </Typography>
                  )}
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
                cursor: 'pointer',
                ...(selectedItems === item._id && {
                  borderColor: '#B8893B',
                  backgroundColor: '#fef9f3',
                }),
                '&:hover': {
                  backgroundColor: '#F7F0E3',
                  borderColor: '#B8893B',
                  cursor: 'pointer',
                },
              }}
            />
          ))}
        </RadioGroup>
      )}
      {spicePicker}
      {itemSpicePickers}
    </Box>
  );
}

'use client';

import { Box, Checkbox, Radio, RadioGroup, Typography } from '@mui/material';
import { IconCheck } from '@tabler/icons-react';
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

const GOLD = '#B8893B';
const ACCENT = '#8A6420';
const HAIRLINE = 'rgba(60, 35, 10, 0.1)';
const EASE = 'cubic-bezier(0.32,0.72,0,1)';

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

  // Short helper next to the title ("Pick 1", "Pick 2", "Optional")
  const getHelperText = () => {
    if (!section.isRequired) {
      return `Optional · up to ${section.maxSelection || section.selectedItems.length}`;
    }
    const min = section.minSelection || 1;
    const max = section.maxSelection || 1;
    return min === max ? `Pick ${max}` : `Pick ${min}-${max}`;
  };

  // A required section with a single choice has nothing to decide: show it as included
  const onlyChoice = !useCheckboxes && section.selectedItems.length === 1 && !(section.selectedItems[0].item as { soldOut?: boolean }).soldOut ? section.selectedItems[0] : null;
  const onlyChoiceTaken = Boolean(onlyChoice && selectedItems === onlyChoice._id);

  const itemLabel = (item: ComboSection['selectedItems'][number]) => {
    const soldOut = Boolean((item.item as { soldOut?: boolean }).soldOut);
    return (
      <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 1, flex: 1, minWidth: 0 }}>
        <Typography component="span" sx={{ color: '#1F1712', fontWeight: 500, fontSize: '0.9375rem' }}>
          {item.item.name}
        </Typography>
        {item.portion && (
          <Typography component="span" sx={{ fontSize: '0.8125rem', color: '#8B8378' }}>
            {item.portion}
          </Typography>
        )}
        {comboItemQuantity(item.quantity) > 1 && (
          <Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>
            × {comboItemQuantity(item.quantity)}
          </Typography>
        )}
        {soldOut && (
          <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#B91C1C' }}>
            Out of stock
          </Typography>
        )}
        {item.price > 0 && (
          <Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: ACCENT, ml: 'auto' }}>
            +${item.price.toFixed(2)}
          </Typography>
        )}
      </Box>
    );
  };

  const rowSx = (selected: boolean, disabled: boolean) => ({
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    gap: 1.25,
    px: 1.5,
    minHeight: 48,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    backgroundColor: selected ? 'rgba(184, 137, 59, 0.09)' : 'transparent',
    transition: `background-color 280ms ${EASE}`,
    '&:not(:last-of-type)': { borderBottom: `1px solid ${HAIRLINE}` },
    '&:hover': disabled ? {} : { backgroundColor: selected ? 'rgba(184, 137, 59, 0.12)' : 'rgba(184, 137, 59, 0.05)' },
    '&:has(input:focus-visible)': { outline: `2px solid ${GOLD}`, outlineOffset: -2 },
  });
  // the real input fills the row (so the whole row is the tap target) but stays invisible: the mark on the left is drawn by us
  const inputSx = { position: 'absolute' as const, inset: 0, width: '100%', height: '100%', m: 0, p: 0, opacity: 0, cursor: 'inherit' };
  const mark = (selected: boolean, round: boolean) => (
    <Box
      aria-hidden
      sx={{
        width: 20,
        height: 20,
        flexShrink: 0,
        borderRadius: round ? '50%' : '6px',
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
  );

  // spice sits inside the same card, under the items, in its own tinted well
  const hasSpiceWell = showSpice || itemSpice.length > 0;
  const spiceWell = hasSpiceWell ? (
    <Box sx={{ px: 1.5, py: 1.25, borderTop: `1px solid ${HAIRLINE}`, backgroundColor: '#FAF4E8', display: 'grid', gap: 1.5 }}>
      {showSpice && (
        <SpiceLevelSelector
          variant="chips"
          spiceLevels={spiceLevels}
          selectedSpiceLevel={spiceValue}
          onSpiceLevelChange={(level) => onSpiceChange?.(section._id, level)}
          label="Spice"
          idSuffix={`-${section._id}`}
        />
      )}
      {itemSpice.map((p) => (
        <SpiceLevelSelector
          key={p.option._id}
          variant="chips"
          spiceLevels={p.levels}
          selectedSpiceLevel={p.level ?? ''}
          onSpiceLevelChange={(level) => onItemSpiceChange?.(section._id, p.option._id ?? '', level)}
          label={itemSpice.length > 1 ? `${p.option.item?.name ?? 'Item'} spice` : 'Spice'}
          idSuffix={`-${section._id}-${p.option._id}`}
        />
      ))}
    </Box>
  ) : null;

  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 1 }}>
        <Typography component="h3" sx={{ fontFamily: 'var(--font-display), Georgia, serif', fontWeight: 600, fontSize: '1.0625rem', color: '#1F1712' }}>
          {section.title}
          {section.isRequired && (
            <Box component="span" aria-hidden sx={{ color: ACCENT, ml: 0.5 }}>
              *
            </Box>
          )}
        </Typography>
        <Typography component="span" sx={{ flexShrink: 0, fontSize: '0.75rem', fontWeight: 600, color: '#8B8378' }}>
          {getHelperText()}
        </Typography>
      </Box>

      {section.description && (
        <Typography variant="body2" sx={{ color: '#6B7280', mb: 1 }}>
          {section.description}
        </Typography>
      )}

      <Box sx={{ border: `1px solid ${onlyChoiceTaken ? HAIRLINE : 'rgba(60, 35, 10, 0.14)'}`, borderRadius: '16px', overflow: 'hidden', backgroundColor: '#fff' }}>
        {onlyChoiceTaken && onlyChoice ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, minHeight: 48, backgroundColor: 'rgba(184, 137, 59, 0.06)' }}>
            {mark(true, true)}
            {itemLabel(onlyChoice)}
          </Box>
        ) : useCheckboxes ? (
          <Box>
            {section.selectedItems.map((item) => {
              const isSelected = Array.isArray(selectedItems) && selectedItems.includes(item._id);
              const disabled = Boolean((item.item as { soldOut?: boolean }).soldOut);
              return (
                <Box key={item._id} component="label" sx={rowSx(isSelected, disabled)}>
                  <Checkbox checked={isSelected} disabled={disabled} disableRipple onChange={(e) => handleSelectionChange(item._id, e.target.checked)} sx={inputSx} />
                  {mark(isSelected, false)}
                  {itemLabel(item)}
                </Box>
              );
            })}
          </Box>
        ) : (
          <RadioGroup value={selectedItems} onChange={handleRadioChange}>
            {section.selectedItems.map((item) => {
              const isSelected = selectedItems === item._id;
              const disabled = Boolean((item.item as { soldOut?: boolean }).soldOut);
              return (
                <Box key={item._id} component="label" sx={rowSx(isSelected, disabled)}>
                  <Radio value={item._id} disabled={disabled} disableRipple sx={inputSx} />
                  {mark(isSelected, true)}
                  {itemLabel(item)}
                </Box>
              );
            })}
          </RadioGroup>
        )}
        {spiceWell}
      </Box>
    </Box>
  );
}

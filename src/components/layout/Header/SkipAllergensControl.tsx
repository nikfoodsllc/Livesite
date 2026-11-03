'use client';

import { useState } from 'react';
import { Badge, Box, ButtonBase, Checkbox, Collapse, Popover, Tooltip, Typography, useTheme } from '@mui/material';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useHeader } from '@/contexts/HeaderContext';
import { ALLERGENS } from '@/lib/allergens';
import AllergenIcon from '@/components/common/AllergenIcon';

const ACCENT = '#B45309';

/** The tick list: one row per allergen (badge + name). Ticked allergens are skipped: every dish containing them is hidden. */
function AllergenChecklist() {
  const { skipAllergens, setSkipAllergens } = useHeader();
  const toggle = (key: string) => setSkipAllergens(skipAllergens.includes(key) ? skipAllergens.filter((k) => k !== key) : [...skipAllergens, key]);
  return (
    <Box sx={{ p: 1, minWidth: 230 }}>
      <Typography variant="subtitle2" sx={{ px: 1, pt: 0.5, pb: 0.5, fontWeight: 700 }}>
        Skip dishes with
      </Typography>
      {ALLERGENS.map((a) => (
        <Box
          key={a.key}
          component="label"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 0.5, py: 0.25, borderRadius: 1.5, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
        >
          <Checkbox size="small" checked={skipAllergens.includes(a.key)} onChange={() => toggle(a.key)} sx={{ p: 0.75, '&.Mui-checked': { color: ACCENT } }} inputProps={{ 'aria-label': `Skip ${a.label}` }} />
          <AllergenIcon allergen={a.key} size={20} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {a.label}
          </Typography>
        </Box>
      ))}
      {skipAllergens.length > 0 && (
        <ButtonBase onClick={() => setSkipAllergens([])} sx={{ mt: 0.5, ml: 1, mb: 0.5, fontSize: '0.8125rem', fontWeight: 600, color: ACCENT, textDecoration: 'underline' }}>
          Clear
        </ButtonBase>
      )}
    </Box>
  );
}

/**
 * "Skip allergens" in the header, in the three places the Vegetarian switch is:
 *  - pill: the computer header (icon + words), opens the tick list under it
 *  - icon: the phone header (icon only, with a count), opens the tick list under it
 *  - row: the phone menu drawer (a full row that opens the list inline)
 */
export default function SkipAllergensControl({ variant }: { variant: 'pill' | 'icon' | 'row' }) {
  const theme = useTheme();
  const { skipAllergens } = useHeader();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const active = skipAllergens.length > 0;
  const bg = active ? 'rgba(180, 83, 9, 0.12)' : 'rgba(0, 0, 0, 0.04)';
  const border = active ? `1px solid ${ACCENT}` : '1px solid transparent';
  const iconColor = active ? ACCENT : theme.palette.text.secondary;

  if (variant === 'row') {
    return (
      <Box sx={{ width: '100%' }}>
        <ButtonBase
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          sx={{ width: '100%', justifyContent: 'flex-start', borderRadius: '12px', py: 1.5, px: 2, backgroundColor: bg, border, transition: 'all 0.2s ease' }}
        >
          <IconAlertTriangle size={22} style={{ marginRight: 12, flexShrink: 0 }} color={iconColor} />
          <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.95rem', flex: 1, textAlign: 'left', color: active ? ACCENT : theme.palette.text.primary }}>
            Skip allergens{active ? ` (${skipAllergens.length})` : ''}
          </Typography>
        </ButtonBase>
        <Collapse in={open}>
          <AllergenChecklist />
        </Collapse>
      </Box>
    );
  }

  const trigger =
    variant === 'pill' ? (
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="dialog"
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: '12px', backgroundColor: bg, border, transition: 'all 0.3s ease', height: 42 }}
      >
        <IconAlertTriangle size={20} color={iconColor} />
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: active ? ACCENT : theme.palette.text.primary }}>
          Skip allergens{active ? ` (${skipAllergens.length})` : ''}
        </Typography>
      </ButtonBase>
    ) : (
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label="Skip allergens"
        aria-haspopup="dialog"
        sx={{ width: 38, height: 38, borderRadius: '8px', backgroundColor: bg, border, transition: 'all 0.2s ease', '@media (max-width:349px)': { display: 'none' } }}
      >
        <Badge badgeContent={skipAllergens.length} color="warning" invisible={!active}>
          <IconAlertTriangle size={18} color={iconColor} />
        </Badge>
      </ButtonBase>
    );

  return (
    <>
      <Tooltip title="Hide dishes with the allergens you pick" arrow enterTouchDelay={400} leaveTouchDelay={2500}>
        <Box sx={{ display: 'inline-flex' }}>{trigger}</Box>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, maxHeight: '70vh' } } }}
      >
        <AllergenChecklist />
      </Popover>
    </>
  );
}

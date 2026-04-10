'use client';

import { Box, IconButton, Typography, Button, CircularProgress, useTheme } from '@mui/material';
import { IconPlus, IconMinus } from '@tabler/icons-react';

interface QuantitySelectorProps {
  quantity?: number;
  onAdd?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  isLoading?: {
    add?: boolean;
    increment?: boolean;
    decrement?: boolean;
  };
  size?: 'small' | 'medium';
  disabled?: boolean;
}

export default function QuantitySelector({
  quantity = 0,
  onAdd,
  onIncrement,
  onDecrement,
  isLoading = {},
  size = 'medium',
  disabled = false,
}: QuantitySelectorProps) {
  const theme = useTheme();

  const buttonHeight = size === 'small' ? 28 : 32;
  const iconSize = size === 'small' ? 16 : 20;
  const fontSize = size === 'small' ? '0.875rem' : '1rem';

  // If quantity is 0, show Add button
  if (quantity === 0) {
    return (
      <Button
        variant="contained"
        onClick={onAdd}
        disabled={isLoading.add || disabled}
        sx={{
          backgroundColor: theme.palette.primary.main,
          color: '#ffffff',
          textTransform: 'none',
          fontWeight: 600,
          height: buttonHeight,
          minWidth: 80,
          fontSize,
          '&:hover': {
            backgroundColor: theme.palette.primary.dark,
          },
          '&:disabled': {
            backgroundColor: theme.palette.grey[300],
          },
        }}
      >
        {isLoading.add ? (
          <CircularProgress size={iconSize} sx={{ color: '#ffffff' }} />
        ) : (
          'Add'
        )}
      </Button>
    );
  }

  // Show quantity selector with +/- buttons
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        backgroundColor: '#FFF4E4',
        border: '1px solid #E0CAB6',
        borderRadius: 1,
        px: 0.5,
        height: buttonHeight,
      }}
    >
      <IconButton
        onClick={onDecrement}
        disabled={isLoading.decrement || quantity <= 1 || disabled}
        size="small"
        sx={{
          color: theme.palette.primary.main,
          p: 0.5,
          '&:hover': {
            backgroundColor: 'rgba(248, 156, 53, 0.1)',
          },
          '&:disabled': {
            color: theme.palette.grey[400],
          },
        }}
      >
        {isLoading.decrement ? (
          <CircularProgress size={iconSize} sx={{ color: theme.palette.primary.main }} />
        ) : (
          <IconMinus size={iconSize} />
        )}
      </IconButton>

      <Typography
        sx={{
          fontWeight: 600,
          fontSize,
          minWidth: size === 'small' ? 20 : 24,
          textAlign: 'center',
          color: theme.palette.text.primary,
        }}
      >
        {quantity}
      </Typography>

      <IconButton
        onClick={onIncrement}
        disabled={isLoading.increment || disabled}
        size="small"
        sx={{
          color: theme.palette.primary.main,
          p: 0.5,
          '&:hover': {
            backgroundColor: 'rgba(248, 156, 53, 0.1)',
          },
          '&:disabled': {
            color: theme.palette.grey[400],
          },
        }}
      >
        {isLoading.increment ? (
          <CircularProgress size={iconSize} sx={{ color: theme.palette.primary.main }} />
        ) : (
          <IconPlus size={iconSize} />
        )}
      </IconButton>
    </Box>
  );
}

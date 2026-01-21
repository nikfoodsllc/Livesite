'use client';

import { Box } from '@mui/material';

interface VegIndicatorProps {
  isVeg: boolean;
  size?: number;
}

export default function VegIndicator({ isVeg, size = 16 }: VegIndicatorProps) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        border: `2px solid ${isVeg ? '#22c55e' : '#ef4444'}`,
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          width: size / 2,
          height: size / 2,
          borderRadius: '50%',
          backgroundColor: isVeg ? '#22c55e' : '#ef4444',
        }}
      />
    </Box>
  );
}

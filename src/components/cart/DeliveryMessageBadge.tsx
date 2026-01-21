'use client';

import { Box, Typography } from '@mui/material';
import { IconInfoCircle, IconCheck, IconAlertTriangle, IconAlertCircle } from '@tabler/icons-react';
import { DeliveryMessage } from '@/types/cart';

interface DeliveryMessageBadgeProps {
  message: DeliveryMessage;
}

export default function DeliveryMessageBadge({ message }: DeliveryMessageBadgeProps) {

  const getConfig = () => {
    switch (message.type) {
      case 'success':
        return {
          icon: IconCheck,
          backgroundColor: '#E8F5E9',
          borderColor: '#81C784',
          textColor: '#2e7d32',
          iconColor: '#2e7d32',
        };
      case 'warning':
        return {
          icon: IconAlertTriangle,
          backgroundColor: '#FFF4E4',
          borderColor: '#FFB74D',
          textColor: '#e65100',
          iconColor: '#f57c00',
        };
      case 'error':
        return {
          icon: IconAlertCircle,
          backgroundColor: '#FFEBEE',
          borderColor: '#E57373',
          textColor: '#c62828',
          iconColor: '#d32f2f',
        };
      default:
        return {
          icon: IconInfoCircle,
          backgroundColor: '#E3F2FD',
          borderColor: '#90CAF9',
          textColor: '#1565c0',
          iconColor: '#1976d2',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        p: 1.5,
        backgroundColor: config.backgroundColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: 2,
        mb: 2,
      }}
    >
      <Icon
        size={20}
        style={{
          color: config.iconColor,
          flexShrink: 0,
          marginTop: 2,
        }}
      />
      <Typography
        variant="body2"
        sx={{
          color: config.textColor,
          fontSize: '0.875rem',
          lineHeight: 1.5,
          fontWeight: 500,
        }}
      >
        {message.message}
      </Typography>
    </Box>
  );
}

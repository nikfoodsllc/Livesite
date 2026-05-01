'use client';

import React from 'react';
import { Box, Typography, Alert, useTheme, useMediaQuery, Card, CardContent } from '@mui/material';
import { IconShoppingCart, IconTruckDelivery } from '@tabler/icons-react';

interface MinOrderValueDisplayProps {
  minValue: number;
  zipcode?: string;
  variant?: 'default' | 'compact' | 'prominent';
  currentSubtotal?: number;
}

export default function MinOrderValueDisplay({
  minValue,
  zipcode,
  variant = 'default',
  currentSubtotal = 0,
}: MinOrderValueDisplayProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Only show if minimum order value is greater than 0
  if (minValue <= 0) {
    return null;
  }

  // Format the minimum value as currency
  const formattedMinValue = minValue.toFixed(2);
  const remainingAmount = Math.max(0, minValue - currentSubtotal);
  const meetsMinimum = currentSubtotal >= minValue;

  // Determine status and messaging
  const getOrderStatus = () => {
    if (meetsMinimum) {
      return {
        status: 'success',
        message: 'Your order meets the minimum requirement for delivery!',
        subMessage: zipcode ? `Delivery always free for ${zipcode}` : 'Delivery always free for your area',
        remainingAmount: 0
      };
    } else {
      return {
        status: 'warning',
        message: `Add $${remainingAmount.toFixed(2)} more to qualify for delivery`,
        subMessage: zipcode ? `Minimum order for delivery to ${zipcode}: $${formattedMinValue}` : `Minimum order value: $${formattedMinValue}`,
        remainingAmount
      };
    }
  };

  const orderStatus = getOrderStatus();

  // Get enhanced title for prominent display
  const getDisplayTitle = () => {
    if (zipcode) {
      return `Delivery Minimum for ${zipcode}`;
    }
    return 'Minimum Order Requirement';
  };

  
  // Compact variant - simpler inline display with status-based messaging
  if (variant === 'compact') {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: isMobile ? '0.75rem' : '0.8rem',
            color: meetsMinimum ? theme.palette.success.main : theme.palette.text.secondary,
            fontWeight: meetsMinimum ? 600 : 500,
          }}
        >
          {meetsMinimum ? orderStatus.message : orderStatus.subMessage}
        </Typography>
        {!meetsMinimum && (
          <Typography
            variant="body2"
            sx={{
              fontSize: isMobile ? '0.75rem' : '0.8rem',
              color: theme.palette.primary.main,
              fontWeight: 600,
            }}
          >
            (${remainingAmount.toFixed(2)} more needed)
          </Typography>
        )}
      </Box>
    );
  }

  // Prominent variant - highly visible card with enhanced styling and status-based messaging
  if (variant === 'prominent') {
    return (
      <Card
        sx={{
          width: '100%',
          mb: 3,
          mt: 2,
          background: meetsMinimum
            ? 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)'
            : 'linear-gradient(135deg, #FFF9F2 0%, #FFF6E9 100%)',
          border: meetsMinimum ? '2px solid #10B981' : '2px solid #FF9F0D',
          borderRadius: 2,
          boxShadow: meetsMinimum
            ? '0 4px 12px rgba(16, 185, 129, 0.15)'
            : '0 4px 12px rgba(255, 159, 13, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: meetsMinimum
              ? 'linear-gradient(90deg, #10B981 0%, #34D399 100%)'
              : 'linear-gradient(90deg, #FF9F0D 0%, #FFB84D 100%)',
          },
        }}
      >
        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: meetsMinimum ? '#10B981' : '#FF9F0D',
                flexShrink: 0,
              }}
            >
              <IconShoppingCart size={24} color="white" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant={isMobile ? 'h6' : 'h5'}
                sx={{
                  fontWeight: 700,
                  color: meetsMinimum ? '#065F46' : '#1A1A1A',
                  mb: 1,
                  fontSize: isMobile ? '1.1rem' : '1.25rem',
                }}
              >
                {meetsMinimum ? 'Delivery Minimum Met! 🎉' : getDisplayTitle()}
              </Typography>

              {/* Status-based messaging */}
              <Typography
                variant={isMobile ? 'body1' : 'h6'}
                sx={{
                  fontWeight: meetsMinimum ? 700 : 600,
                  color: meetsMinimum ? '#10B981' : '#FF9F0D',
                  mb: 1,
                  fontSize: isMobile ? '1rem' : '1.1rem',
                }}
              >
                {orderStatus.message}
              </Typography>

              {/* Progress indicator */}
              {!meetsMinimum && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 0.5
                  }}>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Progress to minimum
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      ${currentSubtotal.toFixed(2)} / ${formattedMinValue}
                    </Typography>
                  </Box>
                  <Box sx={{
                    height: 8,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}>
                    <Box sx={{
                      height: '100%',
                      width: `${Math.min(100, (currentSubtotal / minValue) * 100)}%`,
                      backgroundColor: '#FF9F0D',
                      transition: 'width 0.3s ease'
                    }} />
                  </Box>
                </Box>
              )}

              {/* Minimum order amount display */}
              <Typography
                variant={isMobile ? 'body2' : 'body1'}
                sx={{
                  fontWeight: 600,
                  color: '#666',
                  mb: 1,
                }}
              >
                Minimum order amount: <Box component="span" sx={{ color: meetsMinimum ? '#10B981' : '#FF9F0D' }}>
                  ${formattedMinValue}
                </Box>
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <IconTruckDelivery size={16} color={meetsMinimum ? '#10B981' : '#666'} />
                <Typography
                  variant="body2"
                  sx={{
                    color: meetsMinimum ? '#065F46' : '#666',
                    fontSize: isMobile ? '0.8rem' : '0.875rem',
                    lineHeight: 1.4,
                  }}
                >
                  {orderStatus.subMessage}
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: meetsMinimum ? '#10B981' : '#999',
                  fontSize: isMobile ? '0.7rem' : '0.75rem',
                  display: 'block',
                  fontStyle: 'italic',
                }}
              >
                {meetsMinimum
                  ? 'Delivery is always free in your area.'
                  : 'This helps us ensure efficient delivery service in your location'
                }
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Default variant - styled alert box with status-based messaging
  return (
    <Alert
      severity={meetsMinimum ? "success" : "info"}
      sx={{
        width: '100%',
        mb: 2,
        backgroundColor: meetsMinimum ? '#F0FDF4' : '#FFF9F2',
        borderColor: meetsMinimum ? '#10B981' : '#FF9F0D',
        borderWidth: 1,
        borderStyle: 'solid',
        '& .MuiAlert-icon': {
          color: meetsMinimum ? '#10B981' : '#FF9F0D',
        },
        '& .MuiAlert-message': {
          width: '100%',
        },
      }}
    >
      <Box>
        <Typography
          variant={isMobile ? 'body2' : 'body1'}
          sx={{
            fontWeight: 600,
            color: meetsMinimum ? '#065F46' : theme.palette.text.primary,
            mb: 0.5,
            fontSize: isMobile ? '0.875rem' : '1rem',
          }}
        >
          {orderStatus.message}
        </Typography>
        {!meetsMinimum && (
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.primary,
              mb: 0.5,
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              fontWeight: 500,
            }}
          >
            {orderStatus.subMessage}
          </Typography>
        )}
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontSize: isMobile ? '0.7rem' : '0.75rem',
            display: 'block',
          }}
        >
          {zipcode
            ? 'This minimum order requirement applies to delivery in your area.'
            : 'Minimum order requirements may vary by delivery location.'
          }
        </Typography>
      </Box>
    </Alert>
  );
}
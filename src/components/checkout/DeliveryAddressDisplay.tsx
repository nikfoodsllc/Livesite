'use client';

import React from 'react';
import { Box, Typography, Paper, Button, Alert } from '@mui/material';
import { IconMapPin, IconEdit } from '@tabler/icons-react';
import { IAddress } from '@/types/auth';

interface DeliveryAddressDisplayProps {
  address?: {
    _id: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    landmark?: string;
    isDefault: boolean;
  };
  onChangeAddress?: () => void;
  addresses?: IAddress[];
  isAuthenticated?: boolean;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
}

export default function DeliveryAddressDisplay({
  address,
  onChangeAddress,
  isAuthenticated = false,
  onLoginClick,
  onSignupClick,
}: DeliveryAddressDisplayProps) {

  if (!address) {
    // For non-authenticated users, show login/signup prompts
    if (!isAuthenticated) {
      return (
        <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #EDEDED' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Delivery Address
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            Please login or signup to select a delivery address for your order.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={onLoginClick}
              sx={{
                borderColor: '#FF9F0D',
                color: '#FF9F0D',
                '&:hover': {
                  borderColor: '#FF9F0D',
                  bgcolor: 'rgba(255, 159, 13, 0.05)',
                },
              }}
            >
              Log In
            </Button>
            <Button
              variant="contained"
              onClick={onSignupClick}
              sx={{
                bgcolor: '#FF9F0D',
                color: '#fff',
                '&:hover': {
                  bgcolor: '#e68f0c',
                },
              }}
            >
              Sign Up
            </Button>
          </Box>
        </Paper>
      );
    }

    // For authenticated users with no address, show address selection prompt
    return (
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #EDEDED' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Delivery Address
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
          No delivery address selected. Please select or add an address to proceed.
        </Typography>
        <Button
          variant="outlined"
          onClick={onChangeAddress}
          sx={{
            borderColor: '#FF9F0D',
            color: '#FF9F0D',
            '&:hover': {
              borderColor: '#FF9F0D',
              bgcolor: 'rgba(255, 159, 13, 0.05)',
            },
          }}
        >
          Select Address
        </Button>
      </Paper>
    );
  }

  // Check if this is a zipcode-derived address (for guest users)
  const isZipcodeAddress = address._id?.startsWith('zipcode-');

  // Check if address is incomplete (has placeholder in addressLine1)
  const isIncompleteAddress = address.addressLine1 === 'Delivery Area' ||
                             address.addressLine1 === 'Delivery Area:';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        border: isZipcodeAddress || isIncompleteAddress ? '2px solid #FF9F0D' : '1px solid #EDEDED',
        bgcolor: isZipcodeAddress || isIncompleteAddress ? '#FFF5E6' : 'inherit',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Delivery Address
        </Typography>
        <Button
          size="small"
          startIcon={<IconEdit size={16} />}
          onClick={onChangeAddress}
          sx={{
            color: '#FF9F0D',
            '&:hover': {
              bgcolor: 'rgba(255, 159, 13, 0.05)',
            },
          }}
        >
          Change
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '8px',
            bgcolor: '#FFF5E6',
            color: '#FF9F0D',
            flexShrink: 0,
          }}
        >
          <IconMapPin size={24} style={{ marginTop: '8px' }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          {isZipcodeAddress || isIncompleteAddress ? (
            // Display for incomplete address (zipcode-based or placeholder)
            <>
              <Typography variant="body1" sx={{ mb: 0.5, fontWeight: 600, color: '#FF9F0D' }}>
                {isZipcodeAddress ? `Delivery to Zipcode: ${address.zipCode}` : 'Incomplete Delivery Address'}
              </Typography>
              <Alert
                severity="warning"
                sx={{
                  mb: 1,
                  bgcolor: '#FFF3CD',
                  color: '#856404',
                  '& .MuiAlert-icon': {
                    color: '#856404',
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Action Required: Complete Your Delivery Address
                </Typography>
                <Typography variant="body2">
                  Please provide your complete delivery address including street address to place your order.
                </Typography>
              </Alert>
              <Typography variant="body2" sx={{ color: '#666' }}>
                {isZipcodeAddress
                  ? 'Your order will be delivered to your selected delivery area. Exact address will be confirmed during order processing.'
                  : 'Your current address is incomplete. Please click "Change" to provide your full street address.'}
              </Typography>
            </>
          ) : (
            // Display for full address (authenticated users)
            <>
              <Typography variant="body1" sx={{ mb: 0.5 }}>
                {address.addressLine1}
              </Typography>
              {address.addressLine2 && (
                <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                  {address.addressLine2}
                </Typography>
              )}
              <Typography variant="body2" sx={{ color: '#666' }}>
                {address.city}, {address.state} {address.zipCode}
              </Typography>
              {address.landmark && (
                <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
                  Landmark: {address.landmark}
                </Typography>
              )}
              {address.isDefault && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    mt: 1,
                    px: 1,
                    py: 0.5,
                    bgcolor: '#28a745',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Default Address
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

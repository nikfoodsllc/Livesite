'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  TextField,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { IconMapPin } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { IAddress } from '@/types/auth';

interface DeliveryLocationBarProps {
  className?: string;
  showMinOrderValue?: boolean;
}

export default function DeliveryLocationBar({
  className = '',
  showMinOrderValue = true,
}: DeliveryLocationBarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const {
    selectedAddressId,
    selectedZipcode,
    minOrderValue,
    updateAddress,
    updateZipcode,
    setSelectedAddressId,
  } = useCart();

  const [addresses, setAddresses] = useState<IAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [zipcodeInput, setZipcodeInput] = useState(() => localStorage.getItem('selectedZipcode') || '');
  const [isValidatingZipcode, setIsValidatingZipcode] = useState(false);
  const [zipcodeError, setZipcodeError] = useState('');
  const hasAutoSelectedRef = useRef(false);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;

    setIsLoadingAddresses(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        return;
      }

      const response = await fetch('/api/address', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (data.success) {
        const addressList = Array.isArray(data.data?.items) ? data.data.items : [];
        setAddresses(addressList);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [user]);

  const handleAddressSelect = useCallback((addressId: string) => {
    // Update the zipcode input field with the selected address's postal_code
    // Update the selected address ID in CartContext so the dropdown reflects the selection
    const selectedAddress = addresses.find(addr => addr._id?.toString() === addressId);
    if (selectedAddress) {
      setZipcodeInput(selectedAddress.postal_code);
      setZipcodeError('');
      setSelectedAddressId(addressId);
      // Store in localStorage for persistence
      localStorage.setItem('selectedAddressId', addressId);
    }
  }, [addresses, setSelectedAddressId]);

  // Load saved addresses for logged-in users
  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user, fetchAddresses]);

  // Auto-select default address (or first address if no default) for logged-in users with addresses
  useEffect(() => {
    if (user && addresses.length > 0) {
      // Only auto-select if:
      // 1. We haven't already auto-selected an address
      // 2. localStorage doesn't have a saved selectedAddressId
      const hasStoredAddressId = localStorage.getItem('selectedAddressId');

      if (!hasAutoSelectedRef.current && !hasStoredAddressId) {
        // Priority 1: Find and always select the default address
        const defaultAddress = addresses.find((address) => address.isDefault === true);
        const addressToSelect = defaultAddress || addresses[0]; // Fallback to first if no default
        const addressId = addressToSelect._id?.toString();

        // Only select if different from current (avoid unnecessary updates)
        if (addressId && addressId !== selectedAddressId) {
          handleAddressSelect(addressId);
          hasAutoSelectedRef.current = true;
        }
      }
    }
  }, [user, addresses, selectedAddressId, handleAddressSelect]);

  const validateZipcode = (value: string): boolean => {
    const zipcodeRegex = /^\d{5}(-\d{4})?$/;
    return zipcodeRegex.test(value);
  };

  const handleZipcodeSubmit = async () => {
    const trimmedZipcode = zipcodeInput.trim();

    if (!trimmedZipcode) {
      setZipcodeError('Please enter a zipcode');
      return;
    }

    if (!validateZipcode(trimmedZipcode)) {
      setZipcodeError('Invalid zipcode format');
      return;
    }

    setIsValidatingZipcode(true);
    setZipcodeError('');

    try {
      const response = await fetch(`/api/zipcode-config?zipcode=${encodeURIComponent(trimmedZipcode)}`);

      if (!response.ok) {
        // Handle API error responses
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'This zipcode is not serviceable');
      }

      const data = await response.json();

      if (data.success && data.data) {
        await updateZipcode(trimmedZipcode);
        // Zipcode and cart will be automatically updated by CartContext
      } else {
        // Handle zipcode rejection from API
        const errorMessage = data.message || data.error || 'This zipcode is not serviceable';
        setZipcodeError(errorMessage);
      }
    } catch (err) {
      console.error('Error setting zipcode:', err);
      // Display user-friendly error message
      const errorMessage = err instanceof Error ? err.message : 'This zipcode is not serviceable';
      setZipcodeError(errorMessage);
    } finally {
      setIsValidatingZipcode(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleZipcodeSubmit();
    }
  };

  const handleApplyZipcode = async () => {
    const trimmedZipcode = zipcodeInput.trim();

    if (!trimmedZipcode) {
      setZipcodeError('Please enter a zipcode');
      return;
    }

    if (!validateZipcode(trimmedZipcode)) {
      setZipcodeError('Invalid zipcode format');
      return;
    }

    setIsValidatingZipcode(true);
    setZipcodeError('');

    try {
      // First validate zipcode is serviceable
      const response = await fetch(`/api/zipcode-config?zipcode=${encodeURIComponent(trimmedZipcode)}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'This zipcode is not serviceable');
      }

      const data = await response.json();

      if (data.success && data.data) {
        // For logged-in users with addresses, first update the selected address if one is selected
        if (user && addresses.length > 0 && selectedAddressId) {
          await updateAddress(selectedAddressId);
        }
        // Then update the zipcode, preserving the address ID if one is selected
        await updateZipcode(trimmedZipcode, !!selectedAddressId);
        // Address and zipcode will be automatically updated by CartContext
      } else {
        const errorMessage = data.message || data.error || 'This zipcode is not serviceable';
        setZipcodeError(errorMessage);
      }
    } catch (err) {
      console.error('Error setting zipcode:', err);
      const errorMessage = err instanceof Error ? err.message : 'This zipcode is not serviceable';
      setZipcodeError(errorMessage);
    } finally {
      setIsValidatingZipcode(false);
    }
  };

  // Determine dynamic label based on user state
  const getDynamicLabel = (): string => {
    if (user && addresses.length > 0) {
      return 'Select your delivery address';
    }
    return 'To get best delivery experience, provide your zip code';
  };

  return (
    <Box className={className} sx={{ width: '100%' }}>
      <Box
        sx={{
          border: '2px dashed #FF9F0D',
          borderRadius: 1,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {/* Dynamic label based on authentication state */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: '#333',
            fontSize: isMobile ? '0.8rem' : '0.875rem',
          }}
        >
          {getDynamicLabel()}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
          }}
        >
        {/* Left side: Address dropdown or zipcode input */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flex: 1,
            minWidth: { xs: '100%', sm: 0 },
          }}
        >
          <IconMapPin size={isMobile ? 18 : 20} color="#FF9F0D" />

          {user ? (
            // Logged-in user: Address dropdown
            isLoadingAddresses ? (
              <CircularProgress size={20} />
            ) : addresses.length > 0 ? (
              // Has saved addresses - show dropdown + zipcode input + Apply button in horizontal row
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  flex: 1,
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                }}
              >
                {/* Address Dropdown */}
                <FormControl
                  size="small"
                  sx={{
                    minWidth: 200,
                    maxWidth: 450,
                    flex: 1,
                    width: { xs: '100%', sm: 'auto' },
                  }}
                >
                  <Select
                    value={selectedAddressId || ''}
                    onChange={(e) => handleAddressSelect(e.target.value as string)}
                    displayEmpty
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#E0E0E0',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#FF9F0D',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#FF9F0D',
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      Select delivery address
                    </MenuItem>
                    {addresses.map((address) => {
                      const addressId = address._id?.toString() || '';
                      return (
                        <MenuItem key={addressId} value={addressId}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {address.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              {address.street_address}, {address.city} {address.postal_code}
                            </Typography>
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                {/* Zipcode Input Field */}
                <TextField
                  size="small"
                  placeholder="Enter zipcode"
                  value={zipcodeInput}
                  onChange={(e) => {
                    setZipcodeInput(e.target.value);
                    setZipcodeError('');
                  }}
                  onKeyPress={handleKeyPress}
                  error={!!zipcodeError}
                  helperText={zipcodeError}
                  disabled={isValidatingZipcode}
                  sx={{
                    minWidth: 150,
                    maxWidth: 200,
                    width: { xs: '100%', sm: 'auto' },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#E0E0E0',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#FF9F0D',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#FF9F0D',
                    },
                  }}
                />

                {/* Apply Button */}
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleApplyZipcode}
                  disabled={isValidatingZipcode || !zipcodeInput.trim()}
                  sx={{
                    bgcolor: '#FF9F0D',
                    minWidth: 60,
                    '&:hover': {
                      bgcolor: '#e68f0c',
                    },
                    '&:disabled': {
                      bgcolor: '#ccc',
                    },
                  }}
                >
                  {isValidatingZipcode ? (
                    <CircularProgress size={16} sx={{ color: '#fff' }} />
                  ) : (
                    'Apply'
                  )}
                </Button>
              </Box>
            ) : (
              // No addresses, show zipcode input only (same as guest users)
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flex: 1 }}>
                <TextField
                  size="small"
                  placeholder="Enter zipcode"
                  value={zipcodeInput}
                  onChange={(e) => {
                    setZipcodeInput(e.target.value);
                    setZipcodeError('');
                  }}
                  onKeyPress={handleKeyPress}
                  error={!!zipcodeError}
                  disabled={isValidatingZipcode}
                  sx={{
                    minWidth: 150,
                    flex: 1,
                    maxWidth: 200,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#E0E0E0',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#FF9F0D',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#FF9F0D',
                    },
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleZipcodeSubmit}
                  disabled={isValidatingZipcode || !zipcodeInput.trim()}
                  sx={{
                    bgcolor: '#FF9F0D',
                    minWidth: 60,
                    '&:hover': {
                      bgcolor: '#e68f0c',
                    },
                    '&:disabled': {
                      bgcolor: '#ccc',
                    },
                  }}
                >
                  {isValidatingZipcode ? (
                    <CircularProgress size={16} sx={{ color: '#fff' }} />
                  ) : (
                    'Set'
                  )}
                </Button>
              </Box>
            )
          ) : (
            // Guest user: Zipcode input only
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flex: 1 }}>
              <TextField
                size="small"
                placeholder="Enter zipcode"
                value={zipcodeInput}
                onChange={(e) => {
                  setZipcodeInput(e.target.value);
                  setZipcodeError('');
                }}
                onKeyPress={handleKeyPress}
                error={!!zipcodeError}
                helperText={zipcodeError}
                disabled={isValidatingZipcode}
                sx={{
                  minWidth: 150,
                  flex: 1,
                  maxWidth: 200,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E0E0E0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#FF9F0D',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#FF9F0D',
                  },
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleZipcodeSubmit}
                disabled={isValidatingZipcode || !zipcodeInput.trim()}
                sx={{
                  bgcolor: '#FF9F0D',
                  minWidth: 60,
                  '&:hover': {
                    bgcolor: '#e68f0c',
                  },
                  '&:disabled': {
                    bgcolor: '#ccc',
                  },
                }}
              >
                {isValidatingZipcode ? (
                  <CircularProgress size={16} sx={{ color: '#fff' }} />
                ) : (
                  'Set'
                )}
              </Button>
            </Box>
          )}
        </Box>

          {/* Right side: Minimum order value display */}
          {showMinOrderValue && minOrderValue && minOrderValue > 0 && (
            <Box
              sx={{
                flexShrink: 0,
                textAlign: { xs: 'left', sm: 'right' },
              }}
            >
              <Typography
                variant={isMobile ? 'caption' : 'body2'}
                sx={{
                  fontWeight: 500,
                  color: '#666',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                }}
              >
                Min. Daily Order Value ${minOrderValue.toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

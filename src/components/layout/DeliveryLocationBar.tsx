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
    minOrderValue,
    updateAddress,
    updateZipcode,
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
    const selectedAddress = addresses.find((addr) => addr._id?.toString() === addressId);
    if (!selectedAddress) return;

    setZipcodeInput(selectedAddress.postal_code);
    setZipcodeError('');
    void updateAddress(addressId).catch((err) => {
      console.error('Error updating delivery address:', err);
    });
  }, [addresses, updateAddress]);

  // Load saved addresses for logged-in users
  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user, fetchAddresses]);

  // Auto-select stored address, default, or first — and sync cart/checkout state
  useEffect(() => {
    if (!user || addresses.length === 0 || hasAutoSelectedRef.current) return;

    const storedId = localStorage.getItem('selectedAddressId') || selectedAddressId;
    const defaultAddress = addresses.find((address) => address.isDefault === true);
    const addressToSelect =
      (storedId ? addresses.find((a) => a._id?.toString() === storedId) : undefined) ||
      defaultAddress ||
      addresses[0];

    const addressId = addressToSelect?._id?.toString();
    if (!addressId) return;

    hasAutoSelectedRef.current = true;
    void updateAddress(addressId).catch((err) => {
      console.error('Error auto-selecting delivery address:', err);
    });
  }, [user, addresses, selectedAddressId, updateAddress]);

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

  const hasSavedAddresses = !!user && addresses.length > 0;

  // One card for every state: title + helper on the left, the control in the middle, the minimum
  // order as a small pill. Same wording as before, just laid out consistently.
  const title = hasSavedAddresses ? 'Delivery address' : 'Delivery location';
  const helper = hasSavedAddresses
    ? 'Select your delivery address'
    : 'To get best delivery experience, provide your zip code';

  const fieldBorder = {
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#F3D9B1' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#FF9F0D' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FF9F0D' },
  };

  const zipcodeControl = (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', width: '100%', maxWidth: { md: 360 } }}>
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
        sx={{ flex: 1, minWidth: 0, bgcolor: '#fff', borderRadius: 2, ...fieldBorder }}
        slotProps={{ htmlInput: { inputMode: 'numeric', 'aria-label': 'Delivery zipcode' } }}
      />
      <Button
        variant="contained"
        onClick={handleZipcodeSubmit}
        disabled={isValidatingZipcode || !zipcodeInput.trim()}
        sx={{
          bgcolor: '#FF9F0D',
          minWidth: 72,
          height: 40,
          borderRadius: 2,
          boxShadow: 'none',
          textTransform: 'none',
          fontWeight: 600,
          '&:hover': { bgcolor: '#e68f0c', boxShadow: 'none' },
          '&:disabled': { bgcolor: '#E6E6E6', color: '#9A9A9A' },
        }}
      >
        {isValidatingZipcode ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Set'}
      </Button>
    </Box>
  );

  const addressControl = (
    <FormControl size="small" fullWidth sx={{ maxWidth: { md: 560 } }}>
      <Select
        value={selectedAddressId || ''}
        onChange={(e) => handleAddressSelect(e.target.value as string)}
        displayEmpty
        inputProps={{ 'aria-label': 'Delivery address' }}
        sx={{ bgcolor: '#fff', borderRadius: 2, ...fieldBorder }}
        MenuProps={{ slotProps: { paper: { sx: { borderRadius: 2, mt: 0.5 } } } }}
      >
        <MenuItem value="" disabled>
          Select delivery address
        </MenuItem>
        {addresses.map((address) => {
          const addressId = address._id?.toString() || '';
          return (
            <MenuItem key={addressId} value={addressId}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {address.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', whiteSpace: 'normal' }}>
                  {address.street_address}, {address.city} {address.postal_code}
                </Typography>
              </Box>
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );

  return (
    <Box className={className} sx={{ width: '100%' }}>
      <Box
        sx={{
          bgcolor: '#FFF8EC',
          border: '1px solid #F3D9B1',
          borderRadius: 3,
          p: { xs: 1.5, sm: 2 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr auto', md: 'auto minmax(0, 1fr) auto' },
          gridTemplateAreas: {
            xs: '"label" "control" "pill"',
            sm: '"label pill" "control control"',
            md: '"label control pill"',
          },
          alignItems: 'center',
          columnGap: { xs: 1.5, md: 3 },
          rowGap: 1.5,
        }}
      >
        {/* Title + helper */}
        <Box sx={{ gridArea: 'label', display: 'flex', alignItems: 'center', gap: 1.5, minWidth: { md: 250 } }}>
          <Box
            aria-hidden
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: '#FF9F0D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconMapPin size={22} color="#fff" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1F1F1F', lineHeight: 1.3 }}>
              {title}
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: 'block', color: '#666', lineHeight: 1.35, textWrap: 'balance' }}
            >
              {helper}
            </Typography>
          </Box>
        </Box>

        {/* Control: address dropdown when the user has saved addresses, zipcode box otherwise */}
        <Box sx={{ gridArea: 'control', minWidth: 0, display: 'flex', alignItems: 'center' }}>
          {user && isLoadingAddresses ? (
            <CircularProgress size={20} sx={{ color: '#FF9F0D' }} />
          ) : hasSavedAddresses ? (
            addressControl
          ) : (
            zipcodeControl
          )}
        </Box>

        {/* Minimum order value */}
        {showMinOrderValue && minOrderValue && minOrderValue > 0 && (
          <Box
            sx={{
              gridArea: 'pill',
              justifySelf: { xs: 'start', sm: 'end' },
              bgcolor: '#fff',
              border: '1px solid #F3D9B1',
              borderRadius: 999,
              px: 1.75,
              py: 0.5,
            }}
          >
            <Typography
              component="span"
              sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' }, color: '#666', fontWeight: 500 }}
            >
              Min. daily order{' '}
              <Box component="span" sx={{ color: '#1F1F1F', fontWeight: 700 }}>
                ${minOrderValue.toFixed(2)}
              </Box>
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

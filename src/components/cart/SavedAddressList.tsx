'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  useTheme,
} from '@mui/material';
import { IconPlus, IconMapPin, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { IAddress } from '@/types/auth';
import AddressDialog from '@/components/account/AddressDialog';
import { validateZipcodeServiceability } from '@/utils/zipcodeValidationClient';
import { invalidateAddressCache } from '@/lib/zipcodeCache';
import { useApiClient } from '@/hooks/useApiClient';

interface SavedAddressListProps {
  onAddressSelect: (addressId: string) => Promise<void>;
  selectedAddressId?: string;
}

interface AddressValidationState {
  isServiceable: boolean;
  error?: string;
  isValidating: boolean;
}

export default function SavedAddressList({
  onAddressSelect,
  selectedAddressId,
}: SavedAddressListProps) {
  const theme = useTheme();
  const { authenticatedFetch } = useApiClient();
  const [addresses, setAddresses] = useState<IAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  // State for tracking address validation results
  const [addressValidationStates, setAddressValidationStates] = useState<Map<string, AddressValidationState>>(new Map());

  // Validate zip codes for all addresses in parallel
  const validateAddressZipcodes = useCallback(async (addressList: IAddress[]) => {
    const validationMap = new Map<string, AddressValidationState>();

    // Initialize validation states
    addressList.forEach((address) => {
      const addressId = address._id?.toString() || '';
      validationMap.set(addressId, {
        isServiceable: false,
        isValidating: true,
      });
    });
    setAddressValidationStates(new Map(validationMap));

    // Validate all zip codes in parallel
    const validationPromises = addressList.map(async (address) => {
      const addressId = address._id?.toString() || '';
      const zipcode = address.postal_code;

      try {
        const result = await validateZipcodeServiceability(zipcode);
        return {
          addressId,
          result: {
            isServiceable: result.isServiceable,
            error: result.isServiceable ? undefined : result.message,
            isValidating: false,
          },
        };
      } catch (error) {
        console.error(`Error validating zipcode ${zipcode} for address ${addressId}:`, error);
        return {
          addressId,
          result: {
            isServiceable: false,
            error: 'Unable to verify serviceability',
            isValidating: false,
          },
        };
      }
    });

    // Wait for all validations to complete
    const validationResults = await Promise.allSettled(validationPromises);

    // Update validation states
    validationResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        validationMap.set(result.value.addressId, result.value.result);
      }
    });

    setAddressValidationStates(new Map(validationMap));
  }, []);

  // Fetch user's saved addresses
  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await authenticatedFetch('/api/address');

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please login to view saved addresses');
        }
        throw new Error('Failed to fetch addresses');
      }

      const data = await response.json();

      if (data.success) {
        // Ensure we always set an array
        // API returns paginated response with addresses in data.items
        const addressList = Array.isArray(data.data?.items) ? data.data.items : [];
        setAddresses(addressList);

        // Validate zip codes for all loaded addresses
        if (addressList.length > 0) {
          validateAddressZipcodes(addressList);
        }
      } else {
        setAddresses([]); // Reset to empty array on error
        setError(data.error || 'Failed to load addresses');
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setAddresses([]); // Reset to empty array on error
      setError(err instanceof Error ? err.message : 'Failed to load addresses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [validateAddressZipcodes, authenticatedFetch]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleAddressChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      await onAddressSelect(event.target.value);
      // Address and cart will be automatically updated by CartContext
    } catch (error) {
      console.error('Failed to update address:', error);
      // Error is handled in CartContext and could be displayed here if needed
    }
  };

  const handleAddressSaved = async (addressData: {
    _id?: string;
    name: string;
    email: string;
    phone?: string;
    street_address: string;
    city: string;
    postal_code: string;
    apartment?: string;
    floor?: string;
    entrance?: string;
    isDefault?: boolean;
  }) => {
    try {
      const response = await authenticatedFetch('/api/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create address');
      }

      // Add the new address to state immediately
      if (data.data) {
        const newAddress = data.data;
        setAddresses(prev => {
          const updatedAddresses = [...prev, newAddress];

          // Validate the new address's zipcode
          const addressId = newAddress._id?.toString() || '';
          const zipcode = newAddress.postal_code;

          // Initialize validation state as "validating"
          setAddressValidationStates(prev => {
            const newMap = new Map(prev);
            newMap.set(addressId, {
              isServiceable: false,
              isValidating: true,
            });
            return newMap;
          });

          // Validate zipcode asynchronously
          validateZipcodeServiceability(zipcode)
            .then(result => {
              setAddressValidationStates(prev => {
                const newMap = new Map(prev);
                newMap.set(addressId, {
                  isServiceable: result.isServiceable,
                  error: result.isServiceable ? undefined : result.message,
                  isValidating: false,
                });
                return newMap;
              });
            })
            .catch(error => {
              console.error(`Error validating zipcode ${zipcode} for address ${addressId}:`, error);
              setAddressValidationStates(prev => {
                const newMap = new Map(prev);
                newMap.set(addressId, {
                  isServiceable: false,
                  error: 'Unable to verify serviceability',
                  isValidating: false,
                });
                return newMap;
              });
            });

          return updatedAddresses;
        });
      }

      setShowAddDialog(false);
      invalidateAddressCache();
    } catch (error) {
      console.error('Error saving address:', error);
      throw error; // AddressDialog will display the error
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} sx={{ color: '#FF9F0D' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (addresses.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <IconMapPin size={48} color="#ccc" style={{ marginBottom: '16px' }} />
        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
          No saved addresses found
        </Typography>
        <Button
          variant="contained"
          startIcon={<IconPlus size={18} />}
          onClick={() => setShowAddDialog(true)}
          sx={{
            bgcolor: '#FF9F0D',
            '&:hover': {
              bgcolor: '#e68f0c',
            },
          }}
        >
          Add New Address
        </Button>

        <AddressDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSave={handleAddressSaved}
          mode="add"
          existingAddressCount={addresses.length}
        />
      </Box>
    );
  }

  return (
    <Box>
      <RadioGroup value={selectedAddressId || ''} onChange={handleAddressChange}>
        {Array.isArray(addresses) && addresses.map((address) => {
          const addressId = address._id?.toString() || '';
          const validationState = addressValidationStates.get(addressId);
          const isServiceable = validationState?.isServiceable;
          const isValidating = validationState?.isValidating;
          const validationError = validationState?.error;

          // Determine if this address should be disabled
          const isDisabled = !isServiceable && !isValidating;

          return (
            <Box key={addressId} sx={{ mb: 1 }}>
              <FormControlLabel
                value={addressId}
                disabled={isDisabled}
                control={
                  <Tooltip
                    title={validationError || (isServiceable ? 'Serviceable' : 'Not serviceable')}
                    arrow
                  >
                    <Radio
                      sx={{
                        color: isDisabled ? '#ccc' : '#666',
                        '&.Mui-checked': {
                          color: '#FF9F0D',
                        },
                        '&.Mui-disabled': {
                          color: '#ccc',
                        },
                      }}
                    />
                  </Tooltip>
                }
                label={
                  <Box sx={{ py: 1, flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: isDisabled ? '#999' : 'inherit' }}>
                        {address.name}
                      </Typography>
                      {isValidating && (
                        <CircularProgress size={16} sx={{ ml: 1 }} />
                      )}
                      {!isValidating && (
                        <>
                          {isServiceable ? (
                            <IconCheck size={20} color={theme.palette.success.main} />
                          ) : (
                            <IconAlertCircle size={20} color={theme.palette.error.main} />
                          )}
                        </>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ color: isDisabled ? '#999' : '#666', mb: 0.5 }}>
                      {address.street_address}
                      {address.apartment && `, ${address.apartment}`}
                    </Typography>
                    <Typography variant="body2" sx={{ color: isDisabled ? '#999' : '#666' }}>
                      {address.city}
                      {address.province && `, ${address.province}`} - {address.postal_code}
                    </Typography>
                    {!isServiceable && !isValidating && (
                      <Chip
                        label="Not Serviceable"
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{ mt: 1, fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>
                }
                sx={{
                  border: '1px solid',
                  borderColor: isDisabled
                    ? '#e0e0e0'
                    : selectedAddressId === addressId
                      ? '#FF9F0D'
                      : '#EDEDED',
                  borderRadius: '8px',
                  p: 1.5,
                  mr: 0,
                  transition: 'all 0.2s',
                  backgroundColor: isDisabled ? '#f5f5f5' : 'transparent',
                  opacity: isDisabled ? 0.7 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  '&:hover': {
                    borderColor: isDisabled
                      ? '#e0e0e0'
                      : '#FF9F0D',
                    bgcolor: isDisabled
                      ? '#f5f5f5'
                      : 'rgba(255, 159, 13, 0.05)',
                  },
                }}
              />
            </Box>
          );
        })}
      </RadioGroup>

      <Button
        variant="outlined"
        fullWidth
        startIcon={<IconPlus size={18} />}
        onClick={() => setShowAddDialog(true)}
        sx={{
          mt: 2,
          borderColor: '#FF9F0D',
          color: '#FF9F0D',
          '&:hover': {
            borderColor: '#FF9F0D',
            bgcolor: 'rgba(255, 159, 13, 0.05)',
          },
        }}
      >
        Add New Address
      </Button>

      <AddressDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSave={handleAddressSaved}
        mode="add"
        existingAddressCount={addresses.length}
      />
    </Box>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Box,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Alert,
} from '@mui/material';
import { IconX, IconMapPin, IconCheck, IconAlertCircle, IconPlus } from '@tabler/icons-react';
import { IAddress } from '@/types/auth';
import { validateZipcodeServiceability } from '@/utils/zipcodeValidationClient';
import AddressDialog from '@/components/account/AddressDialog';

interface AddressValidationState {
  isServiceable: boolean;
  error?: string;
  isValidating: boolean;
}

interface AddressSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  addresses: IAddress[];
  selectedAddressId?: string;
  onConfirm: (addressId: string) => void;
  isLoading?: boolean;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  userProfile?: {
    name?: string;
    email: string;
    phone?: string;
  };
  onAddressRefresh?: () => Promise<void>;
}

export default function AddressSelectionDialog({
  open,
  onClose,
  addresses,
  selectedAddressId,
  onConfirm,
  isLoading = false,
  authenticatedFetch,
  userProfile,
  onAddressRefresh,
}: AddressSelectionDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedId, setSelectedId] = useState<string>('');
  const [addressValidationStates, setAddressValidationStates] = useState<
    Map<string, AddressValidationState>
  >(new Map());

  // Add address dialog states
  const [showAddAddressDialog, setShowAddAddressDialog] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addAddressError, setAddAddressError] = useState('');

  // Set initial selected address when dialog opens
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in useEffect
    setTimeout(() => {
      if (open && selectedAddressId) {
        setSelectedId(selectedAddressId);
      }
    }, 0);
  }, [open, selectedAddressId]);

  // Validate zip codes for all addresses when addresses change
  const validateAddressZipcodes = useCallback(async (addressList: IAddress[]) => {
    if (addressList.length === 0) return;

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

  // Validate addresses when dialog opens or addresses change
  useEffect(() => {
    if (open && addresses.length > 0) {
      // Use setTimeout to avoid synchronous setState in useEffect
      setTimeout(() => {
        validateAddressZipcodes(addresses);
      }, 0);
    }
  }, [open, addresses, validateAddressZipcodes]);

  const handleSelectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedId(event.target.value);
  };

  const handleConfirm = () => {
    if (selectedId) {
      onConfirm(selectedId);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleOpenAddAddressDialog = () => {
    setShowAddAddressDialog(true);
    setAddAddressError('');
  };

  const handleCloseAddAddressDialog = () => {
    if (!isAddingAddress) {
      setShowAddAddressDialog(false);
      setAddAddressError('');
    }
  };

  const handleAddAddress = async (addressData: any) => {
    setIsAddingAddress(true);
    setAddAddressError('');

    try {
      const response = await authenticatedFetch('/api/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addressData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error || 'Failed to create address';
        setAddAddressError(errorMessage);
        throw new Error(errorMessage);
      }

      // Get the new address details
      const newAddress = data.data;
      const newAddressId = newAddress._id;
      const zipcode = newAddress.postal_code;

      // Immediately validate the new address's zipcode
      setAddressValidationStates(prev => {
        const newMap = new Map(prev);
        newMap.set(newAddressId, {
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
            newMap.set(newAddressId, {
              isServiceable: result.isServiceable,
              error: result.isServiceable ? undefined : result.message,
              isValidating: false,
            });
            return newMap;
          });
        })
        .catch(error => {
          console.error(`Error validating zipcode ${zipcode} for address ${newAddressId}:`, error);
          setAddressValidationStates(prev => {
            const newMap = new Map(prev);
            newMap.set(newAddressId, {
              isServiceable: false,
              error: 'Unable to verify serviceability',
              isValidating: false,
            });
            return newMap;
          });
        });

      // Refresh the addresses list
      if (onAddressRefresh) {
        await onAddressRefresh();
      }

      // Auto-select the newly created address
      if (newAddressId) {
        setSelectedId(newAddressId);
        onConfirm(newAddressId);
      }

      // Close only the add address dialog, keep main dialog open
      // so user can see the newly added address in the list
      setShowAddAddressDialog(false);
      // Don't call onClose() here - let user see the updated address list

      setAddAddressError('');
    } catch (error) {
      console.error('Error adding address:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create address';
      setAddAddressError(errorMessage);
      throw error;
    } finally {
      setIsAddingAddress(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : '16px',
          maxHeight: isMobile ? '100%' : '80vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
        }}
      >
        Select Delivery Address
        <IconButton onClick={handleClose} disabled={isLoading} size="small">
          <IconX size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {addresses.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <IconMapPin size={48} color="#ccc" style={{ marginBottom: '16px' }} />
            <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
              No saved addresses found
            </Typography>
            <Button
              variant="contained"
              startIcon={<IconPlus size={18} />}
              onClick={handleOpenAddAddressDialog}
              disabled={isAddingAddress}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.25,
                borderRadius: '12px',
                bgcolor: '#FF9F0D',
                '&:hover': {
                  bgcolor: '#e68f0c',
                },
                '&:disabled': {
                  bgcolor: '#ccc',
                  color: '#666',
                },
              }}
            >
              {isAddingAddress ? 'Adding...' : 'Add New Address'}
            </Button>
          </Box>
        ) : (
          <RadioGroup value={selectedId} onChange={handleSelectionChange}>
            {addresses.map((address) => {
              const addressId = address._id?.toString() || '';
              const validationState = addressValidationStates.get(addressId);
              const isServiceable = validationState?.isServiceable;
              const isValidating = validationState?.isValidating;
              const validationError = validationState?.error;
              const isDisabled = !isServiceable && !isValidating;

              return (
                <Box key={addressId} sx={{ mb: 1.5 }}>
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
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: 600, color: isDisabled ? '#999' : 'inherit' }}
                          >
                            {address.name}
                          </Typography>
                          {isValidating && <CircularProgress size={16} sx={{ ml: 1 }} />}
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
                        <Typography
                          variant="body2"
                          sx={{ color: isDisabled ? '#999' : '#666', mb: 0.5 }}
                        >
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
                      width: '100%',
                      border: '1px solid',
                      borderColor: isDisabled
                        ? '#e0e0e0'
                        : selectedId === addressId
                          ? '#FF9F0D'
                          : '#EDEDED',
                      borderRadius: '8px',
                      p: 1.5,
                      mr: 0,
                      ml: 0,
                      transition: 'all 0.2s',
                      backgroundColor: isDisabled ? '#f5f5f5' : 'transparent',
                      opacity: isDisabled ? 0.7 : 1,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      '&:hover': {
                        borderColor: isDisabled ? '#e0e0e0' : '#FF9F0D',
                        bgcolor: isDisabled ? '#f5f5f5' : 'rgba(255, 159, 13, 0.05)',
                      },
                    }}
                  />
                </Box>
              );
            })}
          </RadioGroup>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1, flexDirection: 'column' }}>
        {addresses.length > 0 && (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
            <Button
              startIcon={<IconPlus size={18} />}
              onClick={handleOpenAddAddressDialog}
              disabled={isAddingAddress}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                px: 2,
                py: 1,
                borderRadius: '8px',
                color: '#FF9F0D',
                bgcolor: 'rgba(255, 159, 13, 0.1)',
                '&:hover': {
                  bgcolor: 'rgba(255, 159, 13, 0.2)',
                },
                '&:disabled': {
                  color: '#ccc',
                  bgcolor: 'rgba(0, 0, 0, 0.05)',
                },
              }}
            >
              {isAddingAddress ? 'Adding...' : 'Add New Address'}
            </Button>
          </Box>
        )}
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            onClick={handleClose}
            disabled={isLoading}
            variant="outlined"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.25,
              borderRadius: '12px',
              borderColor: '#EDEDED',
              color: '#666',
              '&:hover': {
                borderColor: '#ccc',
                bgcolor: 'rgba(0, 0, 0, 0.02)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !selectedId || addresses.length === 0}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.25,
              borderRadius: '12px',
              bgcolor: '#FF9F0D',
              '&:hover': {
                bgcolor: '#e68f0c',
              },
              '&:disabled': {
                bgcolor: '#ccc',
                color: '#666',
              },
            }}
          >
            {isLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Confirm'}
          </Button>
        </Box>
      </DialogActions>

      {/* Add Address Dialog */}
      <AddressDialog
        open={showAddAddressDialog}
        onClose={handleCloseAddAddressDialog}
        onSave={handleAddAddress}
        mode="add"
        userProfile={userProfile}
        existingAddressCount={addresses.length}
      />
    </Dialog>
  );
}

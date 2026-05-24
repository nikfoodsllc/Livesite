'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { IconX, IconCheck, IconX as IconError } from '@tabler/icons-react';
import AddressSearch from './AddressSearch';
import { PlaceDetails } from '@/types/places';
import { validateZipcodeServiceability } from '@/utils/zipcodeValidationClient';
import { validateUSPhone } from '@/utils/validation';

interface Address {
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
}

interface UserProfile {
  name?: string;
  email: string;
  phone?: string;
}

interface AddressDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (address: Address) => Promise<void>;
  address?: Address | null;
  mode: 'add' | 'edit';
  userProfile?: UserProfile;
  existingAddressCount?: number;
}

export default function AddressDialog({
  open,
  onClose,
  onSave,
  address,
  mode,
  userProfile,
  existingAddressCount = 0,
}: AddressDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState<Address>({
    name: '',
    email: '',
    phone: '',
    street_address: '',
    city: '',
    postal_code: '',
    apartment: '',
    floor: '',
    entrance: '',
    isDefault: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [addressSelected, setAddressSelected] = useState(false);

  // Zip code validation states
  const [isValidatingZipcode, setIsValidatingZipcode] = useState(false);
  const [zipcodeError, setZipcodeError] = useState<string | null>(null);
  const [zipcodeServiceable, setZipcodeServiceable] = useState<boolean | null>(null);

  // Phone validation state
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Debouncing for zip code validation
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dialog content ref
  const dialogContentRef = useRef<HTMLDivElement>(null);

  // Zip code validation function
  const validateZipcode = useCallback(async (zipcode: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (!zipcode || zipcode.trim().length === 0) {
      setZipcodeError(null);
      setZipcodeServiceable(null);
      return;
    }

    const zipcodeRegex = /^\d{5}(-\d{4})?$/;

    if (!zipcodeRegex.test(zipcode)) {
      setZipcodeError(
        'Invalid zip code format. Expected format: 12345 or 12345-6789'
      );
      setZipcodeServiceable(false);
      return;
    }

    setIsValidatingZipcode(true);
    setZipcodeError(null);

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await validateZipcodeServiceability(zipcode);

        setZipcodeServiceable(result.isServiceable);

        if (!result.isServiceable) {
          setZipcodeError(result.message || 'This area is not serviceable');
        } else {
          setZipcodeError(null);
        }
      } catch (error) {
        console.error('Zip code validation error:', error);

        setZipcodeError(
          'Unable to verify serviceability. Please try again.'
        );

        setZipcodeServiceable(false);
      } finally {
        setIsValidatingZipcode(false);
      }
    }, 500);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (address && mode === 'edit') {
        setFormData(address);
        setAddressSelected(true);
      } else {
        setFormData({
          name: userProfile?.name || '',
          email: userProfile?.email || '',
          phone: userProfile?.phone || '',
          street_address: '',
          city: '',
          postal_code: '',
          apartment: '',
          floor: '',
          entrance: '',
          isDefault: existingAddressCount === 0,
        });

        setAddressSelected(false);
      }

      setError('');
      setZipcodeError(null);
      setZipcodeServiceable(null);
      setIsValidatingZipcode(false);
      setPhoneError(null);
    }, 0);
  }, [address, mode, open, userProfile, existingAddressCount]);

  useEffect(() => {
    validateZipcode(formData.postal_code);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [formData.postal_code, validateZipcode]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (error || phoneError) {
      if (dialogContentRef.current) {
        dialogContentRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    }
  }, [error, phoneError]);

  const handleAddressSelect = (placeDetails: PlaceDetails) => {
    setFormData((prev) => ({
      ...prev,
      street_address:
        placeDetails.full_address || placeDetails.street,
      city: placeDetails.city || placeDetails.town,
      postal_code: placeDetails.pincode,
    }));

    setAddressSelected(true);
  };

  const handleChangeAddress = () => {
    setFormData((prev) => ({
      ...prev,
      street_address: '',
      city: '',
      postal_code: '',
    }));

    setAddressSelected(false);
  };

  const handleChange =
    (field: keyof Address) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      setError('');

      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      if (field === 'phone' && phoneError) {
        setPhoneError(null);
      }
    };

  const handleSubmit = async () => {
    setError('');

    if (!formData.name || formData.name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (
      !formData.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      setError('Please enter a valid email address');
      return;
    }

    if (
      !formData.street_address ||
      formData.street_address.trim().length < 5
    ) {
      setError('Street address is too short');
      return;
    }

    if (!formData.city || formData.city.trim().length < 2) {
      setError('City is required');
      return;
    }

    if (
      !formData.postal_code ||
      formData.postal_code.trim().length < 4
    ) {
      setError('Postal code is required');
      return;
    }

    if (zipcodeServiceable === false) {
      setError(
        zipcodeError ||
          "This area is not serviceable. We currently don't deliver to this zip code."
      );
      return;
    }

    if (isValidatingZipcode) {
      setError('Please wait while we verify your zip code...');
      return;
    }

    const phoneValidation = validateUSPhone(formData.phone || '');

    if (!phoneValidation.valid) {
      setPhoneError(
        phoneValidation.error || 'Phone number must be 10 digits'
      );
      return;
    } else {
      setPhoneError(null);
    }

    setIsLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save address'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : '16px',
          maxHeight: isMobile ? '100%' : '90vh',
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
        {mode === 'add' ? 'Add New Address' : 'Edit Address'}

        <IconButton
          onClick={onClose}
          disabled={isLoading}
          size="small"
        >
          <IconX size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent ref={dialogContentRef} sx={{ pt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {phoneError && !error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {phoneError}
          </Alert>
        )}

        {mode === 'add' && !addressSelected && (
          <Box sx={{ mb: 3 }}>
            <AddressSearch
              onAddressSelect={handleAddressSelect}
            />

            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                mt: 1,
                display: 'block',
              }}
            >
              Select an address to continue
            </Typography>
          </Box>
        )}

        {(addressSelected || mode === 'edit') && (
          <>
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: '#2A1A0C',
                  }}
                >
                  Address Details
                </Typography>

                {mode === 'add' && (
                  <Button
                    size="small"
                    onClick={handleChangeAddress}
                    sx={{
                      textTransform: 'none',
                      fontSize: '13px',
                      color: theme.palette.primary.main,
                    }}
                  >
                    Change Address
                  </Button>
                )}
              </Box>

              <TextField
                fullWidth
                label="Street Address *"
                value={formData.street_address}
                onChange={handleChange('street_address')}
                InputProps={{
                  readOnly: mode === 'add',
                }}
                sx={{
                  mb: 2,
                  '& .MuiInputBase-input': {
                    cursor:
                      mode === 'add'
                        ? 'not-allowed'
                        : 'text',
                  },
                }}
              />

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="City *"
                  value={formData.city}
                  onChange={handleChange('city')}
                />

                <TextField
                  fullWidth
                  label="Postal Code *"
                  value={formData.postal_code}
                  onChange={handleChange('postal_code')}
                  error={zipcodeError !== null}
                  helperText={zipcodeError}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {isValidatingZipcode ? (
                          <CircularProgress
                            size={20}
                            color="inherit"
                          />
                        ) : zipcodeServiceable === true ? (
                          <IconCheck
                            size={20}
                            color={
                              theme.palette.success.main
                            }
                          />
                        ) : zipcodeServiceable === false ? (
                          <IconError
                            size={20}
                            color={
                              theme.palette.error.main
                            }
                          />
                        ) : null}
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
  <TextField
    fullWidth
    label="Apartment"
    value={formData.apartment}
    onChange={handleChange('apartment')}
    inputProps={{ maxLength: 10 }}
    error={(formData.apartment?.length || 0) === 10}
  />

  <TextField
    fullWidth
    label="Delivery Instruction"
    value={formData.floor}
    onChange={handleChange('floor')}
    inputProps={{ maxLength: 30 }}
    error={(formData.floor?.length || 0) === 30}
  />

  <TextField
    fullWidth
    label="Gate Code"
    value={formData.entrance}
    onChange={handleChange('entrance')}
    inputProps={{ maxLength: 30 }}
    error={(formData.entrance?.length || 0) === 30}
  />
</Box>
            </Box>

            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: '#2A1A0C',
                  mb: 2,
                }}
              >
                Personal Details
              </Typography>

              <TextField
                fullWidth
                label="Full Name *"
                value={formData.name}
                onChange={handleChange('name')}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Email *"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={handleChange('phone')}
                error={!!phoneError}
                helperText={phoneError}
                inputProps={{ maxLength: 10 }}
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isDefault || false}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        isDefault: e.target.checked,
                      }));
                    }}
                    sx={{
                      color: theme.palette.primary.main,
                      '&.Mui-checked': {
                        color:
                          theme.palette.primary.main,
                      },
                    }}
                  />
                }
                label="Set as default address"
                sx={{
                  mt: 1,
                  '& .MuiFormControlLabel-label': {
                    fontWeight: 500,
                    color: '#2A1A0C',
                  },
                }}
              />
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={isLoading}
          variant="outlined"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.25,
            borderRadius: '12px',
            borderColor: theme.palette.divider,
            color: theme.palette.text.secondary,
          }}
        >
          Cancel
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={
            isLoading ||
            isValidatingZipcode ||
            zipcodeServiceable === false ||
            !!phoneError
          }
          variant="contained"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.25,
            borderRadius: '12px',
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor:
                theme.palette.primary.dark,
            },
          }}
        >
          {isLoading ? (
            <CircularProgress
              size={20}
              color="inherit"
            />
          ) : mode === 'add' ? (
            'Add Address'
          ) : (
            'Save Changes'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
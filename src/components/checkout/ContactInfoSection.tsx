'use client';

import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { Box, TextField, Typography, Paper } from '@mui/material';
import { IconUser, IconMail, IconPhone, IconCheck } from '@tabler/icons-react';
import { validateUSPhone } from '@/utils/validation';

interface ContactInfoSectionProps {
  name: string;
  email: string;
  phone: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPhoneError: (error: string | null) => void;
  errors?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface ContactInfoSectionRef {
  scrollToFirstError: () => void;
  getFirstErrorField: () => HTMLInputElement | null;
}

const ContactInfoSection = forwardRef<ContactInfoSectionRef, ContactInfoSectionProps>(({
  name,
  email,
  phone,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onPhoneError,
  errors = {},
}, ref) => {
  // Individual field refs for scroll-to-error functionality
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Track validity of each field for visual feedback
  const [isValidPhone, setIsValidPhone] = useState(false);

  // Handle phone input with real-time validation
  const handlePhoneChange = (value: string) => {
    // Validate the phone number
    const validation = validateUSPhone(value);

    if (validation.valid) {
      // Pass the formatted phone number to parent
      onPhoneChange(validation.formatted || value);
      // Clear any phone error
      onPhoneError(null);
      setIsValidPhone(true);
    } else {
      // Pass the raw input value to parent
      onPhoneChange(value);
      // Pass the validation error to parent
      onPhoneError(validation.error || 'Phone number must be 10 digits');
      setIsValidPhone(false);
    }
  };

  
  // Get the first field with an error
  const getFirstErrorField = useCallback((): HTMLInputElement | null => {
    if (errors.name && nameRef.current) {
      return nameRef.current;
    }
    if (errors.email && emailRef.current) {
      return emailRef.current;
    }
    if (errors.phone && phoneRef.current) {
      return phoneRef.current;
    }
    return null;
  }, [errors.name, errors.email, errors.phone]);

  // Scroll to the first error field
  const scrollToFirstError = useCallback(() => {
    const firstErrorField = getFirstErrorField();
    if (firstErrorField) {
      firstErrorField.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      // Focus the field for immediate correction
      setTimeout(() => {
        firstErrorField.focus();
      }, 500); // Small delay to ensure scroll completes
    }
  }, [getFirstErrorField]);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    scrollToFirstError,
    getFirstErrorField
  }), [getFirstErrorField, scrollToFirstError]);

  // Auto-scroll to first error when errors change
  useEffect(() => {
    if (Object.keys(errors).some(key => errors[key as keyof typeof errors])) {
      scrollToFirstError();
    }
  }, [errors, scrollToFirstError]);
  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #EDEDED' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Contact Information
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          fullWidth
          label="Full Name"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
          required
          inputRef={nameRef}
          sx={{}}

          InputProps={{
            startAdornment: (
              <IconUser
                size={20}
                style={{ marginRight: '8px', color: '#666' }}
              />
            ),
          }}
        />

        <TextField
          fullWidth
          type="email"
          label="Email Address"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          error={!!errors.email}
          helperText={errors.email}
          required
          inputRef={emailRef}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': {
                borderColor: undefined,
              },
              '&:not(.Mui-focused):hover .MuiOutlinedInput-notchedOutline': {
                borderColor: undefined,
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <IconMail
                size={20}
                style={{ marginRight: '8px', color: '#666' }}
              />
            ),
            endAdornment: undefined,
          }}
        />

        <TextField
          fullWidth
          type="tel"
          label="Phone Number"
          placeholder="Enter your phone number"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          error={!!errors.phone}
          helperText={errors.phone}
          required
          inputRef={phoneRef}
          inputProps={{ maxLength: 10 }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': {
                borderColor: isValidPhone ? 'success.main' : undefined,
              },
              '&:not(.Mui-focused):hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isValidPhone ? 'success.main' : undefined,
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <IconPhone
                size={20}
                style={{ marginRight: '8px', color: '#666' }}
              />
            ),
            endAdornment: isValidPhone ? (
              <IconCheck
                size={20}
                style={{ color: 'success.main' }}
              />
            ) : undefined,
          }}
        />
      </Box>
    </Paper>
  );
});

ContactInfoSection.displayName = 'ContactInfoSection';

export default ContactInfoSection;

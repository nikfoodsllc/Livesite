'use client';

import React, { useState, useEffect } from 'react';
import { Box, TextField, Typography, Button, CircularProgress, Alert, Fade } from '@mui/material';
import { IconHash, IconCheck, IconInfoCircle } from '@tabler/icons-react';
import { useCart } from '@/contexts/CartContext';
import { invalidateZipcodeCache } from '@/lib/zipcodeCache';

interface ZipcodeEntryProps {
  onZipcodeChange: (zipcode: string) => Promise<void>;
  selectedZipcode?: string;
  compact?: boolean;
}

export default function ZipcodeEntry({
  onZipcodeChange,
  selectedZipcode,
  compact = false,
}: ZipcodeEntryProps) {
  const { zipcodeConfig } = useCart();
  const [zipcode, setZipcode] = useState(selectedZipcode || '');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in useEffect
    setTimeout(() => {
      if (selectedZipcode) {
        setZipcode(selectedZipcode);
        setIsValid(true);
      }
    }, 0);
  }, [selectedZipcode]);

  const validateZipcode = (value: string): boolean => {
    // US zipcode format: 5 digits or 5+4 digits
    const zipcodeRegex = /^\d{5}(-\d{4})?$/;
    return zipcodeRegex.test(value);
  };

  const handleZipcodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setZipcode(value);
    setError('');
    setIsValid(false);

    // Auto-format: Add hyphen after 5 digits
    if (value.length === 5 && !value.includes('-')) {
      setZipcode(value);
    }
  };

  const handleApply = async () => {
    const trimmedZipcode = zipcode.trim();

    if (!trimmedZipcode) {
      setError('Please enter a zipcode');
      return;
    }

    if (!validateZipcode(trimmedZipcode)) {
      setError('Invalid zipcode format. Expected format: 12345 or 12345-6789');
      return;
    }

    setIsValidating(true);
    setError('');

    // Invalidate old zipcode cache before setting new one to ensure fresh data
    if (selectedZipcode && selectedZipcode !== trimmedZipcode) {
      invalidateZipcodeCache(selectedZipcode);
    }

    try {
      // Validate zipcode by calling the API
      const response = await fetch(`/api/zipcode-config?zipcode=${encodeURIComponent(trimmedZipcode)}`);

      if (!response.ok) {
        throw new Error('Failed to validate zipcode');
      }

      const data = await response.json();

      if (data.success) {
        setIsValid(true);
        await onZipcodeChange(trimmedZipcode);
        // Zipcode and cart will be automatically updated by CartContext
      } else {
        setError(data.error || 'Failed to validate zipcode');
      }
    } catch (err) {
      console.error('Zipcode validation error:', err);
      setError('Failed to validate zipcode. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleApply();
    }
  };

  if (compact) {
    // Compact layout for inline zipcode entry
    return (
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Zipcode"
          value={zipcode}
          onChange={handleZipcodeChange}
          onKeyPress={handleKeyPress}
          error={!!error}
          helperText={null} // Hide helper text in compact mode
          disabled={isValidating}
          sx={{
            minWidth: 120,
            '& .MuiOutlinedInput-root': {
              height: 36,
              '&.Mui-focused fieldset': {
                borderColor: '#FF9F0D',
              },
            },
            '& .MuiInputBase-input': {
              fontSize: '0.8rem',
              padding: '8px 12px',
            },
          }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={handleApply}
          disabled={isValidating || !zipcode.trim()}
          sx={{
            bgcolor: '#FF9F0D',
            minWidth: 60,
            height: 36,
            fontSize: '0.75rem',
            '&:hover': {
              bgcolor: '#e68f0c',
            },
            '&:disabled': {
              bgcolor: '#ccc',
            },
          }}
        >
          {isValidating ? (
            <CircularProgress size={16} sx={{ color: '#fff' }} />
          ) : (
            'Set'
          )}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 2, color: '#666', lineHeight: 1.5 }}>
        Enter your delivery zipcode to see pricing and minimum order requirements.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Enter zipcode (e.g., 12345)"
          value={zipcode}
          onChange={handleZipcodeChange}
          onKeyPress={handleKeyPress}
          error={!!error}
          helperText={error}
          disabled={isValidating}
          InputProps={{
            startAdornment: <IconHash size={20} style={{ marginRight: '8px', color: '#666' }} />,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': {
                borderColor: '#FF9F0D',
              },
            },
          }}
        />
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={isValidating || !zipcode.trim()}
          sx={{
            bgcolor: '#FF9F0D',
            minWidth: 100,
            '&:hover': {
              bgcolor: '#e68f0c',
            },
            '&:disabled': {
              bgcolor: '#ccc',
            },
          }}
        >
          {isValidating ? (
            <CircularProgress size={20} sx={{ color: '#fff' }} />
          ) : (
            'Apply'
          )}
        </Button>
      </Box>

      {isValid && selectedZipcode && (
        <Alert
          severity="success"
          icon={<IconCheck size={20} />}
          sx={{
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Delivery zipcode: {selectedZipcode}
          </Typography>
          <Typography variant="caption" sx={{ color: '#666' }}>
            Pricing and minimum order value updated based on your zipcode
          </Typography>
        </Alert>
      )}

      <Typography variant="caption" sx={{ color: '#999', display: 'block', mt: 1 }}>
        We deliver to most zipcodes. Minimum order value may vary by location.
      </Typography>
    </Box>
  );
}

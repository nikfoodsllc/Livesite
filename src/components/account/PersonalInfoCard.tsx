'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import { formatPhoneNumberDisplay } from '@/utils/formatPhone';

export default function PersonalInfoCard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, updateUser } = useAuth();
  const { authenticatedFetch } = useApiClient();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in useEffect
    setTimeout(() => {
      if (user) {
        setName(user.name || '');
        setPhone(formatPhoneNumberDisplay(user.phone));
      }
    }, 0);
  }, [user]);

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in useEffect
    setTimeout(() => {
      const changed =
        name !== (user?.name || '') || phone !== formatPhoneNumberDisplay(user?.phone);
      setHasChanges(changed);
    }, 0);
  }, [name, phone, user]);

  const handleDiscard = () => {
    setName(user?.name || '');
    setPhone(formatPhoneNumberDisplay(user?.phone));
    setError('');
    setSuccess(false);
  };

  const handleSave = async () => {
    setError('');
    setSuccess(false);

    // Validation
    if (!name || name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (phone && !/^[+]?[\d\s()-]{7,}$/.test(phone)) {
      setError('Invalid phone number format');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authenticatedFetch('/api/account/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update profile');
        setIsLoading(false);
        return;
      }

      // Update user in context
      updateUser(data.data);

      setSuccess(true);
      setHasChanges(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Update profile error:', err);
      // 401 errors are automatically handled by useApiClient (redirects to login)
      // Other errors will show a generic message
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, sm: 4 },
        borderRadius: '16px',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        backgroundColor: '#FFFFFF',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: '#2A1A0C',
            mb: 0.5,
            fontSize: { xs: '20px', sm: '24px' },
          }}
        >
          Personal Information
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', fontSize: '14px' }}>
          Update your personal details
        </Typography>
      </Box>

      {/* Error/Success Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Profile updated successfully
        </Alert>
      )}

      {/* Form */}
      <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        {/* Name Field */}
        <Box sx={{ mb: 2.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              mb: 1,
              color: theme.palette.text.primary,
            }}
          >
            Full Name *
          </Typography>
          <TextField
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            sx={{
              '& .MuiOutlinedInput-root': {
                height: 48,
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                  borderWidth: '2px',
                },
              },
            }}
          />
        </Box>

        {/* Phone Field */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              mb: 1,
              color: theme.palette.text.primary,
            }}
          >
            Phone Number
          </Typography>
          <TextField
            fullWidth
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your 10-digit phone number"
            inputProps={{ maxLength: 10 }}
            sx={{
              '& .MuiOutlinedInput-root': {
                height: 48,
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                  borderWidth: '2px',
                },
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary, mt: 0.5, display: 'block' }}
          >
            Display format: 10-digit number (international code added automatically)
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'flex-end',
            flexDirection: isMobile ? 'column-reverse' : 'row',
          }}
        >
          <Button
            variant="outlined"
            onClick={handleDiscard}
            disabled={!hasChanges || isLoading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.25,
              borderRadius: '12px',
              borderColor: '#E8E8E8',
              color: '#666',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#999',
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              '&:active': {
                transform: 'scale(0.98)',
              },
            }}
          >
            Discard
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.25,
              borderRadius: '12px',
              backgroundColor: '#FF9F0D',
              boxShadow: '0 4px 12px rgba(255, 159, 13, 0.25)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#E88F00',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(255, 159, 13, 0.35)',
              },
              '&:active': {
                transform: 'scale(0.98)',
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Save Changes'
            )}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  CircularProgress,
} from '@mui/material';
import { useNotifications, showSuccessNotification, showErrorNotification } from '@/components/common/NotificationSystem';
import { subscribeSchema } from '@/lib/validations/subscription';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface MenuSubscriptionSectionProps {
  user?: User | null;
}

export default function MenuSubscriptionSection({
  user,
}: MenuSubscriptionSectionProps) {
  const { showNotification } = useNotifications();

  const [email, setEmail] = useState('');
  const [consentGiven, setConsentGiven] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

  // Check subscription status on mount
  useEffect(() => {
    const checkSubscription = async () => {
      // For logged-in users, check if their email is already subscribed
      if (user?.email) {
        setEmail(user.email);
        try {
          const response = await fetch(
            `/api/menu-subscriptions/check?email=${encodeURIComponent(user.email)}`
          );
          const data = await response.json();
          if (data.subscribed) {
            setSubscribed(true);
          }
        } catch (error) {
          console.error('Error checking subscription:', error);
        }
      }
      setCheckingStatus(false);
    };

    checkSubscription();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate using Zod schema
    const validationResult = subscribeSchema.safeParse({ email, consentGiven });
    if (!validationResult.success) {
      setError(validationResult.error.issues[0].message);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/menu-subscriptions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user && { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }),
        },
        body: JSON.stringify({ email, consentGiven }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showSuccessNotification(showNotification, 'Successfully subscribed to menu notifications!');
        setSubscribed(true);
      } else if (response.status === 409) {
        setError('This email is already subscribed');
        setSubscribed(true);
      } else {
        setError(data.error || 'Failed to subscribe. Please try again.');
        showErrorNotification(showNotification, data.error || 'Failed to subscribe');
      }
    } catch (err) {
      const errorMessage = 'Network error. Please try again.';
      setError(errorMessage);
      showErrorNotification(showNotification, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking subscription
  if (checkingStatus) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            p: 4,
            mt: 4,
            mb: 4,
            boxShadow: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 200,
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Show success message if already subscribed
  if (subscribed) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            p: 4,
            mt: 4,
            mb: 4,
            boxShadow: 1,
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'Georgia, serif',
              fontWeight: 700,
              color: 'text.primary',
              mb: 1,
            }}
          >
            {user ? "You're already subscribed!" : 'Thank you for subscribing!'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You will receive notifications when our menus are uploaded.
          </Typography>
        </Box>
      </Container>
    );
  }

  // Show subscription form
  return (
    <Container maxWidth="sm">
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 4,
          mt: 4,
          mb: 4,
          boxShadow: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        {/* Heading */}
        <Typography
          variant="h5"
          sx={{
            fontFamily: 'Georgia, serif',
            fontWeight: 700,
            color: 'text.primary',
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          Get notified as soon as our menu&apos;s are uploaded
        </Typography>

        {/* Email Input and Subscribe Button Row */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <TextField
            fullWidth
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            error={!!error}
            helperText={error}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
                '& fieldset': {
                  borderColor: 'text.primary',
                },
                '&:hover fieldset': {
                  borderColor: 'text.primary',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                },
              },
              '& .MuiInputBase-input': {
                py: 1.5,
              },
            }}
          />

          <Button
            type="submit"
            variant="outlined"
            disabled={loading}
            sx={{
              px: { xs: 2, sm: 3 },
              py: 1.5,
              borderRadius: 1,
              border: 2,
              borderColor: 'text.primary',
              color: 'text.primary',
              bgcolor: 'background.paper',
              fontWeight: 500,
              minWidth: { xs: '100%', sm: 120 },
              '&:hover': {
                borderColor: 'text.primary',
                bgcolor: 'action.hover',
              },
              '&:disabled': {
                borderColor: 'divider',
                color: 'text.disabled',
              },
            }}
          >
            {loading ? <CircularProgress size={20} /> : 'Subscribe'}
          </Button>
        </Box>

        {/* Consent Checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              disabled={loading}
              sx={{
                color: 'text.primary',
                '&.Mui-checked': {
                  color: 'text.primary',
                },
              }}
            />
          }
          label={
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: 'text.primary',
              }}
            >
              I want to subscribe to your mailing list.
            </Typography>
          }
        />
      </Box>
    </Container>
  );
}

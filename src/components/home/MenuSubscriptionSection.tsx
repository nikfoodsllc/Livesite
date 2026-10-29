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
import { IconBell, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useNotifications, showSuccessNotification, showErrorNotification } from '@/components/common/NotificationSystem';
import { subscribeSchema } from '@/lib/validations/subscription';

interface User {
  id: string;
  email: string;
  name?: string;
}

// A visitor who is not logged in is remembered by the email they subscribed with, so the box stays away on their next visit
const STORAGE_KEY = 'menuSubscribedEmail';
const rememberEmail = (value: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {}
};
const rememberedEmail = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

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
  // Starts as one slim row (like the app) so the menu stays the first thing customers see
  const [open, setOpen] = useState(false);

  // Check subscription status on mount
  useEffect(() => {
    const checkSubscription = async () => {
      // Check the logged-in user's email, or the one this browser subscribed with earlier
      if (user?.email) setEmail(user.email);
      const known = user?.email || rememberedEmail();
      if (known) {
        try {
          const response = await fetch(
            `/api/menu-subscriptions/check?email=${encodeURIComponent(known)}`
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
        rememberEmail(email.trim());
        setSubscribed(true);
      } else if (response.status === 409) {
        setError('This email is already subscribed');
        rememberEmail(email.trim());
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

  // Nothing while we find out, and nothing once the email is on the list (a notice confirms a new sign-up)
  if (checkingStatus || subscribed) return null;

  if (!open) {
    return (
      <Container maxWidth="sm">
        <Box
          component="button"
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Get menu alerts"
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minHeight: 44,
            px: 2,
            mt: 2,
            mb: 2,
            border: 1,
            borderColor: 'rgba(184, 137, 59, 0.35)',
            borderRadius: 2,
            bgcolor: '#FFFEFB',
            cursor: 'pointer',
            font: 'inherit',
            color: 'text.primary',
            textAlign: 'left',
          }}
        >
          <IconBell size={18} />
          <Typography sx={{ flex: 1, fontWeight: 600, fontSize: '0.9rem' }} noWrap>
            Get menu alerts
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'primary.dark' }}>Subscribe</Typography>
          <IconChevronDown size={16} />
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
          position: 'relative',
          p: 2,
          mt: 2,
          mb: 2,
          boxShadow: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          sx={{ position: 'absolute', top: 8, right: 8, p: 0.5, border: 0, bgcolor: 'transparent', cursor: 'pointer', color: 'text.secondary', display: 'flex' }}
        >
          <IconChevronUp size={18} />
        </Box>
        {/* Heading */}
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Georgia, serif',
            fontWeight: 700,
            color: 'text.primary',
            textAlign: 'center',
            lineHeight: 1.3,
            px: 3,
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
                py: 1.25,
              },
            }}
          />

          <Button
            type="submit"
            variant="outlined"
            disabled={loading}
            sx={{
              px: { xs: 2, sm: 3 },
              py: 1,
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

'use client';

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  useTheme,
} from '@mui/material';
import { IconMail, IconLock, IconEye, IconEyeOff } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import { passwordProblem } from '@/lib/password';
import PasswordRequirements from '@/components/common/PasswordRequirements';

function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      // a new key re-creates the input, so Safari's filled-in (masked) password also switches
      key={visible ? 'visible' : 'hidden'}
      fullWidth
      size="small"
      label={label}
      type={visible ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      error={Boolean(error)}
      helperText={error}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible((v) => !v)}
              >
                {visible ? <IconEyeOff size={20} /> : <IconEye size={20} />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

function ChangePasswordSection() {
  const theme = useTheme();
  const { authenticatedFetch } = useApiClient();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [apiError, setApiError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setCurrent('');
    setNext('');
    setConfirm('');
    setErrors({});
    setApiError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!current) found.current = 'Required';
    const problem = passwordProblem(next);
    if (problem) found.next = problem;
    else if (next === current) found.next = 'Must be different';
    if (!found.next && next !== confirm) found.confirm = 'Passwords do not match';
    setErrors(found);
    setApiError('');
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const response = await authenticatedFetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setApiError(body?.error || 'Could not change the password');
        return;
      }
      close();
      setSaved(true);
    } catch {
      setApiError('Could not change the password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconLock size={18} color={theme.palette.text.secondary} />
        <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
          Password
        </Typography>
      </Box>
      {saved && !open && (
        <Alert severity="success" onClose={() => setSaved(false)} sx={{ mb: 1.5 }}>
          Password changed
        </Alert>
      )}
      {!open ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box
            sx={{
              flex: 1,
              minWidth: 200,
              backgroundColor: '#FAFAFA',
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: theme.palette.divider,
            }}
          >
            <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontWeight: 500, letterSpacing: 2 }}>
              ••••••••••
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => {
              setSaved(false);
              setOpen(true);
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
              py: 1,
              borderRadius: '10px',
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
              '&:hover': {
                borderColor: theme.palette.primary.dark,
                backgroundColor: 'rgba(255, 159, 13, 0.08)',
              },
            }}
          >
            Change Password
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {apiError && <Alert severity="error">{apiError}</Alert>}
          <PasswordInput label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" error={errors.current} />
          <Box>
            <PasswordInput label="New password" value={next} onChange={setNext} autoComplete="new-password" error={errors.next} />
            <PasswordRequirements password={next} />
          </Box>
          <PasswordInput label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" error={errors.confirm} />
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={busy}
              sx={{ textTransform: 'none', fontWeight: 600, px: 3, py: 1, borderRadius: '10px' }}
            >
              Save
            </Button>
            <Button
              variant="text"
              onClick={close}
              disabled={busy}
              sx={{ textTransform: 'none', fontWeight: 600, px: 2, py: 1, borderRadius: '10px', color: theme.palette.text.secondary }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default function LoginCredentialsCard() {
  const theme = useTheme();
  const { user } = useAuth();

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        borderRadius: '16px',
        border: '1px solid',
        borderColor: theme.palette.divider,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 0.5,
          }}
        >
          Login Credentials
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          Manage your email and password
        </Typography>
      </Box>

      {/* Email Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconMail size={18} color={theme.palette.text.secondary} />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            Email Address
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 200,
              backgroundColor: '#FAFAFA',
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: theme.palette.divider,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.primary,
                fontWeight: 500,
              }}
            >
              {user?.email}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            disabled
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 2.5,
              py: 1,
              borderRadius: '10px',
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
              '&:hover': {
                borderColor: theme.palette.primary.dark,
                backgroundColor: 'rgba(255, 159, 13, 0.08)',
              },
            }}
          >
            Change Email
          </Button>
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            mt: 1,
            display: 'block',
          }}
        >
          Email change functionality coming soon
        </Typography>
      </Box>

      {/* Password Section */}
      <ChangePasswordSection />
    </Paper>
  );
}

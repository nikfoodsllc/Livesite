'use client';

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  useTheme,
} from '@mui/material';
import { IconMail, IconLock } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';

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
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconLock size={18} color={theme.palette.text.secondary} />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            Password
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
                letterSpacing: 2,
              }}
            >
              ••••••••••
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
            Change Password
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
          Password change functionality coming soon
        </Typography>
      </Box>
    </Paper>
  );
}

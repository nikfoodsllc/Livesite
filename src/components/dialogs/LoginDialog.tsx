'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Link,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconX,
} from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onSwitchToSignup?: () => void;
  onSwitchToForgotPassword?: () => void;
}

export default function LoginDialog({ open, onClose, onSwitchToSignup, onSwitchToForgotPassword }: LoginDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Verification: Ensure user data exists and has required fields
      if (!data.data?.user) {
        console.error('Login error: Invalid API response - missing user data');
        setError('Invalid response from server. Please try again.');
        setIsLoading(false);
        return;
      }

      // Safety check: Add default isCompleted if missing from API response
      const userData = {
        ...data.data.user,
        isCompleted: data.data.user.isCompleted ?? false, // Default to false if missing
      };

      console.log('[LoginFlow] User logged in successfully:', {
        userId: userData.id,
        email: userData.email,
        isCompleted: userData.isCompleted,
        hasAddresses: !!userData.addresses && userData.addresses.length > 0,
        timestamp: new Date().toISOString(),
      });

      // Update auth context with user data
      login(
        userData,
        data.data.token,
        data.data.refreshToken
      );

      // Reset form
      setEmail('');
      setPassword('');
      setError('');
      setIsLoading(false);

      // Close dialog
      onClose();
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : '16px',
          width: '100%',
          maxWidth: '480px',
          m: isMobile ? 0 : 2,
        },
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 16,
          top: 16,
          zIndex: 1,
          color: '#666',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <IconX size={24} />
      </IconButton>

      <DialogContent
        sx={{
          p: isMobile ? 3 : 4,
          pt: isMobile ? 8 : 6,
        }}
      >
        <Box
          component="form"
          onSubmit={(e) => handleSubmit(e)}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 2, textAlign: 'center' }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
              <Image
                src="/images/logo.png"
                alt="NikFoods Logo"
                width={180}
                height={60}
                style={{
                  width: 'auto',
                  height: isMobile ? '50px' : '60px',
                  maxWidth: isMobile ? '160px' : '180px',
                }}
              />
            </Box>
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: 28, sm: 32 },
                fontWeight: 800,
                color: '#1A1106',
                letterSpacing: '-0.5px',
                mb: 1,
              }}
            >
              Welcome Back
            </Typography>
            <Typography
              sx={{
                fontSize: 15,
                color: '#666',
                fontWeight: 400,
              }}
            >
              Sign in to continue to your account
            </Typography>
          </Box>

          {/* Error Message */}
          {error && (
            <Alert
              severity="error"
              sx={{
                borderRadius: '12px',
                '& .MuiAlert-message': {
                  width: '100%',
                },
              }}
            >
              {error}
            </Alert>
          )}

          {/* Email Input */}
          <TextField
            fullWidth
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            disabled={isLoading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconMail
                    size={20}
                    color={emailFocused ? '#FF9F0D' : '#666'}
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                height: 56,
                borderRadius: '12px',
                backgroundColor: emailFocused ? '#FFF9F2' : '#FAFAFA',
                transition: 'all 0.2s ease',
                '& fieldset': {
                  borderWidth: 2,
                  borderColor: '#E8E8E8',
                },
                '&:hover fieldset': {
                  borderColor: emailFocused ? '#FF9F0D' : '#D0D0D0',
                },
                '&.Mui-focused': {
                  backgroundColor: '#FFF9F2',
                  boxShadow: '0 0 0 4px rgba(255, 159, 13, 0.1)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#FF9F0D',
                },
              },
              '& input': {
                fontSize: 15,
                '&::placeholder': {
                  color: '#999',
                  opacity: 1,
                },
              },
            }}
          />

          {/* Password Input */}
          <Box>
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconLock
                      size={20}
                      color={passwordFocused ? '#FF9F0D' : '#666'}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: '#666' }}
                    >
                      {showPassword ? (
                        <IconEyeOff size={20} />
                      ) : (
                        <IconEye size={20} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 56,
                  borderRadius: '12px',
                  backgroundColor: passwordFocused ? '#FFF9F2' : '#FAFAFA',
                  transition: 'all 0.2s ease',
                  '& fieldset': {
                    borderWidth: 2,
                    borderColor: '#E8E8E8',
                  },
                  '&:hover fieldset': {
                    borderColor: passwordFocused ? '#FF9F0D' : '#D0D0D0',
                  },
                  '&.Mui-focused': {
                    backgroundColor: '#FFF9F2',
                    boxShadow: '0 0 0 4px rgba(255, 159, 13, 0.1)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#FF9F0D',
                  },
                },
                '& input': {
                  fontSize: 15,
                  '&::placeholder': {
                    color: '#999',
                    opacity: 1,
                  },
                },
              }}
            />

            {/* Forgot Password Link */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Link
                component="button"
                type="button"
                onClick={onSwitchToForgotPassword}
                underline="none"
                sx={{
                  fontSize: 14,
                  color: '#FF9F0D',
                  fontWeight: 600,
                  '&:hover': {
                    color: '#FF6B35',
                  },
                }}
              >
                Forgot Password?
              </Link>
            </Box>
          </Box>

          {/* Sign In Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading || !email || !password}
            sx={{
              height: 56,
              borderRadius: '12px',
              fontSize: 16,
              fontWeight: 700,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #FF9F0D 0%, #FF6B35 100%)',
              boxShadow: '0 6px 24px rgba(255, 159, 13, 0.4)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 32px rgba(255, 159, 13, 0.5)',
                background: 'linear-gradient(135deg, #FF9F0D 0%, #FF6B35 100%)',
              },
              '&:active': {
                transform: 'scale(0.98)',
              },
              '&.Mui-disabled': {
                background: '#E0E0E0',
                color: '#999',
                boxShadow: 'none',
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} sx={{ color: '#fff' }} />
            ) : (
              'Sign In'
            )}
          </Button>

          {/* Sign Up Link */}
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Typography
              sx={{
                fontSize: 14,
                color: '#666',
              }}
            >
              Don&apos;t have an account?{' '}
              <Link
                component="button"
                type="button"
                onClick={onSwitchToSignup}
                underline="none"
                sx={{
                  color: '#FF9F0D',
                  fontWeight: 700,
                  '&:hover': {
                    color: '#FF6B35',
                  },
                }}
              >
                Sign up
              </Link>
            </Typography>
          </Box>

          {/* Terms and Policy Links */}
          <Box
            sx={{
              textAlign: 'center',
              mt: 2,
              pt: 2,
              borderTop: '1px solid #F0F0F0',
            }}
          >
            <Typography
              sx={{
                fontSize: 12,
                color: '#999',
                lineHeight: 1.6,
              }}
            >
              By continuing, you agree to our{' '}
              <Link
                href="/terms"
                underline="none"
                sx={{
                  color: '#666',
                  fontWeight: 600,
                  '&:hover': {
                    color: '#FF9F0D',
                  },
                }}
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                underline="none"
                sx={{
                  color: '#666',
                  fontWeight: 600,
                  '&:hover': {
                    color: '#FF9F0D',
                  },
                }}
              >
                Privacy Policy
              </Link>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

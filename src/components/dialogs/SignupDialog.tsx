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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconX,
  IconUser,
  IconPhone,
} from '@tabler/icons-react';
import { useApiClient } from '@/hooks/useApiClient';
import { useAuth } from '@/contexts/AuthContext';
import { validatePassword } from '@/lib/password';
import PasswordRequirements from '@/components/common/PasswordRequirements';

interface SignupDialogProps {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

export default function SignupDialog({
  open,
  onClose,
  onSwitchToLogin,
}: SignupDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { authenticatedFetch } = useApiClient();
  const { login } = useAuth();

  // Step 1 fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptPrivacyPolicy, setAcceptPrivacyPolicy] = useState(false);
  const [acceptNotifications, setAcceptNotifications] = useState(false);

  // Focus states
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateStep1 = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      newErrors.password =
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
    }

    if (!acceptPrivacyPolicy) {
      newErrors.privacyPolicy = 'You must accept the Privacy Policy to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: `${firstName} ${lastName}`.trim(),
          email,
          password,
          phone,
          acceptPrivacyPolicy,
          acceptNotifications,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.error || 'Signup failed' });
        return;
      }

      // Auto-login user after successful signup
      const { user, token, refreshToken } = data.data;
      login(user, token, refreshToken);

      // Store tokens in localStorage for backward compatibility
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      // Log successful signup
      console.log('Signup completed successfully, user logged in');

      // Close dialog immediately
      onClose();
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setAcceptPrivacyPolicy(false);
    setAcceptNotifications(false);
    setErrors({});
    onClose();
  };

  const handleSwitchToLogin = () => {
    handleClose();
    onSwitchToLogin?.();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
      {/* Header */}
      <Box
        sx={{
          px: isMobile ? 3 : 4,
          pt: isMobile ? 8 : 6,
          pb: 2,
          borderBottom: '1px solid #F0F0F0',
          textAlign: 'center',
        }}
      >
        <IconButton
          onClick={handleClose}
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

        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
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
            fontSize: { xs: 14, sm: 16 },
            fontWeight: 800,
            color: '#1A1106',
            letterSpacing: '-0.5px',
            mb: 1,
          }}
        >
          Create Account
        </Typography>
        <Typography
          sx={{
            fontSize: 15,
            color: '#666',
            fontWeight: 400,
          }}
        >
          Sign up to get started with your account
        </Typography>
      </Box>

      <DialogContent
        sx={{
          p: isMobile ? 3 : 4,
        }}
      >
        <Box
          component="form"
          onSubmit={handleStep1Submit}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
          }}
        >
            {/* First Name and Last Name Inputs */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              {/* First Name Input */}
              <TextField
                fullWidth
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (errors.firstName) {
                    setErrors({ ...errors, firstName: '' });
                  }
                }}
                onFocus={() => setFirstNameFocused(true)}
                onBlur={() => setFirstNameFocused(false)}
                error={!!errors.firstName}
                helperText={errors.firstName}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconUser
                        size={20}
                        color={firstNameFocused ? '#FF9F0D' : '#666'}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 56,
                    borderRadius: '12px',
                    backgroundColor: firstNameFocused ? '#FFF9F2' : '#FAFAFA',
                    transition: 'all 0.2s ease',
                    '& fieldset': {
                      borderWidth: 2,
                      borderColor: errors.firstName ? '#f44336' : '#E8E8E8',
                    },
                    '&:hover fieldset': {
                      borderColor: errors.firstName
                        ? '#f44336'
                        : firstNameFocused
                        ? '#FF9F0D'
                        : '#D0D0D0',
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#FFF9F2',
                      boxShadow: '0 0 0 4px rgba(255, 159, 13, 0.1)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: errors.firstName ? '#f44336' : '#FF9F0D',
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

              {/* Last Name Input */}
              <TextField
                fullWidth
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (errors.lastName) {
                    setErrors({ ...errors, lastName: '' });
                  }
                }}
                onFocus={() => setLastNameFocused(true)}
                onBlur={() => setLastNameFocused(false)}
                error={!!errors.lastName}
                helperText={errors.lastName}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconUser
                        size={20}
                        color={lastNameFocused ? '#FF9F0D' : '#666'}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 56,
                    borderRadius: '12px',
                    backgroundColor: lastNameFocused ? '#FFF9F2' : '#FAFAFA',
                    transition: 'all 0.2s ease',
                    '& fieldset': {
                      borderWidth: 2,
                      borderColor: errors.lastName ? '#f44336' : '#E8E8E8',
                    },
                    '&:hover fieldset': {
                      borderColor: errors.lastName
                        ? '#f44336'
                        : lastNameFocused
                        ? '#FF9F0D'
                        : '#D0D0D0',
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#FFF9F2',
                      boxShadow: '0 0 0 4px rgba(255, 159, 13, 0.1)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: errors.lastName ? '#f44336' : '#FF9F0D',
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
            </Box>

            {/* Email Input */}
            <TextField
              fullWidth
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors({ ...errors, email: '' });
                }
              }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              error={!!errors.email}
              helperText={errors.email}
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
                    borderColor: errors.email ? '#f44336' : '#E8E8E8',
                  },
                  '&:hover fieldset': {
                    borderColor: errors.email
                      ? '#f44336'
                      : emailFocused
                      ? '#FF9F0D'
                      : '#D0D0D0',
                  },
                  '&.Mui-focused': {
                    backgroundColor: '#FFF9F2',
                    boxShadow: '0 0 0 4px rgba(255, 159, 13, 0.1)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: errors.email ? '#f44336' : '#FF9F0D',
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
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors({ ...errors, password: '' });
                }
              }}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              error={!!errors.password}
              helperText={errors.password}
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
                    borderColor: errors.password ? '#f44336' : '#E8E8E8',
                  },
                  '&:hover fieldset': {
                    borderColor: errors.password
                      ? '#f44336'
                      : passwordFocused
                      ? '#FF9F0D'
                      : '#D0D0D0',
                  },
                  '&.Mui-focused': {
                    backgroundColor: '#FFF9F2',
                    boxShadow: '0 0 0 4px rgba(255, 159, 13, 0.1)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: errors.password ? '#f44336' : '#FF9F0D',
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

            {/* Password Requirements */}
            <PasswordRequirements password={password} />

            {/* Phone Input (Optional) */}
            <TextField
              fullWidth
              type="tel"
              placeholder="Phone Number (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              inputProps={{ maxLength: 10 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconPhone
                      size={20}
                      color={phoneFocused ? '#FF9F0D' : '#666'}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 56,
                  borderRadius: '12px',
                  backgroundColor: phoneFocused ? '#FFF9F2' : '#FAFAFA',
                  transition: 'all 0.2s ease',
                  '& fieldset': {
                    borderWidth: 2,
                    borderColor: '#E8E8E8',
                  },
                  '&:hover fieldset': {
                    borderColor: phoneFocused ? '#FF9F0D' : '#D0D0D0',
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

            {/* Privacy Policy Checkbox (Required) */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptPrivacyPolicy}
                  onChange={(e) => {
                    setAcceptPrivacyPolicy(e.target.checked);
                    if (errors.privacyPolicy) {
                      setErrors({ ...errors, privacyPolicy: '' });
                    }
                  }}
                  sx={{
                    color: errors.privacyPolicy ? '#f44336' : '#666',
                    '&.Mui-checked': {
                      color: '#FF9F0D',
                    },
                    '&.MuiCheckbox-root': {
                      transition: 'all 0.2s ease',
                    },
                  }}
                />
              }
              label={
                <Typography
                  sx={{
                    fontSize: 14,
                    color: '#333',
                    fontWeight: 500,
                  }}
                >
                  I accept the{' '}
                  <Link
                    href="/privacy"
                    underline="none"
                    sx={{
                      color: '#FF9F0D',
                      fontWeight: 600,
                      '&:hover': {
                        color: '#FF6B35',
                      },
                    }}
                  >
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/terms"
                    underline="none"
                    sx={{
                      color: '#FF9F0D',
                      fontWeight: 600,
                      '&:hover': {
                        color: '#FF6B35',
                      },
                    }}
                  >
                    Terms of Service
                  </Link>
                </Typography>
              }
              sx={{
                alignItems: 'center',
                margin: 0,
                ml: -1,
              }}
            />
            {errors.privacyPolicy && (
              <Typography
                sx={{
                  fontSize: 12,
                  color: '#f44336',
                  mt: -1.5,
                  mb: 1,
                  ml: 3.5,
                }}
              >
                {errors.privacyPolicy}
              </Typography>
            )}

            {/* Notifications Consent Checkbox (Optional) */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={acceptNotifications}
                  onChange={(e) => setAcceptNotifications(e.target.checked)}
                  sx={{
                    color: '#666',
                    '&.Mui-checked': {
                      color: '#FF9F0D',
                    },
                    '&.MuiCheckbox-root': {
                      transition: 'all 0.2s ease',
                    },
                  }}
                />
              }
              label={
                <Typography
                  sx={{
                    fontSize: 14,
                    color: '#333',
                    fontWeight: 400,
                  }}
                >
                  I consent to receive ordering notifications via email and phone
                  <Typography
                    component="span"
                    sx={{
                      fontSize: 12,
                      color: '#999',
                      fontWeight: 400,
                      display: 'block',
                    }}
                  >
                    (optional)
                  </Typography>
                </Typography>
              }
              sx={{
                alignItems: 'flex-start',
                margin: 0,
                ml: -1,
              }}
            />

            {/* General Error Message */}
            {errors.general && (
              <Box
                sx={{
                  p: 2,
                  backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                }}
              >
                <Typography
                  sx={{
                    fontSize: 14,
                    color: '#f44336',
                    textAlign: 'center',
                  }}
                >
                  {errors.general}
                </Typography>
              </Box>
            )}

            {/* Sign Up Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
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
                  background:
                    'linear-gradient(135deg, #FF9F0D 0%, #FF6B35 100%)',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
                '&:disabled': {
                  background: 'linear-gradient(135deg, #ccc 0%, #999 100%)',
                  boxShadow: 'none',
                },
              }}
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Button>

            {/* Sign In Link */}
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Typography
                sx={{
                  fontSize: 14,
                  color: '#666',
                }}
              >
                Already have an account?{' '}
                <Link
                  component="button"
                  type="button"
                  onClick={handleSwitchToLogin}
                  underline="none"
                  sx={{
                    color: '#FF9F0D',
                    fontWeight: 700,
                    '&:hover': {
                      color: '#FF6B35',
                    },
                  }}
                >
                  Sign in
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

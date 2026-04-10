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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  IconMail,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconLock,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import { validatePassword } from '@/lib/password';

interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

export default function ForgotPasswordDialog({
  open,
  onClose,
  onSwitchToLogin,
}: ForgotPasswordDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Step management (1: email, 2: OTP, 3: new password, 4: success/error)
  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(true);

  // Form fields
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Focus states
  const [emailFocused, setEmailFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Visibility states
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateOtp = (otp: string): boolean => {
    return /^\d{6}$/.test(otp);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      setApiError('');

      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
          setApiError(data.error || 'Failed to send OTP. Please try again.');
          setIsLoading(false);
          return;
        }

        setCurrentStep(2);
      } catch (error) {
        console.error('Error sending OTP:', error);
        setApiError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!otp.trim()) {
      newErrors.otp = 'OTP is required';
    } else if (!validateOtp(otp)) {
      newErrors.otp = 'Please enter a valid 6-digit OTP';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      setApiError('');

      try {
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, otp }),
        });

        const data = await response.json();

        if (!response.ok) {
          setApiError(data.error || 'Invalid OTP. Please try again.');
          setIsLoading(false);
          return;
        }

        // Store reset token and move to password reset step
        setResetToken(data.resetToken);
        setCurrentStep(3);
      } catch (error) {
        console.error('Error verifying OTP:', error);
        setApiError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!newPassword) {
      newErrors.newPassword = 'Password is required';
    } else if (!validatePassword(newPassword)) {
      newErrors.newPassword =
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsLoading(true);
      setApiError('');

      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: resetToken, password: newPassword }),
        });

        const data = await response.json();

        if (!response.ok) {
          setApiError(data.error || 'Failed to reset password. Please try again.');
          setIsLoading(false);
          return;
        }

        // Success - move to final step
        setIsSuccess(true);
        setCurrentStep(4);
      } catch (error) {
        console.error('Error resetting password:', error);
        setApiError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setApiError('');
    setOtp('');
    setErrors({});

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error || 'Failed to resend OTP. Please try again.');
      } else {
        setApiError('');
        // Show a brief success message (optional)
        setTimeout(() => setApiError(''), 3000);
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      setApiError('Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setCurrentStep(1);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
    setErrors({});
    setApiError('');
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
    setOtp('');
    setErrors({});
    setApiError('');
  };

  const handleClose = () => {
    // Reset form
    setCurrentStep(1);
    setEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
    setErrors({});
    setApiError('');
    setIsSuccess(true);
    onClose();
  };

  const handleSwitchToLogin = () => {
    handleClose();
    onSwitchToLogin?.();
  };

  const getHeaderTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Forgot Password';
      case 2:
        return 'Verify OTP';
      case 3:
        return 'Set New Password';
      case 4:
        return isSuccess ? 'Success!' : 'Reset Failed';
      default:
        return 'Forgot Password';
    }
  };

  const getHeaderSubtitle = () => {
    switch (currentStep) {
      case 1:
        return 'Enter your email to reset password';
      case 2:
        return 'Enter the code sent to your email';
      case 3:
        return 'Choose a strong password for your account';
      case 4:
        return isSuccess
          ? 'Your password has been reset successfully'
          : 'Failed to reset password. Please try again';
      default:
        return '';
    }
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
            fontSize: { xs: 20, sm: 24 },
            fontWeight: 800,
            color: '#1A1106',
            letterSpacing: '-0.5px',
            mb: 1,
          }}
        >
          {getHeaderTitle()}
        </Typography>
        <Typography
          sx={{
            fontSize: 15,
            color: '#666',
            fontWeight: 400,
          }}
        >
          {getHeaderSubtitle()}
        </Typography>
      </Box>

      <DialogContent
        sx={{
          p: isMobile ? 3 : 4,
        }}
      >
        {/* Step 1: Email */}
        {currentStep === 1 && (
          <Box
            component="form"
            onSubmit={handleEmailSubmit}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }}
          >
            {/* API Error */}
            {apiError && (
              <Alert severity="error" sx={{ borderRadius: '12px' }}>
                {apiError}
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
                if (errors.email) {
                  setErrors({ ...errors, email: '' });
                }
                if (apiError) setApiError('');
              }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              error={!!errors.email}
              helperText={errors.email}
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

            {/* Send OTP Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading || !email}
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
                'Send OTP'
              )}
            </Button>

            {/* Back to Sign In Link */}
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Typography
                sx={{
                  fontSize: 14,
                  color: '#666',
                }}
              >
                Remember your password?{' '}
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
          </Box>
        )}

        {/* Step 2: OTP Verification */}
        {currentStep === 2 && (
          <Box
            component="form"
            onSubmit={handleOtpSubmit}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }}
          >
            {/* API Error */}
            {apiError && (
              <Alert severity="error" sx={{ borderRadius: '12px' }}>
                {apiError}
              </Alert>
            )}

            {/* Email Display */}
            <Box
              sx={{
                textAlign: 'center',
                py: 2,
                px: 3,
                backgroundColor: '#FFF9F2',
                borderRadius: '12px',
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  color: '#666',
                  mb: 0.5,
                }}
              >
                Code sent to
              </Typography>
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#FF9F0D',
                }}
              >
                {email}
              </Typography>
            </Box>

            {/* OTP Input */}
            <TextField
              fullWidth
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(value);
                if (errors.otp) {
                  setErrors({ ...errors, otp: '' });
                }
                if (apiError) setApiError('');
              }}
              onFocus={() => setOtpFocused(true)}
              onBlur={() => setOtpFocused(false)}
              error={!!errors.otp}
              helperText={errors.otp}
              disabled={isLoading}
              inputProps={{
                maxLength: 6,
                style: {
                  textAlign: 'center',
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: 8,
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 64,
                  borderRadius: '12px',
                  backgroundColor: otpFocused ? '#FFF9F2' : '#FAFAFA',
                  transition: 'all 0.2s ease',
                  '& fieldset': {
                    borderWidth: 2,
                    borderColor: errors.otp ? '#f44336' : '#E8E8E8',
                  },
                  '&:hover fieldset': {
                    borderColor: errors.otp
                      ? '#f44336'
                      : otpFocused
                      ? '#FF9F0D'
                      : '#D0D0D0',
                  },
                  '&.Mui-focused': {
                    backgroundColor: '#FFF9F2',
                    boxShadow: '0 0 0 4px rgba(255, 159, 13, 0.1)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: errors.otp ? '#f44336' : '#FF9F0D',
                  },
                },
              }}
            />

            {/* Resend OTP Link */}
            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading}
                underline="none"
                sx={{
                  fontSize: 14,
                  color: '#666',
                  fontWeight: 600,
                  '&:hover': {
                    color: '#FF9F0D',
                  },
                  '&:disabled': {
                    color: '#ccc',
                    cursor: 'not-allowed',
                  },
                }}
              >
                Didn&apos;t receive code? Resend OTP
              </Link>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                type="button"
                onClick={handleBackToStep1}
                fullWidth
                variant="outlined"
                disabled={isLoading}
                sx={{
                  height: 56,
                  borderRadius: '12px',
                  fontSize: 16,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderWidth: 2,
                  borderColor: '#E8E8E8',
                  color: '#666',
                  '&:hover': {
                    borderWidth: 2,
                    borderColor: '#FF9F0D',
                    backgroundColor: 'rgba(255, 159, 13, 0.04)',
                  },
                }}
              >
                Back
              </Button>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading || otp.length !== 6}
                sx={{
                  height: 56,
                  borderRadius: '12px',
                  fontSize: 16,
                  fontWeight: 700,
                  textTransform: 'none',
                  background:
                    'linear-gradient(135deg, #FF9F0D 0%, #FF6B35 100%)',
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
                  'Verify OTP'
                )}
              </Button>
            </Box>
          </Box>
        )}

        {/* Step 3: New Password */}
        {currentStep === 3 && (
          <Box
            component="form"
            onSubmit={handlePasswordSubmit}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }}
          >
            {/* API Error */}
            {apiError && (
              <Alert severity="error" sx={{ borderRadius: '12px' }}>
                {apiError}
              </Alert>
            )}

            {/* New Password Input */}
            <TextField
              fullWidth
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) {
                  setErrors({ ...errors, newPassword: '' });
                }
                if (apiError) setApiError('');
              }}
              onFocus={() => setNewPasswordFocused(true)}
              onBlur={() => setNewPasswordFocused(false)}
              error={!!errors.newPassword}
              helperText={errors.newPassword}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconLock
                      size={20}
                      color={newPasswordFocused ? '#FF9F0D' : '#666'}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                      sx={{ color: '#666' }}
                    >
                      {showNewPassword ? (
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
                  backgroundColor: newPasswordFocused ? '#FFF9F2' : '#FAFAFA',
                  transition: 'all 0.2s ease',
                  '& fieldset': {
                    borderWidth: 2,
                    borderColor: errors.newPassword ? '#f44336' : '#E8E8E8',
                  },
                  '&:hover fieldset': {
                    borderColor: errors.newPassword
                      ? '#f44336'
                      : newPasswordFocused
                      ? '#FF9F0D'
                      : '#D0D0D0',
                  },
                  '&.Mui-focused': {
                    backgroundColor: '#FFF9F2',
                    boxShadow: '0 0 0 4px rgba(255, 159, 13, 0.1)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: errors.newPassword ? '#f44336' : '#FF9F0D',
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

            {/* Confirm Password Input */}
            <TextField
              fullWidth
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: '' });
                }
                if (apiError) setApiError('');
              }}
              onFocus={() => setConfirmPasswordFocused(true)}
              onBlur={() => setConfirmPasswordFocused(false)}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconLock
                      size={20}
                      color={confirmPasswordFocused ? '#FF9F0D' : '#666'}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      edge="end"
                      sx={{ color: '#666' }}
                    >
                      {showConfirmPassword ? (
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
                  backgroundColor: confirmPasswordFocused
                    ? '#FFF9F2'
                    : '#FAFAFA',
                  transition: 'all 0.2s ease',
                  '& fieldset': {
                    borderWidth: 2,
                    borderColor: errors.confirmPassword ? '#f44336' : '#E8E8E8',
                  },
                  '&:hover fieldset': {
                    borderColor: errors.confirmPassword
                      ? '#f44336'
                      : confirmPasswordFocused
                      ? '#FF9F0D'
                      : '#D0D0D0',
                  },
                  '&.Mui-focused': {
                    backgroundColor: '#FFF9F2',
                    boxShadow: '0 0 0 4px rgba(255, 159, 13, 0.1)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: errors.confirmPassword
                      ? '#f44336'
                      : '#FF9F0D',
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
            <Box
              sx={{
                backgroundColor: '#F0F9FF',
                borderRadius: '12px',
                p: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1A1106',
                  mb: 1,
                }}
              >
                Password must contain:
              </Typography>
              <List dense sx={{ p: 0 }}>
                <ListItem sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <IconCheck size={16} color="#2196F3" />
                  </ListItemIcon>
                  <ListItemText
                    primary="At least 8 characters"
                    primaryTypographyProps={{
                      fontSize: 13,
                      color: '#0066B2',
                    }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <IconCheck size={16} color="#2196F3" />
                  </ListItemIcon>
                  <ListItemText
                    primary="One uppercase letter"
                    primaryTypographyProps={{
                      fontSize: 13,
                      color: '#0066B2',
                    }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <IconCheck size={16} color="#2196F3" />
                  </ListItemIcon>
                  <ListItemText
                    primary="One lowercase letter"
                    primaryTypographyProps={{
                      fontSize: 13,
                      color: '#0066B2',
                    }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <IconCheck size={16} color="#2196F3" />
                  </ListItemIcon>
                  <ListItemText
                    primary="One number"
                    primaryTypographyProps={{
                      fontSize: 13,
                      color: '#0066B2',
                    }}
                  />
                </ListItem>
                <ListItem sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <IconCheck size={16} color="#2196F3" />
                  </ListItemIcon>
                  <ListItemText
                    primary="One special character (!@#$%^&*()_+)"
                    primaryTypographyProps={{
                      fontSize: 13,
                      color: '#0066B2',
                    }}
                  />
                </ListItem>
              </List>
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading || !newPassword || !confirmPassword}
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
                'Reset Password'
              )}
            </Button>
          </Box>
        )}

        {/* Step 4: Success/Error */}
        {currentStep === 4 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              py: 3,
            }}
          >
            {/* Success/Error Icon */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isSuccess
                  ? 'rgba(76, 175, 80, 0.1)'
                  : 'rgba(244, 67, 54, 0.1)',
              }}
            >
              {isSuccess ? (
                <IconCheck size={48} color="#4caf50" strokeWidth={3} />
              ) : (
                <IconAlertCircle size={48} color="#f44336" strokeWidth={3} />
              )}
            </Box>

            {/* Message */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: isSuccess ? '#4caf50' : '#f44336',
                  mb: 1,
                }}
              >
                {isSuccess ? 'Password Reset Successful!' : 'Reset Failed'}
              </Typography>
              <Typography
                sx={{
                  fontSize: 14,
                  color: '#666',
                  lineHeight: 1.6,
                }}
              >
                {isSuccess
                  ? 'You can now sign in with your new password'
                  : 'Failed to reset your password. Please try again'}
              </Typography>
            </Box>

            {/* Action Button */}
            <Button
              onClick={isSuccess ? handleSwitchToLogin : handleTryAgain}
              fullWidth
              variant="contained"
              sx={{
                height: 56,
                borderRadius: '12px',
                fontSize: 16,
                fontWeight: 700,
                textTransform: 'none',
                background: isSuccess
                  ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
                  : 'linear-gradient(135deg, #FF9F0D 0%, #FF6B35 100%)',
                boxShadow: isSuccess
                  ? '0 6px 24px rgba(76, 175, 80, 0.4)'
                  : '0 6px 24px rgba(255, 159, 13, 0.4)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: isSuccess
                    ? '0 8px 32px rgba(76, 175, 80, 0.5)'
                    : '0 8px 32px rgba(255, 159, 13, 0.5)',
                  background: isSuccess
                    ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
                    : 'linear-gradient(135deg, #FF9F0D 0%, #FF6B35 100%)',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
              }}
            >
              {isSuccess ? 'Back to Sign In' : 'Try Again'}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

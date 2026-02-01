import { z } from 'zod';
import { PASSWORD_REGEX } from '@/lib/password';

/**
 * Validation schema for Step 1 of signup (basic profile)
 */
export const signupStep1Schema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').transform(val => val.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      PASSWORD_REGEX,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  phone: z.string().optional(),
});

/**
 * Validation schema for login
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').transform(val => val.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Validation schema for forgot password (email step)
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').transform(val => val.toLowerCase().trim()),
});

/**
 * Validation schema for verify OTP
 */
export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address').transform(val => val.toLowerCase().trim()),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

/**
 * Validation schema for reset password
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      PASSWORD_REGEX,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
});

// Type exports for TypeScript
export type SignupStep1Input = z.infer<typeof signupStep1Schema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

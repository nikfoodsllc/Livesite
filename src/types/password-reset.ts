// Using string instead of ObjectId to avoid bundling MongoDB in client components
// On the server side, this maps to MongoDB ObjectId type
export type ObjectId = string;

/**
 * Password Reset Document Interface
 */
export interface IPasswordReset {
  _id?: ObjectId;
  email: string;
  otp: string; // Hashed OTP
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}

/**
 * Forgot Password Request
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Forgot Password Response
 */
export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

/**
 * Verify OTP Request
 */
export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

/**
 * Verify OTP Response
 */
export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  resetToken?: string;
}

/**
 * Reset Password Request
 */
export interface ResetPasswordRequest {
  token: string;
  password: string;
}

/**
 * Reset Password Response
 */
export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

/**
 * JWT Reset Token Payload
 */
export interface ResetTokenPayload {
  email: string;
  passwordResetId: string;
  type: 'password-reset';
  iat?: number;
  exp?: number;
}

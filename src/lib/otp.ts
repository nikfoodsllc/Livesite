import bcrypt from 'bcryptjs';

/**
 * Generate a 6-digit OTP (100000-999999)
 */
export function generateOTP(): string {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}

/**
 * Hash OTP using bcrypt
 */
export async function hashOTP(otp: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(otp, saltRounds);
}

/**
 * Verify OTP against hashed OTP
 */
export async function verifyOTP(
  otp: string,
  hashedOTP: string
): Promise<boolean> {
  return await bcrypt.compare(otp, hashedOTP);
}

/**
 * Get OTP expiry time (10 minutes from now)
 */
export function getOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
}

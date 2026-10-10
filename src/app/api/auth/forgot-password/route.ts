import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { generateOTP, hashOTP, getOTPExpiry } from '@/lib/otp';
import { sendPasswordResetOTP } from '@/lib/email';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import { IUser } from '@/types/auth';
import { IPasswordReset } from '@/types/password-reset';
import { clientIp, consume, tooManyMessage } from '@/lib/server/authRateLimit';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request data
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // At most 3 codes an hour per email and 10 per address: counted whether or not the
    // account exists, so a code cannot be guessed by asking for fresh ones again and again
    const limited = await consume([
      { key: `forgot:email:${normalizedEmail}`, max: 3, windowSec: 3600 },
      { key: `forgot:ip:${clientIp(request)}`, max: 10, windowSec: 3600 },
    ]);
    if (!limited.ok) {
      return NextResponse.json(
        { error: tooManyMessage(limited.retryAfterSec) },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
      );
    }

    // The answer is the same whether or not there is an account (nothing to learn about who is registered)
    const sameAnswer = NextResponse.json(
      {
        success: true,
        message: 'If there is an account for this email, a verification code is on its way.',
      },
      { status: 200 }
    );

    const userResult = await db.readOne<IUser>('users', { email: normalizedEmail });
    if (!userResult.success || !userResult.data) return sameAnswer;

    const user = userResult.data;

    // Social-login accounts have no password to reset
    if (user.provider !== 'credentials') return sameAnswer;

    // Generate OTP
    const otp = generateOTP();

    // Hash OTP
    const hashedOTP = await hashOTP(otp);

    // Delete any existing password reset requests for this email
    await db.delete('passwordresets', { email: normalizedEmail });

    // Create new password reset request
    const passwordReset: Omit<IPasswordReset, '_id'> = {
      email: normalizedEmail,
      otp: hashedOTP,
      createdAt: new Date(),
      expiresAt: getOTPExpiry(),
      attempts: 0,
      verified: false,
    };

    await db.create<IPasswordReset>('passwordresets', passwordReset);

    // Send OTP email
    const emailResult = await sendPasswordResetOTP(normalizedEmail, otp);

    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    return sameAnswer;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

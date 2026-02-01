import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { generateOTP, hashOTP, getOTPExpiry } from '@/lib/otp';
import { sendPasswordResetOTP } from '@/lib/email';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import { IUser } from '@/types/auth';
import { IPasswordReset } from '@/types/password-reset';

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

    // Check if user exists
    const userResult = await db.readOne<IUser>('users', { email: normalizedEmail });

    // If user doesn't exist, return error immediately
    if (!userResult.success || !userResult.data) {
      return NextResponse.json(
        { error: 'No account found with this email address. Please check your email or sign up for a new account.' },
        { status: 404 }
      );
    }

    const user = userResult.data;

    // Check if user uses credentials provider (not social login)
    if (user.provider !== 'credentials') {
      return NextResponse.json(
        { error: 'This account uses social login. Password reset is not available for social login accounts.' },
        { status: 400 }
      );
    }

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

    // Return success message
    return NextResponse.json(
      {
        success: true,
        message: 'A verification code has been sent to your email address.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

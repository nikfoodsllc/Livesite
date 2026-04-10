import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { verifyOTP } from '@/lib/otp';
import { verifyOtpSchema } from '@/lib/validations/auth';
import { IPasswordReset, ResetTokenPayload } from '@/types/password-reset';
import jwt from 'jsonwebtoken';

const MAX_ATTEMPTS = 3;

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request data
    const validation = verifyOtpSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, otp } = validation.data;

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Find the most recent non-expired password reset request
    const result = await db.readOne<IPasswordReset>('passwordresets', {
      email: normalizedEmail,
      expiresAt: { $gt: new Date() },
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: 'No password reset request found or OTP has expired. Please request a new one.' },
        { status: 404 }
      );
    }

    const passwordReset = result.data;

    // Check if max attempts reached
    if (passwordReset.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          error: `Maximum verification attempts (${MAX_ATTEMPTS}) reached. Please request a new OTP.`,
        },
        { status: 429 }
      );
    }

    // Verify OTP
    const isValid = await verifyOTP(otp, passwordReset.otp);

    if (!isValid) {
      // Increment attempts
      await db.updateOne(
        'passwordresets',
        { _id: passwordReset._id as any },
        { $inc: { attempts: 1 } }
      );

      const remainingAttempts = MAX_ATTEMPTS - (passwordReset.attempts + 1);

      return NextResponse.json(
        {
          error: `Invalid OTP. ${remainingAttempts} attempt${
            remainingAttempts !== 1 ? 's' : ''
          } remaining.`,
        },
        { status: 401 }
      );
    }

    // Mark as verified
    await db.updateOne(
      'passwordresets',
      { _id: passwordReset._id as any },
      { $set: { verified: true } }
    );

    // Generate reset token (15 minutes expiry)
    const passwordResetId = passwordReset._id?.toString() || '';
    const payload: ResetTokenPayload = {
      email: normalizedEmail,
      passwordResetId,
      type: 'password-reset',
    };

    // Use JWT to create token with 15-minute expiry
    const resetToken = jwt.sign(payload, process.env.PRIVATE_KEY || 'default-jwt-secret-key-change-in-production', {
      expiresIn: '15m',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'OTP verified successfully',
        resetToken,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

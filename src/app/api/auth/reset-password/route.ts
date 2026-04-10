import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { hashPassword } from '@/lib/password';
import { sendPasswordResetConfirmation } from '@/lib/email';
import { resetPasswordSchema } from '@/lib/validations/auth';
import { IUser } from '@/types/auth';
import { IPasswordReset, ResetTokenPayload } from '@/types/password-reset';
import { ObjectId as MongoObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

// Force dynamic rendering to prevent build-time data collection
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request data
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    // Verify JWT token
    let decoded: ResetTokenPayload;
    try {
      decoded = jwt.verify(
        token,
        process.env.PRIVATE_KEY || process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production'
      ) as ResetTokenPayload;
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 401 }
      );
    }

    // Check token type
    if (decoded.type !== 'password-reset') {
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 401 }
      );
    }

    const { email, passwordResetId } = decoded;

    // Verify password reset record exists and is verified
    const resetResult = await db.readOne<IPasswordReset>('passwordresets', {
      _id: new MongoObjectId(passwordResetId),
    } as any);

    if (!resetResult.success || !resetResult.data) {
      return NextResponse.json(
        { error: 'Password reset request not found' },
        { status: 404 }
      );
    }

    const passwordReset = resetResult.data;

    // Check if verified
    if (!passwordReset.verified) {
      return NextResponse.json(
        { error: 'OTP not verified. Please verify OTP first.' },
        { status: 401 }
      );
    }

    // Check if expired
    if (new Date() > new Date(passwordReset.expiresAt)) {
      return NextResponse.json(
        { error: 'Password reset request has expired. Please request a new one.' },
        { status: 401 }
      );
    }

    // Find user
    const userResult = await db.readOne<IUser>('users', { email });

    if (!userResult.success || !userResult.data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.data;

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update user password
    await db.updateOne(
      'users',
      { _id: user._id as any },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      }
    );

    // Delete all password reset records for this email (cleanup)
    await db.delete('passwordresets', { email });

    // Send confirmation email
    const emailResult = await sendPasswordResetConfirmation(email);

    if (!emailResult.success) {
      console.error(
        'Failed to send password reset confirmation:',
        emailResult.error
      );
      // Continue anyway - password was successfully reset
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Password reset successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

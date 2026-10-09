import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { IUser } from '@/types/auth';
import { ObjectId as MongoObjectId, Filter } from 'mongodb';
import { validateUSPhone } from '@/utils/validation';
import { getSmsConsent, setSmsConsent } from '@/lib/server/smsService';
import { normalizeUsPhone } from '@/lib/server/userPhone';

// GET /api/account/profile - Get user profile
export async function GET(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Extract token after "Bearer "

    // Verify JWT token
    const decoded = jwtHandler.verifyToken(token);

    if (!decoded.success || !decoded.payload) {
      return NextResponse.json(
        { error: decoded.error || 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.payload.userId;

    // Get user from database
    const userResult = await db.readOne<IUser>('users', {
      _id: new MongoObjectId(userId),
    } as unknown as Filter<IUser>);

    if (!userResult.success || !userResult.data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.data;

    // Return user profile (exclude password)
    return NextResponse.json({
          success: true,
          data: {
            id: user._id!.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone,
            smsOptedIn: Boolean((user as unknown as { smsConsent?: { optedIn?: boolean } }).smsConsent?.optedIn),
            role: user.role,
            isCompleted: user.isCompleted,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
  }
}

// PUT /api/account/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Extract token after "Bearer "

    // Verify JWT token
    const decoded = jwtHandler.verifyToken(token);

    if (!decoded.success || !decoded.payload) {
      return NextResponse.json(
        { error: decoded.error || 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.payload.userId;

    // Parse request body
    const body = await request.json();
    const { name, phone } = body;

    // Validate name
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Validate phone if provided
    if (phone && !validateUSPhone(phone).valid) {
      return NextResponse.json(
        { error: 'Phone number must be 10 digits' },
        { status: 400 }
      );
    }

    // Update user
    const updateData: {
      name: string;
      updatedAt: Date;
      phone?: string;
    } = {
      name: name.trim(),
      updatedAt: new Date(),
    };

    if (phone) {
      updateData.phone = phone.trim();
    }

    const updateResult = await db.updateOne(
      'users',
      { _id: new MongoObjectId(userId) } as unknown as Filter<IUser>,
      { $set: updateData }
    );

    if (!updateResult.success) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // text messages were agreed for the OLD number: a new number must agree again
    if (phone) {
      try {
        const consent = await getSmsConsent(userId);
        if (consent?.optedIn && normalizeUsPhone(phone) !== normalizeUsPhone(consent.phone)) {
          await setSmsConsent(userId, { optedIn: false, source: 'profile' });
        }
      } catch (smsError) {
        console.warn('[sms] could not update the text-message choice', smsError instanceof Error ? smsError.message : smsError);
      }
    }

    // Get updated user
    const userResult = await db.readOne<IUser>('users', {
      _id: new MongoObjectId(userId),
    } as unknown as Filter<IUser>);

    if (!userResult.success || !userResult.data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.data;

    return NextResponse.json({
          success: true,
          message: 'Profile updated successfully',
          data: {
            id: user._id!.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isCompleted: user.isCompleted,
          },
        });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
  }
}

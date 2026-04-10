import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { IUser } from '@/types/auth';
import { ObjectId as MongoObjectId, Filter } from 'mongodb';

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
    if (phone && !/^[+]?[\d\s()-]{7,}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
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

import { NextRequest } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { hashPassword } from '@/lib/password';
import { signupStep1Schema } from '@/lib/validations/auth';
import { IUser, AuthResponse, UserResponse } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request data
    const validation = signupStep1Schema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { fullName, email, password, phone } = validation.data;

    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await db.readOne<IUser>('users', { email: normalizedEmail });
    if (existingUser.success && existingUser.data) {
      return Response.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user document
    const newUser: Omit<IUser, '_id'> = {
      name: fullName,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      role: 'USER',
      isCompleted: false,
      provider: 'credentials',
      addresses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert user into database
    const result = await db.create<IUser>('users', newUser);

    if (!result || !result.success || !result.id) {
      return Response.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const userId = result.id;

    // Generate JWT tokens
    const accessTokenResult = jwtHandler.generateToken(userId, 'user', '1d');
    const refreshTokenResult = jwtHandler.generateToken(userId, 'user', '7d');

    if (!accessTokenResult.success || !refreshTokenResult.success) {
      return Response.json(
        { error: 'Failed to generate tokens' },
        { status: 500 }
      );
    }

    const accessToken = accessTokenResult.token!;
    const refreshToken = refreshTokenResult.token!;

    // Prepare user response (exclude password)
    const userResponse: UserResponse = {
      id: userId,
      email: normalizedEmail,
      name: fullName,
      phone,
      role: 'USER',
      isCompleted: false,
    };

    // Prepare response
    const response: AuthResponse = {
      data: {
        user: userResponse,
        token: accessToken,
        refreshToken: refreshToken,
        expiresIn: 86400, // 1 day in seconds
        isCompleted: false,
      },
      message: 'User registered successfully',
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
  }
}

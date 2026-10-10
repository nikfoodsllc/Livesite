import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { comparePassword } from '@/lib/password';
import { clearCounter, clientIp, isBlocked, recordFailure, tooManyMessage, type RateLimit } from '@/lib/server/authRateLimit';
import { loginSchema } from '@/lib/validations/auth';
import { IUser, AuthResponse, UserResponse } from '@/types/auth';
import { ObjectId as MongoObjectId } from 'mongodb';

// a real hash of nothing in particular: used so an unknown email costs the same time as a wrong password
const DUMMY_HASH = bcrypt.hashSync('no-such-account', 10);

interface IRefreshToken {
  _id?: MongoObjectId;
  user: MongoObjectId;
  refresh_token: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request data
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Slow down password guessing: failed tries count per email + address, and per address
    const ip = clientIp(request);
    const pairKey = `login:pair:${email}:${ip}`;
    const limits: RateLimit[] = [
      { key: pairKey, max: 8, windowSec: 15 * 60 },
      { key: `login:ip:${ip}`, max: 40, windowSec: 15 * 60 },
    ];
    const blocked = await isBlocked(limits);
    if (!blocked.ok) {
      return Response.json(
        { error: tooManyMessage(blocked.retryAfterSec) },
        { status: 429, headers: { 'Retry-After': String(blocked.retryAfterSec) } }
      );
    }

    // Find user by email
    const userResult = await db.readOne<IUser>('users', { email });
    const user = userResult.success ? userResult.data : null;

    // Always run one password check, so an unknown email takes as long as a wrong password
    const isPasswordValid = await comparePassword(
      password,
      user?.password || DUMMY_HASH
    );

    if (!user || !isPasswordValid) {
      await recordFailure(limits);
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    await clearCounter(pairKey);

    const userId = user._id!.toString();

    // Generate JWT tokens
    const accessTokenResult = jwtHandler.generateToken(
      userId,
      user.role.toLowerCase() as 'user' | 'admin',
      '1d'
    );
    const refreshTokenResult = jwtHandler.generateToken(
      userId,
      user.role.toLowerCase() as 'user' | 'admin',
      '7d'
    );

    if (!accessTokenResult.success || !refreshTokenResult.success) {
      return Response.json(
        { error: 'Failed to generate tokens' },
        { status: 500 }
      );
    }

    const accessToken = accessTokenResult.token!;
    const refreshToken = refreshTokenResult.token!;

    // Store/update refresh token in database
    try {
      // Check if refresh token exists for user
      const existingTokenResult = await db.readOne<IRefreshToken>(
        'refreshtokens',
        { user: new MongoObjectId(userId) }
      );

      if (existingTokenResult.success && existingTokenResult.data) {
        // Update existing refresh token
        await db.updateOne(
          'refreshtokens',
          { user: new MongoObjectId(userId) },
          {
            $set: {
              refresh_token: refreshToken,
              updatedAt: new Date(),
            },
          }
        );
      } else {
        // Create new refresh token document
        const refreshTokenDoc: Omit<IRefreshToken, '_id'> = {
          user: new MongoObjectId(userId),
          refresh_token: refreshToken,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await db.create<IRefreshToken>('refreshtokens', refreshTokenDoc);
      }
    } catch (tokenError) {
      console.error('Error storing refresh token:', tokenError);
      // Continue with login even if refresh token storage fails
    }

    // Prepare user response (exclude password)
    const userResponse: UserResponse = {
      id: userId,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isCompleted: user.isCompleted,
    };

    // Prepare response
    const response: AuthResponse = {
      data: {
        user: userResponse,
        token: accessToken,
        refreshToken: refreshToken,
        expiresIn: 86400, // 1 day in seconds
        isCompleted: user.isCompleted,
      },
      message: 'User logged in successfully',
    };

    return Response.json(response);
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
  }
}

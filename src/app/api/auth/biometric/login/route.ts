import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { jwtHandler, loginLifetimes } from '@/lib/jwt';
import { clientIp, isBlocked, recordFailure, tooManyMessage, type RateLimit } from '@/lib/server/authRateLimit';
import { redeemDeviceKey } from '@/lib/server/deviceLogin';
import type { IUser, UserResponse } from '@/types/auth';

export const dynamic = 'force-dynamic';

/**
 * POST { deviceKey }: sign in with the key this phone got after a normal sign-in (opened by Face ID in the app). Answers exactly
 * like the password sign-in, so the app handles it the same way. A wrong key counts as a failed try.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { deviceKey?: unknown };
    const deviceKey = typeof body.deviceKey === 'string' ? body.deviceKey : '';
    const ip = clientIp(request);
    const limits: RateLimit[] = [{ key: `biometric:ip:${ip}`, max: 20, windowSec: 15 * 60 }];
    const blocked = await isBlocked(limits);
    if (!blocked.ok) {
      return Response.json({ error: tooManyMessage(blocked.retryAfterSec) }, { status: 429, headers: { 'Retry-After': String(blocked.retryAfterSec) } });
    }

    const userId = await redeemDeviceKey(deviceKey);
    if (!userId || !ObjectId.isValid(userId)) {
      await recordFailure(limits);
      return Response.json({ error: 'Please sign in with your password' }, { status: 401 });
    }
    const found = await db.readOne<IUser>('users', { _id: new ObjectId(userId) } as never);
    const user = found.success ? found.data : null;
    if (!user || String(user.role).toUpperCase() !== 'USER') {
      return Response.json({ error: 'Please sign in with your password' }, { status: 401 });
    }

    const role = user.role.toLowerCase() as 'user' | 'admin';
    const access = jwtHandler.generateToken(userId, role, loginLifetimes(role).access);
    const refresh = jwtHandler.generateToken(userId, role, loginLifetimes(role).refresh);
    if (!access.success || !refresh.success) return Response.json({ error: 'Failed to generate tokens' }, { status: 500 });

    // the same stored refresh token the password sign-in keeps
    try {
      const existing = await db.readOne('refreshtokens', { user: new ObjectId(userId) } as never);
      if (existing.success && existing.data) {
        await db.updateOne('refreshtokens', { user: new ObjectId(userId) } as never, { $set: { refresh_token: refresh.token, updatedAt: new Date() } } as never);
      } else {
        await db.create('refreshtokens', { user: new ObjectId(userId), refresh_token: refresh.token, createdAt: new Date(), updatedAt: new Date() } as never);
      }
    } catch (error) {
      console.error('[biometric] could not store the refresh token', error);
    }

    const userResponse: UserResponse = { id: userId, email: user.email, name: user.name, phone: user.phone, role: user.role, isCompleted: user.isCompleted };
    return Response.json({
      data: { user: userResponse, token: access.token, refreshToken: refresh.token, expiresIn: loginLifetimes(role).access === '90d' ? 90 * 86400 : 86400, isCompleted: user.isCompleted },
      message: 'User logged in successfully',
    });
  } catch (error) {
    console.error('[biometric] login error', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

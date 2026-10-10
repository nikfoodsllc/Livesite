import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { comparePassword, hashPassword } from '@/lib/password';
import { changePasswordSchema } from '@/lib/validations/auth';
import { clearCounter, isBlocked, recordFailure, tooManyMessage, type RateLimit } from '@/lib/server/authRateLimit';
import { IUser } from '@/types/auth';
import { ObjectId as MongoObjectId, Filter } from 'mongodb';

export const dynamic = 'force-dynamic';

// POST /api/account/change-password - { currentPassword, newPassword }
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }
    const decoded = jwtHandler.verifyToken(authHeader.substring(7));
    if (!decoded.success || !decoded.payload) {
      return NextResponse.json({ error: decoded.error || 'Unauthorized - Invalid token' }, { status: 401 });
    }
    const userId = decoded.payload.userId;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { currentPassword, newPassword } = validation.data;

    // Wrong "current password" tries are limited like a login (answered with 400, not 401: a 401 would sign the browser out)
    const limits: RateLimit[] = [{ key: `change-password:user:${userId}`, max: 5, windowSec: 15 * 60 }];
    const blocked = await isBlocked(limits);
    if (!blocked.ok) {
      return NextResponse.json(
        { error: tooManyMessage(blocked.retryAfterSec) },
        { status: 429, headers: { 'Retry-After': String(blocked.retryAfterSec) } }
      );
    }

    const userResult = await db.readOne<IUser>('users', { _id: new MongoObjectId(userId) } as unknown as Filter<IUser>);
    if (!userResult.success || !userResult.data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const user = userResult.data;

    // Accounts that sign in with a social provider have no password here
    if (user.provider !== 'credentials' || !user.password) {
      return NextResponse.json({ error: 'This account has no password to change' }, { status: 400 });
    }

    if (!(await comparePassword(currentPassword, user.password))) {
      await recordFailure(limits);
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }
    await clearCounter(limits[0].key);

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must be different' }, { status: 400 });
    }

    await db.updateOne(
      'users',
      { _id: user._id as any },
      { $set: { password: await hashPassword(newPassword), updatedAt: new Date() } }
    );
    // The stored refresh token goes: other devices must sign in again once their short login runs out
    await db.delete('refreshtokens', { user: user._id as any });

    return NextResponse.json({ success: true, message: 'Password changed' }, { status: 200 });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

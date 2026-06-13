import { NextRequest } from 'next/server';
import { db } from '@/lib/server/db';
import { jwtHandler } from '@/lib/jwt';
import { IUser } from '@/types/auth';
import { Filter, ObjectId } from 'mongodb';

async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }
  const token = authHeader.substring(7);
  const decoded = jwtHandler.verifyToken(token);
  if (!decoded.success || !decoded.payload) {
    return { error: decoded.error || 'Unauthorized', status: 401 };
  }
  return { userId: decoded.payload.userId };
}

// DELETE /api/auth/account - Delete own account
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return Response.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { userId } = authResult;

    if (!userId || userId.length !== 24) {
      return Response.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const userObjectId = new ObjectId(userId);

    // Delete all addresses for this user
    await db.delete('addresses', {
      user: userId,
    } as unknown as Filter<any>);

    // Delete the user
    const result = await db.deleteOne('users', {
      _id: userObjectId,
    } as unknown as Filter<IUser>);

    if (!result.success) {
      return Response.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    return Response.json(
      { success: true, message: 'Account deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete account error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

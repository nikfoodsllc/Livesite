import { NextRequest, NextResponse } from 'next/server';
import { jwtHandler } from '@/lib/jwt';

/**
 * Only logged-in admins may use an admin or test route. Admin logins (the admin panel) carry
 * role 'admin'; a customer's login is a valid token too, but with role 'user'.
 * Returns the error response to send, or null when the caller is an admin.
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const verified = jwtHandler.verifyToken(authHeader.substring(7));
  if (!verified.success || !verified.payload) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (verified.payload.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

/** Like requireAdmin, and also returns the admin's user id (for "entered by" records). */
export function requireAdminWithId(request: NextRequest): { error: NextResponse } | { adminId: string } {
  const error = requireAdmin(request);
  if (error) return { error };
  const verified = jwtHandler.verifyToken((request.headers.get('authorization') ?? '').substring(7));
  return { adminId: String(verified.payload?.userId ?? '') };
}

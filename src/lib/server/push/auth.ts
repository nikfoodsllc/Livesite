import type { NextRequest } from 'next/server';
import { jwtHandler } from '@/lib/jwt';

/** The id of the logged-in customer (or admin) making the request, or null. */
export function userIdFrom(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  const verified = jwtHandler.verifyToken(header.substring(7));
  if (!verified.success || !verified.payload) return null;
  const id = verified.payload.userId;
  return id ? String(id) : null;
}

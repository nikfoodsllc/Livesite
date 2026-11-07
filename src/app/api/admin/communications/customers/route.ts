import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/communications/customers?q= (admin only): customer accounts whose name, email or phone matches, for picking
 * people by hand. Needs at least 2 characters; at most 15 results. Admins and packers are never listed.
 */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ success: true, data: [] });
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const digits = q.replace(/\D/g, '');
  const or: Record<string, unknown>[] = [{ email: { $regex: escaped, $options: 'i' } }, { name: { $regex: escaped, $options: 'i' } }];
  if (digits.length >= 4) or.push({ phone: { $regex: digits } });
  try {
    const users = await db.getCollectionForOperations<Record<string, unknown>>('users');
    const rows = (await users.find({ role: { $in: ['USER', 'user'] }, isActive: { $ne: false }, $or: or } as never, { projection: { name: 1, email: 1, phone: 1 } }).sort({ name: 1 }).limit(15).toArray()) as unknown as Array<{ _id: { toString(): string }; name?: string; email?: string; phone?: string }>;
    return NextResponse.json({ success: true, data: rows.map((u) => ({ id: u._id.toString(), name: u.name ?? '', email: u.email ?? '', phone: u.phone ?? '' })) });
  } catch (error) {
    console.error('[communications] customer search failed', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: 'Customer search failed' }, { status: 500 });
  }
}

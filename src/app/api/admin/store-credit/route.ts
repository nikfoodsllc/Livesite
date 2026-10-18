import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdminWithId } from '@/lib/adminAuth';
import { db } from '@/lib/server/db';
import { toDollars } from '@/lib/storeCredit';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface AccountDoc {
  userId: string;
  balanceCents: number;
  updatedAt?: Date;
}
interface UserDoc {
  _id: ObjectId;
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * GET /api/admin/store-credit?search=&page=&filter=with|all
 * Every customer who has ever had store credit: name, email, balance and when it last changed (admin only).
 * `filter=with` (default) lists only balances above zero.
 */
export async function GET(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const url = new URL(request.url);
  const search = (url.searchParams.get('search') || '').trim().slice(0, 80);
  const page = Math.max(1, Math.floor(Number(url.searchParams.get('page'))) || 1);
  const onlyWithBalance = url.searchParams.get('filter') !== 'all';

  const accountsCol = await db.getCollectionForOperations<AccountDoc>('storeCreditAccounts');
  const filter: Record<string, unknown> = onlyWithBalance ? { balanceCents: { $gt: 0 } } : {};

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const found = await db.read<UserDoc>('users', { $or: [{ name: rx }, { email: rx }, { phone: rx }] } as never, { limit: 200, projection: { _id: 1 } });
    const ids = (found.success && found.data ? found.data : []).map((u) => String(u._id));
    filter.userId = { $in: ids };
  }

  const [total, rows, totals] = await Promise.all([
    accountsCol.countDocuments(filter as never),
    accountsCol
      .find(filter as never)
      .sort({ balanceCents: -1, updatedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
    accountsCol.aggregate([{ $group: { _id: null, outstanding: { $sum: '$balanceCents' }, holders: { $sum: { $cond: [{ $gt: ['$balanceCents', 0] }, 1, 0] } } } }]).toArray(),
  ]);

  const valid = rows.map((r) => r.userId).filter((id) => ObjectId.isValid(id));
  const users = valid.length
    ? await db.read<UserDoc>('users', { _id: { $in: valid.map((id) => new ObjectId(id)) } } as never, { projection: { name: 1, email: 1, phone: 1 } })
    : { success: true, data: [] as UserDoc[] };
  const byId = new Map((users.success && users.data ? users.data : []).map((u) => [String(u._id), u]));

  return NextResponse.json({
    success: true,
    data: {
      page,
      pageSize: PAGE_SIZE,
      total,
      outstanding: toDollars(Math.round(Number(totals[0]?.outstanding) || 0)),
      holders: Number(totals[0]?.holders) || 0,
      accounts: rows.map((r) => {
        const u = byId.get(r.userId);
        return {
          userId: r.userId,
          name: u?.name || '',
          email: u?.email || '',
          phone: u?.phone || '',
          balance: toDollars(Math.round(r.balanceCents)),
          updatedAt: r.updatedAt ?? null,
        };
      }),
    },
  });
}

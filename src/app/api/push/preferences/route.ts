import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { isMenuSubscribed, subscribeMenu } from '@/lib/server/push/menuAudience';
import { userIdFrom } from '@/lib/server/push/auth';
import { getPrefs, setPrefs } from '@/lib/server/push/store';

export const dynamic = 'force-dynamic';

async function emailOf(userId: string): Promise<string> {
  if (!ObjectId.isValid(userId)) return '';
  const users = await db.getCollectionForOperations<Record<string, unknown>>('users');
  const u = await users.findOne({ _id: new ObjectId(userId) } as never, { projection: { email: 1 } });
  return String(u?.email ?? '');
}

async function view(userId: string) {
  const prefs = await getPrefs(userId);
  return { ...prefs, menuSubscribed: await isMenuSubscribed(userId, await emailOf(userId)) };
}

/** GET /api/push/preferences: which notifications this customer gets, and whether they are on the menu alerts list. */
export async function GET(request: NextRequest) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ success: true, data: await view(userId) });
}

/** PUT /api/push/preferences { orders?, menu?, reminders? }. Turning menu alerts on also puts their email on the menu alerts list. */
export async function PUT(request: NextRequest) {
  const userId = userIdFrom(request);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { orders?: unknown; menu?: unknown; reminders?: unknown };
  await setPrefs(userId, {
    ...(typeof body.orders === 'boolean' ? { orders: body.orders } : {}),
    ...(typeof body.menu === 'boolean' ? { menu: body.menu } : {}),
    ...(typeof body.reminders === 'boolean' ? { reminders: body.reminders } : {}),
  });
  if (body.menu === true) {
    const email = await emailOf(userId);
    if (email) await subscribeMenu(userId, email);
  }
  return NextResponse.json({ success: true, data: await view(userId) });
}

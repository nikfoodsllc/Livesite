import { NextRequest, NextResponse } from 'next/server';
import { requireAdminWithId } from '@/lib/adminAuth';
import { createTemplate, listTemplates } from '@/lib/server/push/templates';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  return NextResponse.json({ success: true, data: await listTemplates() });
}

/** POST { name, title, body }: save a new text. */
export async function POST(request: NextRequest) {
  const auth = requireAdminWithId(request);
  if ('error' in auth) return auth.error;
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; title?: unknown; body?: unknown };
  const r = await createTemplate(body.name, body.title, body.body, auth.adminId);
  if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 400 });
  return NextResponse.json({ success: true, data: r.template });
}

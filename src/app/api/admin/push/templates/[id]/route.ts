import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { deleteTemplate, updateTemplate } from '@/lib/server/push/templates';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; title?: unknown; body?: unknown };
  const r = await updateTemplate(id, body.name, body.title, body.body);
  if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: r.status });
  return NextResponse.json({ success: true, data: r.template });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  const ok = await deleteTemplate(id);
  return NextResponse.json({ success: ok, ...(ok ? {} : { error: 'Unknown text' }) }, { status: ok ? 200 : 404 });
}

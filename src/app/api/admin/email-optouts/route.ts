import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { listOptOuts } from '@/lib/server/emailOptOut';

export const dynamic = 'force-dynamic';

/** GET /api/admin/email-optouts (admin only): everyone who unsubscribed, newest first. ?format=csv for a download (for removing them from Wix). */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const rows = await listOptOuts();
  if (request.nextUrl.searchParams.get('format') === 'csv') {
    const csv = ['email,unsubscribed_at', ...rows.map((r) => `${r.email},${new Date(r.createdAt).toISOString()}`)].join('\r\n');
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="unsubscribed.csv"' } });
  }
  return NextResponse.json({ success: true, count: rows.length, data: rows });
}

import { NextRequest, NextResponse } from 'next/server';
import { updateReportStatus, deleteReport } from '@/lib/reports';
import { STATUSES, type ReportStatus } from '@/types';

// Returns true only if the request carries the correct admin password.
function isAdmin(req: NextRequest): boolean {
  const providedKey = req.headers.get('x-admin-key');
  const adminKey = process.env.ADMIN_PASSWORD;
  return Boolean(adminKey) && providedKey === adminKey;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { status } = body ?? {};
  if (typeof status !== 'string' || !STATUSES.includes(status as ReportStatus)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }

  try {
    await updateReportStatus(params.id, status as ReportStatus);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update status.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const deleted = await deleteReport(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    }
  } catch (err: any) {
    console.error('DELETE /api/reports/[id] failed:', err?.message);
    return NextResponse.json({ error: 'Failed to delete report.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
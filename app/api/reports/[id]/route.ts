import { NextRequest, NextResponse } from 'next/server';
import { updateReportStatus } from '@/lib/reports';
import { STATUSES, type ReportStatus } from '@/types';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const providedKey = req.headers.get('x-admin-key');
  const adminKey = process.env.ADMIN_PASSWORD;

  if (!adminKey || providedKey !== adminKey) {
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

import { NextRequest, NextResponse } from 'next/server';
import { updateReportStatus, updateReportAuthority, deleteReport } from '@/lib/reports';
import { deleteReportPhoto } from '@/lib/photoStorage';
import { STATUSES, type ReportStatus } from '@/types';

// Returns true only if the request carries the correct admin password.
function isAdmin(req: NextRequest): boolean {
  const providedKey = req.headers.get('x-admin-key');
  const adminKey = process.env.ADMIN_PASSWORD;
  return Boolean(adminKey) && providedKey === adminKey;
}

// PATCH body is either { status } to change the status,
// or { authorityId } (a string, or null for unassigned) to change the office.
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

  // Change the assigned office
  if (body && Object.prototype.hasOwnProperty.call(body, 'authorityId')) {
    const authorityId = body.authorityId;
    if (authorityId !== null && (typeof authorityId !== 'string' || authorityId.length > 64)) {
      return NextResponse.json({ error: 'Invalid office.' }, { status: 400 });
    }
    try {
      const found = await updateReportAuthority(params.id, authorityId);
      if (!found) {
        return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
      }
    } catch (err: any) {
      console.error('PATCH authority failed:', err?.message);
      return NextResponse.json({ error: 'Failed to update office.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Change the status
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
    const { deleted, photo } = await deleteReport(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    }
    // Remove the photo file too (a failure here is logged, not fatal).
    await deleteReportPhoto(photo);
  } catch (err: any) {
    console.error('DELETE /api/reports/[id] failed:', err?.message);
    return NextResponse.json({ error: 'Failed to delete report.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
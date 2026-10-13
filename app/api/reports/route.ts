import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getReportsOrThrow, addReport } from '@/lib/reports';
import { uploadReportPhoto, deleteReportPhoto } from '@/lib/photoStorage';
import { resolveAuthority } from '@/lib/zones';
import { getClientIp, isRateLimited, recordSubmission } from '@/lib/rateLimit';
import { WASTE_TYPES, type WasteReport, type WasteType } from '@/types';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET() {
  try {
    const reports = await getReportsOrThrow();
    return NextResponse.json({ reports }, { headers: NO_STORE });
  } catch (err: any) {
    console.error('GET /api/reports failed:', err?.message);
    return NextResponse.json(
      { error: 'Reports are temporarily unavailable.' },
      { status: 503, headers: NO_STORE }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { lat, lng, type, description, locality, photo } = body ?? {};

  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'Missing or invalid location.' }, { status: 400 });
  }
  if (typeof type !== 'string' || !WASTE_TYPES.includes(type as WasteType)) {
    return NextResponse.json({ error: 'Missing or invalid waste type.' }, { status: 400 });
  }
  if (typeof description !== 'string' || description.trim().length === 0) {
    return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
  }
  if (locality != null && typeof locality !== 'string') {
    return NextResponse.json({ error: 'Invalid locality.' }, { status: 400 });
  }
  if (photo && (typeof photo !== 'string' || photo.length > 3_000_000)) {
    return NextResponse.json({ error: 'Photo is missing or too large.' }, { status: 400 });
  }

  // Too many reports from one visitor? Stop here, before any photo is uploaded.
  const ip = getClientIp(req.headers);
  if (await isRateLimited(ip)) {
    return NextResponse.json(
      { error: "You've sent a lot of reports recently. Please try again a little later." },
      { status: 429, headers: { 'Retry-After': '3600' } }
    );
  }

  const id = crypto.randomUUID();

  // If a photo was sent, store it as a file and keep only its web address.
  let photoUrl: string | null = null;
  if (photo) {
    try {
      photoUrl = await uploadReportPhoto(id, photo);
    } catch (err: any) {
      const message: string = err?.message ?? '';
      if (message.startsWith('Photo ')) {
        // Our own validation (not a JPEG, too large, etc.)
        return NextResponse.json({ error: message }, { status: 400 });
      }
      console.error('Photo upload failed:', message);
      return NextResponse.json(
        { error: "We couldn't save your photo right now. Please try again in a little while." },
        { status: 503 }
      );
    }
  }

  const report: WasteReport = {
    id,
    lat,
    lng,
    type: type as WasteType,
    description: description.trim().slice(0, 500),
    locality: typeof locality === 'string' ? locality.trim().slice(0, 100) || null : null,
    photo: photoUrl,
    status: 'reported',
    createdAt: new Date().toISOString(),
  };

  // Work out which office owns this spot. A failure here must never block the report.
  let authorityId: string | null = null;
  try {
    const match = await resolveAuthority(report.lat, report.lng, report.locality);
    authorityId = match?.authorityId ?? null;
  } catch (err: any) {
    console.error('Authority lookup failed (report saved unassigned):', err?.message);
  }

  try {
    await addReport(report, authorityId);
  } catch (err: any) {
    console.error('POST /api/reports failed:', err?.message);
    // Don't leave an orphan photo behind if the report itself couldn't be saved.
    await deleteReportPhoto(photoUrl);
    return NextResponse.json(
      { error: "We couldn't save your report right now. Please try again in a little while." },
      { status: 503 }
    );
  }

  // Count this successful report towards the visitor's limit.
  await recordSubmission(ip);

  return NextResponse.json({ report }, { status: 201 });
}
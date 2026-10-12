  import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getReportsOrThrow, addReport } from '@/lib/reports';
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
  if (photo && (typeof photo !== 'string' || photo.length > 6_000_000)) {
    return NextResponse.json({ error: 'Photo is missing or too large.' }, { status: 400 });
  }

  const report: WasteReport = {
    id: crypto.randomUUID(),
    lat,
    lng,
    type: type as WasteType,
    description: description.trim().slice(0, 500),
    locality: typeof locality === 'string' ? locality.trim().slice(0, 100) || null : null,
    photo: photo || null,
    status: 'reported',
    createdAt: new Date().toISOString(),
  };

  try {
    await addReport(report);
  } catch (err: any) {
    console.error('POST /api/reports failed:', err?.message);
    return NextResponse.json(
      { error: "We couldn't save your report right now. Please try again in a little while." },
      { status: 503 }
    );
  }

  return NextResponse.json({ report }, { status: 201 });
}
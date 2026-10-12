import { NextRequest, NextResponse } from 'next/server';
import { getReportsOrThrow } from '@/lib/reports';
import { STATUS_LABELS, TYPE_LABELS } from '@/types';

// Always fetch fresh data — never cache this route.
export const dynamic = 'force-dynamic';

function escapeCsv(value: string): string {
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

// New reports store a web address; older ones stored the image itself as text.
function photoCell(photo: string | null | undefined): string {
  if (!photo) return '';
  if (photo.startsWith('http')) return photo;
  return 'Old format (no link)';
}

export async function GET(req: NextRequest) {
  const providedKey = req.headers.get('x-admin-key');
  const adminKey = process.env.ADMIN_PASSWORD;

  if (!adminKey || providedKey !== adminKey) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let reports;
  try {
    reports = await getReportsOrThrow();
  } catch (err: any) {
    console.error('Export failed:', err?.message);
    return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });
  }
  const origin = req.nextUrl.origin;

  const header = [
    'Date reported',
    'Status',
    'Waste type',
    'Description',
    'Locality',
    'Latitude',
    'Longitude',
    'Google Maps link',
    'View in Clean My City',
    'Photo link',
  ];
  const rows = reports.map((r) => [
    new Date(r.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
    STATUS_LABELS[r.status] ?? 'Reported',
    TYPE_LABELS[r.type],
    r.description,
    r.locality ?? '',
    r.lat.toFixed(6),
    r.lng.toFixed(6),
    `https://www.google.com/maps?q=${r.lat},${r.lng}`,
    `${origin}/?report=${r.id}`,
    photoCell(r.photo),
  ]);

  // Leading \uFEFF (byte-order mark) so Excel opens special characters correctly.
  const csv =
    '\uFEFF' +
    [header, ...rows].map((row) => row.map((cell) => escapeCsv(String(cell))).join(',')).join('\r\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clean-my-city-reports-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
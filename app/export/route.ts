import { NextResponse } from 'next/server';
import { getReports } from '@/lib/reports';
import { TYPE_LABELS } from '@/types';

// Always fetch fresh data — never cache this route.
export const dynamic = 'force-dynamic';

function escapeCsv(value: string): string {
  const needsQuotes = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export async function GET() {
  const reports = await getReports();

  const header = ['Date reported', 'Waste type', 'Description', 'Latitude', 'Longitude', 'Map link', 'Has photo'];
  const rows = reports.map((r) => [
    new Date(r.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
    TYPE_LABELS[r.type],
    r.description,
    r.lat.toFixed(6),
    r.lng.toFixed(6),
    `https://www.google.com/maps?q=${r.lat},${r.lng}`,
    r.photo ? 'Yes' : 'No',
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

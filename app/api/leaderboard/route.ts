import { NextResponse } from 'next/server';
import { getReports } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export async function GET() {
  const reports = await getReports();

  const counts = new Map<string, number>();
  for (const r of reports) {
    const key = r.locality?.trim() || 'Not specified';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const leaderboard = Array.from(counts.entries())
    .map(([locality, count]) => ({ locality, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ leaderboard, total: reports.length });
}

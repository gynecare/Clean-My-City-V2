import { NextResponse } from 'next/server';
import { getReports } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export async function GET() {
  const reports = await getReports();

  const counts = new Map<string, { count: number; resolved: number }>();
  for (const r of reports) {
    const key = r.locality?.trim() || 'Not specified';
    const entry = counts.get(key) ?? { count: 0, resolved: 0 };
    entry.count += 1;
    if (r.status === 'resolved') entry.resolved += 1;
    counts.set(key, entry);
  }

  const leaderboard = Array.from(counts.entries())
    .map(([locality, { count, resolved }]) => ({
      locality,
      count,
      resolved,
      resolvedRate: count > 0 ? Math.round((resolved / count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const totalResolved = reports.filter((r) => r.status === 'resolved').length;

  return NextResponse.json({ leaderboard, total: reports.length, totalResolved });
}

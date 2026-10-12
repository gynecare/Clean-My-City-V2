import { NextRequest, NextResponse } from 'next/server';
import { getAuthorityOptions, getAssignments } from '@/lib/reports';

export const dynamic = 'force-dynamic';

// Returns true only if the request carries the correct admin password.
function isAdmin(req: NextRequest): boolean {
  const providedKey = req.headers.get('x-admin-key');
  const adminKey = process.env.ADMIN_PASSWORD;
  return Boolean(adminKey) && providedKey === adminKey;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const [authorities, assignments] = await Promise.all([getAuthorityOptions(), getAssignments()]);
    return NextResponse.json(
      { authorities, assignments },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: any) {
    console.error('GET /api/admin/routing failed:', err?.message);
    return NextResponse.json({ error: 'Routing data unavailable.' }, { status: 503 });
  }
}
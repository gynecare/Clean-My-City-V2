import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { resolveAuthority } from '@/lib/zones';

export const dynamic = 'force-dynamic';

type AuthorityRow = {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
};

// Returns true only if the request carries the correct admin password.
function isAdmin(req: NextRequest): boolean {
  const providedKey = req.headers.get('x-admin-key');
  const adminKey = process.env.ADMIN_PASSWORD;
  return Boolean(adminKey) && providedKey === adminKey;
}

// Looks up one authority by id (explicit return type keeps TypeScript happy).
async function getAuthority(id: string): Promise<AuthorityRow | null> {
  const { data, error } = await supabase
    .from('authorities')
    .select('id, name, level, parent_id')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return (data as AuthorityRow | null) ?? null;
}

// Example: /api/zones/check?lat=33.597&lng=73.0479&locality=Saddar
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const latText = searchParams.get('lat');
  const lngText = searchParams.get('lng');
  const lat = Number(latText);
  const lng = Number(lngText);

  if (!latText || !lngText || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'Provide lat and lng numbers.' }, { status: 400 });
  }

  const locality = searchParams.get('locality');

  try {
    const match = await resolveAuthority(lat, lng, locality);
    if (!match) {
      return NextResponse.json({
        matched: false,
        message: 'No zone or locality matches. This report would be Unassigned.',
      });
    }

    // Walk up the chain: local office, then waste operator, then district.
    const chain: { level: number; name: string }[] = [];
    let nextId: string | null = match.authorityId;
    for (let i = 0; i < 5 && nextId; i++) {
      const authority: AuthorityRow | null = await getAuthority(nextId);
      if (!authority) break;
      chain.push({ level: authority.level, name: authority.name });
      nextId = authority.parent_id;
    }

    return NextResponse.json({
      matched: true,
      method: match.method,
      zone: match.zoneName,
      chain,
    });
  } catch (err: any) {
    console.error('GET /api/zones/check failed:', err?.message);
    return NextResponse.json({ error: 'Check failed.' }, { status: 500 });
  }
}
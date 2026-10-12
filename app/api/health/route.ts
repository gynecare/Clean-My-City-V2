import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

// Lightweight check: touches the database without loading photos.
export async function GET() {
  const { error } = await supabase.from('reports').select('id').limit(1);
  if (error) {
    console.error('Health check failed:', error.message);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
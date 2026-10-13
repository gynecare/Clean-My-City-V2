import crypto from 'crypto';
import { supabase } from './supabaseClient';

// Change these two numbers to make the limit stricter or looser.
export const MAX_PER_HOUR = 15;
export const MAX_PER_DAY = 30;

// The visitor's network address, as reported by the hosting platform.
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip') ?? 'unknown';
}

// One-way scrambled version of the address, so it isn't stored in readable form.
function hashIp(ip: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback-salt';
  return crypto.createHmac('sha256', secret).update(ip).digest('hex');
}

async function countSince(ipHash: string, sinceIso: string): Promise<number> {
  const { count, error } = await supabase
    .from('submission_log')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', sinceIso);
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

// True if this visitor has sent too many reports recently.
// If the check itself fails, it returns false so honest reports are never blocked.
export async function isRateLimited(ip: string): Promise<boolean> {
  try {
    const ipHash = hashIp(ip);
    const now = Date.now();
    const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const [lastHour, lastDay] = await Promise.all([countSince(ipHash, hourAgo), countSince(ipHash, dayAgo)]);
    return lastHour >= MAX_PER_HOUR || lastDay >= MAX_PER_DAY;
  } catch (err: any) {
    console.error('Rate limit check failed (allowing the report):', err?.message);
    return false;
  }
}

// Records one successful submission. Never throws.
export async function recordSubmission(ip: string): Promise<void> {
  try {
    const { error } = await supabase.from('submission_log').insert({ ip_hash: hashIp(ip) });
    if (error) {
      console.error('Failed to record submission:', error.message);
    }

    // Now and then, delete log rows older than two days.
    if (Math.random() < 0.05) {
      const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const { error: cleanupError } = await supabase.from('submission_log').delete().lt('created_at', cutoff);
      if (cleanupError) {
        console.error('Failed to clean the submission log:', cleanupError.message);
      }
    }
  } catch (err: any) {
    console.error('Failed to record submission:', err?.message);
  }
}
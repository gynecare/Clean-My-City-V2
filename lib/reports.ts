import { supabase } from './supabaseClient';
import type { ReportStatus, WasteReport } from '@/types';

export type AuthorityOption = { id: string; name: string; level: number };

// Throws if the database can't be read, so callers can tell "no reports"
// apart from "database unavailable".
export async function getReportsOrThrow(): Promise<WasteReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    type: row.type,
    description: row.description,
    locality: row.locality ?? null,
    photo: row.photo,
    status: (row.status as ReportStatus) ?? 'reported',
    createdAt: row.created_at,
  }));
}

// Old behaviour kept for any other code that already calls getReports().
export async function getReports(): Promise<WasteReport[]> {
  try {
    return await getReportsOrThrow();
  } catch (err: any) {
    console.error('Failed to load reports:', err?.message);
    return [];
  }
}

// authorityId is the office this report belongs to (null = unassigned).
export async function addReport(report: WasteReport, authorityId: string | null = null): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    id: report.id,
    lat: report.lat,
    lng: report.lng,
    type: report.type,
    description: report.description,
    locality: report.locality ?? null,
    photo: report.photo,
    status: report.status ?? 'reported',
    created_at: report.createdAt,
    authority_id: authorityId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateReportStatus(id: string, status: ReportStatus): Promise<void> {
  const { error } = await supabase.from('reports').update({ status }).eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
}

// Permanently deletes a report. Returns whether a report was deleted, and the
// photo address it had, so the caller can remove the photo file as well.
export async function deleteReport(id: string): Promise<{ deleted: boolean; photo: string | null }> {
  const { data, error } = await supabase.from('reports').delete().eq('id', id).select('id, photo');
  if (error) {
    throw new Error(error.message);
  }
  const row = data?.[0];
  return { deleted: Boolean(row), photo: row?.photo ?? null };
}

// The offices an admin can choose from (names and levels only, no emails).
export async function getAuthorityOptions(): Promise<AuthorityOption[]> {
  const { data, error } = await supabase
    .from('authorities')
    .select('id, name, level')
    .eq('active', true)
    .order('level', { ascending: true })
    .order('name', { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as AuthorityOption[];
}

// Which office each report is assigned to: { reportId: authorityId or null }.
export async function getAssignments(): Promise<Record<string, string | null>> {
  const { data, error } = await supabase.from('reports').select('id, authority_id');
  if (error) {
    throw new Error(error.message);
  }
  const map: Record<string, string | null> = {};
  for (const row of data ?? []) {
    map[row.id] = row.authority_id ?? null;
  }
  return map;
}

// Sets (or clears) a report's office by hand. Marks it manual so automatic
// updates never overwrite it. Returns false if the report doesn't exist.
export async function updateReportAuthority(id: string, authorityId: string | null): Promise<boolean> {
  const { data, error } = await supabase
    .from('reports')
    .update({ authority_id: authorityId, authority_manual: true })
    .eq('id', id)
    .select('id');
  if (error) {
    throw new Error(error.message);
  }
  return (data?.length ?? 0) > 0;
}
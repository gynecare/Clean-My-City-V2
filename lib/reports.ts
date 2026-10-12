import { supabase } from './supabaseClient';
import type { ReportStatus, WasteReport } from '@/types';

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
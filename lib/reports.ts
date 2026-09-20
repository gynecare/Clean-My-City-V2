import { supabase } from './supabaseClient';
import type { ReportStatus, WasteReport } from '@/types';

export async function getReports(): Promise<WasteReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load reports:', error.message);
    return [];
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

export async function addReport(report: WasteReport): Promise<void> {
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

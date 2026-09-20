export type WasteType = 'household' | 'construction' | 'plastic' | 'medical' | 'other';
export type ReportStatus = 'reported' | 'in_progress' | 'resolved';

export interface WasteReport {
  id: string;
  lat: number;
  lng: number;
  type: WasteType;
  description: string;
  locality?: string | null;
  photo?: string | null;
  status: ReportStatus;
  createdAt: string;
}

export const WASTE_TYPES: WasteType[] = [
  'household',
  'construction',
  'plastic',
  'medical',
  'other',
];

export const TYPE_LABELS: Record<WasteType, string> = {
  household: 'Household waste',
  construction: 'Construction debris',
  plastic: 'Plastic & packaging',
  medical: 'Medical / hazardous',
  other: 'Other',
};

export const TYPE_COLORS: Record<WasteType, string> = {
  household: '#3F8F5E',
  construction: '#D98A1F',
  plastic: '#3B7FC4',
  medical: '#C0392B',
  other: '#7B4FA0',
};

export const STATUSES: ReportStatus[] = ['reported', 'in_progress', 'resolved'];

export const STATUS_LABELS: Record<ReportStatus, string> = {
  reported: 'Reported',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export const STATUS_COLORS: Record<ReportStatus, string> = {
  reported: '#6B6A5C',
  in_progress: '#D98A1F',
  resolved: '#2FA854',
};

// A starting list of well-known Rawalpindi localities/areas. Add or edit
// freely — this list only drives the dropdown and leaderboard grouping.
export const RAWALPINDI_LOCALITIES: string[] = [
  'Saddar',
  'Committee Chowk',
  'Raja Bazaar',
  'Chaklala / Cantt',
  'Satellite Town',
  'Westridge',
  'Dhoke Kashmirian',
  'Pirwadhai',
  'Gulzar-e-Quaid',
  'Bahria Town',
  'Chur Chowk',
  'Adiala Road',
  'Dhamial',
  'Tench Bhatta',
  'Waris Khan',
  'Gawalmandi',
  'Kartarpura',
  'Angori Town',
  'Airport Housing Society',
  'Other',
];

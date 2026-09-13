export type WasteType = 'household' | 'construction' | 'plastic' | 'medical' | 'other';

export interface WasteReport {
  id: string;
  lat: number;
  lng: number;
  type: WasteType;
  description: string;
  photo?: string | null;
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
  household: '#4C7A3D',
  construction: '#35505C',
  plastic: '#B5502E',
  medical: '#A32020',
  other: '#6B6A5C',
};

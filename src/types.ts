// Shared types for the whole app.

export const REGIONS = ['South', 'North', 'Central', 'East'] as const;
export type Region = (typeof REGIONS)[number];

export const TRAVEL_MODES = ['any', 'walk', 'bus', 'metro', 'train', 'auto', 'cab'] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export interface Coord {
  lat: number;
  lng: number;
}

// One pandal, cleaned up from the JSON file.
// lat and lng are null when the dataset leaves them blank. They are never 0.
export interface PandalRecord {
  id: string;
  name: string;
  region: Region;
  area: string;
  lat: number | null;
  lng: number | null;
  verification: string;
  notes: string;
  mapsUrl: string;
}

export interface ValidationResult {
  records: PandalRecord[];
  errors: string[];
  warnings: string[];
}

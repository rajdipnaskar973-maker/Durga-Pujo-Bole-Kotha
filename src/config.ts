import type { Region } from './types';

export const APP_NAME = 'Durga Pujo Bole Kotha';
export const DATASET_URL = '/kolkata_puja_pandals_starter_dataset.json';

// The three regions in the guided flow. East is optional, offered from the review screen.
export const MAIN_REGIONS: Region[] = ['South', 'North', 'Central'];
export const OPTIONAL_REGIONS: Region[] = ['East'];

export const REGION_LABELS: Record<Region, string> = {
  South: 'South Kolkata',
  North: 'North Kolkata',
  Central: 'Central Kolkata',
  East: 'East Kolkata / Salt Lake / New Town (optional)',
};

export const DEFAULT_MAX_WALK_KM = 1.5;

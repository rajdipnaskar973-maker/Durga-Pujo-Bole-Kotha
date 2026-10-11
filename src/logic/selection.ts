import type { PandalRecord, Region } from '../types';

export interface PickerFilter {
  region: Region | null;
  area: string; // '' means all areas
  query: string; // matched against the pandal name
}

export function filterPandals(records: PandalRecord[], filter: PickerFilter): PandalRecord[] {
  const q = filter.query.trim().toLowerCase();
  return records.filter(
    (r) =>
      (filter.region === null || r.region === filter.region) &&
      (filter.area === '' || r.area === filter.area) &&
      (q === '' || r.name.toLowerCase().includes(q)),
  );
}

// Groups records by area, keeping the order they first appear in the dataset.
export function groupByArea(records: PandalRecord[]): { area: string; items: PandalRecord[] }[] {
  const groups = new Map<string, PandalRecord[]>();
  for (const r of records) {
    groups.set(r.area, [...(groups.get(r.area) ?? []), r]);
  }
  return [...groups.entries()].map(([area, items]) => ({ area, items }));
}

export function areasIn(records: PandalRecord[], region: Region): string[] {
  return groupByArea(records.filter((r) => r.region === region)).map((g) => g.area);
}

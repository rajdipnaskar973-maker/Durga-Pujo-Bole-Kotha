import { REGIONS, type PandalRecord, type Region, type ValidationResult } from '../types';

// Turns any value into trimmed text. Missing values become an empty string.
export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

// Blank stays null. It is never turned into 0.
export function parseCoordinate(
  value: unknown,
  kind: 'latitude' | 'longitude',
): { value: number | null; error?: string } {
  const text = cleanText(value);
  if (text === '') return { value: null };
  const n = Number(text);
  if (!Number.isFinite(n)) return { value: null, error: `${kind} "${text}" is not a number` };
  const limit = kind === 'latitude' ? 90 : 180;
  if (Math.abs(n) > limit) return { value: null, error: `${kind} ${n} is outside the allowed range` };
  return { value: n };
}

export function isRegion(value: string): value is Region {
  return (REGIONS as readonly string[]).includes(value);
}

// Used to spot possible duplicates: "Kumartuli Park Sarbojanin" and "kumartuli park sarbojanin!" match.
const normaliseName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Checks the parsed JSON. Bad records are skipped with a clear error, and the rest still load.
export function validateDataset(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const records: PandalRecord[] = [];

  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { records?: unknown }).records)) {
    return { records, errors: ['The file has no "records" list at the top level.'], warnings };
  }

  const list = (raw as { records: unknown[] }).records;
  const seenIds = new Set<string>();

  list.forEach((item, index) => {
    const row = index + 1;
    if (!item || typeof item !== 'object') {
      errors.push(`Record ${row} is not an object; skipped.`);
      return;
    }
    const r = item as Record<string, unknown>;
    const id = cleanText(r.id);
    const name = cleanText(r.pandal_name);
    const region = cleanText(r.region);

    if (!id) {
      errors.push(`Record ${row} has no id; skipped.`);
      return;
    }
    if (seenIds.has(id)) {
      errors.push(`Duplicate id "${id}" at record ${row}; skipped.`);
      return;
    }
    if (!name) {
      errors.push(`Record ${id} has no pandal_name; skipped.`);
      return;
    }
    if (!isRegion(region)) {
      errors.push(`Record ${id} has unknown region "${region}"; skipped.`);
      return;
    }
    seenIds.add(id);

    const lat = parseCoordinate(r.latitude, 'latitude');
    const lng = parseCoordinate(r.longitude, 'longitude');
    let latValue = lat.value;
    let lngValue = lng.value;

    const coordErrors = [lat.error, lng.error].filter((e): e is string => Boolean(e));
    if (coordErrors.length > 0) {
      errors.push(`Record ${id}: ${coordErrors.join('; ')}. Coordinates ignored.`);
      latValue = null;
      lngValue = null;
    } else if ((latValue === null) !== (lngValue === null)) {
      warnings.push(`Record ${id} has only one coordinate; both were ignored.`);
      latValue = null;
      lngValue = null;
    }

    records.push({
      id,
      name,
      region,
      area: cleanText(r.area_cluster) || 'Unassigned',
      lat: latValue,
      lng: lngValue,
      verification: cleanText(r.verification_status) || 'unknown',
      notes: cleanText(r.notes),
      mapsUrl: cleanText(r.google_maps_url),
    });
  });

  const byName = new Map<string, string[]>();
  for (const rec of records) {
    const key = normaliseName(rec.name);
    byName.set(key, [...(byName.get(key) ?? []), rec.id]);
  }
  for (const ids of byName.values()) {
    if (ids.length > 1) warnings.push(`Possible duplicate pandal name across records: ${ids.join(', ')}.`);
  }

  const missing = records.filter((r) => r.lat === null).length;
  if (missing > 0) {
    warnings.push(`${missing} of ${records.length} pandals have no coordinates. Routes need verified coordinates.`);
  }
  const unverified = records.filter((r) => r.verification !== 'verified').length;
  if (unverified > 0) {
    warnings.push(`${unverified} of ${records.length} records are not yet verified.`);
  }

  return { records, errors, warnings };
}

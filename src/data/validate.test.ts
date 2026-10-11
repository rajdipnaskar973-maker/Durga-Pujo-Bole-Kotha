import { describe, expect, it } from 'vitest';
import { parseCoordinate, validateDataset } from './validate';

const row = (over: Record<string, unknown> = {}) => ({
  id: 'kp-x',
  pandal_name: 'Test Pally',
  region: 'South',
  area_cluster: 'Test Area',
  latitude: '',
  longitude: '',
  verification_status: 'needs_verification',
  notes: '',
  google_maps_url: '',
  ...over,
});

describe('parseCoordinate', () => {
  it('keeps blank as null and never turns it into 0', () => {
    expect(parseCoordinate('', 'latitude')).toEqual({ value: null });
    expect(parseCoordinate(undefined, 'longitude')).toEqual({ value: null });
  });
  it('reads numbers and numeric text', () => {
    expect(parseCoordinate('22.57', 'latitude')).toEqual({ value: 22.57 });
    expect(parseCoordinate(88.36, 'longitude')).toEqual({ value: 88.36 });
  });
  it('rejects out-of-range and non-numeric values', () => {
    expect(parseCoordinate('95', 'latitude').error).toMatch(/outside/);
    expect(parseCoordinate('abc', 'longitude').error).toMatch(/not a number/);
  });
});

describe('validateDataset', () => {
  it('rejects input with no records list', () => {
    const result = validateDataset({ nothing: true });
    expect(result.records).toEqual([]);
    expect(result.errors[0]).toMatch(/records/);
  });

  it('skips records with missing id, name, or unknown region', () => {
    const result = validateDataset({
      records: [row({ id: '' }), row({ id: 'a', pandal_name: '' }), row({ id: 'b', region: 'West' }), row({ id: 'c' })],
    });
    expect(result.records.map((r) => r.id)).toEqual(['c']);
    expect(result.errors).toHaveLength(3);
  });

  it('flags duplicate ids and keeps the first one', () => {
    const result = validateDataset({ records: [row({ id: 'dup', pandal_name: 'One' }), row({ id: 'dup', pandal_name: 'Two' })] });
    expect(result.records.map((r) => r.name)).toEqual(['One']);
    expect(result.errors.join(' ')).toMatch(/Duplicate id "dup"/);
  });

  it('ignores coordinates that are out of range and records the error', () => {
    const result = validateDataset({ records: [row({ id: 'z', latitude: '120', longitude: '88' })] });
    expect(result.records[0].lat).toBeNull();
    expect(result.records[0].lng).toBeNull();
    expect(result.errors[0]).toMatch(/outside the allowed range/);
  });

  it('warns when only one coordinate is given', () => {
    const result = validateDataset({ records: [row({ id: 'half', latitude: '22.5', longitude: '' })] });
    expect(result.records[0].lat).toBeNull();
    expect(result.warnings.join(' ')).toMatch(/only one coordinate/);
  });

  it('keeps valid coordinates', () => {
    const result = validateDataset({ records: [row({ id: 'ok', latitude: '22.5726', longitude: '88.3639' })] });
    expect(result.records[0].lat).toBe(22.5726);
    expect(result.records[0].lng).toBe(88.3639);
  });

  it('warns about possible duplicate names, ignoring case and punctuation', () => {
    const result = validateDataset({
      records: [row({ id: 'p1', pandal_name: 'Kumartuli Park Sarbojanin' }), row({ id: 'p2', pandal_name: 'kumartuli park, sarbojanin' })],
    });
    expect(result.warnings.join(' ')).toMatch(/Possible duplicate pandal name across records: p1, p2/);
  });

  it('counts missing coordinates and unverified records in warnings', () => {
    const result = validateDataset({ records: [row({ id: 'a' }), row({ id: 'b' })] });
    expect(result.warnings).toContain('2 of 2 pandals have no coordinates. Routes need verified coordinates.');
    expect(result.warnings).toContain('2 of 2 records are not yet verified.');
  });
});

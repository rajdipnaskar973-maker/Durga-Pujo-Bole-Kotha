import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadPandalDataset } from './loadDataset';

// Loads the real starter file that ships in /public, not a copy.
const datasetPath = resolve(process.cwd(), 'public/kolkata_puja_pandals_starter_dataset.json');
const datasetText = readFileSync(datasetPath, 'utf-8');

const fakeFetch = (body: string, status = 200) =>
  (async () => new Response(body, { status })) as unknown as typeof fetch;

describe('starter dataset file', () => {
  it('loads all 122 records with no validation errors', async () => {
    const result = await loadPandalDataset('/x.json', fakeFetch(datasetText));
    expect(result.errors).toEqual([]);
    expect(result.records).toHaveLength(122);
  });

  it('has the expected count for each region', async () => {
    const { records } = await loadPandalDataset('/x.json', fakeFetch(datasetText));
    const count = (region: string) => records.filter((r) => r.region === region).length;
    expect(count('South')).toBe(43);
    expect(count('North')).toBe(69);
    expect(count('Central')).toBe(7);
    expect(count('East')).toBe(3);
  });

  it('has no coordinates yet, so none are invented', async () => {
    const { records } = await loadPandalDataset('/x.json', fakeFetch(datasetText));
    expect(records.every((r) => r.lat === null && r.lng === null)).toBe(true);
  });

  it('has unique ids', async () => {
    const { records } = await loadPandalDataset('/x.json', fakeFetch(datasetText));
    expect(new Set(records.map((r) => r.id)).size).toBe(records.length);
  });

  it('keeps the Salt Lake / New Town records in the East region', async () => {
    const { records } = await loadPandalDataset('/x.json', fakeFetch(datasetText));
    const east = records.filter((r) => r.region === 'East').map((r) => r.name);
    expect(east).toEqual(expect.arrayContaining(['AK Block Puja Salt Lake', 'EC Block Residents Association Salt Lake']));
  });

  it('includes the Shobhabazar Rajbari and Dum Dum Park entries used in the test trip', async () => {
    const { records } = await loadPandalDataset('/x.json', fakeFetch(datasetText));
    expect(records.some((r) => r.name === 'Shobhabazar Rajbari' && r.region === 'North')).toBe(true);
    expect(records.some((r) => r.name === 'Dum Dum Park Sarbojanin' && r.region === 'North')).toBe(true);
  });
});

describe('loadPandalDataset errors', () => {
  it('gives a clear message when the file is missing (HTTP 404)', async () => {
    await expect(loadPandalDataset('/missing.json', fakeFetch('Not found', 404))).rejects.toThrow(/not found at \/missing.json \(HTTP 404\)/);
  });

  it('gives a clear message when the file is not JSON', async () => {
    await expect(loadPandalDataset('/x.json', fakeFetch('<html>home page</html>'))).rejects.toThrow(/could not be read as JSON/);
  });

  it('gives a clear message when the network fails', async () => {
    const broken = (async () => {
      throw new TypeError('network down');
    }) as unknown as typeof fetch;
    await expect(loadPandalDataset('/x.json', broken)).rejects.toThrow(/Could not reach the dataset/);
  });
});

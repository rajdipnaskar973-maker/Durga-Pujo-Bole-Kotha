import { describe, expect, it } from 'vitest';
import { approximateOrder, buildLegs, mapsDirectionsUrl, parseLatLng, placeQuery, straightLineKm } from './routing';

describe('parseLatLng', () => {
  it('reads a pair copied from Google Maps', () => {
    expect(parseLatLng('22.5726, 88.3639').coord).toEqual({ lat: 22.5726, lng: 88.3639 });
  });
  it('treats blank as no coordinates, not an error', () => {
    expect(parseLatLng('   ')).toEqual({ coord: null });
  });
  it('rejects bad input with a message', () => {
    expect(parseLatLng('22.5').error).toMatch(/two numbers/);
    expect(parseLatLng('abc, def').error).toMatch(/must be numbers/);
    expect(parseLatLng('95, 88').error).toMatch(/valid range/);
  });
});

describe('straightLineKm', () => {
  it('gives roughly 111 km for one degree of longitude on the equator', () => {
    const km = straightLineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(km).toBeGreaterThan(111);
    expect(km).toBeLessThan(111.4);
  });
  it('is zero for the same point', () => {
    expect(straightLineKm({ lat: 22.5, lng: 88.3 }, { lat: 22.5, lng: 88.3 })).toBe(0);
  });
});

describe('approximateOrder', () => {
  it('returns every stop exactly once', () => {
    const stops = [
      { id: 'a', coord: { lat: 22.6, lng: 88.4 } },
      { id: 'b', coord: { lat: 22.5, lng: 88.3 } },
      { id: 'c', coord: { lat: 22.55, lng: 88.35 } },
    ];
    const order = approximateOrder({ lat: 22.5, lng: 88.3 }, stops, { lat: 22.7, lng: 88.5 });
    expect([...order].sort()).toEqual(['a', 'b', 'c']);
  });

  it('visits the stop closest to the start first, and a stop at the destination last', () => {
    const order = approximateOrder(
      { lat: 0, lng: 0 },
      [
        { id: 'at-destination', coord: { lat: 5, lng: 5 } },
        { id: 'near-start', coord: { lat: 0, lng: 0.01 } },
      ],
      { lat: 5, lng: 5 },
    );
    expect(order).toEqual(['near-start', 'at-destination']);
  });

  it('keeps going to the nearest next stop when none sit at the destination', () => {
    const order = approximateOrder(
      { lat: 0, lng: 0 },
      [
        { id: 'c', coord: { lat: 0, lng: 3 } },
        { id: 'a', coord: { lat: 0, lng: 1 } },
        { id: 'b', coord: { lat: 0, lng: 2 } },
      ],
      { lat: 10, lng: 10 },
    );
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty list when there are no stops', () => {
    expect(approximateOrder({ lat: 0, lng: 0 }, [], { lat: 1, lng: 1 })).toEqual([]);
  });
});

describe('Google Maps links', () => {
  it('encodes spaces and sets the travel mode', () => {
    const url = mapsDirectionsUrl('Sonarpur station, Kolkata', 'Dum Dum Park', 'transit');
    expect(url.startsWith('https://www.google.com/maps/dir/?api=1')).toBe(true);
    expect(url).toContain('origin=Sonarpur%20station%2C%20Kolkata');
    expect(url).toContain('destination=Dum%20Dum%20Park');
    expect(url.endsWith('&travelmode=transit')).toBe(true);
  });

  it('adds Kolkata to plain names but not when it is already there', () => {
    expect(placeQuery('Dum Dum Park', null)).toBe('Dum Dum Park, Kolkata, West Bengal');
    expect(placeQuery('Shobhabazar Rajbari, Kolkata', null)).toBe('Shobhabazar Rajbari, Kolkata');
  });

  it('uses coordinates when they exist', () => {
    expect(placeQuery('Anywhere', { lat: 22.5, lng: 88.3 })).toBe('22.5,88.3');
  });
});

describe('buildLegs', () => {
  it('marks a leg as not verified when a coordinate is missing', () => {
    const legs = buildLegs(
      [
        { label: 'Start', coord: null },
        { label: 'Pandal A', coord: { lat: 22.6, lng: 88.4 } },
      ],
      1.5,
    );
    expect(legs[0].straightLineKm).toBeNull();
    expect(legs[0].advice).toMatch(/not verified/);
  });

  it('says walking is fine within the limit, and suggests transport beyond it', () => {
    const near = buildLegs(
      [
        { label: 'A', coord: { lat: 22.5, lng: 88.3 } },
        { label: 'B', coord: { lat: 22.5, lng: 88.31 } },
      ],
      1.5,
    );
    expect(near[0].advice).toMatch(/within your 1.5 km walking limit/);

    const far = buildLegs(
      [
        { label: 'A', coord: { lat: 22.5, lng: 88.3 } },
        { label: 'B', coord: { lat: 22.6, lng: 88.4 } },
      ],
      1.5,
    );
    expect(far[0].advice).toMatch(/longer than your 1.5 km walking limit/);
  });

  it('creates one leg per neighbouring pair, with three link options each', () => {
    const legs = buildLegs(
      [
        { label: 'S', coord: null },
        { label: 'A', coord: null },
        { label: 'D', coord: null },
      ],
      1.5,
    );
    expect(legs).toHaveLength(2);
    expect(Object.keys(legs[0].links).sort()).toEqual(['driving', 'transit', 'walking']);
  });
});

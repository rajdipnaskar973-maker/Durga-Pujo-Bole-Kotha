import type { Coord } from '../types';

export interface ParsedCoord {
  coord: Coord | null;
  error?: string;
}

// Reads "22.5726, 88.3639" (as copied from Google Maps). Blank input means no coordinates.
export function parseLatLng(text: string): ParsedCoord {
  const trimmed = text.trim();
  if (trimmed === '') return { coord: null };
  const parts = trimmed.split(/[,\s]+/).filter(Boolean);
  if (parts.length !== 2) {
    return { coord: null, error: 'use two numbers, latitude then longitude, e.g. 22.5726, 88.3639' };
  }
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { coord: null, error: 'both values must be numbers' };
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { coord: null, error: 'the values are outside the valid range' };
  }
  return { coord: { lat, lng } };
}

const EARTH_RADIUS_KM = 6371;

// Straight-line ("as the crow flies") distance in km.
// This is NOT a road or walking distance. It is only used for estimates and ordering.
export function straightLineKm(a: Coord, b: Coord): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface OrderStop {
  id: string;
  coord: Coord;
}

// Stops this close (in km, straight line) to the destination are held back and visited last,
// so the trip finishes at the destination.
const NEAR_DESTINATION_KM = 0.3;

// Greedy "nearest next stop" ordering using straight-line distance.
// At each step it picks the closest unvisited stop to where you are now, but stops that sit at the
// destination are saved for the end. This is an approximation, not a guaranteed best route.
export function approximateOrder(start: Coord, stops: OrderStop[], destination: Coord): string[] {
  const remaining = [...stops];
  const order: string[] = [];
  let current = start;
  while (remaining.length > 0) {
    const notAtDestination = remaining.filter(
      (stop) => straightLineKm(stop.coord, destination) > NEAR_DESTINATION_KM,
    );
    const pool = notAtDestination.length > 0 ? notAtDestination : remaining;

    let chosen = pool[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const stop of pool) {
      const d = straightLineKm(current, stop.coord);
      if (d < bestDistance) {
        bestDistance = d;
        chosen = stop;
      }
    }
    remaining.splice(remaining.indexOf(chosen), 1);
    order.push(chosen.id);
    current = chosen.coord;
  }
  return order;
}

export type NavMode = 'walking' | 'transit' | 'driving';

// A Google Maps directions link. It opens navigation in the Google Maps app or website.
// It does not calculate a full itinerary inside this app.
export function mapsDirectionsUrl(origin: string, destination: string, mode: NavMode): string {
  return (
    'https://www.google.com/maps/dir/?api=1' +
    `&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}` +
    `&travelmode=${mode}`
  );
}

// Adds "Kolkata, West Bengal" to a plain name so Google finds the right place.
export function placeQuery(name: string, coord: Coord | null): string {
  if (coord) return `${coord.lat},${coord.lng}`;
  const trimmed = name.trim();
  return /kolkata/i.test(trimmed) ? trimmed : `${trimmed}, Kolkata, West Bengal`;
}

export interface RouteStop {
  label: string;
  coord: Coord | null;
}

export interface RouteLeg {
  from: string;
  to: string;
  straightLineKm: number | null;
  advice: string;
  links: Record<NavMode, string>;
}

// Builds one leg for every pair of neighbouring points: start -> stop 1 -> ... -> destination.
// Distances are straight-line only and are labelled that way. Missing coordinates give "not verified".
export function buildLegs(points: RouteStop[], maxWalkKm: number): RouteLeg[] {
  const legs: RouteLeg[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const km = from.coord && to.coord ? straightLineKm(from.coord, to.coord) : null;

    let advice: string;
    if (km === null) {
      advice = 'Distance not verified (missing coordinates). Check walking and transit on Google Maps.';
    } else if (km <= maxWalkKm) {
      advice =
        `About ${km.toFixed(2)} km in a straight line, within your ${maxWalkKm} km walking limit. ` +
        'A real walking route may be longer.';
    } else {
      advice =
        `About ${km.toFixed(2)} km in a straight line, longer than your ${maxWalkKm} km walking limit. ` +
        'Consider bus, metro, auto or cab. Check the options on Google Maps.';
    }

    const origin = placeQuery(from.label, from.coord);
    const destination = placeQuery(to.label, to.coord);
    legs.push({
      from: from.label,
      to: to.label,
      straightLineKm: km,
      advice,
      links: {
        walking: mapsDirectionsUrl(origin, destination, 'walking'),
        transit: mapsDirectionsUrl(origin, destination, 'transit'),
        driving: mapsDirectionsUrl(origin, destination, 'driving'),
      },
    });
  }
  return legs;
}

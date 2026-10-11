import { useMemo } from 'react';
import type { Coord, PandalRecord } from '../types';
import type { RouteMode, Trip } from '../logic/wizard';
import { approximateOrder, buildLegs, parseLatLng, type RouteStop } from '../logic/routing';

interface Props {
  trip: Trip;
  selected: PandalRecord[];
  routeMode: RouteMode;
  onMode: (mode: RouteMode) => void;
  onBack: () => void;
  onStartOver: () => void;
}

const coordOf = (r: PandalRecord): Coord | null => (r.lat !== null && r.lng !== null ? { lat: r.lat, lng: r.lng } : null);

export function RouteScreen({ trip, selected, routeMode, onMode, onBack, onStartOver }: Props) {
  const startCoord = parseLatLng(trip.startCoords).coord;
  const destCoord = parseLatLng(trip.destinationCoords).coord;

  // Recommended order needs coordinates for the start, the destination and every pandal.
  const allCoords = selected.every((r) => coordOf(r) !== null);
  const canRecommend = Boolean(startCoord && destCoord && allCoords);
  const recommendBlockReason = !startCoord || !destCoord
    ? 'Add starting and destination coordinates on the trip screen to enable this.'
    : 'Some pandals have no verified map location yet.';

  const orderedRecords = useMemo(() => {
    if (routeMode === 'recommended' && canRecommend && startCoord && destCoord) {
      const ids = approximateOrder(
        startCoord,
        selected.map((r) => ({ id: r.id, coord: coordOf(r)! })),
        destCoord,
      );
      const byId = new Map(selected.map((r) => [r.id, r]));
      return ids.map((id) => byId.get(id)!);
    }
    return selected;
  }, [routeMode, canRecommend, selected, startCoord, destCoord]);

  const points: RouteStop[] = useMemo(
    () => [
      { label: trip.start, coord: startCoord },
      ...orderedRecords.map((r) => ({ label: r.name, coord: coordOf(r) })),
      { label: trip.destination, coord: destCoord },
    ],
    [trip.start, trip.destination, startCoord, destCoord, orderedRecords],
  );

  const legs = useMemo(() => buildLegs(points, trip.maxWalkKm), [points, trip.maxWalkKm]);

  return (
    <section className="card" aria-labelledby="route-title">
      <h2 id="route-title">Your route</h2>

      <div className="segmented" role="group" aria-label="Route order">
        <button
          type="button"
          className={routeMode === 'fixed' ? 'active' : ''}
          aria-pressed={routeMode === 'fixed'}
          onClick={() => onMode('fixed')}
        >
          Fixed order (your order)
        </button>
        <button
          type="button"
          className={routeMode === 'recommended' ? 'active' : ''}
          aria-pressed={routeMode === 'recommended'}
          disabled={!canRecommend}
          onClick={() => onMode('recommended')}
        >
          Suggested order
        </button>
      </div>
      {!canRecommend && <p className="hint">{recommendBlockReason}</p>}
      {routeMode === 'recommended' && canRecommend && (
        <p className="notice">
          Suggested order is an approximation based on straight-line distances. It is not a guaranteed best route.
        </p>
      )}

      <p className="hint">
        Each leg shows a straight-line distance only. It is not a road or walking distance. Tap a link to see
        real routes in Google Maps.
      </p>

      <ol className="legs">
        {legs.map((leg, i) => (
          <li key={`${leg.from}-${leg.to}-${i}`} className="leg">
            <p className="leg-title">
              <span className="muted">Leg {i + 1}</span> {leg.from} → {leg.to}
            </p>
            <p className="leg-advice">{leg.advice}</p>
            <div className="links">
              <a href={leg.links.walking} target="_blank" rel="noopener noreferrer">
                Walk
              </a>
              <a href={leg.links.transit} target="_blank" rel="noopener noreferrer">
                Transit
              </a>
              <a href={leg.links.driving} target="_blank" rel="noopener noreferrer">
                Cab / auto
              </a>
            </div>
          </li>
        ))}
      </ol>

      <div className="row">
        <button type="button" className="secondary" onClick={onBack}>
          Back to review
        </button>
        <button type="button" className="link" onClick={onStartOver}>
          Start over
        </button>
      </div>
    </section>
  );
}

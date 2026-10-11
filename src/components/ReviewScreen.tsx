import type { PandalRecord, Region } from '../types';
import type { Trip } from '../logic/wizard';
import { REGION_LABELS } from '../config';

interface Props {
  trip: Trip;
  selected: PandalRecord[];
  completedRegions: Region[];
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onAddOptional: (region: Region) => void;
  onBack: () => void;
  onGenerate: () => void;
  onStartOver: () => void;
}

export function ReviewScreen({
  trip,
  selected,
  completedRegions,
  onMove,
  onRemove,
  onAddOptional,
  onBack,
  onGenerate,
  onStartOver,
}: Props) {
  const missing = selected.filter((r) => r.lat === null || r.lng === null).length;
  const regionsUsed = [...new Set(selected.map((r) => r.region))];
  const eastAvailable = !completedRegions.includes('East');

  return (
    <section className="card" aria-labelledby="review-title">
      <h2 id="review-title">Review your trip</h2>

      <dl className="summary">
        <dt>Start</dt>
        <dd>{trip.start || '—'}</dd>
        <dt>Final destination</dt>
        <dd>{trip.destination || '—'}</dd>
        <dt>Regions</dt>
        <dd>{regionsUsed.length ? regionsUsed.map((r) => REGION_LABELS[r]).join(', ') : 'None yet'}</dd>
        <dt>Pandals selected</dt>
        <dd>{selected.length}</dd>
        <dt>Max walking distance</dt>
        <dd>{trip.maxWalkKm} km</dd>
      </dl>

      {missing > 0 && (
        <p className="notice" role="status">
          {missing} selected pandal(s) have no map location yet. Distances for them cannot be calculated, and
          their legs will show "not verified".
        </p>
      )}

      {selected.length === 0 ? (
        <p className="hint">No pandals selected yet. Go Back to pick some.</p>
      ) : (
        <ol className="stops">
          {selected.map((rec, index) => (
            <li key={rec.id} className="stop">
              <div className="stop-info">
                <strong>{rec.name}</strong>
                <span className="muted">
                  {rec.area} · {REGION_LABELS[rec.region].split(' (')[0]}
                </span>
                {(rec.lat === null || rec.lng === null) && <span className="badge warn">No map location yet</span>}
              </div>
              <div className="stop-actions">
                <button type="button" className="icon" aria-label={`Move ${rec.name} up`} disabled={index === 0} onClick={() => onMove(rec.id, -1)}>
                  ↑
                </button>
                <button
                  type="button"
                  className="icon"
                  aria-label={`Move ${rec.name} down`}
                  disabled={index === selected.length - 1}
                  onClick={() => onMove(rec.id, 1)}
                >
                  ↓
                </button>
                <button type="button" className="icon danger" aria-label={`Remove ${rec.name}`} onClick={() => onRemove(rec.id)}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {eastAvailable && (
        <button type="button" className="secondary full" onClick={() => onAddOptional('East')}>
          Add East Kolkata / Salt Lake / New Town (optional)
        </button>
      )}

      <div className="row">
        <button type="button" className="secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="primary" onClick={onGenerate} disabled={selected.length === 0}>
          Generate route
        </button>
      </div>

      <button type="button" className="link" onClick={onStartOver}>
        Start over
      </button>
    </section>
  );
}

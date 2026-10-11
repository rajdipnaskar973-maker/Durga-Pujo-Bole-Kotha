import { useState } from 'react';
import { TRAVEL_MODES, type TravelMode } from '../types';
import { validateTrip, type Trip } from '../logic/wizard';

const MODE_LABELS: Record<TravelMode, string> = {
  any: 'No preference',
  walk: 'Walking',
  bus: 'Bus',
  metro: 'Metro',
  train: 'Train',
  auto: 'Auto',
  cab: 'Cab',
};

interface Props {
  trip: Trip;
  onChange: (patch: Partial<Trip>) => void;
  onNext: () => void;
}

export function TripForm({ trip, onChange, onNext }: Props) {
  const [showProblems, setShowProblems] = useState(false);
  const problems = validateTrip(trip);

  const handleNext = () => {
    setShowProblems(true);
    if (problems.length === 0) onNext();
  };

  return (
    <section className="card" aria-labelledby="trip-title">
      <h2 id="trip-title">Plan your trip</h2>
      <p className="hint">Tell us where you start and where you want to finish. You can change these later.</p>

      <label className="field">
        <span>Starting point *</span>
        <input
          type="text"
          value={trip.start}
          placeholder="e.g. Sonarpur station or a pandal name"
          onChange={(e) => onChange({ start: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Starting coordinates (optional, from Google Maps)</span>
        <input
          type="text"
          inputMode="decimal"
          value={trip.startCoords}
          placeholder="e.g. 22.5726, 88.3639"
          onChange={(e) => onChange({ startCoords: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Final destination *</span>
        <input
          type="text"
          value={trip.destination}
          placeholder="e.g. Dum Dum Park"
          onChange={(e) => onChange({ destination: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Destination coordinates (optional)</span>
        <input
          type="text"
          inputMode="decimal"
          value={trip.destinationCoords}
          placeholder="e.g. 22.6, 88.4"
          onChange={(e) => onChange({ destinationCoords: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Departure date and time (optional, noted only)</span>
        <input
          type="datetime-local"
          value={trip.departure}
          onChange={(e) => onChange({ departure: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Preferred travel mode</span>
        <select
          value={trip.preferredMode}
          onChange={(e) => onChange({ preferredMode: e.target.value as TravelMode })}
        >
          {TRAVEL_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Maximum walking distance (km)</span>
        <input
          type="number"
          min={0.1}
          max={5}
          step={0.1}
          value={trip.maxWalkKm}
          onChange={(e) => onChange({ maxWalkKm: Number(e.target.value) })}
        />
      </label>

      {showProblems && problems.length > 0 && (
        <ul className="problems" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <button type="button" className="primary" onClick={handleNext}>
        Next
      </button>
    </section>
  );
}

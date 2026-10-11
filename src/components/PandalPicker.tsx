import { useMemo, useState } from 'react';
import { REGION_LABELS } from '../config';
import type { PandalRecord, Region } from '../types';
import { areasIn, filterPandals, groupByArea } from '../logic/selection';

interface Props {
  region: Region;
  records: PandalRecord[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectIds: (ids: string[]) => void;
  onDeselectIds: (ids: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PandalPicker({
  region,
  records,
  selectedIds,
  onToggle,
  onSelectIds,
  onDeselectIds,
  onNext,
  onBack,
}: Props) {
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');

  const regionRecords = useMemo(() => records.filter((r) => r.region === region), [records, region]);
  const areas = useMemo(() => areasIn(records, region), [records, region]);
  const visible = useMemo(
    () => filterPandals(regionRecords, { region, area, query }),
    [regionRecords, region, area, query],
  );
  const groups = useMemo(() => groupByArea(visible), [visible]);
  const selectedSet = new Set(selectedIds);
  const visibleIds = visible.map((r) => r.id);
  const selectedInRegion = regionRecords.filter((r) => selectedSet.has(r.id)).length;

  return (
    <section className="card" aria-labelledby="picker-title">
      <h2 id="picker-title">{REGION_LABELS[region]}</h2>
      <p className="hint">Tick the pandals you want to visit. Your ticks are kept when you go Back.</p>
      <p className="count">
        Selected in this region: {selectedInRegion} · Selected overall: {selectedIds.length}
      </p>

      <label className="field">
        <span>Search by pandal name</span>
        <input
          type="search"
          value={query}
          placeholder="Type part of a name"
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <label className="field">
        <span>Area</span>
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">All areas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>

      <div className="row">
        <button type="button" className="secondary" onClick={() => onSelectIds(visibleIds)} disabled={visibleIds.length === 0}>
          Select all shown ({visibleIds.length})
        </button>
        <button type="button" className="secondary" onClick={() => onDeselectIds(visibleIds)} disabled={visibleIds.length === 0}>
          Clear shown
        </button>
      </div>

      {groups.length === 0 && <p className="hint">No pandals match your search.</p>}

      {groups.map((group) => (
        <fieldset key={group.area} className="group">
          <legend>{group.area}</legend>
          {group.items.map((rec) => {
            const checked = selectedSet.has(rec.id);
            const hasCoords = rec.lat !== null && rec.lng !== null;
            return (
              <label key={rec.id} className={`pandal-row${checked ? ' checked' : ''}`}>
                <input type="checkbox" checked={checked} onChange={() => onToggle(rec.id)} />
                <span className="pandal-text">
                  <span className="pandal-name">{rec.name}</span>
                  <span className="badges">
                    <span className="badge">{rec.verification === 'verified' ? 'Verified' : 'Needs verification'}</span>
                    <span className={`badge ${hasCoords ? 'ok' : 'warn'}`}>
                      {hasCoords ? 'Map location saved' : 'No map location yet'}
                    </span>
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      ))}

      <div className="row">
        <button type="button" className="secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="primary" onClick={onNext}>
          Next
        </button>
      </div>
    </section>
  );
}

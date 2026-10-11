import { REGION_LABELS } from '../config';
import type { Region } from '../types';

interface Props {
  title: string;
  intro: string;
  options: Region[];
  onChoose: (region: Region) => void;
  onSkip?: () => void;
  skipLabel?: string;
  onBack?: () => void;
  selectedCount: number;
}

// Used for "choose your first region" and "add another region?".
export function RegionChoice({ title, intro, options, onChoose, onSkip, skipLabel, onBack, selectedCount }: Props) {
  return (
    <section className="card" aria-labelledby="region-title">
      <h2 id="region-title">{title}</h2>
      <p className="hint">{intro}</p>
      <p className="count">Pandals selected so far: {selectedCount}</p>

      <div className="stack">
        {options.map((region) => (
          <button key={region} type="button" className="region-button" onClick={() => onChoose(region)}>
            {REGION_LABELS[region]}
          </button>
        ))}
      </div>

      <div className="row">
        {onBack && (
          <button type="button" className="secondary" onClick={onBack}>
            Back
          </button>
        )}
        {onSkip && (
          <button type="button" className="secondary" onClick={onSkip}>
            {skipLabel ?? 'Skip'}
          </button>
        )}
      </div>
    </section>
  );
}

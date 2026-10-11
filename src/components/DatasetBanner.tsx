import { REGIONS, type PandalRecord, type ValidationResult } from '../types';

interface Props {
  data: ValidationResult;
}

// Shows what was loaded, plus any problems the validator found.
export function DatasetBanner({ data }: Props) {
  const records: PandalRecord[] = data.records;
  const withCoords = records.filter((r) => r.lat !== null && r.lng !== null).length;
  const counts = REGIONS.map((region) => ({
    region,
    count: records.filter((r) => r.region === region).length,
  }));

  return (
    <section className="banner" aria-label="Dataset status">
      <p className="banner-main">
        <strong>{records.length}</strong> pandals loaded
        {' · '}
        {counts.map((c) => `${c.region} ${c.count}`).join(' · ')}
      </p>
      <p className="banner-sub">
        {withCoords} of {records.length} have verified map coordinates.
      </p>
      {data.errors.length > 0 && (
        <details>
          <summary>{data.errors.length} record problem(s) skipped</summary>
          <ul>
            {data.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </details>
      )}
      {data.warnings.length > 0 && (
        <details>
          <summary>{data.warnings.length} warning(s)</summary>
          <ul>
            {data.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

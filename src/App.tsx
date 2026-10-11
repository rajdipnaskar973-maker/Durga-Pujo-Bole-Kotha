import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { APP_NAME, MAIN_REGIONS } from './config';
import { loadPandalDataset } from './data/loadDataset';
import type { PandalRecord, ValidationResult } from './types';
import { initialWizardState, remainingRegions, wizardReducer, type Screen } from './logic/wizard';
import { DatasetBanner } from './components/DatasetBanner';
import { TripForm } from './components/TripForm';
import { RegionChoice } from './components/RegionChoice';
import { PandalPicker } from './components/PandalPicker';
import { ReviewScreen } from './components/ReviewScreen';
import { RouteScreen } from './components/RouteScreen';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ValidationResult };

const STEP_LABELS: Record<Screen, string> = {
  trip: 'Trip',
  chooseRegion: 'Region',
  pick: 'Pandals',
  addMore: 'More regions',
  review: 'Review',
  route: 'Route',
};

export default function App() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoad({ status: 'loading' });
    loadPandalDataset()
      .then((data) => {
        if (!cancelled) setLoad({ status: 'ready', data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoad({ status: 'error', message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>{APP_NAME}</h1>
        <p>Kolkata Durga Puja pandal planner</p>
      </header>
      <main className="app-main">
        {load.status === 'loading' && <p className="loading" role="status">Loading the pandal list…</p>}
        {load.status === 'error' && (
          <section className="card error" role="alert">
            <h2>Could not load the pandal list</h2>
            <p>{load.message}</p>
            <button type="button" className="primary" onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </button>
          </section>
        )}
        {load.status === 'ready' && (
          <>
            <DatasetBanner data={load.data} />
            <Wizard records={load.data.records} />
          </>
        )}
      </main>
    </div>
  );
}

function Wizard({ records }: { records: PandalRecord[] }) {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  const byId = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);
  const selected = useMemo(
    () => state.selectedIds.map((id) => byId.get(id)).filter((r): r is PandalRecord => Boolean(r)),
    [state.selectedIds, byId],
  );

  const stepIndex = ['trip', 'chooseRegion', 'pick', 'addMore', 'review', 'route'].indexOf(state.screen);
  const stepTotal = 6;

  let body: ReactNode;
  switch (state.screen) {
    case 'trip':
      body = (
        <TripForm
          trip={state.trip}
          onChange={(patch) => dispatch({ type: 'SET_TRIP', patch })}
          onNext={() => dispatch({ type: 'TRIP_NEXT' })}
        />
      );
      break;

    case 'chooseRegion':
      body = (
        <RegionChoice
          title="Choose your first region"
          intro="Pick the area you want to explore first. You can add more regions after this."
          options={MAIN_REGIONS}
          selectedCount={state.selectedIds.length}
          onChoose={(region) => dispatch({ type: 'OPEN_REGION', region })}
          onBack={() => dispatch({ type: 'BACK' })}
        />
      );
      break;

    case 'pick':
      if (!state.currentRegion) {
        body = <p>No region chosen.</p>;
        break;
      }
      body = (
        <PandalPicker
          region={state.currentRegion}
          records={records}
          selectedIds={state.selectedIds}
          onToggle={(id) => dispatch({ type: 'TOGGLE_PANDAL', id })}
          onSelectIds={(ids) => dispatch({ type: 'SELECT_IDS', ids })}
          onDeselectIds={(ids) => dispatch({ type: 'DESELECT_IDS', ids })}
          onNext={() => dispatch({ type: 'PICK_NEXT' })}
          onBack={() => dispatch({ type: 'BACK' })}
        />
      );
      break;

    case 'addMore':
      body = (
        <RegionChoice
          title="Add another region?"
          intro="Choose another region to add pandals from, or skip to review what you have."
          options={remainingRegions(state.completedRegions)}
          selectedCount={state.selectedIds.length}
          onChoose={(region) => dispatch({ type: 'OPEN_REGION', region })}
          onSkip={() => dispatch({ type: 'SKIP_ADDITIONAL' })}
          skipLabel="Skip and review my selections"
          onBack={() => dispatch({ type: 'BACK' })}
        />
      );
      break;

    case 'review':
      body = (
        <ReviewScreen
          trip={state.trip}
          selected={selected}
          completedRegions={state.completedRegions}
          onMove={(id, direction) => dispatch({ type: 'MOVE_STOP', id, direction })}
          onRemove={(id) => dispatch({ type: 'REMOVE_STOP', id })}
          onAddOptional={(region) => dispatch({ type: 'OPEN_REGION', region })}
          onBack={() => dispatch({ type: 'BACK' })}
          onGenerate={() => dispatch({ type: 'GENERATE_ROUTE' })}
          onStartOver={() => {
            if (window.confirm('Start over? Your trip details and selections will be cleared.')) {
              dispatch({ type: 'START_OVER' });
            }
          }}
        />
      );
      break;

    case 'route':
      body = (
        <RouteScreen
          trip={state.trip}
          selected={selected}
          routeMode={state.routeMode}
          onMode={(mode) => dispatch({ type: 'SET_ROUTE_MODE', mode })}
          onBack={() => dispatch({ type: 'BACK' })}
          onStartOver={() => {
            if (window.confirm('Start over? Your trip details and selections will be cleared.')) {
              dispatch({ type: 'START_OVER' });
            }
          }}
        />
      );
      break;
  }

  return (
    <div className="wizard">
      <nav className="steps" aria-label="Progress">
        <span>
          Step {stepIndex + 1} of {stepTotal}: {STEP_LABELS[state.screen]}
        </span>
        <progress value={stepIndex + 1} max={stepTotal} />
      </nav>
      {body}
      <p className="footnote">
        Your choices are kept in memory. Refreshing the page clears them. Saved plans are not built yet.
      </p>
    </div>
  );
}

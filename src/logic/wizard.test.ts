import { describe, expect, it } from 'vitest';
import { initialWizardState, remainingRegions, validateTrip, wizardReducer, type WizardState } from './wizard';

const readyTrip = {
  ...initialWizardState.trip,
  start: 'Sonarpur station',
  destination: 'Dum Dum Park',
};

const ready = (over: Partial<WizardState> = {}): WizardState => ({
  ...initialWizardState,
  trip: readyTrip,
  ...over,
});

describe('trip validation', () => {
  it('requires a start and a destination', () => {
    const problems = validateTrip(initialWizardState.trip);
    expect(problems).toContain('Enter a starting point.');
    expect(problems).toContain('Enter a final destination.');
  });

  it('blocks Next until the trip is valid', () => {
    const blocked = wizardReducer(initialWizardState, { type: 'TRIP_NEXT' });
    expect(blocked.screen).toBe('trip');
    const moved = wizardReducer(ready(), { type: 'TRIP_NEXT' });
    expect(moved.screen).toBe('chooseRegion');
  });

  it('checks the walking distance range (default 1.5 km)', () => {
    expect(initialWizardState.trip.maxWalkKm).toBe(1.5);
    expect(validateTrip({ ...readyTrip, maxWalkKm: 0 })[0]).toMatch(/between 0.1 and 5/);
    expect(validateTrip({ ...readyTrip, maxWalkKm: 2 })).toEqual([]);
  });

  it('rejects malformed optional coordinates', () => {
    expect(validateTrip({ ...readyTrip, startCoords: '22.5' }).some((p) => p.startsWith('Starting coordinates'))).toBe(true);
    expect(validateTrip({ ...readyTrip, destinationCoords: '22.5, 88.4' })).toEqual([]);
  });
});

describe('guided region flow', () => {
  it('South then North then Central goes to review after Central', () => {
    let s = ready({ screen: 'chooseRegion' });
    s = wizardReducer(s, { type: 'OPEN_REGION', region: 'South' });
    expect(s.screen).toBe('pick');
    s = wizardReducer(s, { type: 'PICK_NEXT' });
    expect(s.screen).toBe('addMore');
    expect(remainingRegions(s.completedRegions)).toEqual(['North', 'Central']);

    s = wizardReducer(s, { type: 'OPEN_REGION', region: 'North' });
    s = wizardReducer(s, { type: 'PICK_NEXT' });
    expect(s.screen).toBe('addMore');
    expect(remainingRegions(s.completedRegions)).toEqual(['Central']);

    s = wizardReducer(s, { type: 'OPEN_REGION', region: 'Central' });
    s = wizardReducer(s, { type: 'PICK_NEXT' });
    expect(s.completedRegions).toEqual(['South', 'North', 'Central']);
    expect(s.screen).toBe('review');
  });

  it('Skip stops adding regions and keeps the selections already made', () => {
    let s = ready({ screen: 'chooseRegion' });
    s = wizardReducer(s, { type: 'OPEN_REGION', region: 'South' });
    s = wizardReducer(s, { type: 'TOGGLE_PANDAL', id: 'kp-001' });
    s = wizardReducer(s, { type: 'PICK_NEXT' });
    s = wizardReducer(s, { type: 'SKIP_ADDITIONAL' });
    expect(s.screen).toBe('review');
    expect(s.selectedIds).toEqual(['kp-001']);
  });

  it('can start from North instead and does not repeat completed regions', () => {
    let s = ready({ screen: 'chooseRegion' });
    s = wizardReducer(s, { type: 'OPEN_REGION', region: 'North' });
    s = wizardReducer(s, { type: 'PICK_NEXT' });
    expect(remainingRegions(s.completedRegions)).toEqual(['South', 'Central']);
    expect(remainingRegions(s.completedRegions)).not.toContain('North');
  });

  it('Back from the add-more screen returns to the same region checklist', () => {
    let s = ready({ screen: 'chooseRegion' });
    s = wizardReducer(s, { type: 'OPEN_REGION', region: 'South' });
    s = wizardReducer(s, { type: 'TOGGLE_PANDAL', id: 'kp-003' });
    s = wizardReducer(s, { type: 'PICK_NEXT' });
    s = wizardReducer(s, { type: 'BACK' });
    expect(s.screen).toBe('pick');
    expect(s.currentRegion).toBe('South');
    expect(s.selectedIds).toEqual(['kp-003']);
  });

  it('Back returns to the previous screen with selections intact', () => {
    let s = ready({ screen: 'chooseRegion' });
    s = wizardReducer(s, { type: 'OPEN_REGION', region: 'South' });
    s = wizardReducer(s, { type: 'TOGGLE_PANDAL', id: 'kp-002' });
    s = wizardReducer(s, { type: 'BACK' });
    expect(s.screen).toBe('chooseRegion');
    expect(s.selectedIds).toEqual(['kp-002']);
  });

  it('optional East region can be added from review and then returns to review', () => {
    let s = ready({ screen: 'review', completedRegions: ['South'] });
    s = wizardReducer(s, { type: 'OPEN_REGION', region: 'East' });
    s = wizardReducer(s, { type: 'PICK_NEXT' });
    expect(s.completedRegions).toEqual(['South', 'East']);
    expect(s.screen).toBe('addMore');
    s = wizardReducer(s, { type: 'SKIP_ADDITIONAL' });
    expect(s.screen).toBe('review');
  });
});

describe('selection and stop order', () => {
  it('select all adds without duplicates, deselect removes', () => {
    let s = ready({ selectedIds: ['a'] });
    s = wizardReducer(s, { type: 'SELECT_IDS', ids: ['a', 'b', 'c'] });
    expect(s.selectedIds).toEqual(['a', 'b', 'c']);
    s = wizardReducer(s, { type: 'DESELECT_IDS', ids: ['b'] });
    expect(s.selectedIds).toEqual(['a', 'c']);
  });

  it('moves stops up and down and does nothing at the ends', () => {
    let s = ready({ selectedIds: ['a', 'b', 'c'] });
    s = wizardReducer(s, { type: 'MOVE_STOP', id: 'c', direction: -1 });
    expect(s.selectedIds).toEqual(['a', 'c', 'b']);
    s = wizardReducer(s, { type: 'MOVE_STOP', id: 'a', direction: -1 });
    expect(s.selectedIds).toEqual(['a', 'c', 'b']);
  });

  it('will not generate a route with no pandals selected', () => {
    const s = wizardReducer(ready({ screen: 'review' }), { type: 'GENERATE_ROUTE' });
    expect(s.screen).toBe('review');
    const routed = wizardReducer(ready({ screen: 'review', selectedIds: ['a'] }), { type: 'GENERATE_ROUTE' });
    expect(routed.screen).toBe('route');
  });

  it('Start over resets everything', () => {
    const s = wizardReducer(ready({ selectedIds: ['a'], screen: 'route' }), { type: 'START_OVER' });
    expect(s).toEqual(initialWizardState);
  });
});

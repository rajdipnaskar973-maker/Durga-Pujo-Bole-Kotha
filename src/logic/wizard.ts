import { DEFAULT_MAX_WALK_KM, MAIN_REGIONS } from '../config';
import type { Region, TravelMode } from '../types';
import { parseLatLng } from './routing';

export interface Trip {
  start: string;
  startCoords: string; // optional, "lat, lng"
  destination: string;
  destinationCoords: string; // optional, "lat, lng"
  departure: string; // optional, noted only; Google Maps links do not use it
  preferredMode: TravelMode;
  maxWalkKm: number;
}

export type Screen = 'trip' | 'chooseRegion' | 'pick' | 'addMore' | 'review' | 'route';
export type RouteMode = 'fixed' | 'recommended';

export interface WizardState {
  screen: Screen;
  history: Screen[];
  trip: Trip;
  currentRegion: Region | null;
  completedRegions: Region[];
  selectedIds: string[]; // in the order the user wants to visit them
  routeMode: RouteMode;
}

export const initialTrip: Trip = {
  start: '',
  startCoords: '',
  destination: '',
  destinationCoords: '',
  departure: '',
  preferredMode: 'any',
  maxWalkKm: DEFAULT_MAX_WALK_KM,
};

export const initialWizardState: WizardState = {
  screen: 'trip',
  history: [],
  trip: initialTrip,
  currentRegion: null,
  completedRegions: [],
  selectedIds: [],
  routeMode: 'fixed',
};

// Returns plain-English problems. An empty list means the trip details are good to go.
export function validateTrip(trip: Trip): string[] {
  const problems: string[] = [];
  if (!trip.start.trim()) problems.push('Enter a starting point.');
  if (!trip.destination.trim()) problems.push('Enter a final destination.');
  if (!(trip.maxWalkKm >= 0.1 && trip.maxWalkKm <= 5)) {
    problems.push('Maximum walking distance must be between 0.1 and 5 km.');
  }
  const start = parseLatLng(trip.startCoords);
  if (start.error) problems.push(`Starting coordinates: ${start.error}.`);
  const destination = parseLatLng(trip.destinationCoords);
  if (destination.error) problems.push(`Destination coordinates: ${destination.error}.`);
  return problems;
}

// Main regions that have not been completed yet, in the usual order.
export function remainingRegions(completed: Region[]): Region[] {
  return MAIN_REGIONS.filter((r) => !completed.includes(r));
}

export type WizardAction =
  | { type: 'SET_TRIP'; patch: Partial<Trip> }
  | { type: 'TRIP_NEXT' }
  | { type: 'OPEN_REGION'; region: Region }
  | { type: 'TOGGLE_PANDAL'; id: string }
  | { type: 'SELECT_IDS'; ids: string[] }
  | { type: 'DESELECT_IDS'; ids: string[] }
  | { type: 'PICK_NEXT' }
  | { type: 'SKIP_ADDITIONAL' }
  | { type: 'MOVE_STOP'; id: string; direction: -1 | 1 }
  | { type: 'REMOVE_STOP'; id: string }
  | { type: 'GENERATE_ROUTE' }
  | { type: 'SET_ROUTE_MODE'; mode: RouteMode }
  | { type: 'BACK' }
  | { type: 'START_OVER' };

function go(state: WizardState, next: Screen): WizardState {
  return { ...state, history: [...state.history, state.screen], screen: next };
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_TRIP':
      return { ...state, trip: { ...state.trip, ...action.patch } };

    case 'TRIP_NEXT':
      return validateTrip(state.trip).length === 0 ? go(state, 'chooseRegion') : state;

    case 'OPEN_REGION':
      return { ...go(state, 'pick'), currentRegion: action.region };

    case 'TOGGLE_PANDAL':
      return {
        ...state,
        selectedIds: state.selectedIds.includes(action.id)
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
      };

    case 'SELECT_IDS': {
      const toAdd = action.ids.filter((id) => !state.selectedIds.includes(id));
      return { ...state, selectedIds: [...state.selectedIds, ...toAdd] };
    }

    case 'DESELECT_IDS':
      return { ...state, selectedIds: state.selectedIds.filter((id) => !action.ids.includes(id)) };

    case 'PICK_NEXT': {
      if (!state.currentRegion) return state;
      const completed = state.completedRegions.includes(state.currentRegion)
        ? state.completedRegions
        : [...state.completedRegions, state.currentRegion];
      const nextScreen: Screen = remainingRegions(completed).length > 0 ? 'addMore' : 'review';
      // The region stays set, so Back from the next screen returns to the same checklist.
      return go({ ...state, completedRegions: completed }, nextScreen);
    }

    case 'SKIP_ADDITIONAL':
      return go(state, 'review');

    case 'MOVE_STOP': {
      const index = state.selectedIds.indexOf(action.id);
      const target = index + action.direction;
      if (index === -1 || target < 0 || target >= state.selectedIds.length) return state;
      const ids = [...state.selectedIds];
      [ids[index], ids[target]] = [ids[target], ids[index]];
      return { ...state, selectedIds: ids };
    }

    case 'REMOVE_STOP':
      return { ...state, selectedIds: state.selectedIds.filter((id) => id !== action.id) };

    case 'GENERATE_ROUTE':
      return state.selectedIds.length > 0 ? go(state, 'route') : state;

    case 'SET_ROUTE_MODE':
      return { ...state, routeMode: action.mode };

    case 'BACK': {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      return { ...state, screen: previous, history: state.history.slice(0, -1) };
    }

    case 'START_OVER':
      return initialWizardState;

    default:
      return state;
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import App from './App';

const datasetText = readFileSync(resolve(process.cwd(), 'public/kolkata_puja_pandals_starter_dataset.json'), 'utf-8');

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(datasetText, { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openPickerFor(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/Starting point/), 'Sonarpur station');
  await user.type(screen.getByLabelText(/Final destination/), 'Dum Dum Park');
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('button', { name: /South Kolkata/ }));
}

describe('Durga Pujo Bole Kotha guided flow', () => {
  it('shows the app name and the loaded dataset counts', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Durga Pujo Bole Kotha' })).toBeTruthy();
    expect(await screen.findByText(/pandals loaded/)).toBeTruthy();
    expect(screen.getByText(/0 of 122 have verified map coordinates/)).toBeTruthy();
  });

  it('will not move past the trip screen without a start and destination', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByLabelText(/Starting point/);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert').textContent).toMatch(/Enter a starting point/);
    expect(screen.queryByRole('button', { name: /South Kolkata/ })).toBeNull();
  });

  it('runs South, pick, Skip, review, and keeps selections when going Back', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPickerFor(user);

    // Only South pandals are shown.
    expect(screen.getByRole('heading', { name: 'South Kolkata' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /75 Pally/ })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /Kumartuli/ })).toBeNull();

    await user.click(screen.getByRole('checkbox', { name: /75 Pally/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    // Remaining regions are offered.
    expect(screen.getByRole('heading', { name: 'Add another region?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /North Kolkata/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Central Kolkata/ })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Skip/ }));
    expect(screen.getByRole('heading', { name: 'Review your trip' })).toBeTruthy();
    expect(screen.getByText('75 Pally')).toBeTruthy();

    // Back twice: the earlier tick is still there.
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect((screen.getByRole('checkbox', { name: /75 Pally/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('adds North after South and keeps South selections', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPickerFor(user);
    await user.click(screen.getByRole('checkbox', { name: /75 Pally/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: /North Kolkata/ }));

    expect(screen.getByRole('heading', { name: 'North Kolkata' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /Shobhabazar Rajbari/ })).toBeTruthy();
    expect(screen.getByText(/Selected overall: 1/)).toBeTruthy();
  });

  it('searches by name and shows a message when nothing matches', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPickerFor(user);
    await user.type(screen.getByRole('searchbox'), 'zzzz');
    expect(screen.getByText('No pandals match your search.')).toBeTruthy();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'Behala');
    expect(screen.getByRole('checkbox', { name: /Behala Friends/ })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /75 Pally/ })).toBeNull();
  });

  it('builds a route with straight-line honesty and cab/transit links', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openPickerFor(user);
    await user.click(screen.getByRole('checkbox', { name: /75 Pally/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: /Skip/ }));
    await user.click(screen.getByRole('button', { name: 'Generate route' }));

    expect(screen.getByRole('heading', { name: 'Your route' })).toBeTruthy();
    expect(screen.getAllByText(/Distance not verified/).length).toBe(2);
    const transitLinks = screen.getAllByRole('link', { name: 'Transit' });
    expect(transitLinks).toHaveLength(2);
    expect(transitLinks[0].getAttribute('href')).toContain('travelmode=transit');
    expect(screen.getByRole('button', { name: 'Suggested order' }).hasAttribute('disabled')).toBe(true);
  });
});

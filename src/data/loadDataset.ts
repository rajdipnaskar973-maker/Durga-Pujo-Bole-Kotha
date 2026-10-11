import { DATASET_URL } from '../config';
import type { ValidationResult } from '../types';
import { validateDataset } from './validate';

// Loads the JSON file from the public folder and checks it.
// Throws a plain-English error if the file is missing, unreadable or not JSON.
export async function loadPandalDataset(
  url: string = DATASET_URL,
  fetchImpl: typeof fetch = fetch,
): Promise<ValidationResult> {
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch {
    throw new Error(`Could not reach the dataset at ${url}. Check your internet connection and reload.`);
  }
  if (!response.ok) {
    throw new Error(
      `The dataset file was not found at ${url} (HTTP ${response.status}). ` +
        'Put kolkata_puja_pandals_starter_dataset.json in the public folder.',
    );
  }

  const text = await response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(
      'The dataset file could not be read as JSON. Check that the file is in the public folder. ' +
        'If it is missing, the server may be returning a web page instead.',
    );
  }
  return validateDataset(raw);
}

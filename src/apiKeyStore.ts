import type { ApiKeys } from './types.ts';

const STORAGE_KEY = 'tidoo_api_keys';

export function getApiKeys(): ApiKeys | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiKeys;
  } catch {
    return null;
  }
}

export function saveApiKeys(keys: ApiKeys): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function clearApiKeys(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasApiKeys(): boolean {
  return getApiKeys() !== null;
}

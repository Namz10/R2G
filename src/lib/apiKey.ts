// BYOK Key Storage Service
// Spec §12.3 & prompt instructions:
// Key stored ONLY in browser sessionStorage, never in localStorage,
// never logged, never in code, env files, or URLs.

const SESSION_STORAGE_KEY = 'r2g_gemini_api_key';

export function getApiKey(): string {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (!trimmed) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      sessionStorage.setItem(SESSION_STORAGE_KEY, trimmed);
    }
  } catch {
    // sessionStorage might fail in restricted environments
  }
}

export function clearApiKey(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

export function hasApiKey(): boolean {
  return Boolean(getApiKey());
}

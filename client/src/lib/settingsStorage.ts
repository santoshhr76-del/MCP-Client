const STORAGE_KEY = "tally_mcp_settings";

interface PersistedSettings {
  serverUrl?: string;
  tallyUrl?: string;
  hasAuthToken?: boolean;
}

export function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedSettings;
  } catch {
    return {};
  }
}

export function saveSettings(settings: PersistedSettings): void {
  try {
    const existing = loadSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...settings }));
  } catch {
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}

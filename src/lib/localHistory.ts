import { HistoryItem } from '../types';

const LOCAL_HISTORY_KEY = 'ai_video_client_generations';

export function getSavedLocalHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage errors
  }
  return [];
}

export function saveLocalHistory(item: HistoryItem): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedLocalHistory();
    const updated = [item, ...existing.filter((x) => x.id !== item.id)].slice(0, 30);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

export function deleteLocalHistoryItem(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedLocalHistory();
    const updated = existing.filter((x) => x.id !== id);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

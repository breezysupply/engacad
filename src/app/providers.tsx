import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ProgressStore } from '../progress/store';
import type { ProgressState } from '../progress/model';
import { getRuntime, type RuntimeStatus } from '../runtime/python/client';

const StoreContext = createContext<ProgressStore | null>(null);

export function ProgressProvider({ store, children }: { store: ProgressStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): ProgressStore {
  const s = useContext(StoreContext);
  if (!s) throw new Error('ProgressProvider missing');
  return s;
}

export function useProgress(): ProgressState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState);
}

export function useRuntimeStatus(): RuntimeStatus {
  const [status, setStatus] = useState<RuntimeStatus>(() => getRuntime().status);
  useEffect(() => getRuntime().subscribe(setStatus), []);
  return status;
}

/** Applies the theme setting to <html> and mirrors it for the pre-paint script. */
export function ThemeEffect() {
  const { settings } = useProgress();
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = settings.theme;
    try {
      localStorage.setItem('engacad.theme', settings.theme);
    } catch {
      /* storage may be blocked; theme still applies for this session */
    }
  }, [settings.theme]);
  return null;
}

/** Re-render periodically so "due" states stay current in a long session. */
export function useNow(intervalMs = 60_000): string {
  const [now, setNow] = useState(() => new Date().toISOString());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date().toISOString()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

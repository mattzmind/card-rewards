/* App state: the wallet and settings, saved on the phone with the same shape as the
   web app's "cardmax-v3" storage, so a web backup file imports 1:1. */
import Storage from 'expo-sqlite/kv-store';
import { useMemo } from 'react';
import { create } from 'zustand';

import catalogJson from '@/assets/catalog.json';
import { makeClock } from '@/core/dates';
import { type Ctx, normalize } from '@/core/engine';
import type { AppState, Catalog, WalletCard } from '@/core/types';

const KEY = 'cardmax-v3', CAT_KEY = 'cardmax-catalog';
const CATALOG_URL = 'https://mattzmind.github.io/card-rewards/catalog.json';
const BUNDLED = catalogJson as unknown as Catalog;

export function fresh(): AppState {
  return { people: [{ id: 'me', name: 'Me' }], wallet: [], recents: [], usage: {}, reports: [], favs: [], profile: { name: '', theme: 'system' } };
}
/* Fill in anything an older save or a web backup might be missing */
export function upgrade(s: Partial<AppState>): AppState {
  const st = { ...fresh(), ...s } as AppState;
  st.wallet = (st.wallet || []).map(w => normalize(w));
  st.recents = st.recents || []; st.usage = st.usage || {}; st.reports = st.reports || []; st.favs = st.favs || [];
  const pr = { ...(st.profile || {}) } as AppState['profile'];
  if (pr.name == null) { const p = (st.people || []).find(p => p.name && p.name !== 'Me'); pr.name = p ? p.name : ''; }
  pr.theme = pr.theme || 'system';
  st.profile = pr;
  return st;
}
function loadState(): AppState {
  try { const raw = Storage.getItemSync(KEY); if (raw) return upgrade(JSON.parse(raw)); } catch {}
  return fresh();
}
function loadCatalog(): Catalog {
  try { const c = JSON.parse(Storage.getItemSync(CAT_KEY) || 'null'); if (c && c.products && c.version > BUNDLED.version) return c; } catch {}
  return BUNDLED;
}

interface Store {
  state: AppState;
  catalog: Catalog;
  /* Change the saved state; the updater gets a copy it can mutate */
  update: (fn: (s: AppState) => void) => void;
  replace: (s: AppState) => void;
  syncCatalog: () => Promise<void>;
}

export const useApp = create<Store>((set, get) => ({
  state: loadState(),
  catalog: loadCatalog(),
  update: fn => {
    const next = structuredClone(get().state);
    fn(next);
    Storage.setItemSync(KEY, JSON.stringify(next));
    set({ state: next });
  },
  replace: s => { Storage.setItemSync(KEY, JSON.stringify(s)); set({ state: s }); },
  /* Pick up card changes without an app update (keeps whichever catalog is newer) */
  syncCatalog: async () => {
    try {
      const r = await fetch(CATALOG_URL, { cache: 'no-store' }); const data = await r.json();
      if (data && data.products && data.version > get().catalog.version) { Storage.setItemSync(CAT_KEY, JSON.stringify(data)); set({ catalog: data }); }
    } catch {}
  },
}));

/* Engine context for the current render: catalog + state + today's date */
export function useCtx(): Ctx {
  const state = useApp(s => s.state), catalog = useApp(s => s.catalog);
  return useMemo(() => ({ state, catalog, clock: makeClock() }), [state, catalog]);
}

export const newCard = (product: string): WalletCard =>
  normalize({ id: 'w' + Date.now() + Math.random().toString(36).slice(2, 6), product, owner: 'me', nickname: '', last4: '', rewards: '', dueDay: null, limit: '' } as WalletCard);
export const myName = (s: AppState) => (s.profile.name || '').trim().split(/\s+/)[0];

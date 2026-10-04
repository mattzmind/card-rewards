/// <reference types="jest" />
/* Saved state and wallet actions: web-backup upgrades, and every action (with Undo) changes the right thing. */
const mem: Record<string, string> = {};
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: (k: string) => mem[k] ?? null, setItemSync: (k: string, v: string) => { mem[k] = v; } } }));
const toasts: { msg: string; undo?: () => void }[] = [];
jest.mock('@/ui/toast', () => ({ toast: (msg: string, undo?: () => void) => toasts.push({ msg, undo }) }));
const alerts: string[] = [];
jest.spyOn(require('react-native').Alert, 'alert').mockImplementation((t: any, _m: any, buttons: any) => { alerts.push(t); buttons?.[buttons.length - 1]?.onPress?.(); });

import type { AppState } from '@/core/types';

import {
  addCard, confirmSame, dismissTask, finishAct, markCap, moveTo, removeCards, rename, reorder, savePicks, setInactive, startAct, toggleAct, togglePin, undoCap,
} from '../actions';
import { fresh, newCard, upgrade, useApp } from '../app';

const st = () => useApp.getState().state;
const lastUndo = () => toasts[toasts.length - 1].undo!();
const ids = () => st().wallet.map(w => w.product);

beforeEach(() => {
  toasts.length = 0; alerts.length = 0;
  useApp.getState().replace(upgrade({ ...fresh(), onboarded: true, wallet: ['amex_gold', 'chase_freedom_flex', 'citi_double_cash', 'usbank_cash_plus'].map(newCard) }));
});

describe('upgrade (old saves and web backups)', () => {
  test('fills gaps, maps old card ids, moves old picks, carries the name over', () => {
    const old = { people: [{ id: 'me', name: 'Sam' }], wallet: [{ id: 'w1', product: 'chase_fu' }, { id: 'w2', product: 'usbank_cash_plus', sel: { five: { cats: ['phone', 'gas'] } } }] } as unknown as AppState;
    const s = upgrade(old);
    expect(s.wallet[0].product).toBe('chase_freedom_unlimited');
    expect(s.wallet[1].sel.five).toEqual({ opts: ['phone', 'gas'] });
    expect(s.wallet[0].activated).toEqual([]);
    expect(s.profile).toEqual({ name: 'Sam', theme: 'system' });
    expect(s.favs).toEqual([]);
  });
  test('keeps an existing profile and ignores the placeholder name "Me"', () => {
    expect(upgrade({ profile: { name: 'Jo', theme: 'dark' } } as AppState).profile).toEqual({ name: 'Jo', theme: 'dark' });
    expect(upgrade({ people: [{ id: 'me', name: 'Me' }] } as AppState).profile.name).toBe('');
  });
  test('every change is saved under the web app\'s key', () => {
    togglePin(st().wallet[0].id);
    expect(JSON.parse(mem['cardmax-v3']).wallet[0].pinned).toBe(true);
  });
});

describe('wallet actions', () => {
  test('deactivate asks first, then undo restores', () => {
    const id = st().wallet[0].id;
    setInactive([id], true);
    expect(alerts[0]).toMatch(/^Deactivate/);
    expect(st().wallet[0].inactive).toBeTruthy();
    lastUndo();
    expect(st().wallet[0].inactive).toBeUndefined();
  });
  test('remove confirms and undo brings the card back in place', () => {
    const id = st().wallet[1].id;
    removeCards([id]);
    expect(ids()).toEqual(['amex_gold', 'citi_double_cash', 'usbank_cash_plus']);
    lastUndo();
    expect(ids()).toEqual(['amex_gold', 'chase_freedom_flex', 'citi_double_cash', 'usbank_cash_plus']);
  });
  test('move to top/bottom and drag reorder', () => {
    const w = st().wallet, shown = w.map(x => x.id);
    moveTo(w[2].id, 'top', shown);
    expect(ids()[0]).toBe('citi_double_cash');
    moveTo(st().wallet[0].id, 'bottom', st().wallet.map(x => x.id));
    expect(ids()[3]).toBe('citi_double_cash');
    const cur = st().wallet.map(x => x.id);
    reorder([cur[3], cur[0], cur[1], cur[2]], cur);
    expect(ids()).toEqual(['citi_double_cash', 'amex_gold', 'chase_freedom_flex', 'usbank_cash_plus']);
  });
  test('manual moves switch a sorted list to My order, keeping what was on screen', () => {
    useApp.getState().update(s => { s.view = { sort: 'name', order: 'asc', group: 'none', f: { person: 'all', earns: 'all', type: 'all', bank: 'all', network: 'all', fee: 'all', status: 'all' }, showRate: true, showLast4: true }; });
    const byName = [...st().wallet].sort((a, b) => a.product.localeCompare(b.product)).map(w => w.id);
    reorder([byName[1], byName[0], byName[2], byName[3]], byName);
    expect(st().view!.sort).toBe('custom');
    expect(toasts.some(t => t.msg === 'Sorted by My order')).toBe(true);
  });
  test('rename, and empty name falls back to the card name (with undo)', () => {
    const id = st().wallet[0].id;
    rename(id, '  Travel  ');
    expect(st().wallet[0].nickname).toBe('Travel');
    rename(id, '');
    expect(toasts[toasts.length - 1].msg).toBe("Using the card's own name");
    lastUndo();
    expect(st().wallet[0].nickname).toBe('Travel');
  });
  test('quarterly activation: toggle, and the Activate now → Yes, done flow', () => {
    const id = st().wallet[1].id;
    toggleAct(id, '2026-Q4');
    expect(st().wallet[1].activated).toEqual(['2026-Q4']);
    toggleAct(id, '2026-Q4');
    expect(st().wallet[1].activated).toEqual([]);
    startAct(id, 'act:2026-Q4');
    expect(st().wallet[1].pending).toBe('act:2026-Q4');
    finishAct(id, '2026-Q4', true);
    expect(st().wallet[1].pending).toBeNull();
    expect(st().wallet[1].activated).toEqual(['2026-Q4']);
  });
  test('dismiss a reminder, with undo', () => {
    const id = st().wallet[1].id;
    dismissTask(id, 'act:2026-Q4');
    expect(st().wallet[1].dismissed).toEqual(['act:2026-Q4']);
    lastUndo();
    expect(st().wallet[1].dismissed).toEqual([]);
  });
  test('save picks (trimmed to how many the card allows), confirm same, undo', () => {
    const id = st().wallet[3].id;
    savePicks(id, { five: ['fast_food', 'phone', 'department'], two: ['gas'] });
    const sel = st().wallet[3].sel;
    expect(sel.five!.opts).toEqual(['fast_food', 'phone']);
    expect(sel.two!.opts).toEqual(['gas']);
    expect(sel.five!.quarter).toMatch(/^\d{4}-Q[1-4]$/);
    useApp.getState().update(s => { s.wallet[3].sel.five!.quarter = '2020-Q1'; });
    confirmSame(id);
    expect(st().wallet[3].sel.five!.quarter).not.toBe('2020-Q1');
    savePicks(id, { five: ['department', 'phone'], two: ['grocery'] });
    toasts.find(t => t.msg === 'Categories saved' && t === toasts[toasts.length - 1])!.undo!();
    expect(st().wallet[3].sel.two!.opts).toEqual(['gas']);
  });
  test('mark a cap and undo it', () => {
    const id = st().wallet[0].id;
    markCap(id, 'r0', 'year');
    expect(st().wallet[0].capped.r0).toMatch(/-12-31$/);
    undoCap(id, 'r0');
    expect(st().wallet[0].capped.r0).toBeUndefined();
  });
  test('add a card with last 4, nickname and a non-default network', () => {
    const w = addCard('apple_card', { nickname: ' Apple ', last4: '9876' });
    const saved = st().wallet.find(x => x.id === w.id)!;
    expect(saved).toMatchObject({ product: 'apple_card', nickname: 'Apple', last4: '9876' });
    expect(st().onboarded).toBe(true);
  });
});

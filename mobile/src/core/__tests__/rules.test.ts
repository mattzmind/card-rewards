/// <reference types="jest" />
/** @jest-environment node */
/* Store-specific catalog rules, e.g. Costco gas counts as gas for some cards but not others. */
import catalogJson from '../../../assets/catalog.json';
import { catById } from '../cats';
import { makeClock } from '../dates';
import { type Ctx, evalCard, normalize } from '../engine';
import type { AppState, Catalog, WalletCard } from '../types';

const catalog = catalogJson as unknown as Catalog;
const card = (product: string, extra: Partial<WalletCard> = {}) => ({ ...normalize({ id: 'w', product } as WalletCard), ...extra });
const ctx: Ctx = { catalog, clock: makeClock(new Date('2026-10-13T12:00:00')),
  state: { wallet: [], people: [], recents: [], usage: {}, reports: [], favs: [], profile: { name: '', theme: 'system' } } as AppState };
const rate = (w: WalletCard, cat: string) => evalCard(ctx, w, catById(cat)!)?.rate;

test('Wells Autograph: 3x at gas stations, 1x at Costco gas', () => {
  expect(rate(card('wells_autograph'), 'gas')).toBe(3);
  expect(rate(card('wells_autograph'), 'costco_gas')).toBe(1);
});

test('US Bank Cash+ 2% gas pick leaves out Costco gas; Chase still counts it as gas', () => {
  const sel = { two: { opts: ['gas'], quarter: '2026-Q4' } };
  expect(rate(card('usbank_cash_plus', { sel }), 'gas')).toBe(2);
  expect(rate(card('usbank_cash_plus', { sel }), 'costco_gas')).toBe(1);
  expect(rate(card('chase_sapphire_preferred'), 'costco_gas')).toBe(3);
});

test('no-rewards cards earn 0 everywhere', () => {
  expect(rate(card('citi_diamond_preferred'), 'grocery')).toBe(0);
  expect(rate(card('wells_reflect'), 'other')).toBe(0);
});

test('issuer-checked corrections: Rewards+ gas, Aeroplan travel/gas, Shield Travel Center only', () => {
  expect(rate(card('citi_rewards_plus'), 'gas')).toBe(2);
  expect(rate(card('citi_rewards_plus'), 'costco_gas')).toBeUndefined(); // Mastercard: Costco takes only Visa
  expect(rate(card('chase_aeroplan'), 'gas')).toBe(2.6);       // 2x at 1.3¢
  expect(rate(card('chase_aeroplan'), 'travel')).toBe(3.9);    // 3x at 1.3¢
  expect(rate(card('usbank_shield'), 'travel')).toBe(0);       // 4% only when booked in the Travel Center
  expect(catalog.products.chase_aeroplan.fee).toBe(195);
});

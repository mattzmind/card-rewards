/* Shapes of the card catalog (catalog.json) and the wallet saved on the phone.
   The wallet shape matches the web app's "cardmax-v3" storage, so backups move over 1:1. */

export type Network = 'visa' | 'mastercard' | 'amex' | 'discover' | 'store' | string;

export interface Rule {
  cats: string[];
  rate: number;
  label: string;
  note?: string;
  excl?: string[];
  cond?: string;      // only at certain stores (see m)
  m?: string[];       // store ids or store tags the condition matches
}
export interface ChoiceOption { id: string; label: string; cats: string[]; excl?: string[] }
export interface ChoiceSlot {
  id: string;
  label: string;
  rate: number;
  note?: string;
  period?: 'quarter' | string;
  pick: number;       // how many options to choose
  default?: string;
  options: ChoiceOption[];
}
export interface Rotating {
  rate: number;
  cap?: string;
  retroactive?: boolean;
  deadlineDay?: number;
  activateHint?: string;
  schedule: Record<string, { cats: string[]; label: string; opens?: string }>;
}
export interface Product {
  brand: string;
  name: string;
  short: string;
  network: Network;
  type: 'cash' | 'points' | 'miles' | string;
  base: number;
  baseLabel?: string;
  baseExcept?: { cats: string[]; rate: number; label: string };
  cpp?: number;
  fee?: number;
  feeNote?: string;
  status?: string;
  storeOnly?: string[];
  rules?: Rule[];
  choice?: ChoiceSlot[];
  rotating?: Rotating;
  /* new-account bonus added to every purchase, e.g. Freedom Unlimited +1.5% in year one */
  firstYear?: { extra: number; months: number; label: string; note?: string };
  auto?: { rate: number; note?: string; options: string[] };
  perks?: string[];
  networkOptions?: string[];
  business?: boolean;
  source?: { url?: string; checked?: string; note?: string };
  [k: string]: unknown;
}
export interface Brand { name: string; short: string; mono?: string; colors: [string, string]; login?: string; note?: string }
export interface Store { id: string; name: string; cat: string; aka?: string; tags?: string[] }
export interface Catalog {
  version: string;
  updated?: string;
  brands: Record<string, Brand>;
  products: Record<string, Product>;
  stores: Store[];
}

export interface Category {
  id: string;
  label: string;
  kw?: string;
  parent?: string;
  networks?: string[];
  niche?: boolean;
}

export interface Promo { extra: number; until: string; label?: string; opened?: string; src?: string }
export interface Report { at: string; where: string; cat: string; card: string; reason: string; note: string }
export interface WalletCard {
  id: string;
  product: string;
  owner?: string;
  nickname: string;
  last4: string;
  network?: Network;
  sel: Record<string, { opts?: string[]; quarter?: string; cats?: string[] } | undefined>;
  activated: string[];
  dismissed: string[];
  capped: Record<string, string>;
  promos: Promo[];
  rewards: string | number;
  limit: string | number;
  dueDay?: number | null;
  autoFocus?: string;
  introApr?: string;
  inactive?: string;
  pinned?: boolean;
  pending?: string | null;
}

/* reminders: notification permission as last seen (undefined = never asked, true = allowed, false = blocked).
   notify: which activity sends a reminder (Notification settings); a missing key means on. */
export type NotifyKind = 'bonus' | 'picks';
export interface Profile { name: string; theme: 'system' | 'light' | 'dark'; splash?: boolean; since?: string; reminders?: boolean; notify?: Partial<Record<NotifyKind, boolean>> }
export interface AppState {
  people: { id: string; name: string }[];
  wallet: WalletCard[];
  recents: { c: string; s?: string }[];
  usage: Record<string, number>;
  reports: Report[];   // old on-phone feedback (feedback is emailed now)
  outbox?: Report[];   // feedback waiting to be sent
  favs: string[];
  profile: Profile;
  onboarded?: boolean;
  backedUp?: string;
  view?: WalletView;
  dragTipSeen?: boolean;
  [k: string]: unknown;
}

export interface WalletFilter { person: string; earns: string; type: string; bank: string; network: string; fee: string; status: string }
export interface WalletView {
  sort: 'custom' | 'rewards' | 'name' | 'bank' | 'added';
  order: 'asc' | 'desc';
  group: 'none' | 'person' | 'bank' | 'type';
  f: WalletFilter;
  showRate: boolean;
  showLast4: boolean;
}

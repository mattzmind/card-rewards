import type { Category } from './types';

/* Spending categories (same list as the web app's src/cats.js)
   parent:   also earns the parent's rate (fast food counts as dining)
   networks: only these networks are accepted (Costco = Visa only)
   niche:    only shown when one of your cards earns extra there */
export const CATS: Category[] = [
  { id: 'grocery', label: 'Grocery', kw: 'supermarket grocery food' },
  { id: 'fast_food', label: 'Fast food', parent: 'dining', kw: 'fast food drive thru coffee burger pizza' },
  { id: 'dining', label: 'Dining', kw: 'restaurant restaurants dinner lunch bar cafe takeout delivery' },
  { id: 'gas', label: 'Gas', kw: 'fuel gasoline gas station ev charging' },
  { id: 'costco', label: 'Costco', networks: ['visa'], kw: 'costco' },
  { id: 'costco_gas', label: 'Costco gas', parent: 'gas', networks: ['visa'], kw: 'costco gas fuel' },
  { id: 'walmart', label: 'Walmart', kw: 'walmart supercenter' },
  { id: 'target', label: 'Target', kw: 'target' },
  { id: 'amazon', label: 'Amazon', parent: 'online', kw: 'amazon prime' },
  { id: 'online', label: 'Online', kw: 'online shopping internet ecommerce' },
  { id: 'drugstore', label: 'Drugstore', kw: 'pharmacy drug store' },
  { id: 'streaming', label: 'Streaming', kw: 'streaming music tv subscription' },
  { id: 'transit', label: 'Transit', kw: 'taxi rideshare parking toll train bus subway metro' },
  { id: 'travel', label: 'Travel', kw: 'flight airline hotel rental car cruise vacation' },
  { id: 'entertainment', label: 'Entertainment', kw: 'movie movies theater concert tickets show amusement park sports' },
  { id: 'fitness', label: 'Fitness', kw: 'gym fitness yoga' },
  { id: 'phone', label: 'Phone bill', kw: 'cell phone mobile wireless' },
  { id: 'utilities', label: 'Utilities', kw: 'electric electricity water bill internet cable utility' },
  { id: 'home', label: 'Home improvement', kw: 'hardware' },
  { id: 'department', label: 'Department store', kw: 'department store' },
  { id: 'warehouse', label: 'Warehouse club', niche: true, kw: 'warehouse club wholesale' },
  { id: 'wholefoods', label: 'Whole Foods', parent: 'grocery', niche: true, kw: 'whole foods' },
  { id: 'electronics', label: 'Electronics', niche: true, kw: 'electronics' },
  { id: 'clothing', label: 'Clothing', niche: true, kw: 'clothing clothes apparel' },
  { id: 'furniture', label: 'Furniture', niche: true, kw: 'furniture' },
  { id: 'sporting', label: 'Sporting goods', niche: true, kw: 'sporting goods' },
  { id: 'pets', label: 'Pet supplies', niche: true, kw: 'pet' },
  { id: 'beauty', label: 'Salon & beauty', niche: true, kw: 'salon barber beauty cosmetics haircut' },
  { id: 'office', label: 'Office supplies', niche: true, kw: 'office supplies' },
  { id: 'other', label: 'Everything else', kw: 'other everything else' },
];

/* Cards shown on the first-run "Which cards do you carry?" step */
export const POPULAR_CARDS = ['chase_freedom_unlimited', 'chase_sapphire_preferred', 'chase_freedom_flex', 'chase_prime_visa', 'amex_blue_cash_preferred',
  'amex_blue_cash_everyday', 'amex_gold', 'amex_platinum', 'capone_venture', 'capone_savor', 'capone_quicksilver', 'capone_venture_x',
  'citi_double_cash', 'citi_costco', 'discover_it_cash_back', 'boa_customized_cash', 'wells_active_cash', 'wells_autograph',
  'apple_card', 'usbank_cash_plus'];

/* How "All categories" is grouped on Earn (anything not listed falls into the last group) */
export const CAT_GROUPS: [string, string[]][] = [
  ['Everyday', ['grocery', 'dining', 'fast_food', 'gas', 'drugstore', 'wholefoods']],
  ['Stores & shopping', ['costco', 'costco_gas', 'warehouse', 'walmart', 'target', 'amazon', 'online', 'department', 'home', 'electronics', 'clothing', 'furniture', 'sporting', 'pets', 'beauty', 'office']],
  ['Travel & going out', ['travel', 'transit', 'entertainment']],
  ['Bills & everything else', ['streaming', 'phone', 'utilities', 'fitness', 'other']],
];

/* Shown on Earn until someone stars their own favorites */
export const POPULAR_CATS = ['grocery', 'dining', 'gas', 'fast_food'];

export const catById = (id: string) => CATS.find(c => c.id === id);
export const catName = (id: string) => catById(id)?.label || id;

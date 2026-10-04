/* v2 feature switches: hidden features stay in the code, turn back on here */
const SHOW={accountDetails:false /* due date, limit, fee, rewards balance */, splash:true /* opening animation */, multiPeople:false /* household mode: owner badges, Whose card, group by person */};
const SINGLE_CARD_PER_PRODUCT=true; // wallet holds at most one of each card
const APP_VERSION="2.1.0"; // shown in Profile > About
const FEEDBACK_EMAIL=""; // Profile > Send feedback opens a mail to this address (row hidden while empty)

/* ══════════════════════════════════════════════════════════
   ICONS (one consistent line set, drawn for this app)
   ══════════════════════════════════════════════════════════ */
const ICONS={
  grocery:'<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.4 11h11l2-8H6.2"/>',
  fast_food:'<path d="M5 11a7 5 0 0 1 14 0z"/><path d="M4 14.5h16"/><path d="M5 17.5v.5A2.5 2.5 0 0 0 7.5 20.5h9A2.5 2.5 0 0 0 19 18v-.5z"/>',
  dining:'<path d="M7 3v7a2 2 0 0 0 2 2v9"/><path d="M11 3v7a2 2 0 0 1-2 2"/><path d="M9 3v5"/><path d="M17 21V3c-2 1.5-3 4-3 7v3h3"/>',
  gas:'<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M3 21h12"/><path d="M4 10h10"/><path d="M14 8l3 3v6.5a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
  costco:'<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8"/><path d="M7 17h10"/>',
  warehouse:'<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8"/><path d="M7 17h10"/>',
  costco_gas:'<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M3 21h12"/><path d="M4 10h10"/><path d="M14 8l3 3v6.5a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
  walmart:'<path d="M12 3v5M12 16v5M4.2 7.5l4.3 2.5M15.5 14l4.3 2.5M4.2 16.5l4.3-2.5M15.5 10l4.3-2.5"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  amazon:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  online:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>',
  drugstore:'<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>',
  streaming:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 21h8"/><path d="M10.5 9.5v5l4-2.5z"/>',
  transit:'<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14"/><path d="M8 21v-3M16 21v-3"/><circle cx="8.5" cy="14.5" r=".9"/><circle cx="15.5" cy="14.5" r=".9"/>',
  travel:'<path d="M2.5 13.5l7-1.5L14 4.5a1.8 1.8 0 0 1 3 1.5l-2 7.5 5.5 2-1 2-6-.5-3 4.5-1.5-.5.5-5-6-1.5z"/>',
  entertainment:'<path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"/><path d="M14 6v2M14 11v2M14 16v2"/>',
  fitness:'<path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/>',
  phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  utilities:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  department:'<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  wholefoods:'<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19l8-8"/>',
  electronics:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  clothing:'<path d="M8 3l-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z"/>',
  furniture:'<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z"/><path d="M5 18v2M19 18v2"/>',
  sporting:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6c3.6 3.6 3.6 9.2 0 12.8M18.4 5.6c-3.6 3.6-3.6 9.2 0 12.8"/>',
  pets:'<circle cx="6" cy="10" r="1.6"/><circle cx="9.5" cy="6" r="1.6"/><circle cx="14.5" cy="6" r="1.6"/><circle cx="18" cy="10" r="1.6"/><path d="M12 11c-3 0-5 3.5-5 6a2.5 2.5 0 0 0 3 2.4c1.3-.3 2.7-.3 4 0a2.5 2.5 0 0 0 3-2.4c0-2.5-2-6-5-6z"/>',
  beauty:'<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/><path d="M8 8.5L20 18M8 15.5L20 6"/>',
  office:'<path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7L9.3 17a1.7 1.7 0 0 1-2.3-2.3L15 7"/>',
  other:'<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  chevR:'<path d="M9 5l7 7-7 7"/>', chevL:'<path d="M15 5l-7 7 7 7"/>', chevD:'<path d="M5 9l7 7 7-7"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  pay:'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6 15h4"/>',
  wallet:'<path d="M4 7a2 2 0 0 1 2-2h12v3"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 13.5h2"/>',
  bell:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  flag:'<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  gauge:'<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  archive:'<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/>',
  trash:'<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/>',
  restore:'<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4h4"/>',
  select:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 12.5l3 3 5-6"/>',
  download:'<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  more:'<circle cx="12" cy="5.5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="18.5" r="1.6"/>',
  earn:'<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2c-.5-.9-1.6-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2s1.1 1.7 2.8 2.1 2.9 1 2.9 2.2-1.2 2.1-2.9 2.1c-1.3 0-2.4-.6-2.9-1.5"/><path d="M12 6v1.8M12 16.2V18"/>',
  bolt:'<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  refresh:'<path d="M20 11a8 8 0 0 0-14.3-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.5L20 16"/><path d="M20 20v-4h-4"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  filter:'<path d="M4 5h16l-6 7.5V19l-4 2v-8.5z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  tag:'<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
  layers:'<rect x="3" y="3" width="13" height="13" rx="2"/><path d="M8 21h11a2 2 0 0 0 2-2V8"/>',
  arrowUp:'<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
  arrowDown:'<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
  sort:'<path d="M7 4v16M3.5 7.5L7 4l3.5 3.5"/><path d="M17 20V4M13.5 16.5L17 20l3.5-3.5"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  grip:'<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  pin:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  share:'<path d="M12 15V4"/><path d="M8 8l4-4 4 4"/><path d="M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};
const ic=(n,cls)=>`<svg class="ic ${cls||""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||ICONS.other}</svg>`;

/* ══════════════════════════════════════════════════════════
   1. SPENDING CATEGORIES
   parent:   also earns the parent's rate (fast food counts as dining)
   networks: only these networks are accepted (Costco = Visa only)
   niche:    only shown when one of your cards earns extra there
   ══════════════════════════════════════════════════════════ */
const CATS = [
  {id:"grocery",label:"Grocery",kw:"supermarket grocery food"},
  {id:"fast_food",label:"Fast food",parent:"dining",kw:"fast food drive thru coffee burger pizza"},
  {id:"dining",label:"Dining",kw:"restaurant restaurants dinner lunch bar cafe takeout delivery"},
  {id:"gas",label:"Gas",kw:"fuel gasoline gas station ev charging"},
  {id:"costco",label:"Costco",networks:["visa"],kw:"costco"},
  {id:"costco_gas",label:"Costco gas",parent:"gas",networks:["visa"],kw:"costco gas fuel"},
  {id:"walmart",label:"Walmart",kw:"walmart supercenter"},
  {id:"target",label:"Target",kw:"target"},
  {id:"amazon",label:"Amazon",parent:"online",kw:"amazon prime"},
  {id:"online",label:"Online",kw:"online shopping internet ecommerce"},
  {id:"drugstore",label:"Drugstore",kw:"pharmacy drug store"},
  {id:"streaming",label:"Streaming",kw:"streaming music tv subscription"},
  {id:"transit",label:"Transit",kw:"taxi rideshare parking toll train bus subway metro"},
  {id:"travel",label:"Travel",kw:"flight airline hotel rental car cruise vacation"},
  {id:"entertainment",label:"Entertainment",kw:"movie movies theater concert tickets show amusement park sports"},
  {id:"fitness",label:"Fitness",kw:"gym fitness yoga"},
  {id:"phone",label:"Phone bill",kw:"cell phone mobile wireless"},
  {id:"utilities",label:"Utilities",kw:"electric electricity water bill internet cable utility"},
  {id:"home",label:"Home improvement",kw:"hardware"},
  {id:"department",label:"Department store",kw:"department store"},
  {id:"warehouse",label:"Warehouse club",niche:true,kw:"warehouse club wholesale"},
  {id:"wholefoods",label:"Whole Foods",parent:"grocery",niche:true,kw:"whole foods"},
  {id:"electronics",label:"Electronics",niche:true,kw:"electronics"},
  {id:"clothing",label:"Clothing",niche:true,kw:"clothing clothes apparel"},
  {id:"furniture",label:"Furniture",niche:true,kw:"furniture"},
  {id:"sporting",label:"Sporting goods",niche:true,kw:"sporting goods"},
  {id:"pets",label:"Pet supplies",niche:true,kw:"pet"},
  {id:"beauty",label:"Salon & beauty",niche:true,kw:"salon barber beauty cosmetics haircut"},
  {id:"office",label:"Office supplies",niche:true,kw:"office supplies"},
  {id:"other",label:"Everything else",kw:"other everything else"},
];
/* Cards shown on the first-run "Which of these do you carry?" screen */
const POPULAR_CARDS=["chase_freedom_unlimited","chase_sapphire_preferred","chase_freedom_flex","chase_prime_visa","amex_blue_cash_preferred",
  "amex_blue_cash_everyday","amex_gold","amex_platinum","capone_venture","capone_savor","capone_quicksilver","capone_venture_x",
  "citi_double_cash","citi_costco","discover_it_cash_back","boa_customized_cash","wells_active_cash","wells_autograph",
  "apple_card","usbank_cash_plus"];
/* How "All categories" is grouped on Pay (anything not listed falls into the last group) */
const CAT_GROUPS=[
  ["Everyday",["grocery","dining","fast_food","gas","drugstore","wholefoods"]],
  ["Stores & shopping",["costco","costco_gas","warehouse","walmart","target","amazon","online","department","home","electronics","clothing","furniture","sporting","pets","beauty","office"]],
  ["Travel & going out",["travel","transit","entertainment"]],
  ["Bills & everything else",["streaming","phone","utilities","fitness","other"]],
];
/* Shown on Earn until someone stars their own favorites */
const POPULAR_CATS=["grocery","dining","gas","fast_food"];
const DEFAULT_TOP=["grocery","dining","gas","fast_food","amazon","costco"];

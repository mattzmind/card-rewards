/* ══════════════════════════════════════════════════════════
   2. CARD CATALOG (public product data, same for every user)
   The embedded copy is catalog.json at build time. When CATALOG_URL
   is set, the app checks it on open and keeps whichever is newer.
   ══════════════════════════════════════════════════════════ */
const CATALOG_URL = null; // e.g. "https://<you>.github.io/card-maximizer/catalog.json"
const EMBEDDED_CATALOG = /*__CATALOG__*/null;

/* Old product IDs from earlier app versions → catalog IDs */
const ALIASES = {
  amex_bcp:"amex_blue_cash_preferred", amex_bce:"amex_blue_cash_everyday",
  chase_fu:"chase_freedom_unlimited", chase_ff:"chase_freedom_flex", chase_csp:"chase_sapphire_preferred",
  usb_cashplus:"usbank_cash_plus", usb_altgo:"usbank_altitude_go",
  citi_custom:"citi_custom_cash", citi_double:"citi_double_cash",
  boa_ccr:"boa_customized_cash", discover_it:"discover_it_cash_back", ally_everyday:"ollo_everyday_rewards",
};

/* Placeholder card art colors (licensed card images replace these later) */
const ART = {
  amex_blue_cash_preferred:["#2563eb","#1e3a8a"], amex_blue_cash_everyday:["#60a5fa","#1d4ed8"], amex_gold:["#b45309","#451a03"],
  chase_freedom_unlimited:["#3b82f6","#1e3a8a"], chase_freedom_flex:["#0ea5e9","#1e40af"], chase_sapphire_preferred:["#1e3a8a","#0f172a"], chase_prime_visa:["#0f766e","#0f172a"],
  wells_autograph:["#7f1d1d","#1f2937"], wells_active_cash:["#be123c","#7c2d12"],
  usbank_cash_plus:["#1e40af","#0f172a"], usbank_altitude_go:["#0f766e","#134e4a"],
  citi_strata:["#334155","#0f172a"], citi_custom_cash:["#0891b2","#164e63"], citi_double_cash:["#475569","#1e293b"], citi_costco:["#1d4ed8","#b91c1c"],
  boa_customized_cash:["#be123c","#1e3a8a"], discover_it_cash_back:["#f97316","#7c2d12"], ollo_everyday_rewards:["#7c3aed","#3b0764"],
  capone_quicksilver:["#94a3b8","#334155"], capone_savor:["#9a3412","#431407"], capone_venture:["#1e3a5f","#0f172a"],
  apple_card:["#f8fafc","#cbd5e1"],
  chase_sapphire_reserve:["#0f172a","#1e3a8a"], chase_freedom_rise:["#60a5fa","#1d4ed8"], chase_amazon_visa:["#334155","#0f172a"],
  chase_united_explorer:["#1e40af","#0c4a6e"], chase_united_quest:["#0f172a","#1e40af"],
  chase_southwest_plus:["#2563eb","#f59e0b"], chase_southwest_priority:["#1e3a8a","#dc2626"],
  chase_marriott_boundless:["#7c2d12","#1c1917"], chase_ihg_premier:["#15803d","#14532d"], chase_world_of_hyatt:["#0e7490","#164e63"],
  chase_disney_premier:["#1e1b4b","#4338ca"], chase_ink_cash:["#475569","#0f172a"], chase_ink_unlimited:["#64748b","#1e293b"], chase_ink_preferred:["#1e293b","#020617"],
  amex_platinum:["#cbd5e1","#64748b"], amex_green:["#15803d","#064e3b"], amex_delta_gold:["#b45309","#78350f"], amex_delta_platinum:["#94a3b8","#475569"], amex_delta_reserve:["#1e293b","#0f172a"],
  amex_hilton:["#1d4ed8","#1e3a8a"], amex_hilton_surpass:["#0f172a","#1e40af"], amex_hilton_aspire:["#0c4a6e","#082f49"],
  amex_marriott_brilliant:["#1c1917","#44403c"], amex_marriott_bevy:["#7f1d1d","#450a0a"], amex_blue_business_plus:["#1d4ed8","#0c4a6e"],
  citi_strata_premier:["#1e293b","#0f172a"], citi_strata_elite:["#020617","#334155"],
  citi_aadvantage_platinum:["#991b1b","#1e3a8a"], citi_aadvantage_executive:["#0f172a","#7f1d1d"], citi_aadvantage_globe:["#1e3a8a","#0f172a"],
  capone_venture_x:["#0f172a","#1e293b"], capone_ventureone:["#475569","#1e293b"], capone_quicksilverone:["#94a3b8","#475569"],
  capone_quicksilver_secured:["#64748b","#334155"], capone_savor_student:["#c2410c","#7c2d12"],
};

/* ══════════════════════════════════════════════════════════
   3. YOUR WALLET (private, lives only on this phone)
   ══════════════════════════════════════════════════════════ */
/* New users start empty and pick cards on the first-run screen.
   For local testing you can preload a wallet in seed.local.js (git-ignored, never published). */
const SEED = (typeof LOCAL_SEED!=="undefined")?LOCAL_SEED:{people:[{id:"me",name:"Me"}],wallet:[]};

/* ══════════════════════════════════════════════════════════
   4. STORAGE & MIGRATION
   ══════════════════════════════════════════════════════════ */
const KEY="cardmax-v3", CAT_KEY="cardmax-catalog";
let memStore={};
const store={
  get(k){try{return localStorage.getItem(k)}catch{return memStore[k]??null}},
  set(k,v){try{localStorage.setItem(k,v)}catch{memStore[k]=v}}
};
let CATALOG=EMBEDDED_CATALOG;
try{const c=JSON.parse(store.get(CAT_KEY));if(c&&c.products&&c.version>CATALOG.version)CATALOG=c}catch{}
const P=id=>CATALOG.products[id];
const B=key=>CATALOG.brands[key]||{name:key,short:key,mono:String(key).slice(0,2).toUpperCase(),colors:["#475569","#1e293b"]};

function normalize(w){
  if(ALIASES[w.product]){if(w.product==="ally_everyday"&&!w.nickname)w.nickname="Ally";w.product=ALIASES[w.product]}
  w.sel=w.sel||{};
  Object.values(w.sel).forEach(s=>{if(s&&!s.opts&&s.cats){s.opts=s.cats;delete s.cats}});
  w.activated=w.activated||[];w.dismissed=w.dismissed||[];w.capped=w.capped||{};w.promos=w.promos||[];w.nickname=w.nickname||"";w.last4=w.last4||"";w.rewards=w.rewards??"";w.limit=w.limit||"";
  return w;
}
function load(){
  try{const s=JSON.parse(store.get(KEY));if(s&&s.wallet){s.wallet.forEach(normalize);return s}}catch{}
  const s=JSON.parse(JSON.stringify(SEED));
  try{const old=JSON.parse(store.get("cardmax-rewards")||"{}");s.wallet.forEach(w=>{if(old[w.id]!==undefined)w.rewards=old[w.id]})}catch{}
  s.wallet.forEach(normalize);
  store.set(KEY,JSON.stringify(s));
  return s;
}
let state=load();
state.recents=state.recents||[];state.usage=state.usage||{};state.reports=state.reports||[];state.favs=state.favs||[];
const save=()=>store.set(KEY,JSON.stringify(state));
/* Profile: name (greeting + avatar), theme ("system"|"light"|"dark"), splash on/off, first-use date.
   Older wallets kept the name on people[]; carry it over once. */
function initProfile(){
  const pr=state.profile=state.profile||{};
  if(pr.name==null){const p=(state.people||[]).find(p=>p.name&&p.name!=="Me");pr.name=p?p.name:""}
  pr.theme=pr.theme||"system";
}
initProfile();
const myName=()=>(state.profile.name||"").trim().split(/\s+/)[0];
function setMyName(v){
  state.profile.name=(v||"").trim().slice(0,30);
  if(state.people&&state.people[0])state.people[0].name=state.profile.name||"Me";
  save();
}

async function syncCatalog(){
  if(!CATALOG_URL)return;
  try{
    const r=await fetch(CATALOG_URL,{cache:"no-store"});const data=await r.json();
    if(data&&data.products&&data.version>CATALOG.version){CATALOG=data;store.set(CAT_KEY,JSON.stringify(data));refreshAll()}
  }catch{}
}

/* ══════════════════════════════════════════════════════════
   5. DATES & HELPERS
   ══════════════════════════════════════════════════════════ */
const NOW=new Date();
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const TODAY=iso(NOW);
const qKey=d=>d.getFullYear()+"-Q"+(Math.floor(d.getMonth()/3)+1);
const QK=qKey(NOW);
const NQK=(()=>{const q=Math.floor(NOW.getMonth()/3)+1;return q===4?(NOW.getFullYear()+1)+"-Q1":NOW.getFullYear()+"-Q"+(q+1)})();
const qLabel=k=>{const[y,q]=k.split("-");return q+" "+y};
const qEnd=k=>{const[y,q]=k.split("-Q").map(Number);return new Date(y,q*3,0)};
const qStart=k=>{const[y,q]=k.split("-Q").map(Number);return new Date(y,(q-1)*3,1)};
const qDeadline=(k,day)=>{const[y,q]=k.split("-Q").map(Number);return new Date(y,q*3-1,day)};
const daysLeftInQ=Math.round((qEnd(QK)-new Date(NOW.getFullYear(),NOW.getMonth(),NOW.getDate()))/864e5);
const PICK_Q=daysLeftInQ<=15?NQK:QK; // near quarter end, quarterly picks are for next quarter
const shortDate=d=>d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
const isoToDate=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const ordinal=n=>{if(!n)return"—";const s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])};
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const catById=id=>CATS.find(c=>c.id===id);
const catName=id=>catById(id)?.label||id;
const fmtRate=r=>Number.isInteger(r)?String(r):String(+r.toFixed(2));
const walletById=id=>state.wallet.find(w=>w.id===id);
/* Deactivated cards (w.inactive = date) stay in the wallet's history but never rank or nag */
const activeWallet=()=>state.wallet.filter(w=>!w.inactive);
const dn=w=>w.nickname||P(w.product)?.short||"Card";
const unitOf=p=>p&&p.type!=="cash"?"x":"%";
const capWord=w=>w?w[0].toUpperCase()+w.slice(1):"";
const netLabel=n=>n==="store"?"Store card":capWord(n);
const netOf=w=>w.network||P(w.product)?.network;

function pctColor(p){return p>=5?"#16a34a":p>=4?"#059669":p>=3?"#0284c7":p>=2?"#6366f1":"#94a3b8"}
function pctBg(p){return p>=5?"#dcfce7":p>=4?"#d1fae5":p>=3?"#dbeafe":p>=2?"#e0e7ff":"#f1f5f9"}
function grad(p){return p>=5?"linear-gradient(145deg,#14532d,#052e16)":p>=3?"linear-gradient(145deg,#0c4a6e,#082f49)":"linear-gradient(145deg,#1e293b,#0f172a)"}
function accent(p){return p>=5?"#4ade80":p>=3?"#38bdf8":"#94a3b8"}

const PCOL=[["#fef3c7","#92400e"],["#ede9fe","#5b21b6"],["#cffafe","#155e75"],["#fce7f3","#9d174d"]];
function personColors(id){const i=state.people.findIndex(p=>p.id===id);return i<0?null:PCOL[i%PCOL.length]}
function badge(owner,size){
  const i=state.people.findIndex(p=>p.id===owner);if(i<0)return"";
  const[bg,fg]=PCOL[i%PCOL.length];const ini=esc(state.people[i].name[0].toUpperCase());
  return size==="lg"
    ?`<span style="font-size:13px;font-weight:700;background:${bg};color:${fg};padding:2px 8px;border-radius:6px">${ini}</span>`
    :`<span style="font-size:9px;font-weight:700;background:${bg};color:${fg};padding:1px 5px;border-radius:4px">${ini}</span>`;
}

/* choice-slot helpers: options are {id,label,cats} */
const optOf=(slot,id)=>(slot.options||[]).find(o=>o.id===id);
const selOpts=(w,slot)=>{const s=w.sel[slot.id];return s&&s.opts&&s.opts.length?s.opts:(slot.default?[slot.default]:[])};
const isDefaultSel=(w,slot)=>!(w.sel[slot.id]&&w.sel[slot.id].opts&&w.sel[slot.id].opts.length)&&!!slot.default;
const selCats=(w,slot)=>selOpts(w,slot).flatMap(id=>optOf(slot,id)?.cats||[]);
const selLabels=(w,slot)=>selOpts(w,slot).map(id=>optOf(slot,id)?.label||id);

/* ══════════════════════════════════════════════════════════
   6. RANKING ENGINE
   ══════════════════════════════════════════════════════════ */
function matches(cats,excl,cat){
  if(cats.includes(cat.id))return true;
  return !!(cat.parent&&cats.includes(cat.parent)&&!(excl||[]).includes(cat.id));
}
/* spending caps: period parsed from the rule's note ("$6,000/yr", "$1,500/quarter", "per billing cycle") */
function capPeriod(text){text=(text||"").toLowerCase();
  if(/billing cycle|\/mo\b|per month|a month|monthly/.test(text))return"month";
  if(/quarter|\/q\b/.test(text))return"quarter";
  if(/\/yr|year|annual/.test(text))return"year";return null}
function periodEnd(per){if(per==="month")return iso(new Date(NOW.getFullYear(),NOW.getMonth()+1,0));if(per==="quarter")return iso(qEnd(QK));return iso(new Date(NOW.getFullYear(),11,31))}
const isCapped=(w,key)=>!!(w.capped&&w.capped[key]&&w.capped[key]>=TODAY);
const storeHit=(r,store)=>!!(store&&r.m&&(r.m.includes(store.id)||(store.tags||[]).some(t=>r.m.includes(t))));

function evalCard(w,cat,store){
  const p=P(w.product);if(!p)return null;
  if(p.storeOnly&&!p.storeOnly.includes(cat.id))return null;
  if(cat.networks&&!cat.networks.includes(netOf(w)))return null;
  const bx=p.baseExcept&&p.baseExcept.cats.includes(cat.id)?p.baseExcept:null;
  let best={rate:bx?bx.rate:p.base,label:bx?bx.label:(p.baseLabel||"Everything else"),note:"",flags:[],cap:null};
  const take=(rate,label,note,flags,cap)=>{if(rate>best.rate)best={rate,label,note:note||"",flags:flags||[],cap:cap||null}};
  const conds=[];
  (p.rules||[]).forEach((r,i)=>{
    if(!matches(r.cats,r.excl,cat))return;
    if(r.cond&&!storeHit(r,store)){conds.push(r);return}
    const key="r"+i,per=capPeriod(r.note);
    if(per&&isCapped(w,key))return;
    take(r.rate,r.label,r.cond?`At ${store.name}`:r.note,[],per?{key,per,text:r.note}:null);
  });
  (p.choice||[]).forEach(slot=>{
    if(!matches(selCats(w,slot),null,cat))return;
    const key="c:"+slot.id,per=capPeriod(slot.note);
    if(per&&isCapped(w,key))return;
    const s=w.sel[slot.id];
    const stale=slot.period==="quarter"&&(!s||!s.quarter||s.quarter<QK);
    take(slot.rate,slot.label.replace("Your ","").replace(/^./,c=>c.toUpperCase()),slot.note,stale?["confirm"]:[],per?{key,per,text:slot.note}:null);
  });
  if(p.rotating&&!isCapped(w,"rot")){
    const q=p.rotating.schedule[QK],cap={key:"rot",per:"quarter",text:p.rotating.cap};
    if(q&&matches(q.cats,null,cat)){
      if(w.activated.includes(QK))take(p.rotating.rate,qLabel(QK)+" bonus",p.rotating.cap,[],cap);
      else if(p.rotating.retroactive&&qDeadline(QK,p.rotating.deadlineDay||31)>=NOW)
        take(p.rotating.rate,qLabel(QK)+" bonus",`Activate by ${shortDate(qDeadline(QK,p.rotating.deadlineDay))}`,["activate"],cap);
    }
  }
  if(p.auto&&w.autoFocus&&matches([w.autoFocus],null,cat)&&!isCapped(w,"auto"))
    take(p.auto.rate,"Top category this cycle",p.auto.note,[],{key:"auto",per:"month",text:p.auto.note});
  let rate=best.rate;const extras=[];
  w.promos.forEach(pr=>{if(pr.until>=TODAY){rate+=pr.extra;extras.push(pr)}});
  const mult=p.type==="cash"?1:(p.cpp||1),bump=extras.reduce((a,e)=>a+e.extra,0);
  rate=rate*mult;
  const special=conds.map(r=>({rate:Math.round((r.rate+bump)*mult*100)/100,label:r.label,cond:r.cond}))
    .filter(x=>x.rate>rate).sort((a,b)=>b.rate-a.rate)[0]||null;
  const apr=w.introApr&&w.introApr>=TODAY?w.introApr:null;
  return {w,p,earn:Math.round((best.rate+bump)*100)/100,rate:Math.round(rate*100)/100,label:best.label,note:best.note,flags:best.flags,cap:best.cap,extras,apr,special};
}
function rank(cat,store){
  return activeWallet().map(w=>evalCard(w,cat,store)).filter(Boolean)
    .sort((a,b)=>b.rate-a.rate||a.flags.length-b.flags.length);
}
function networkHidden(cat){
  if(!cat.networks)return 0;
  return activeWallet().filter(w=>{const p=P(w.product);return p&&!p.storeOnly&&!cat.networks.includes(netOf(w))}).length;
}
/* does any wallet card name this category directly (not via parent)? */
function directHit(cat){
  return activeWallet().some(w=>{
    const p=P(w.product);if(!p)return false;
    if((p.rules||[]).some(r=>r.cats.includes(cat.id)))return true;
    if((p.choice||[]).some(s=>selCats(w,s).includes(cat.id)))return true;
    const q=p.rotating&&p.rotating.schedule[QK];if(q&&q.cats.includes(cat.id))return true;
    return p.auto&&w.autoFocus===cat.id;
  });
}
const visibleCats=()=>CATS.filter(c=>!c.niche||directHit(c));

/* ══════════════════════════════════════════════════════════
   7. TASKS (quarterly activation & picks)
   ══════════════════════════════════════════════════════════ */
function tasksFor(w){
  const p=P(w.product);if(!p)return[];const t=[];
  if(p.rotating){
    const r=p.rotating;
    [QK,NQK].forEach(k=>{
      const q=r.schedule[k];if(!q||w.activated.includes(k))return;
      if(k===NQK&&(!q.opens||q.opens>TODAY))return;
      if(k===QK){
        if(r.retroactive){if(qDeadline(k,r.deadlineDay||31)<NOW)return}
        else if(daysLeftInQ<=2)return;
      }
      const due=r.retroactive?`Activate by ${shortDate(qDeadline(k,r.deadlineDay||31))}`:(k===QK?`Ends ${shortDate(qEnd(k))}`:`Starts ${shortDate(qStart(k))}, activate before you spend`);
      t.push({kind:"activate",key:"act:"+k,q:k,text:`Activate ${qLabel(k)}: ${q.label}`,sub:due});
    });
  }
  const quarterly=(p.choice||[]).filter(s=>s.period==="quarter");
  const stale=quarterly.filter(s=>{const x=w.sel[s.id];return x&&x.opts&&x.opts.length&&(!x.quarter||x.quarter<PICK_Q)});
  if(stale.length){
    const summ=quarterly.map(s=>`${s.rate}% ${selLabels(w,s).join(", ")||"not set"}`).join(" · ");
    t.push({kind:"confirm",key:"confirm:"+PICK_Q,text:`Confirm ${qLabel(PICK_Q)} picks`,sub:summ});
  }
  (p.choice||[]).forEach(s=>{if(!selOpts(w,s).length)t.push({kind:"pick",text:`Choose ${s.label.replace("Your ","your ")}`,sub:s.note||""})});
  if(p.auto&&!w.autoFocus)t.push({kind:"pick",text:"Set which category you expect to earn 5%",sub:p.auto.note});
  return t.filter(x=>!x.key||!w.dismissed.includes(x.key));
}
function allTasks(){return activeWallet().flatMap(w=>tasksFor(w).map(t=>({...t,w})))}


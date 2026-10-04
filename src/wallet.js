/* ══════════════════════════════════════════════════════════
   WALLET TAB: your list, your way
   - Press and hold a card, then drag to rearrange
   - Swipe right on a card for its ⋯ menu; swipe left for Deactivate / Delete
   - Sort, group and filter (saved per phone in state.view)
   - Pin cards to the top, rename, deactivate, delete
   ══════════════════════════════════════════════════════════ */
let selectMode=null,showInactive=false;
const FILTER_DEFAULT={person:"all",earns:"all",type:"all",bank:"all",network:"all",fee:"all",status:"all"};
const VIEW_DEFAULT={sort:"custom",order:"asc",group:"none",f:{...FILTER_DEFAULT},showRate:true,showLast4:true};
/* Saved per phone; older versions stored a single "filter" string, so start those fresh */
const viewOpt=()=>{const v=Object.assign({},VIEW_DEFAULT,state.view||{});v.f=Object.assign({},FILTER_DEFAULT,v.f||{});delete v.filter;return(state.view=v)};
const SORTS={custom:"My order",rewards:"Highest rewards",name:"Name A–Z",bank:"Bank",added:"Recently added"};
const GROUPS={person:"Person",bank:"Bank",type:"Reward type",none:"No groups"};
const TYPE_LABEL={cash:"Cash back",points:"Points",miles:"Miles"};

/* Best rate a card can earn anywhere, counted in cents per dollar (points valued at their ¢ estimate) */
function topRate(w){
  const p=P(w.product);if(!p)return 0;
  const mult=p.type==="cash"?1:(p.cpp||1);
  const rates=[p.base||0,...(p.rules||[]).filter(r=>!r.cond).map(r=>r.rate),...(p.choice||[]).map(s=>s.rate)];
  if(p.rotating)rates.push(p.rotating.rate);if(p.auto)rates.push(p.auto.rate);
  return Math.round(Math.max(...rates)*mult*100)/100;
}
const addedAt=w=>w.added||(+(String(w.id).match(/^w(\d{12,})/)||[])[1]||0);
const isPeople=()=>multiOwner()&&state.people.length>1;

/* earns more than its everyday rate at this category */
const earnsExtra=(w,catId)=>{const p=P(w.product),c=catById(catId);if(!p||!c)return false;const e=evalCard(w,c,null);
  if(!e)return false;const mult=p.type==="cash"?1:(p.cpp||1),promo=e.extras.reduce((t,x)=>t+x.extra,0)*mult;
  return e.rate-promo>(p.base||0)*mult+0.001}; // promos that boost everything don't count
function walletFiltered(list,f=viewOpt().f){
  return list.filter(w=>{const p=P(w.product);
    if(f.person!=="all"&&w.owner!==f.person)return false;
    if(f.earns!=="all"&&!earnsExtra(w,f.earns))return false;
    if(f.type!=="all"&&(p?.type||"cash")!==f.type)return false;
    if(f.bank!=="all"&&p?.brand!==f.bank)return false;
    if(f.network!=="all"&&netOf(w)!==f.network)return false;
    if(f.fee==="none"&&p&&p.fee>0)return false;
    if(f.fee==="paid"&&!(p&&p.fee>0))return false;
    if(f.status==="setup"&&!(!w.inactive&&tasksFor(w).length))return false;
    if(f.status==="pinned"&&!w.pinned)return false;
    if(f.status==="intro"&&!(w.introApr&&w.introApr>=TODAY))return false;
    return true;});
}
const activeFilterCount=(f=viewOpt().f)=>Object.keys(FILTER_DEFAULT).filter(k=>f[k]!==FILTER_DEFAULT[k]).length;
/* Each sort's natural direction: A–Z, highest first, newest first */
const SORT_NATURAL={custom:"asc",rewards:"desc",name:"asc",bank:"asc",added:"desc"};
function walletSorted(list){
  const v=viewOpt(),s=v.sort,idx=new Map(state.wallet.map((w,i)=>[w.id,i])),a=[...list];
  const bank=w=>P(w.product)?B(P(w.product).brand).name:"~";
  if(s==="rewards")a.sort((x,y)=>topRate(x)-topRate(y)||idx.get(x.id)-idx.get(y.id));
  else if(s==="name")a.sort((x,y)=>dn(x).localeCompare(dn(y)));
  else if(s==="bank")a.sort((x,y)=>bank(x).localeCompare(bank(y))||dn(x).localeCompare(dn(y)));
  else if(s==="added")a.sort((x,y)=>addedAt(x)-addedAt(y)||idx.get(x.id)-idx.get(y.id));
  else{a.sort((x,y)=>idx.get(x.id)-idx.get(y.id));return a}
  return v.order==="desc"?a.reverse():a;
}
function walletGroups(list){
  const g=viewOpt().group;
  if(g==="none"||(g==="person"&&!isPeople()))return[{key:"all",title:"",items:list}];
  const map=new Map(),add=(k,t,w)=>{if(!map.has(k))map.set(k,{key:k,title:t,items:[]});map.get(k).items.push(w)};
  if(g==="person"){
    state.people.forEach(pp=>map.set(pp.id,{key:pp.id,title:`${pp.name}'s cards`,items:[]}));
    list.forEach(w=>map.has(w.owner)?map.get(w.owner).items.push(w):add("none","Unassigned",w));
  }else if(g==="bank"){
    walletSorted(list).forEach(w=>{const p=P(w.product),k=p?p.brand:"other";add(k,p?B(k).name:"Other",w)});
    return[...map.values()].sort((a,b)=>a.title.localeCompare(b.title)).map(x=>({...x,items:walletSorted(x.items)}));
  }else if(g==="type"){
    ["cash","points","miles"].forEach(t=>map.set(t,{key:t,title:TYPE_LABEL[t],items:[]}));
    list.forEach(w=>{const t=P(w.product)?.type||"cash";map.get(t).items.push(w)});
  }
  return[...map.values()].filter(x=>x.items.length);
}

function walletRow(w,{drag=true}={}){
  const p=P(w.product),v=viewOpt(),has=!w.inactive&&tasksFor(w).length>0,sel=selectMode&&selectMode.has(w.id);
  const sub=w.inactive?`Deactivated ${shortDate(isoToDate(w.inactive))}${w.inactive.slice(0,4)!==TODAY.slice(0,4)?", "+w.inactive.slice(0,4):""}`
    :(w.nickname&&p)||!p?(p?`${B(p.brand).name} ${p.name}`:"Not in the catalog"):"";
  const best=!w.inactive&&p?bestFor(w):"";
  const rate=v.showRate&&!w.inactive&&p?`<span class="w-top"><span>up to</span><b>${fmtRate(topRate(w))}%</b></span>`:"";
  const right=rate;
  return `<div class="swipe-wrap" data-id="${w.id}" data-drag="${drag&&!selectMode?1:0}">
    <div class="swipe-act left"><button class="sw-btn more" onclick="openCardMenu('${w.id}')" aria-label="More options for ${esc(dn(w))}">${ic("more","fill")}<span>More</span></button></div>
    <div class="swipe-act right">${w.inactive
      ?`<button class="sw-btn restore" onclick="setInactive(['${w.id}'],false)">${ic("restore")}<span>Reactivate</span></button>`
      :`<button class="sw-btn archive" onclick="setInactive(['${w.id}'],true)">${ic("archive")}<span>Deactivate</span></button>`}
      <button class="sw-btn delete" onclick="removeCards(['${w.id}'])">${ic("trash")}<span>Delete</span></button></div>
    <button class="card-row ${w.inactive?"inactive":""} ${sel?"selected":""}" onclick="rowTap('${w.id}')" ${selectMode?`aria-pressed="${!!sel}"`:""}>
      ${selectMode?`<span class="sel-box">${sel?ic("check"):""}</span>`:""}
      <span class="row-main"><span class="row-title">${w.pinned&&!w.inactive?`<span class="pin-ic" aria-label="Pinned">${ic("pin")}</span>`:""}${esc(dn(w))}${has?'<span class="dot" aria-label="needs an update"></span>':""}</span>
      ${sub?`<span class="row-sub">${esc(sub)}</span>`:""}
      ${best?`<span class="w-best-for">${best}</span>`:""}
      <span class="w-meta">${p?`<span class="net-tag net-${esc(netOf(w))}">${esc(netLabel(netOf(w)))}</span>`:""}${v.showLast4&&w.last4?`<span class="mono">•••• ${esc(w.last4)}</span>`:""}</span></span>
      ${right?`<span class="row-end">${right}</span>`:""}</button></div>`;
}

/* Bank tile: the bank's colors and short name (real card pictures need licensing) */
function bankTile(w){const p=P(w.product),b=p?B(p.brand):B("?");const[c1,c2]=(typeof ART!=="undefined"&&ART[w.product])||b.colors;
  return `<span class="bank-tile" style="background:linear-gradient(135deg,${c1},${c2})" aria-hidden="true">${esc(b.mono||(b.short||b.name).slice(0,2))}</span>`}
/* What a card is best for: its top two bonus categories, e.g. "6% grocery · 3% gas" */
function bestFor(w){
  const p=P(w.product);if(!p)return"";const mult=p.type==="cash"?1:(p.cpp||1);
  const hits=visibleCats().filter(c=>c.id!=="other").map(c=>{const e=evalCard(w,c,null);return e?{c,r:e.rate-e.extras.reduce((t,x)=>t+x.extra,0)*mult}:null})
    .filter(x=>x&&x.r>(p.base||0)*mult+0.001).sort((a,b)=>b.r-a.r||(a.c.parent?1:0)-(b.c.parent?1:0));
  const seen=new Set(),top=[];for(const h of hits){if(top.length>=2)break;const k=h.r+"|"+(h.c.parent||h.c.id);if(seen.has(k))continue;seen.add(k);top.push(h)}
  // a quarterly bonus that still needs activating
  const q=p.rotating&&p.rotating.schedule[QK],pend=q&&!w.activated.includes(QK)?`<span class="bf-pill warn"><b>${fmtRate(p.rotating.rate)}%</b> ${esc(q.label.split(/,| &/)[0].toLowerCase())} · activate</span>`:"";
  if(!top.length)return pend+`<span class="bf-pill">${fmtRate((p.base||0)*mult)}% everywhere</span>`;
  return pend+top.slice(0,pend?1:2).map(h=>`<span class="bf-pill"><b>${fmtRate(Math.round(h.r*100)/100)}%</b> ${esc(h.c.label.toLowerCase())}</span>`).join("");
}
/* Wallet header: title, people, fanned top cards, then a summary strip like a finance app */
function walletHero(){
  const act=activeWallet(),nm=myName(),names=nm?[nm]:[];
  const banks=new Set(act.map(w=>P(w.product)?.brand).filter(Boolean)).size;
  let best=null;visibleCats().filter(c=>c.id!=="other").forEach(c=>{const r=rank(c,null)[0];if(r&&(!best||r.rate>best.r.rate))best={r,c}});
  const every=rank(catById("other"),null)[0];
  const fees=act.reduce((t,w)=>t+(P(w.product)?.fee||0),0);
  const fan=[...act.filter(w=>w.pinned),...act.filter(w=>!w.pinned)].slice(0,3);
  return `<div class="pay-hero w-hero">
    <h2 class="hero-greet">Your wallet</h2>
    <div class="hero-meta"><span>${act.length} card${act.length===1?"":"s"}</span><span>·</span><span>${banks} bank${banks===1?"":"s"}</span></div>
    ${fan.length?`<div class="w-fan" aria-hidden="true">${fan.map((w,i)=>`<div class="w-fan-card f${fan.length-1-i}">${cardArt(w.product,0,true)}</div>`).reverse().join("")}</div>`:""}
  </div>
  ${act.length?`<div class="w-stats">
    <div class="w-stat"><b class="good">${best?fmtRate(best.r.rate)+"%":"—"}</b><span>Top rate</span></div>
    <div class="w-stat"><b>${every?fmtRate(every.rate)+"%":"—"}</b><span>Everywhere</span></div>
  </div>
  ${best?`<button class="w-best" onclick="openAnswer('${best.c.id}')">${ic("star")}<span>Your best rate: <b>${fmtRate(best.r.rate)}% at ${esc(best.c.label.toLowerCase())}</b> with ${esc(dn(best.r.w))}</span>${ic("chevR","dim")}</button>`:""}`:""}`;
}
function renderWallet(){
  const v=viewOpt(),all=state.wallet;
  const active=walletFiltered(activeWallet()),off=walletFiltered(all.filter(w=>w.inactive)).sort((a,b)=>b.inactive.localeCompare(a.inactive));
  let h="";
  h+=walletHero();
  if(all.length)h+=walletToolbar();
  if(!all.length)h+=`<div class="empty"><h2>No cards yet</h2><p>Add the cards you carry and Earn picks the best one for every purchase.</p>
    <button class="btn" onclick="openOnboard()">Pick your cards</button></div>`;
  else if(!active.length&&activeFilterCount())h+=`<div class="empty small"><p>No cards match these filters.</p><button class="btn-sm alt" onclick="clearFilter('*')">Clear filters</button></div>`;
  else if(!active.length)h+=`<p class="hint">All your cards are deactivated. Reactivate one below or tap + to add a card.</p>`;
  else{
    const pinned=active.filter(w=>w.pinned),rest=active.filter(w=>!w.pinned);
    if(pinned.length)h+=`<h2 class="sec">${ic("pin")} Pinned</h2><div class="list" data-list="pinned">${walletSorted(pinned).map(w=>walletRow(w)).join("")}</div>`;
    walletGroups(walletSorted(rest)).forEach(g=>{
      h+=`${g.title?`<h2 class="sec">${esc(g.title)} <span class="sec-n">${g.items.length}</span></h2>`:(pinned.length?`<h2 class="sec">All cards</h2>`:"")}
        <div class="list" data-list="${g.key}">${g.items.map(w=>walletRow(w)).join("")}</div>`});
    if(!state.dragTipSeen&&active.length>1&&!selectMode)h+=`<p class="hint center tip">Tip: press and hold a card to move it. Swipe a card for more options.
      <button class="link-btn" onclick="state.dragTipSeen=true;save();renderWallet()">Got it</button></p>`;
  }
  if(off.length){
    const open=showInactive||!!selectMode;
    h+=`<button class="more" onclick="showInactive=!showInactive;renderWallet()" aria-expanded="${open}">
      <span>${ic("archive")} Deactivated cards (${off.length})</span>${ic(open?"chevD":"chevR","dim")}</button>
      ${open?`<p class="hint">Cards you no longer use. They don't show up on Earn or in notifications.</p><div class="list inactive-list" data-list="off">${off.map(w=>walletRow(w,{drag:false})).join("")}</div>`:""}`;
  }
  $("wallet-list").innerHTML=h;
  const d=CATALOG.updated?shortDate(isoToDate(CATALOG.updated)):"";
  $("foot").innerHTML=`${Object.keys(CATALOG.products).length} cards and ${stores().length} stores in the catalog${d?`, updated ${d}`:""}.<br>Your cards stay on this phone. <button class="link-btn" onclick="openBackup()">Back up or restore</button>`;
}

/* Toolbar: two pills, Sort and Filter, plus removable chips for active filters */
function walletToolbar(){
  const v=viewOpt(),n=activeFilterCount(),sortOn=v.sort!=="custom"||v.group!=="none";
  const chips=Object.keys(FILTER_DEFAULT).filter(k=>v.f[k]!==FILTER_DEFAULT[k])
    .map(k=>`<button class="chip on-soft f-chip" onclick="clearFilter('${k}')" aria-label="Remove filter ${esc(filterValueLabel(k,v.f[k]))}">${esc(filterValueLabel(k,v.f[k]))}${ic("x")}</button>`).join("");
  return `<div class="w-toolbar no-swipe">
    <button class="pill-btn ${sortOn?"active":""}" onclick="openDisplay('sort')">${ic("sort")}<span>${esc(SORTS[v.sort])}</span>${ic("chevD","dim")}</button>
    <button class="pill-btn ${n?"active":""}" onclick="openDisplay('filter')">${ic("filter")}<span>Filter${n?` · ${n}`:""}</span>${ic("chevD","dim")}</button>
  </div>${chips?`<div class="w-toolbar f-chips no-swipe">${chips}<button class="link-btn" onclick="clearFilter('*')">Clear all</button></div>`:""}`;
}
function clearFilter(k){const v=viewOpt();if(k==="*")v.f={...FILTER_DEFAULT};else v.f[k]=FILTER_DEFAULT[k];save();renderWallet()}

/* ─── Sort & Filter sheets (Todoist-style: rows with current value → option list; ✓ saves, ✕ discards) ─── */
let viewDraft=null,displayMode="sort";
function filterDefs(){
  const ws=state.wallet,ps=ws.map(w=>P(w.product)).filter(Boolean),uniq=a=>[...new Set(a)];
  const defs=[];
  if(isPeople())defs.push({k:"person",icon:"user",label:"Whose card",opts:[["all","Everyone"],...state.people.filter(pp=>ws.some(w=>w.owner===pp.id)).map(pp=>[pp.id,pp.name])]});
  const cats=visibleCats().filter(c=>c.id!=="other"&&ws.some(w=>earnsExtra(w,c.id)));
  defs.push({k:"earns",icon:"star",label:"Earns extra at",hint:"Cards that earn more than their everyday rate there",opts:[["all","Anywhere"],...cats.map(c=>[c.id,c.label])]});
  const types=uniq(ps.map(p=>p.type));
  if(types.length>1)defs.push({k:"type",icon:"gauge",label:"Reward type",opts:[["all","All"],...["cash","points","miles"].filter(t=>types.includes(t)).map(t=>[t,TYPE_LABEL[t]])]});
  const banks=uniq(ps.map(p=>p.brand)).sort((a,b)=>B(a).name.localeCompare(B(b).name));
  if(banks.length>1)defs.push({k:"bank",icon:"home",label:"Bank",opts:[["all","All banks"],...banks.map(b=>[b,B(b).name])]});
  const nets=uniq(ws.map(netOf).filter(Boolean));
  if(nets.length>1)defs.push({k:"network",icon:"pay",label:"Network",hint:"Handy where only some cards are accepted, like Costco (Visa)",opts:[["all","All networks"],...nets.sort().map(n=>[n,netLabel(n)])]});
  if(ps.some(p=>p.fee>0)&&ps.some(p=>!(p.fee>0)))defs.push({k:"fee",icon:"tag",label:"Annual fee",opts:[["all","All"],["none","No annual fee"],["paid","Has an annual fee"]]});
  defs.push({k:"status",icon:"flag",label:"Status",opts:[["all","All cards"],["setup","Needs setup"],["pinned","Pinned"],["intro","0% intro APR"]]});
  return defs;
}
function filterValueLabel(k,val){const d=filterDefs().find(x=>x.k===k);const o=d&&d.opts.find(x=>x[0]===val);return o?o[1]:val}
function openDisplay(mode,keep){
  if(!keep){viewDraft=JSON.parse(JSON.stringify(viewOpt()));displayMode=mode}
  const v=viewDraft,row=(icon,label,value,fn,disabled)=>`<button class="set-row" ${disabled?"disabled":""} onclick="${fn}"><span class="set-ic">${ic(icon)}</span><span class="set-label">${label}</span><span class="set-val">${esc(value)}</span>${ic("chevR","dim")}</button>`;
  let body;
  if(mode==="sort"){
    body=`<div class="set-group" style="margin-top:8px">
      ${row("layers","Grouping",GROUPS[v.group==="person"&&!isPeople()?"none":v.group],"displayPick('group')")}
      ${row("sort","Sorting",SORTS[v.sort],"displayPick('sort')")}
      ${row("arrowUp","Ordering",v.sort==="custom"?"Your order":(v.order==="asc"?"Ascending":"Descending"),"displayPick('order')",v.sort==="custom")}</div>
      ${v.sort==="custom"?`<p class="set-hint">Press and hold any card in your wallet to drag it into place.</p>`:""}
      <h3 class="set-sec">Show on each card</h3><div class="set-group">
      ${tog("showRate","Top reward rate")}${tog("showLast4","Last 4 digits")}</div>`;
  }else{
    body=`<div class="set-group" style="margin-top:8px">${filterDefs().map(d=>row(d.icon,d.label,(d.opts.find(o=>o[0]===v.f[d.k])||d.opts[0])[1],`displayPick('f.${d.k}')`)).join("")}</div>
      <p class="set-hint">Showing ${walletFiltered(state.wallet,v.f).length} of ${state.wallet.length} cards.</p>`;
  }
  openSheet(`<div class="display-sheet">${displayHead(mode==="sort"?"Sort":"Filter")}${body}
    <button class="reset-btn" onclick="resetDisplay()">Reset ${mode==="sort"?"sort":"filters"}</button></div>`,keep,null,{customTop:true});
  function tog(k,label){return `<button class="set-row" onclick="viewDraft.${k}=!viewDraft.${k};openDisplay(displayMode,true)" role="switch" aria-checked="${v[k]}"><span class="set-label">${label}</span><span class="switch ${v[k]?"on":""}"></span></button>`}
}
function displayHead(title,back){
  return `<div class="set-head">${back?`<button class="round-btn" onclick="${back}" aria-label="Back">${ic("chevL")}</button>`
    :`<button class="round-btn" onclick="closeSheet()" aria-label="Cancel">${ic("x")}</button>`}
    <h2>${esc(title)}</h2>${back?`<span class="round-btn ghost"></span>`:`<button class="round-btn ok" onclick="saveDisplay()" aria-label="Save">${ic("check")}</button>`}</div>`;
}
function displayPick(key){
  const v=viewDraft;let title,opts,cur,hint="";
  if(key==="group"){title="Grouping";cur=v.group==="person"&&!isPeople()?"none":v.group;opts=[["none","None"],...(isPeople()?[["person","Person"]]:[]),["bank","Bank"],["type","Reward type"]]}
  else if(key==="sort"){title="Sorting";cur=v.sort;opts=Object.entries(SORTS)}
  else if(key==="order"){title="Ordering";cur=v.order;opts=[["asc","Ascending"],["desc","Descending"]];
    hint={rewards:"Descending shows the highest rates first.",name:"Ascending is A to Z.",bank:"Ascending is A to Z.",added:"Descending shows the newest cards first."}[v.sort]||""}
  else{const d=filterDefs().find(x=>"f."+x.k===key);title=d.label;cur=v.f[d.k];opts=d.opts;hint=d.hint||""}
  openSheet(`<div class="display-sheet">${displayHead(title,"openDisplay(displayMode,true)")}
    ${hint?`<p class="set-hint" style="margin-top:0">${esc(hint)}</p>`:""}
    <div class="set-group">${opts.map(([val,label])=>`<button class="set-row opt ${val===cur?"on":""}" onclick="setDraft('${key}','${val}')"><span class="set-label">${esc(label)}</span>${val===cur?ic("check"):""}</button>`).join("")}</div></div>`,
    0.001,{label:displayMode==="sort"?"Sort":"Filter",fn:()=>openDisplay(displayMode,true)},{customTop:true});
}
function setDraft(key,val){
  if(key.startsWith("f."))viewDraft.f[key.slice(2)]=val;
  else{viewDraft[key]=val;if(key==="sort")viewDraft.order=SORT_NATURAL[val]}
  openDisplay(displayMode,true);
}
function saveDisplay(){state.view=viewDraft;viewDraft=null;save();closeSheet();renderWallet()}
function resetDisplay(){
  if(displayMode==="sort"){const f=viewDraft.f;viewDraft={...JSON.parse(JSON.stringify(VIEW_DEFAULT)),f}}
  else viewDraft.f={...FILTER_DEFAULT};
  openDisplay(displayMode,true);
}
/* kept for older links in the menu */
function openViewSheet(){openDisplay("sort")}
function setView(k,val){viewOpt();if(k==="filter")return;state.view[k]=val;save();renderWallet()}

/* ─── Per-card menu (from swipe or long list) ─── */
function openCardMenu(id){
  closeSwipes();const w=walletById(id);if(!w)return;const p=P(w.product);
  const item=(icon,label,fn,cls="")=>`<button class="row ${cls}" onclick="${fn}"><span class="row-ic">${ic(icon)}</span><span class="row-main"><span class="row-title">${label}</span></span></button>`;
  openSheet(`<div class="drawer-head">${cardArt(w.product,64)}<div class="row-main"><h2 class="sheet-title">${esc(dn(w))}</h2>
      <p class="sheet-sub">${p?`${esc(B(p.brand).name)} ${esc(p.name)}`:""}${w.last4?`<span class="mono sub-last4">•••• ${esc(w.last4)}</span>`:""}</p></div></div>
    <div class="list">
      ${item("edit","Rename",`openRename('${id}')`)}
      ${item("info","Edit details & rewards",`closeSheet();openDrawer('${id}')`)}
      ${w.inactive?"":item("pin",w.pinned?"Unpin":"Pin to top",`togglePin('${id}')`)}
      ${w.inactive?"":item("arrowUp","Move to top",`moveTo('${id}','top')`)}
      ${w.inactive?"":item("arrowDown","Move to bottom",`moveTo('${id}','bottom')`)}
      ${w.inactive?item("restore","Reactivate",`setInactive(['${id}'],false)`):item("archive","Deactivate",`setInactive(['${id}'],true)`)}
      ${item("trash","Delete",`removeCards(['${id}'])`,"danger-row")}
    </div>`);
}
function openRename(id){
  if(!$("sheet").hidden&&drawerId===id&&$("sheet").querySelector(".drawer-head")){startInlineName(id);return}
  const w=walletById(id),p=P(w.product);
  openSheet(`<h2 class="sheet-title">Rename card</h2><p class="sheet-sub">${p?`${esc(B(p.brand).name)} ${esc(p.name)}`:""}</p>
    <input class="field" id="rn" value="${esc(w.nickname||"")}" placeholder="${esc(p?p.short:"Card name")}" maxlength="40" autocomplete="off"
      onkeydown="if(event.key==='Enter')saveRename('${id}')">
    <p class="hint">Leave it empty to use the card's own name.</p>
    <button class="btn" onclick="saveRename('${id}')">Save</button>`,false,{label:"Back",fn:()=>openCardMenu(id)});
  setTimeout(()=>{const i=$("rn");if(i){i.focus();i.select()}},250);
}
function saveRename(id){const w=walletById(id),v=$("rn").value.trim(),old=w.nickname;w.nickname=v;save();closeSheet();
  toast(v?`Renamed to ${v}`:"Using the card's own name",()=>{w.nickname=old;save();render()})}
function togglePin(id){const w=walletById(id);w.pinned=!w.pinned;save();closeSheet();toast(w.pinned?`${dn(w)} pinned to the top`:`${dn(w)} unpinned`)}
function moveTo(id,where){
  freezeOrder();const i=state.wallet.findIndex(w=>w.id===id),[w]=state.wallet.splice(i,1);
  where==="top"?state.wallet.unshift(w):state.wallet.push(w);save();closeSheet();toast(`${dn(w)} moved to the ${where}`);
}
/* Switch to "My order" keeping exactly what's on screen, so a manual move never scrambles the list */
function freezeOrder(){
  const v=viewOpt();if(v.sort==="custom")return false;
  const shown=[...document.querySelectorAll("#wallet-list .swipe-wrap")].map(e=>e.dataset.id);
  const rest=state.wallet.filter(w=>!shown.includes(w.id));
  state.wallet=[...shown.map(walletById).filter(Boolean),...rest];v.sort="custom";save();return true;
}
function rowTap(id){
  if(swipeOpen){closeSwipes();return}
  if(dragJustEnded)return;
  selectMode?toggleSelect(id):openDrawer(id);
}

/* ─── Touch: swipe to reveal actions, press-and-hold to drag ─── */
let swipeOpen=null,dragJustEnded=false;
function closeSwipes(){document.querySelectorAll(".swipe-wrap.open-l,.swipe-wrap.open-r").forEach(e=>{e.classList.remove("open-l","open-r");e.querySelector(".card-row").style.transform=""});swipeOpen=null}
(function(){
  const LEFT=88,RIGHT=176,HOLD=380;
  let wrap=null,row=null,x0=0,y0=0,mode=null,dx=0,timer=null,base=0;
  let drag=null; // {list, el, startY, startScroll, rows, h, from, to}
  const root=$("wallet-list");
  root.addEventListener("touchstart",e=>{
    if(e.touches.length>1)return;
    const wr=e.target.closest(".swipe-wrap");if(!wr||e.target.closest(".swipe-act"))return;
    if(swipeOpen&&swipeOpen!==wr)closeSwipes();
    wrap=wr;row=wr.querySelector(".card-row");const t=e.touches[0];x0=t.clientX;y0=t.clientY;dx=0;mode=null;
    base=wr.classList.contains("open-l")?LEFT:wr.classList.contains("open-r")?-RIGHT:0;
    clearTimeout(timer);
    if(wr.dataset.drag==="1"&&!base)timer=setTimeout(()=>startDrag(t.clientY),HOLD);
  },{passive:true});
  root.addEventListener("touchmove",e=>{
    if(!wrap)return;const t=e.touches[0];
    if(mode==="drag"){e.preventDefault();moveDrag(t.clientY);return}
    dx=t.clientX-x0;const dy=t.clientY-y0;
    if(!mode){
      if(Math.abs(dx)<8&&Math.abs(dy)<8)return;
      clearTimeout(timer);
      if(!selectMode&&Math.abs(dx)>Math.abs(dy)*1.3){mode="swipe";row.classList.add("swiping")}else{mode="scroll";wrap=null;return}
    }
    if(mode==="swipe"){e.preventDefault();
      let x=base+dx;x=Math.max(-RIGHT-30,Math.min(LEFT+30,x));row.style.transform=`translateX(${x}px)`;}
  },{passive:false});
  const end=()=>{
    clearTimeout(timer);
    if(mode==="drag")endDrag();
    else if(mode==="swipe"){
      const x=base+dx;row.classList.remove("swiping");wrap.classList.remove("open-l","open-r");
      if(x>LEFT*.5){wrap.classList.add("open-l");row.style.transform=`translateX(${LEFT}px)`;swipeOpen=wrap}
      else if(x<-RIGHT*.4){wrap.classList.add("open-r");row.style.transform=`translateX(${-RIGHT}px)`;swipeOpen=wrap}
      else{row.style.transform="";if(swipeOpen===wrap)swipeOpen=null}
      dragJustEnded=true;setTimeout(()=>dragJustEnded=false,60);
    }
    wrap=null;mode=null;
  };
  root.addEventListener("touchend",end);root.addEventListener("touchcancel",end);
  // Long-press on a phone also brings up the system menu; stop that on cards
  root.addEventListener("contextmenu",e=>{if(e.target.closest(".swipe-wrap"))e.preventDefault()});

  function startDrag(y){
    if(!wrap)return;mode="drag";
    try{navigator.vibrate&&navigator.vibrate(12)}catch{}
    const list=wrap.parentElement,items=[...list.children];
    drag={list,el:wrap,startY:y,startScroll:scrollY,items,h:wrap.getBoundingClientRect().height,from:items.indexOf(wrap),to:items.indexOf(wrap)};
    drag.mids=items.map(it=>{const r=it.getBoundingClientRect();return r.top+scrollY+r.height/2});
    wrap.classList.add("dragging");list.classList.add("drag-list");document.body.classList.add("no-select");
  }
  function moveDrag(y){
    const d=drag;if(!d)return;
    if(y>innerHeight-110)scrollBy(0,8);else if(y<120)scrollBy(0,-8);
    const off=(y+scrollY)-(d.startY+d.startScroll);
    d.el.style.transform=`translateY(${off}px) scale(1.02)`;
    const center=d.mids[d.from]+off;let to=d.from;
    d.mids.forEach((m,i)=>{if(i<d.from&&center<m)to=Math.min(to,i);if(i>d.from&&center>m)to=Math.max(to,i)});
    d.to=to;
    d.items.forEach((it,i)=>{if(it===d.el)return;let s=0;
      if(d.from<to&&i>d.from&&i<=to)s=-d.h;else if(d.from>to&&i>=to&&i<d.from)s=d.h;
      it.style.transform=s?`translateY(${s}px)`:"";});
  }
  function endDrag(){
    const d=drag;drag=null;if(!d)return;
    d.items.forEach(it=>it.style.transform="");d.el.classList.remove("dragging");d.list.classList.remove("drag-list");document.body.classList.remove("no-select");
    dragJustEnded=true;setTimeout(()=>dragJustEnded=false,350);
    if(d.to===d.from)return;
    const ids=d.items.map(it=>it.dataset.id);const [m]=ids.splice(d.from,1);ids.splice(d.to,0,m);
    const switched=freezeOrder();
    // put these cards back into the same slots in the wallet, in the new order
    const slots=state.wallet.map((w,i)=>ids.includes(w.id)?i:-1).filter(i=>i>=0);
    const byId=Object.fromEntries(state.wallet.map(w=>[w.id,w]));
    slots.forEach((s,k)=>state.wallet[s]=byId[ids[k]]);
    save();renderWallet();
    if(switched)toast(`Sorted by My order`);
  }
})();

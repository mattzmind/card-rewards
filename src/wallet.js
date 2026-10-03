/* ══════════════════════════════════════════════════════════
   WALLET TAB: your list, your way
   - Press and hold a card, then drag to rearrange
   - Swipe right on a card for its ⋯ menu; swipe left for Deactivate / Delete
   - Sort, group and filter (saved per phone in state.view)
   - Pin cards to the top, rename, deactivate, delete
   ══════════════════════════════════════════════════════════ */
let selectMode=null,showInactive=false;
const VIEW_DEFAULT={sort:"custom",group:"person",filter:"all",showRate:true,showLast4:true};
const viewOpt=()=>(state.view=Object.assign({},VIEW_DEFAULT,state.view||{}));
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

function walletFiltered(list){
  const f=viewOpt().filter;
  if(f==="attention")return list.filter(w=>!w.inactive&&tasksFor(w).length);
  if(f==="cash")return list.filter(w=>P(w.product)?.type==="cash");
  if(f==="points")return list.filter(w=>P(w.product)&&P(w.product).type!=="cash");
  if(f.startsWith("person:"))return list.filter(w=>w.owner===f.slice(7));
  return list;
}
function walletSorted(list){
  const s=viewOpt().sort,idx=new Map(state.wallet.map((w,i)=>[w.id,i])),a=[...list];
  const bank=w=>P(w.product)?B(P(w.product).brand).name:"~";
  if(s==="rewards")a.sort((x,y)=>topRate(y)-topRate(x)||idx.get(x.id)-idx.get(y.id));
  else if(s==="name")a.sort((x,y)=>dn(x).localeCompare(dn(y)));
  else if(s==="bank")a.sort((x,y)=>bank(x).localeCompare(bank(y))||dn(x).localeCompare(dn(y)));
  else if(s==="added")a.sort((x,y)=>addedAt(y)-addedAt(x)||idx.get(y.id)-idx.get(x.id));
  else a.sort((x,y)=>idx.get(x.id)-idx.get(y.id));
  return a;
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
  const rate=v.showRate&&!w.inactive&&p?`<span class="w-rate">up to <b>${fmtRate(topRate(w))}%</b></span>`:"";
  const right=(v.showLast4&&w.last4?`<span class="mono last4">•••• ${esc(w.last4)}</span>`:"")+rate;
  return `<div class="swipe-wrap" data-id="${w.id}" data-drag="${drag&&!selectMode?1:0}">
    <div class="swipe-act left"><button class="sw-btn more" onclick="openCardMenu('${w.id}')" aria-label="More options for ${esc(dn(w))}">${ic("more","fill")}<span>More</span></button></div>
    <div class="swipe-act right">${w.inactive
      ?`<button class="sw-btn restore" onclick="setInactive(['${w.id}'],false)">${ic("restore")}<span>Reactivate</span></button>`
      :`<button class="sw-btn archive" onclick="setInactive(['${w.id}'],true)">${ic("archive")}<span>Deactivate</span></button>`}
      <button class="sw-btn delete" onclick="removeCards(['${w.id}'])">${ic("trash")}<span>Delete</span></button></div>
    <button class="card-row ${w.inactive?"inactive":""} ${sel?"selected":""}" onclick="rowTap('${w.id}')" ${selectMode?`aria-pressed="${!!sel}"`:""}>
      ${selectMode?`<span class="sel-box">${sel?ic("check"):""}</span>`:""}${cardArt(w.product,52)}
      <span class="row-main"><span class="row-title">${w.pinned&&!w.inactive?`<span class="pin-ic" aria-label="Pinned">${ic("pin")}</span>`:""}${esc(dn(w))}${has?'<span class="dot" aria-label="needs an update"></span>':""}</span>
      ${sub?`<span class="row-sub">${esc(sub)}</span>`:""}</span>
      ${right?`<span class="row-end">${right}</span>`:""}</button></div>`;
}

function renderWallet(){
  const v=viewOpt(),all=state.wallet;
  const active=walletFiltered(activeWallet()),off=walletFiltered(all.filter(w=>w.inactive)).sort((a,b)=>b.inactive.localeCompare(a.inactive));
  let h="";
  if(all.length)h+=walletToolbar();
  if(!all.length)h+=`<div class="empty"><h2>No cards yet</h2><p>Add the cards you carry and the Pay tab ranks them for every purchase.</p>
    <button class="btn" onclick="openOnboard()">Pick your cards</button></div>`;
  else if(!active.length&&v.filter!=="all")h+=`<div class="empty small"><p>No cards match this filter.</p><button class="btn-sm alt" onclick="setView('filter','all')">Show all cards</button></div>`;
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
      ${open?`<p class="hint">Cards you no longer use. They don't show up on Pay or in Updates.</p><div class="list inactive-list" data-list="off">${off.map(w=>walletRow(w,{drag:false})).join("")}</div>`:""}`;
  }
  $("wallet-list").innerHTML=h;
  const d=CATALOG.updated?shortDate(isoToDate(CATALOG.updated)):"";
  $("foot").innerHTML=`${Object.keys(CATALOG.products).length} cards and ${stores().length} stores in the catalog${d?`, updated ${d}`:""}.<br>Your cards stay on this phone. <button class="link-btn" onclick="openBackup()">Back up or restore</button>`;
}

/* Toolbar: sort/view button + quick filter chips (scroll sideways) */
function walletToolbar(){
  const v=viewOpt(),n=t=>activeWallet().filter(t).length,att=n(w=>tasksFor(w).length);
  const chips=[["all","All"]];
  if(isPeople())state.people.forEach(pp=>chips.push(["person:"+pp.id,pp.name]));
  if(att)chips.push(["attention",`Needs setup · ${att}`]);
  if(n(w=>P(w.product)?.type==="cash")&&n(w=>P(w.product)&&P(w.product).type!=="cash"))chips.push(["cash","Cash back"],["points","Points & miles"]);
  const changed=v.sort!=="custom"||v.group!==VIEW_DEFAULT.group;
  return `<div class="w-toolbar no-swipe">
    <button class="chip view-chip ${changed?"on-soft":""}" onclick="openViewSheet()">${ic("sort")}${esc(SORTS[v.sort])}</button>
    ${chips.map(([k,l])=>`<button class="chip ${v.filter===k?"on":""}" onclick="setView('filter','${k}')">${esc(l)}</button>`).join("")}</div>`;
}
function setView(k,val){viewOpt();state.view[k]=val;save();renderWallet();if(!$("sheet").hidden&&$("sheet").querySelector(".view-sheet"))openViewSheet(true)}

function openViewSheet(keep){
  const v=viewOpt();
  const opt=(k,val,label,sub)=>`<button class="radio ${v[k]===val?"on":""}" onclick="setView('${k}','${val}')"><span class="radio-dot"></span><span class="row-main"><span class="row-title">${label}</span>${sub?`<span class="row-sub">${sub}</span>`:""}</span></button>`;
  const tog=(k,label)=>`<button class="toggle-row" onclick="setView('${k}',${!v[k]})" role="switch" aria-checked="${v[k]}"><span>${label}</span><span class="switch ${v[k]?"on":""}"></span></button>`;
  openSheet(`<div class="view-sheet"><h2 class="sheet-title">Sort & view</h2>
    <h3 class="sec">Sort by</h3><div class="stack-sm">
      ${opt("sort","custom","My order","Press and hold a card to drag it")}
      ${opt("sort","rewards","Highest rewards","Cards that can earn the most first")}
      ${opt("sort","name","Name A–Z")}${opt("sort","bank","Bank")}${opt("sort","added","Recently added")}</div>
    <h3 class="sec">Group by</h3><div class="stack-sm">
      ${isPeople()?opt("group","person","Person"):""}${opt("group","bank","Bank")}${opt("group","type","Reward type","Cash back, points, miles")}${opt("group",isPeople()?"none":"person","No groups")}</div>
    <h3 class="sec">Show on each card</h3><div class="list">${tog("showRate","Top reward rate")}${tog("showLast4","Last 4 digits")}</div>
    <button class="btn" onclick="closeSheet()">Done</button>
    <button class="btn-outline" style="margin-top:10px" onclick="state.view={...VIEW_DEFAULT};save();renderWallet();openViewSheet(true)">Reset to default</button></div>`,keep);
}

/* ─── Per-card menu (from swipe or long list) ─── */
function openCardMenu(id){
  closeSwipes();const w=walletById(id);if(!w)return;const p=P(w.product);
  const item=(icon,label,fn,cls="")=>`<button class="row ${cls}" onclick="${fn}"><span class="row-ic">${ic(icon)}</span><span class="row-main"><span class="row-title">${label}</span></span></button>`;
  openSheet(`<div class="drawer-head">${cardArt(w.product,64)}<div class="row-main"><h2 class="sheet-title">${esc(dn(w))}</h2>
      <p class="sheet-sub">${p?`${esc(B(p.brand).name)} ${esc(p.name)}`:""}${w.last4?` · <span class="mono">•••• ${esc(w.last4)}</span>`:""}</p></div></div>
    <div class="list" style="margin-top:8px">
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

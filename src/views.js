/* ══════════════════════════════════════════════════════════
   8. APP SHELL
   ══════════════════════════════════════════════════════════ */
let tab="pay",payQ="",moreOpen=false,answerCtx=null,showAllAlts=false,whyOpen=false;
const stores=()=>CATALOG.stores||[];
const storeById=id=>stores().find(s=>s.id===id);
const TITLES={pay:"Pay",wallet:"Wallet",updates:"Updates"};

function go(t){
  tab=t;
  ["pay","wallet","updates"].forEach(x=>{$("view-"+x).hidden=x!==t;const b=$("tab-"+x);b.classList.toggle("on",x===t);b.setAttribute("aria-current",x===t?"page":"false")});
  $("title").textContent=TITLES[t];
  if(t!=="wallet")selectMode=null;
  render();window.scrollTo(0,0);
}
function renderAppbar(){
  const a=$("appbar-action");
  if(tab!=="wallet"){a.innerHTML="";$("fab").hidden=true;$("select-bar").hidden=true;return}
  a.innerHTML=selectMode?`<button class="btn-pill quiet" onclick="endSelect()">Done</button>`
    :`<button class="icon-btn" onclick="openWalletMenu()" aria-label="Wallet options">${ic("more","fill")}</button>`;
  $("fab").hidden=!!selectMode;
  renderSelectBar();
}
function render(){
  renderPay();renderWallet();renderUpdates();renderAppbar();
  const n=allTasks().length;$("tab-badge").textContent=n;$("tab-badge").hidden=!n;
}
let toastTimer=null;
function toast(msg,undoFn){
  const t=$("toast");t.innerHTML=`<span>${esc(msg)}</span>${undoFn?'<button id="toast-undo">Undo</button>':""}`;t.hidden=false;
  if(undoFn)$("toast-undo").onclick=()=>{undoFn();t.hidden=true};
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,4000);
}

/* ─── Pay ─── */
const norm=s=>(s||"").toLowerCase().replace(/[’'.&+-]/g,"").replace(/\s+/g," ").trim();
function searchAll(q){
  q=norm(q);if(!q)return{st:[],ct:[]};
  const score=(name,aka)=>{const n=norm(name);if(n.startsWith(q))return 3;if(n.split(" ").some(w=>w.startsWith(q)))return 2;if(n.includes(q)||norm(aka).includes(q))return 1;return 0};
  const st=stores().map(s=>({s,sc:score(s.name,s.aka)})).filter(x=>x.sc).sort((a,b)=>b.sc-a.sc||a.s.name.localeCompare(b.s.name)).slice(0,8).map(x=>x.s);
  const ct=CATS.map(c=>({c,sc:score(c.label,c.kw)})).filter(x=>x.sc).sort((a,b)=>b.sc-a.sc).slice(0,5).map(x=>x.c);
  return{st,ct};
}
function onPaySearch(v){payQ=v;$("q-clear").hidden=!v;renderPay()}
function clearPaySearch(){payQ="";$("q").value="";$("q-clear").hidden=true;renderPay();$("q").focus()}
const tile=c=>`<button class="tile" onclick="openAnswer('${c.id}')">${ic(c.id)}<span>${esc(c.label)}</span></button>`;
const placeRow=(catId,storeId,title,sub)=>`<button class="row" onclick="openAnswer('${catId}','${storeId||""}')">
  <span class="row-ic">${ic(catId)}</span><span class="row-main"><span class="row-title">${esc(title)}</span><span class="row-sub">${esc(sub)}</span></span>${ic("chevR","dim")}</button>`;
function renderPay(){
  const empty=!activeWallet().length;
  $("pay-empty").hidden=!empty;$("pay-main").hidden=empty;
  if(empty)return;
  const res=$("pay-results"),home=$("pay-home");
  if(payQ.trim()){
    home.hidden=true;res.hidden=false;
    const {st,ct}=searchAll(payQ);
    res.innerHTML=(st.length||ct.length?`<div class="list">${
      st.map(s=>placeRow(s.cat,s.id,s.name,catName(s.cat)+(s.id==="costco"||s.id==="costco_gas"?" · Visa only":""))).join("")}${
      ct.map(c=>placeRow(c.id,null,c.label,"Category")).join("")}</div>`:
      `<p class="hint">No store called “${esc(payQ)}” in the list.</p>`)+
      `<h2 class="sec">Local or not listed? Pick what it is</h2><div class="tiles">${visibleCats().map(tile).join("")}</div>`;
    return;
  }
  home.hidden=false;res.hidden=true;
  const rec=state.recents.filter(x=>catById(x.c)&&(!x.s||storeById(x.s)));
  $("recents").innerHTML=rec.length?`<h2 class="sec">Recent</h2><div class="chips">${rec.map(x=>{
    const s=x.s&&storeById(x.s);return `<button class="chip" onclick="openAnswer('${x.c}','${x.s||""}')">${ic(x.c)}${esc(s?s.name:catName(x.c))}</button>`}).join("")}</div>`:"";
  const vis=visibleCats(),vid=new Set(vis.map(c=>c.id));
  const byUse=vis.filter(c=>state.usage[c.id]).sort((a,b)=>state.usage[b.id]-state.usage[a.id]).map(c=>c.id);
  const favs=favItems();let top;
  if(favs.length){
    top=favs.filter(f=>!f.s).map(f=>f.c);
    $("top-title").textContent="Favorites";$("fav-edit").textContent="Edit";
    $("top").innerHTML=favs.map(favTile).join("");
  }else{
    top=[...new Set([...byUse,...DEFAULT_TOP.filter(id=>vid.has(id))])].slice(0,6);
    $("top-title").textContent="Your top spots";$("fav-edit").textContent="Pick favorites";
    $("top").innerHTML=top.map(id=>tile(catById(id))).join("");
  }
  const rest=vis.filter(c=>!top.includes(c.id));
  $("more-btn").innerHTML=`${moreOpen?"Fewer categories":`More categories (${rest.length})`}${ic(moreOpen?"chevD":"chevR","dim")}`;
  $("all").hidden=!moreOpen;$("all").innerHTML=rest.map(tile).join("");
}
function toggleMore(){moreOpen=!moreOpen;renderPay()}

/* ─── Favorites: categories (and stores starred from an answer) pinned to the top of Pay ─── */
const favKey=(c,s)=>s?"s:"+s:"c:"+c;
function favItems(){return state.favs.map(k=>{const t=k.slice(0,1),id=k.slice(2);
  if(t==="s"){const st=storeById(id);return st&&catById(st.cat)?{c:st.cat,s:id,label:st.name}:null}
  const c=catById(id);return c?{c:id,s:"",label:c.label}:null}).filter(Boolean)}
const favTile=f=>`<button class="tile" onclick="openAnswer('${f.c}','${f.s}')">${ic(f.c)}<span>${esc(f.label)}</span></button>`;
function openFavs(keep){
  const vis=visibleCats(),favStores=state.favs.filter(k=>k.startsWith("s:")).map(k=>storeById(k.slice(2))).filter(Boolean);
  const n=favItems().length;
  const row=(key,icon,title,sub)=>{const on=state.favs.includes(key);
    return `<button class="row fav-row ${on?"on":""}" onclick="toggleFav('${key}',true)" aria-pressed="${on}"><span class="row-ic">${ic(icon)}</span><span class="row-main"><span class="row-title">${esc(title)}</span>${sub?`<span class="row-sub">${esc(sub)}</span>`:""}</span>${ic("star","star")}</button>`};
  openSheet(`<h2 class="sheet-title">Favorites</h2>
    <p class="sheet-sub">Star the places you pay most. They show first on Pay, in the order you star them.</p>
    <p class="fav-count">${n?`${n} favorite${n>1?"s":""}`:"No favorites yet"}</p>
    ${favStores.length?`<h3 class="sec">Stores</h3><div class="list">${favStores.map(s=>row("s:"+s.id,s.cat,s.name,catName(s.cat))).join("")}</div>`:""}
    <h3 class="sec">Categories</h3><div class="list">${vis.map(c=>row("c:"+c.id,c.id,c.label)).join("")}</div>
    <p class="hint">Tip: tap the star on any answer screen to add a store like Costco or Chipotle.</p>
    <button class="btn" onclick="closeSheet()">Done</button>`,keep);
}
function toggleFav(key,inSheet){
  const i=state.favs.indexOf(key),adding=i<0;
  adding?state.favs.push(key):state.favs.splice(i,1);save();
  if(inSheet)openFavs(true);
  else{renderAnswer();toast(adding?"Added to favorites":"Removed from favorites")}
}

/* ─── Answer ─── */
function openAnswer(catId,storeId){
  storeId=storeId||null;
  answerCtx={catId,storeId};showAllAlts=false;whyOpen=false;
  state.usage[catId]=(state.usage[catId]||0)+1;
  state.recents=[{c:catId,s:storeId},...state.recents.filter(x=>!(x.c===catId&&(x.s||null)===storeId))].slice(0,6);
  save();renderAnswer();
  const pn=$("ans-panel");pn.style.transform="";pn.style.opacity="";pn.classList.remove("settle");
  $("answer").hidden=false;pn.scrollTop=0;document.body.classList.add("locked");
}
function closeAnswer(){
  if(!answerCtx)return;answerCtx=null;
  const pn=$("ans-panel");pn.classList.add("settle");pn.style.transform="translateY(100%)";
  setTimeout(()=>{$("answer").hidden=true;pn.style.transform="";pn.classList.remove("settle");
    if($("sheet").hidden&&$("onboard").hidden)document.body.classList.remove("locked");render()},200);
}
/* "Spend $100, earn $2 back" / "Spend $100, earn 300 points (about $3.90)" */
function dollarsLine(x){
  const money=v=>"$"+(Math.round(v*100)%100?v.toFixed(2):v.toFixed(0));
  if(x.p.type==="cash")return `Spend $100, earn <b>${money(x.rate)} back</b>`;
  const pts=Math.round(x.earn*100).toLocaleString("en-US"),unit=x.p.type==="miles"?"miles":"points";
  return `Spend $100, earn <b>${pts} ${unit}</b> (about ${money(x.rate)})`;
}
function capLabel(w,key){
  const p=P(w.product);if(!p)return key;
  if(key[0]==="r")return (p.rules[+key.slice(1)]||{}).label||"Bonus";
  if(key.startsWith("c:"))return ((p.choice||[]).find(s=>"c:"+s.id===key)||{}).label||"Your pick";
  return key==="rot"?"Quarterly 5%":"Top category 5%";
}
function renderAnswer(){
  if(!answerCtx)return;
  const cat=catById(answerCtx.catId),store=answerCtx.storeId?storeById(answerCtx.storeId):null;
  const r=rank(cat,store),where=store?store.name:cat.label;
  const bar=`<div class="ans-bar">${(()=>{const k=favKey(cat.id,store&&store.id),on=state.favs.includes(k);
    return `<button class="star-btn ${on?"on":""}" onclick="toggleFav('${k}')" aria-pressed="${on}" aria-label="${on?"Remove from":"Add to"} favorites">${ic("star")}</button>`})()}<span class="ans-where">${esc(where)}</span><button class="bubble close" onclick="closeAnswer()" aria-label="Close">${ic("x")}</button></div>`;
  const ctx=`<p class="ans-ctx">${store?`${esc(store.name)} counts as <b>${esc(cat.label.toLowerCase())}</b>`:`Best card for <b>${esc(cat.label.toLowerCase())}</b>`}</p>`;
  if(!r.length){
    $("ans-body").innerHTML=`<div class="ans-inner">${bar}${ctx}<div class="ans-none"><h2>None of your cards work here</h2>
      <p>${cat.networks?"Costco only takes Visa credit cards. Add a Visa card to your wallet to see an answer.":"Add more cards to your wallet to see an answer."}</p></div></div>`;
    return;
  }
  const b=r[0],hidden=networkHidden(cat),rest=r.slice(1).filter(x=>x.rate>0);
  const chips=[];
  if(b.label!=="Everything else")chips.push(`<span class="pill">${esc(b.label)}${b.note?` · ${esc(b.note)}`:""}</span>`);
  if(b.flags.includes("confirm"))chips.push(`<span class="pill warn">Confirm ${qLabel(PICK_Q)} picks in Updates</span>`);
  if(b.flags.includes("activate"))chips.push(`<span class="pill warn">Not activated yet</span>`);
  b.extras.forEach(e=>chips.push(`<span class="pill">Includes ${esc(e.label.split(" (")[0])}</span>`));
  if(b.apr)chips.push(`<span class="pill">0% APR until ${shortDate(isoToDate(b.apr))}</span>`);
  if(store&&store.note)chips.push(`<span class="pill info">${esc(store.note)}</span>`);
  const nextRow=x=>`<button class="alt-row" onclick="openDrawer('${x.w.id}')">${cardArt(x.w.product,40)}
    <span class="alt-main"><span class="alt-name">${esc(dn(x.w))}${x.w.last4?` <span class="mono dim">••${esc(x.w.last4)}</span>`:""} ${ownerBadge(x.w)}</span>
    <span class="alt-sub">${esc(x.label)}${x.flags.length?" · needs update":""}</span></span><span class="alt-rate mono">${fmtRate(x.rate)}%</span></button>`;
  const sp=r.filter(x=>x.special&&x.special.rate>b.rate).sort((a,c)=>c.special.rate-a.special.rate).slice(0,4);
  const others=r.slice(1,4).map(x=>`${esc(dn(x.w))} ${fmtRate(x.rate)}%`).join(", ");
  const src=b.p.source||{};
  $("ans-body").innerHTML=`<div class="ans-inner">${bar}${ctx}
    <div class="ans-card" onclick="openDrawer('${b.w.id}')">${cardArt(b.w.product)}</div>
    <div class="ans-name">${esc(dn(b.w))}${b.w.last4?` <span class="mono">•••• ${esc(b.w.last4)}</span>`:""} ${ownerBadge(b.w,"lg")}</div>
    <div class="ans-rate mono">${fmtRate(b.rate)}%</div>
    <p class="ans-dollars">${dollarsLine(b)}</p>
    ${chips.length?`<div class="pills">${chips.join("")}</div>`:""}
    <div class="ans-actions">
      ${b.cap?`<button class="btn-quiet" onclick="markCap('${b.w.id}','${b.cap.key}','${b.cap.per}')">${ic("gauge")}Hit the cap?</button>`:""}
      <button class="btn-quiet" onclick="openReport()">${ic("flag")}Wrong card?</button>
    </div>
    ${rest.length?`<h2 class="sec">Next best</h2><div class="list">${nextRow(rest[0])}${showAllAlts?rest.slice(1).map(nextRow).join(""):""}</div>
      ${rest.length>1?`<button class="link" onclick="showAllAlts=!showAllAlts;renderAnswer()">${showAllAlts?"Show less":`Show all ${rest.length+1} cards`}</button>`:""}`:""}
    ${sp.length?`<h2 class="sec">Better only in these cases</h2><div class="list">${sp.map(x=>`<button class="alt-row dashed" onclick="openDrawer('${x.w.id}')">
      <span class="alt-main"><span class="alt-name">${esc(dn(x.w))} ${ownerBadge(x.w)}</span><span class="alt-sub">${esc(x.special.cond)}</span></span><span class="alt-rate mono">${fmtRate(x.special.rate)}%</span></button>`).join("")}</div>`:""}
    ${hidden?`<p class="hint">Costco only takes Visa, so ${hidden} of your cards aren't shown.</p>`:""}
    <button class="why" onclick="whyOpen=!whyOpen;renderAnswer()" aria-expanded="${whyOpen}">${ic("info")}Why this card?${ic(whyOpen?"chevD":"chevR","dim")}</button>
    ${whyOpen?`<div class="why-body">
      <p>${esc(dn(b.w))} earns <b>${fmtRate(b.rate)}%</b> here: ${esc(b.label.toLowerCase())}${b.note?` (${esc(b.note)})`:""}.</p>
      ${b.p.type!=="cash"?`<p>${capWord(b.p.type)} are counted at ${b.p.cpp||1}¢ each so they compare fairly with cash back.</p>`:""}
      ${others?`<p>It beats ${others}.</p>`:""}
      <p class="dim">${src.checked?`Card terms checked ${isoToDate(src.checked).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}.`:""} Always confirm terms with your card issuer.</p>
    </div>`:""}
  </div>`;
}
function markCap(wid,key,per){
  const w=walletById(wid),until=periodEnd(per),prev=w.capped[key];
  w.capped[key]=until;save();renderAnswer();
  toast(`${capLabel(w,key)} marked as capped until ${shortDate(isoToDate(until))}`,()=>{if(prev)w.capped[key]=prev;else delete w.capped[key];save();renderAnswer();render()});
}
function undoCap(wid,key){const w=walletById(wid);delete w.capped[key];save();render()}

/* ─── Wrong card report ─── */
const REASONS=["Another card earns more here","This card isn't accepted here","The store is in the wrong category","The rate shown is wrong"];
function openReport(){
  openSheet(`<h2 class="sheet-title">What went wrong?</h2>
    <p class="sheet-sub">Your feedback is saved in Updates so you can send it in.</p>
    <div class="radio-list">${REASONS.map((r,i)=>`<label class="radio"><input type="radio" name="reason" id="reason-${i}" value="${i}" ${i===0?"checked":""}><span>${r}</span></label>`).join("")}</div>
    <label class="flabel" for="report-note">Details (optional)</label>
    <textarea id="report-note" class="field" rows="3" placeholder="For example: Costco charged this as gas, not warehouse"></textarea>
    <button class="btn" onclick="saveReport()">Submit feedback</button>
    <button class="btn-ghost" onclick="closeSheet()">Cancel</button>`);
}
function saveReport(){
  const cat=catById(answerCtx.catId),store=answerCtx.storeId?storeById(answerCtx.storeId):null,b=rank(cat,store)[0];
  const i=+(document.querySelector('input[name="reason"]:checked')||{value:0}).value;
  state.reports.unshift({at:TODAY,where:store?store.name:cat.label,cat:cat.label,card:b?dn(b.w)+" "+fmtRate(b.rate)+"%":"none",reason:REASONS[i],note:$("report-note").value.trim()});
  save();closeSheet();toast("Thanks! Feedback saved in Updates");
}

/* ─── Wallet ─── */
function ownerBadge(w,size){return multiOwner()?badge(w.owner,size):""}
function multiOwner(){return new Set(state.wallet.map(w=>w.owner)).size>1}
/* ─── Updates ─── */
function renderUpdates(){
  const t=allTasks();
  const caps=[];state.wallet.forEach(w=>Object.entries(w.capped||{}).forEach(([k,u])=>{if(u>=TODAY)caps.push({w,k,u})}));
  let h="";
  if(t.length)h+=`<h2 class="sec">Card updates</h2><div class="stack">${t.map(x=>`<div class="task">
    <div class="task-main"><div class="task-head">${cardArt(x.w.product,36)}<span class="row-title">${esc(dn(x.w))}</span>${ownerBadge(x.w)}</div>
    ${x.w.pending===x.key?`<p class="task-text">Did you activate it?</p><p class="task-sub">${esc(x.text.replace(/^Activate /,""))}</p>`:
      `<p class="task-text">${esc(x.text)}</p>${x.sub?`<p class="task-sub">${esc(x.sub)}</p>`:""}`}</div>
    <div class="task-btns">${taskButtons(x)}</div></div>`).join("")}</div>`;
  if(caps.length)h+=`<h2 class="sec">Spending caps reached</h2><div class="list">${caps.map(c=>`<div class="row static">
    <span class="row-ic">${ic("gauge")}</span><span class="row-main"><span class="row-title">${esc(dn(c.w))}</span>
    <span class="row-sub">${esc(capLabel(c.w,c.k))} · back ${shortDate(new Date(isoToDate(c.u).getTime()+864e5))}</span></span>
    <button class="btn-sm alt" onclick="undoCap('${c.w.id}','${c.k}')">Undo</button></div>`).join("")}</div>`;
  if(state.reports.length)h+=`<h2 class="sec">Wrong-card reports</h2><div class="list">${state.reports.map(r=>`<div class="row static">
    <span class="row-ic">${ic("flag")}</span><span class="row-main"><span class="row-title">${esc(r.where)} · ${esc(r.card)}</span>
    <span class="row-sub">${esc(r.reason)}${r.note?` · ${esc(r.note)}`:""} · ${shortDate(isoToDate(r.at))}</span></span></div>`).join("")}</div>
    <div class="btn-row"><button class="btn-sm" onclick="copyReports()">${ic("copy")}Copy all</button><button class="btn-sm alt" onclick="clearReports()">Clear</button></div>`;
  if(!h)h=`<div class="empty"><div class="empty-ic">${ic("check")}</div><h2>You're all set</h2><p>Quarterly activations, category picks and reports will show up here.</p></div>`;
  $("updates").innerHTML=h;
}
/* Activate now / Change open the bank (its app if the phone has it, else the sign-in page) */
function bankLink(w,label,cls,onclick){const u=B(P(w.product).brand).login;
  return u?`<a class="btn-sm ${cls}" href="${esc(u)}" target="_blank" rel="noopener" onclick="${onclick}">${label}</a>`
          :`<button class="btn-sm ${cls}" onclick="${onclick}">${label}</button>`}
function taskButtons(x){const id=x.w.id;
  if(x.kind==="activate"){
    if(x.w.pending===x.key)return `<button class="btn-sm" onclick="finishAct('${id}','${x.q}',true)">Yes, done</button><button class="btn-sm alt" onclick="finishAct('${id}','${x.q}',false)">Not yet</button>`;
    return bankLink(x.w,"Activate now","",`startAct('${id}','${x.key}')`)+`<button class="btn-sm alt" onclick="dismissTask('${id}','${x.key}')">Dismiss</button>`;
  }
  if(x.kind==="confirm")return `<button class="btn-sm" onclick="confirmSame('${id}')">Keep same</button>`+bankLink(x.w,"Change","alt",`changePicks('${id}')`);
  return `<button class="btn-sm" onclick="openDrawer('${id}')">Choose</button>`;
}
function startAct(id,key){const w=walletById(id);w.pending=key;save();setTimeout(render,300)}
function finishAct(id,q,done){const w=walletById(id);w.pending=null;
  if(done&&!w.activated.includes(q))w.activated.push(q);save();render();if(done)toast(`${dn(w)} bonus activated`)}
function dismissTask(id,key){const w=walletById(id);w.dismissed.push(key);save();render();
  toast("Reminder dismissed",()=>{w.dismissed=w.dismissed.filter(k=>k!==key);save();render()})}
/* Change: open the bank to change picks there, and open the picks here so the app matches when you come back */
function changePicks(id){setTimeout(()=>openDrawer(id),300)}
function copyReports(){
  const txt=state.reports.map(r=>`${r.at} | ${r.where} | ${r.card} | ${r.reason}${r.note?" | "+r.note:""}`).join("\n");
  const done=()=>toast("Reports copied");
  try{navigator.clipboard.writeText(txt).then(done,()=>fallbackCopy(txt))}catch{fallbackCopy(txt)}
}
function fallbackCopy(txt){openSheet(`<h2 class="sheet-title">Copy your reports</h2><textarea class="field" rows="8" id="copy-box">${esc(txt)}</textarea><button class="btn-ghost" onclick="closeSheet()">Done</button>`);setTimeout(()=>{$("copy-box").select()},50)}
let clearArmed=false;
function clearReports(){if(!clearArmed){clearArmed=true;toast("Tap Clear again to delete all reports");setTimeout(()=>clearArmed=false,4000);return}
  clearArmed=false;state.reports=[];save();render();toast("Reports cleared")}

/* ══════════════════════════════════════════════════════════
   9. SHEETS
   ══════════════════════════════════════════════════════════ */
/* back = {label, fn}: shows a floating back bubble and turns on swipe-back */
let sheetBack=null;
function openSheet(html,keepScroll,back){
  const s=$("sheet"),prev=keepScroll===true?s.querySelector(".sheet")?.scrollTop:(typeof keepScroll==="number"?keepScroll:0);
  sheetBack=back||null;
  s.hidden=false;s.onclick=e=>{if(e.target===s)closeSheet()};
  s.innerHTML=`<div class="sheet ${keepScroll?"still":""}" role="dialog" aria-modal="true"><div class="sheet-top"><div class="handle"></div>${
    back?`<button class="bubble" onclick="sheetGoBack()" aria-label="Back to ${esc(back.label)}">${ic("chevL")}${esc(back.label)}</button>`:""}<button class="bubble close" onclick="closeSheet()" aria-label="Close">${ic("x")}</button></div>${html}</div>`;
  const sh=s.querySelector(".sheet");if(sh){sh.scrollTop=prev||0;sheetGestures(sh,closeSheet,()=>sheetBack&&sheetBack.fn)}
  document.body.classList.add("locked");
}
function sheetGoBack(){if(sheetBack)sheetBack.fn()}
/* Swipe down from the top to close; swipe sideways to go back when there is a back step.
   Used by every pop-up (sheets and the Pay answer) so they all feel the same. */
function sheetGestures(sh,close,getBack){
  let x0=0,y0=0,sc0=0,mode=null,dx=0,dy=0,t0=0;
  const reset=()=>{sh.classList.add("settle");sh.style.transform="";sh.style.opacity="";setTimeout(()=>sh.classList.remove("settle"),220)};
  sh.addEventListener("touchstart",e=>{
    if(e.touches.length>1){mode="none";return}
    const t=e.touches[0];x0=t.clientX;y0=t.clientY;sc0=sh.scrollTop;dx=dy=0;t0=performance.now();
    mode=e.target.closest("input,textarea,select")?"none":null;
  },{passive:true});
  sh.addEventListener("touchmove",e=>{
    if(mode==="none")return;
    const t=e.touches[0];dx=t.clientX-x0;dy=t.clientY-y0;
    if(!mode){
      if(Math.abs(dx)+Math.abs(dy)<10)return;
      if(getBack()&&Math.abs(dx)>Math.abs(dy)*1.4)mode="h";
      else if(dy>0&&sc0<=0&&sh.scrollTop<=0&&dy>Math.abs(dx))mode="v";
      else{mode="none";return}
    }
    e.preventDefault();
    if(mode==="v")sh.style.transform=`translateY(${Math.max(0,dy)}px)`;
    else{sh.style.transform=`translateX(${dx*.6}px)`;sh.style.opacity=String(Math.max(.5,1-Math.abs(dx)/600))}
  },{passive:false});
  const end=()=>{
    if(mode==="v"){
      if(dy>90||(dy>40&&performance.now()-t0<250)){sh.classList.add("settle");sh.style.transform="translateY(100%)";setTimeout(close,180)}else reset();
    }else if(mode==="h"){
      const fn=getBack();if(Math.abs(dx)>70&&fn)fn();else reset();
    }
    mode=null;
  };
  sh.addEventListener("touchend",end);sh.addEventListener("touchcancel",()=>{if(mode)reset();mode=null});
}
function closeSheet(){sheetBack=null;$("sheet").hidden=true;$("sheet").innerHTML="";if($("answer").hidden&&$("onboard").hidden)document.body.classList.remove("locked");render();if(answerCtx)renderAnswer()}

/* ─── Card art (placeholder until licensed images) ─── */
function cardArt(pid,miniWidth){
  const p=P(pid);const b=p?B(p.brand):B("?");const[c1,c2]=ART[pid]||b.colors;
  const bg=`background:linear-gradient(135deg,${c1},${c2})`,light=(pid==="apple_card"||pid==="amex_platinum")?";color:#111827":"";
  if(miniWidth||!p)return `<span class="art mini" style="${bg};width:${miniWidth||46}px"><span class="art-band"></span><span class="art-chip"></span></span>`;
  return `<span class="art" style="${bg}${light}"><span class="art-band"></span><span class="art-iss">${esc(b.short||b.name)}</span><span class="art-chip"></span><span class="art-name">${esc(p.name)}</span><span class="art-net">${esc(netLabel(p.network))}</span></span>`;
}

/* ─── Card details ─── */
let drawerId=null,removeArmed=false;
function openDrawer(id,keep){
  const w=walletById(id);if(!w)return;const p=P(w.product);
  drawerId=id;if(!keep)removeArmed=false;
  if(!p){openSheet(`<h2 class="sheet-title">${esc(dn(w))}</h2><p class="sheet-sub">This card isn't in the catalog anymore.</p>
    ${drawerButtons(w)}`,keep);return}
  const unit=unitOf(p),brand=B(p.brand),tiers=[];
  (p.rules||[]).forEach(r=>tiers.push({rate:r.rate,t:r.label,s:[r.cond,r.note].filter(Boolean).join(" · ")}));
  (p.choice||[]).forEach(s=>{const l=selLabels(w,s);tiers.push({rate:s.rate,t:`${s.label}: ${l.length?l.join(", "):"not set"}${isDefaultSel(w,s)?" (default)":""}`,s:s.note||""})});
  if(p.rotating){const q=p.rotating.schedule[QK];tiers.push({rate:p.rotating.rate,t:`${qLabel(QK)}: ${q?q.label:"not announced yet"}`,s:p.rotating.cap+(q&&!w.activated.includes(QK)?" · not activated":"")})}
  if(p.auto)tiers.push({rate:p.auto.rate,t:"Your top category"+(w.autoFocus?` (expecting ${catName(w.autoFocus)})`:""),s:p.auto.note});
  tiers.sort((a,b)=>b.rate-a.rate);tiers.push({rate:p.base,t:p.baseLabel||"Everything else",s:""});
  const notes=[...(p.perks||[])];
  w.promos.forEach(pr=>{if(pr.until>=TODAY)notes.unshift(`${pr.label}, until ${shortDate(isoToDate(pr.until))}`)});
  if(w.introApr&&w.introApr>=TODAY)notes.unshift(`0% intro APR until ${isoToDate(w.introApr).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`);
  if(SHOW.accountDetails&&p.feeNote)notes.push(`Annual fee: ${p.feeNote}`);
  const caps=Object.entries(w.capped||{}).filter(([,u])=>u>=TODAY);
  const s=p.source||{};
  openSheet(`
    <div class="drawer-head">${cardArt(w.product,72)}<div class="row-main">
      <h2 class="sheet-title">${esc(dn(w))} ${ownerBadge(w)}</h2>
      <p class="sheet-sub">${esc(brand.name)} ${esc(p.name)} · ${netLabel(netOf(w))}${w.last4?` · <span class="mono">•••• ${esc(w.last4)}</span>`:""}</p>
      ${p.status==="closed"?`<span class="pill warn">No longer offered to new applicants</span>`:""}
      ${w.inactive?`<span class="pill">Deactivated ${shortDate(isoToDate(w.inactive))}</span>`:""}</div></div>
    ${SHOW.accountDetails?`<div class="stats"><div><b>Due</b>${ordinal(w.dueDay)}</div><div><b>Limit</b>${esc(w.limit)||"—"}</div><div><b>Fee</b>$${p.fee}</div><div><b>Rewards</b>${esc(w.rewards)||"—"}</div></div>`:""}
    ${setupHTML(w)}
    ${caps.length?`<h3 class="sec">Caps reached</h3><div class="list">${caps.map(([k,u])=>`<div class="row static"><span class="row-main"><span class="row-title">${esc(capLabel(w,k))}</span><span class="row-sub">Counts again after ${shortDate(isoToDate(u))}</span></span><button class="btn-sm alt" onclick="undoCap('${w.id}','${k}');openDrawer('${w.id}',true)">Undo</button></div>`).join("")}</div>`:""}
    <h3 class="sec">Rewards</h3>
    <div class="tiers">${tiers.map((t,i)=>`<div class="tier ${i===0?"top":""}"><span class="tier-rate mono">${fmtRate(t.rate)}${unit}</span>
      <span class="row-main"><span class="row-title">${esc(t.t)}</span>${t.s?`<span class="row-sub">${esc(t.s)}</span>`:""}</span></div>`).join("")}</div>
    ${p.type!=="cash"?`<p class="hint">Ranked at ${p.cpp||1}¢ per ${p.type==="miles"?"mile":"point"}.</p>`:""}
    ${notes.length?`<h3 class="sec">Notes & perks</h3><ul class="notes">${notes.map(n=>`<li>${esc(n)}</li>`).join("")}</ul>`:""}
    <h3 class="sec">Card details</h3>
    <label class="flabel" for="f-nick">Nickname</label>
    <input class="field" id="f-nick" value="${esc(w.nickname)}" placeholder="${esc(p.short)}" onchange="setField('${w.id}','nickname',this.value.trim())">
    <label class="flabel" for="f-last4">Last 4 digits</label>
    <input class="field mono" id="f-last4" inputmode="numeric" maxlength="4" value="${esc(w.last4)}" onchange="setField('${w.id}','last4',this.value.replace(/\\D/g,'').slice(0,4))">
    ${SHOW.accountDetails?`<label class="flabel" for="f-due">Due day</label><input class="field" id="f-due" inputmode="numeric" value="${w.dueDay||""}" onchange="setField('${w.id}','dueDay',parseInt(this.value)||null)">`:""}
    ${p.networkOptions?`<div class="flabel">Logo on your card</div><div class="chips">${p.networkOptions.map(n=>`<button class="chip ${netOf(w)===n?"on":""}" onclick="setField('${w.id}','network','${n}')">${capWord(n)}</button>`).join("")}</div>`:""}
    ${state.people.length>1?`<div class="flabel">Whose card</div><div class="chips">${ownerChips(w.owner,`setField('${w.id}','owner','$ID')`)}</div>`:""}
    <p class="source">${s.checked?`Terms checked ${isoToDate(s.checked).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`:"Terms not yet checked"}${s.url?` · <a href="${esc(s.url)}" target="_blank" rel="noopener">View source</a>`:""}${s.note?`<br>${esc(s.note)}`:""}<br>Always confirm terms with your card issuer.</p>
    ${drawerButtons(w)}
  `,keep);
}
function setupHTML(w){
  const p=P(w.product);let h="";
  if(p.rotating){
    const r=p.rotating;
    h+=[QK,NQK].map(k=>{const q=r.schedule[k];if(!q)return"";const on=w.activated.includes(k);
      const when=k===QK?`Now until ${shortDate(qEnd(k))}`:`Starts ${shortDate(qStart(k))}`;
      const due=r.retroactive?` · activate by ${shortDate(qDeadline(k,r.deadlineDay||31))}`:"";
      return `<div class="row static"><span class="row-main"><span class="row-title">${qLabel(k)}: ${esc(q.label)}</span><span class="row-sub">${when}${due}</span></span>
        <button class="chip ${on?"on":""}" onclick="toggleAct('${w.id}','${k}')">${on?ic("check")+"Activated":"Mark activated"}</button></div>`}).join("");
    h+=`<p class="hint">${esc(r.activateHint||"Activate in your card's app first, then mark it here.")}</p>`;
  }
  (p.choice||[]).forEach(s=>{
    const x=w.sel[s.id]||{},cur=selOpts(w,s);
    const stale=s.period==="quarter"&&x.opts&&x.opts.length&&(!x.quarter||x.quarter<PICK_Q);
    h+=`<div class="flabel">${esc(s.label)} · choose ${s.pick}${s.period==="quarter"?` for ${qLabel(PICK_Q)}`:""}</div>
      <div class="chips">${s.options.map(o=>`<button class="chip ${cur.includes(o.id)?"on":""}" onclick="togglePick('${w.id}','${s.id}','${o.id}')">${esc(o.label)}</button>`).join("")}</div>
      ${stale?`<div class="btn-row"><span class="hint">Last set for ${qLabel(x.quarter||QK)}</span><button class="btn-sm" onclick="confirmSame('${w.id}',true)">Keep same picks</button></div>`:""}
      ${isDefaultSel(w,s)?`<p class="hint">Using the card's default until you choose.</p>`:""}`;
  });
  if(p.auto){
    h+=`<div class="flabel">Where will you spend most this month?</div><p class="hint">Only that category earns 5%.</p>
      <div class="chips">${p.auto.options.map(o=>`<button class="chip ${w.autoFocus===o?"on":""}" onclick="setField('${w.id}','autoFocus','${o}')">${esc(catName(o))}</button>`).join("")}</div>`;
  }
  return h?`<h3 class="sec">${p.rotating?"Quarterly bonus":"Your categories"}</h3>${h}`:"";
}
function ownerChips(sel,action){
  return state.people.map(p=>`<button class="chip ${sel===p.id?"on":""}" onclick="${action.replace("$ID",p.id)}">${esc(p.name)}</button>`).join("");
}
function setField(id,f,v){const w=walletById(id);if(!w)return;w[f]=v;save();openDrawer(id,true)}
function toggleAct(id,k){const w=walletById(id);w.activated=w.activated.includes(k)?w.activated.filter(x=>x!==k):[...w.activated,k];save();
  if(!$("sheet").hidden&&drawerId===id)openDrawer(id,true);else render()}
function togglePick(id,slotId,opt){
  const w=walletById(id),s=P(w.product).choice.find(x=>x.id===slotId);
  const cur=(w.sel[slotId]&&w.sel[slotId].opts)||[];let next;
  if(cur.includes(opt))next=cur.filter(x=>x!==opt);else if(s.pick===1)next=[opt];else next=cur.length>=s.pick?[...cur.slice(1),opt]:[...cur,opt];
  w.sel[slotId]={opts:next,quarter:s.period==="quarter"?PICK_Q:undefined};save();openDrawer(id,true);
}
function confirmSame(id,fromDrawer){const w=walletById(id);
  (P(w.product).choice||[]).forEach(s=>{if(s.period==="quarter"&&w.sel[s.id])w.sel[s.id].quarter=PICK_Q});
  save();if(fromDrawer)openDrawer(id,true);else{render();toast("Picks confirmed")}}
function drawerButtons(w){
  return `<div class="action-stack">
    <button class="btn" onclick="closeSheet()">Done</button>
    ${w.inactive?`<button class="btn-outline" onclick="setInactive(['${w.id}'],false)">${ic("restore")}Reactivate card</button>`
      :`<button class="btn-outline" onclick="setInactive(['${w.id}'],true)">${ic("archive")}Deactivate card</button>`}
    <button class="btn-outline danger" onclick="removeCard('${w.id}')">${ic("trash")}Remove from wallet</button></div>
    ${w.inactive?"":`<p class="hint center">Deactivate keeps the card in your history but stops using it on Pay.</p>`}`;
}
function removeCard(id){removeCards([id])}
function removeCards(ids){
  const ws=ids.map(walletById).filter(Boolean);if(!ws.length)return;
  const name=ws.length===1?dn(ws[0]):`${ws.length} cards`;
  confirmDialog(`Remove ${name}?`,ws.length===1?"It will be deleted from your wallet and its history. To keep it in your history, deactivate it instead."
      :"They will be deleted from your wallet and its history. To keep them in your history, deactivate them instead.","Remove",()=>{
    const before=[...state.wallet];state.wallet=state.wallet.filter(w=>!ids.includes(w.id));save();
    selectMode=null;closeSheet();if(answerCtx)renderAnswer();
    toast(`${name} removed`,()=>{state.wallet=before;save();render();if(answerCtx)renderAnswer()});
  });
}
function setInactive(ids,off,confirmed){
  if(off&&!confirmed){
    const ws=ids.map(walletById).filter(Boolean);if(!ws.length)return;
    const one=ws.length===1,name=one?dn(ws[0]):`${ws.length} cards`;
    confirmDialog(`Deactivate ${name}?`,`${one?"It":"They"} will move to your deactivated cards and stop showing on Pay and in Updates. You can reactivate ${one?"it":"them"} any time.`,
      "Deactivate",()=>setInactive(ids,true,true),"primary");
    return;
  }
  closeSwipes();
  ids.forEach(id=>{const w=walletById(id);if(!w)return;if(off)w.inactive=TODAY;else delete w.inactive});save();
  const n=ids.length,name=n===1?dn(walletById(ids[0])):`${n} cards`;
  if(off)showInactive=false;
  selectMode=null;closeSheet();if(answerCtx)renderAnswer();
  toast(`${name} ${off?"deactivated":"reactivated"}`,()=>{ids.forEach(id=>{const w=walletById(id);if(!w)return;if(off)delete w.inactive;else w.inactive=TODAY});save();render();if(answerCtx)renderAnswer()});
}

/* ─── Confirm pop-up ─── */
let dialogFn=null;
function confirmDialog(title,msg,okLabel,fn,kind="danger"){
  dialogFn=fn;const d=$("dialog");
  d.innerHTML=`<div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t"><h2 id="dlg-t">${esc(title)}</h2><p>${esc(msg)}</p>
    <div class="dialog-btns"><button class="btn-outline" onclick="closeDialog()">Cancel</button><button class="btn ${kind==="danger"?"danger":""}" onclick="const f=dialogFn;closeDialog();f&&f()">${esc(okLabel)}</button></div></div>`;
  d.hidden=false;d.onclick=e=>{if(e.target===d)closeDialog()};
}
function closeDialog(){$("dialog").hidden=true;$("dialog").innerHTML="";dialogFn=null}

/* ─── Wallet menu (⋮) and select mode ─── */
function openWalletMenu(){
  const off=state.wallet.filter(w=>w.inactive).length;
  const item=(icon,label,sub,fn)=>`<button class="row" onclick="${fn}"><span class="row-ic">${ic(icon)}</span><span class="row-main"><span class="row-title">${label}</span>${sub?`<span class="row-sub">${sub}</span>`:""}</span></button>`;
  openSheet(`<h2 class="sheet-title">Wallet</h2><div class="list" style="margin-top:12px">
    ${item("plus","Add a card","","closeSheet();openAdd()")}
    ${state.wallet.length?item("sort","Sort & view",`${SORTS[viewOpt().sort]} · grouped by ${GROUPS[viewOpt().group].toLowerCase()}`,"openViewSheet()"):""}
    ${state.wallet.length?item("select","Select cards","Deactivate or remove several at once","closeSheet();startSelect()"):""}
    ${off?item("archive",showInactive?"Hide deactivated cards":"Show deactivated cards",`${off} card${off>1?"s":""}`,"showInactive=!showInactive;closeSheet()"):""}
    ${item("download","Back up or restore","Save your wallet to a file","openBackup()")}
  </div>`);
}
function startSelect(){selectMode=new Set();render()}
function endSelect(){selectMode=null;render()}
function toggleSelect(id){selectMode.has(id)?selectMode.delete(id):selectMode.add(id);render()}
function renderSelectBar(){
  const bar=$("select-bar");if(!selectMode){bar.hidden=true;return}
  const ids=[...selectMode],n=ids.length,allOff=n&&ids.every(id=>walletById(id)?.inactive);
  bar.hidden=false;
  bar.innerHTML=`<span class="sel-count">${n?`${n} selected`:"Tap cards to select"}</span>
    <button class="btn-sm alt" ${n?"":"disabled"} onclick="setInactive([...selectMode],${!allOff})">${ic(allOff?"restore":"archive")}${allOff?"Reactivate":"Deactivate"}</button>
    <button class="btn-sm danger" ${n?"":"disabled"} onclick="removeCards([...selectMode])">${ic("trash")}Remove</button>`;
}

/* ─── Add a card: bank → cards → details ─── */
const POPULAR_BRANDS=["chase","amex","capone","citi","discover","boa","wells","usbank"];
function productsOf(k){return Object.entries(CATALOG.products).filter(([,p])=>p.brand===k).sort((a,b)=>(ownedCount(a[0])>0)-(ownedCount(b[0])>0)||(a[1].status==="closed")-(b[1].status==="closed")||a[1].name.localeCompare(b[1].name))}
const ownedCount=pid=>state.wallet.filter(w=>w.product===pid).length;
let addQ="",addIss=null,bankQ="",draft=null,banksScroll=0,bankCardsScroll=0;
const curScroll=()=>$("sheet").querySelector(".sheet")?.scrollTop||0;
function openAdd(){addQ="";addIss=null;draft=null;renderBanks(false)}
function renderBanks(still=true){
  addIss=null;if(still)still=banksScroll||0.001;
  openSheet(`<h2 class="sheet-title">Add a card</h2><p class="sheet-sub">Choose the bank on your card</p>
    ${searchRow("add-q","Search banks or cards",addQ,"addQ=this.value;renderAddBody()","clearAddSearch()")}
    <div id="add-body"></div><button class="btn-outline" id="add-bottom" onclick="addQ.trim()?clearAddSearch():closeSheet()">Cancel</button>`,still);
  renderAddBody();
  if(typeof still==="number")$("sheet").querySelector(".sheet").scrollTop=still;
}
const bankRow=k=>{const n=productsOf(k).length;return `<button class="row" onclick="openBank('${k}')"><span class="row-main"><span class="row-title">${esc(B(k).name)}</span></span><span class="dim">${n} card${n>1?"s":""}</span>${ic("chevR","dim")}</button>`};
/* Search box with an iOS-style Cancel that clears the search and brings the full list back */
function searchRow(id,ph,val,oninput,oncancel){
  return `<div class="search-row"><label class="search">${ic("search")}<input id="${id}" type="search" placeholder="${esc(ph)}" value="${esc(val)}" autocomplete="off"
    oninput="${oninput};this.closest('.search-row').classList.toggle('active',!!this.value)"></label>
    <button class="search-cancel" onclick="${oncancel}">Cancel</button></div>`.replace('class="search-row"',`class="search-row ${val?"active":""}"`);
}
function clearAddSearch(){addQ="";const i=$("add-q");if(i){i.value="";i.blur();i.closest(".search-row").classList.remove("active")}renderAddBody();
  const sh=$("sheet").querySelector(".sheet");if(sh)sh.scrollTop=0}
function clearBankSearch(){bankQ="";const i=$("bank-q");if(i){i.value="";i.blur();i.closest(".search-row").classList.remove("active")}renderBankList()}
function renderAddBody(){
  const q=addQ.trim().toLowerCase();
  sheetBack=q?{label:"All banks",fn:clearAddSearch}:null;
  const banks=Object.keys(CATALOG.brands).filter(k=>productsOf(k).length).sort((a,b)=>B(a).name.localeCompare(B(b).name));
  if(!q){$("add-body").innerHTML=`<h3 class="sec">Most popular</h3><div class="list">${POPULAR_BRANDS.filter(k=>banks.includes(k)).map(bankRow).join("")}</div>
    <h3 class="sec">All banks A–Z</h3><div class="list">${banks.map(bankRow).join("")}</div>`;return}
  const mb=banks.filter(k=>(B(k).name+" "+B(k).short+" "+(B(k).note||"")).toLowerCase().includes(q));
  const mc=Object.entries(CATALOG.products).filter(([,p])=>(B(p.brand).name+" "+p.name+" "+p.short).toLowerCase().includes(q)).map(([id])=>id);
  $("add-body").innerHTML=(mb.length?`<h3 class="sec">Banks</h3><div class="list">${mb.map(bankRow).join("")}</div>`:"")+
    (mc.length?`<h3 class="sec">Cards</h3><div class="list">${mc.map(cardCompact).join("")}</div>`:"")+
    (!mb.length&&!mc.length?`<p class="hint">No banks or cards match “${esc(addQ)}”.</p>`:"");
}
function cardCompact(id){const p=P(id),owned=ownedCount(id)&&SINGLE_CARD_PER_PRODUCT;
  return `<div class="row static ${owned?"muted":""}">${cardArt(id,56)}<span class="row-main"><span class="row-sub">${esc(B(p.brand).name)}</span><span class="row-title">${esc(p.name)}</span><span class="row-sub">${netLabel(p.network)}</span></span>
    ${owned?(inactiveOf(id)?`<button class="btn-sm alt" onclick="reactivateFromAdd('${id}')">Reactivate</button>`:`<button class="btn-sm alt" disabled>Already added</button>`):`<button class="btn-sm" onclick="startAdd('${id}')">Add</button>`}</div>`}
const inactiveOf=pid=>state.wallet.find(w=>w.product===pid&&w.inactive);
function reactivateFromAdd(pid){const w=inactiveOf(pid);if(w)setInactive([w.id],false)}
function openBank(k){banksScroll=curScroll();addIss=k;bankQ="";bankCardsScroll=0;renderBankCards()}
function renderBankList(){
  const q=bankQ.trim().toLowerCase(),items=productsOf(addIss).filter(([,p])=>!q||(p.name+" "+p.short).toLowerCase().includes(q));
  $("bank-list").innerHTML=items.map(([id])=>cardFull(id)).join("")||`<p class="hint">No ${esc(B(addIss).name)} cards match “${esc(bankQ)}”.</p>`;
}
function renderBankCards(){
  const b=B(addIss),items=productsOf(addIss);
  openSheet(`<h2 class="sheet-title">${esc(b.name)}</h2><p class="sheet-sub">${b.note?esc(b.note):`${items.length} card${items.length>1?"s":""}`}</p>
    ${items.length>3?searchRow("bank-q",`Search ${b.short||b.name} cards`,bankQ,"bankQ=this.value;renderBankList()","clearBankSearch()"):""}
    <div id="bank-list" class="offers"></div><button class="btn-outline" onclick="bankQ.trim()?clearBankSearch():renderBanks()">${ic("chevL")}Back to all banks</button>`,bankCardsScroll||0.001,{label:"All banks",fn:()=>renderBanks()});
  renderBankList();$("sheet").querySelector(".sheet").scrollTop=bankCardsScroll||0;
}
function cardFull(id){const p=P(id),owned=ownedCount(id)&&SINGLE_CARD_PER_PRODUCT;
  return `<div class="offer ${owned?"muted":""}"><div class="offer-art">${cardArt(id)}</div>
    <div class="row-title">${esc(B(p.brand).name)} ${esc(p.name)}</div>
    <div class="row-sub">${netLabel(p.network)}${p.business?" · Business":""}${p.status==="closed"?" · No longer offered":""}${owned?(inactiveOf(id)?" · Deactivated":" · In your wallet"):""}</div>
    ${owned?(inactiveOf(id)?`<button class="btn" onclick="reactivateFromAdd('${id}')">Reactivate</button>`:`<button class="btn" disabled>Already added</button>`):`<button class="btn" onclick="startAdd('${id}')">Add</button>`}</div>`}
function startAdd(pid){if(SINGLE_CARD_PER_PRODUCT&&ownedCount(pid))return;if(addIss)bankCardsScroll=curScroll();else banksScroll=curScroll();const p=P(pid);draft={product:pid,owner:state.people[0]?.id||"",nickname:"",last4:"",network:p.network};renderDraft(false)}
function renderDraft(keep=true){
  const p=P(draft.product);
  openSheet(`<div class="offer-art small">${cardArt(draft.product)}</div>
    <h2 class="sheet-title center">${esc(B(p.brand).name)} ${esc(p.name)}</h2>
    ${state.people.length>1?`<div class="flabel">Whose card is this?</div><div class="chips">${ownerChips(draft.owner,"draft.owner='$ID';renderDraft()")}</div>`:""}
    ${p.networkOptions?`<div class="flabel">Which logo is on your card?</div><div class="chips">${p.networkOptions.map(n=>`<button class="chip ${draft.network===n?"on":""}" onclick="draft.network='${n}';renderDraft()">${capWord(n)}</button>`).join("")}</div>`:""}
    <label class="flabel" for="d-last4">Last 4 digits (optional)</label>
    <input class="field mono" id="d-last4" inputmode="numeric" maxlength="4" placeholder="1234" value="${esc(draft.last4)}" oninput="draft.last4=this.value.replace(/\\D/g,'').slice(0,4)">
    <label class="flabel" for="d-nick">Nickname (optional)</label>
    <input class="field" id="d-nick" placeholder="${esc(p.short)}" value="${esc(draft.nickname)}" oninput="draft.nickname=this.value">
    <p class="hint">Never enter your full card number. The last 4 only help you spot the card at checkout.</p>
    <button class="btn" onclick="addCard()">Add to wallet</button>`,keep,{label:addIss?B(addIss).short||B(addIss).name:"Back",fn:()=>addIss?renderBankCards():renderBanks()});
}
function addCard(){
  const p=P(draft.product);
  const w=normalize({id:"w"+Date.now(),product:draft.product,owner:draft.owner,nickname:draft.nickname.trim(),last4:draft.last4,rewards:"",dueDay:null,limit:""});
  if(p.networkOptions&&draft.network!==p.network)w.network=draft.network;
  state.wallet.push(w);state.onboarded=true;save();draft=null;
  if(p.choice||p.rotating||p.auto)openDrawer(w.id);else{closeSheet();toast(`${dn(w)} added`)}
}

/* ─── First run: which cards do you carry? ─── */
let obSel=new Set(),obQ="";
function openOnboard(){obSel=new Set();obQ="";$("onboard").hidden=false;document.body.classList.add("locked");renderOnboard()}
function renderOnboard(){
  const q=obQ.trim().toLowerCase();
  const ids=q?Object.keys(CATALOG.products).filter(id=>{const p=P(id);return (B(p.brand).name+" "+p.name+" "+p.short).toLowerCase().includes(q)}).slice(0,30):POPULAR_CARDS.filter(P);
  $("ob-grid").innerHTML=ids.map(id=>{const p=P(id),on=obSel.has(id),own=ownedCount(id)>0;
    return `<button class="ob-card ${on?"on":""}" ${own?"disabled":""} onclick="obToggle('${id}')" aria-pressed="${on}">${cardArt(id)}
      <span class="ob-name">${esc(B(p.brand).short)} ${esc(p.name)}</span>${on?`<span class="ob-check">${ic("check")}</span>`:""}${own?`<span class="ob-owned">In wallet</span>`:""}</button>`}).join("")||`<p class="hint">No cards match “${esc(obQ)}”.</p>`;
  const n=obSel.size;
  $("ob-add").disabled=!n;$("ob-add").textContent=n?`Add ${n} card${n>1?"s":""}`:"Tap the cards you carry";
}
function obToggle(id){obSel.has(id)?obSel.delete(id):obSel.add(id);renderOnboard()}
function obSearch(v){obQ=v;renderOnboard()}
function obFinish(skip){
  if(!skip)[...obSel].forEach(id=>state.wallet.push(normalize({id:"w"+Date.now()+Math.random().toString(36).slice(2,6),product:id,owner:state.people[0]?.id||"",nickname:"",last4:"",rewards:"",dueDay:null,limit:""})));
  state.onboarded=true;save();$("onboard").hidden=true;document.body.classList.remove("locked");
  go(!skip&&allTasks().length?"updates":"pay");
  if(!skip&&obSel.size)toast(`${obSel.size} card${obSel.size>1?"s":""} added${allTasks().length?". A few need a quick setup.":""}`);
}

/* ─── Backup: a file you can keep in iCloud Drive / Files and restore on any phone ─── */
function exportWallet(){
  const data=JSON.stringify({app:"card-maximizer",saved:new Date().toISOString(),state},null,1);
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));
  a.download=`card-maximizer-backup-${TODAY}.json`;document.body.appendChild(a);a.click();a.remove();
  state.backedUp=TODAY;save();render();toast("Backup saved to your downloads");
}
function importWallet(file){
  if(!file)return;const r=new FileReader();
  r.onload=()=>{try{const d=JSON.parse(r.result),s=d.state||d;if(!s||!Array.isArray(s.wallet))throw 0;
      const before=JSON.stringify(state);
      s.wallet.forEach(normalize);Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,s);
      state.recents=state.recents||[];state.usage=state.usage||{};state.reports=state.reports||[];state.favs=state.favs||[];state.onboarded=true;
      save();closeSheet();go("wallet");toast(`Restored ${s.wallet.length} card${s.wallet.length===1?"":"s"}`,()=>{const b=JSON.parse(before);Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,b);save();render()});
    }catch{toast("That file isn't a Card Maximizer backup")}};
  r.readAsText(file);
}
function openBackup(){
  openSheet(`<h2 class="sheet-title">Back up your wallet</h2>
    <p class="sheet-sub">Your cards are saved on this phone. Save a backup file to iCloud Drive or Google Drive so you can restore them if you delete the app or get a new phone.</p>
    <button class="btn" onclick="exportWallet()">${ic("copy")} Save backup file</button>
    <label class="btn-ghost" style="cursor:pointer;color:var(--accent)">Restore from a backup<input type="file" accept="application/json,.json" hidden onchange="importWallet(this.files[0])"></label>
    <p class="hint">${state.backedUp?`Last backup: ${shortDate(isoToDate(state.backedUp))}.`:"No backup yet."} Backups include your cards, picks, favorites and reports. Never card numbers.</p>`);
}

/* ─── One-finger navigation ─── */
document.addEventListener("click",e=>{if(swipeOpen&&!e.target.closest(".swipe-wrap"))closeSwipes()},true);
// The Pay answer slides up like the other pop-ups: swipe down (or sideways) to close it.
sheetGestures($("ans-panel"),closeAnswer,()=>closeAnswer);
$("answer").addEventListener("click",e=>{if(e.target===$("answer"))closeAnswer()});
// Swipe left/right anywhere on a main tab to move between Pay, Wallet and Updates.
(function(){const ORDER=["pay","wallet","updates"];let x0,y0,ok=false;
  const main=document.querySelector("main");
  main.addEventListener("touchstart",e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY;
    ok=e.touches.length===1&&x0>24&&x0<innerWidth-24&&!e.target.closest("input,textarea,.chips,.no-swipe,.swipe-wrap")},{passive:true});
  main.addEventListener("touchend",e=>{if(!ok)return;ok=false;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;
    if(Math.abs(dx)<80||Math.abs(dx)<Math.abs(dy)*2)return;
    const i=ORDER.indexOf(tab)+(dx<0?1:-1);if(i>=0&&i<ORDER.length)go(ORDER[i]);},{passive:true});
})();

/* ─── Opening splash ─── */
(function(){const sp=$("splash");if(!sp)return;
  if(!SHOW.splash){sp.remove();return}
  const done=()=>sp.remove();
  sp.addEventListener("animationend",e=>{if(e.target===sp)done()});
  sp.addEventListener("click",()=>sp.classList.add("skip"));
  setTimeout(done,2600); // safety net
})();

/* Ask the browser to keep this app's storage (protects the wallet from automatic clean-up) */
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch{}

/* ─── Init ─── */
go("pay");
if(!state.wallet.length&&!state.onboarded)openOnboard();
syncCatalog();
if("serviceWorker"in navigator){
  const sw=`const C='card-max-v2';self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['./']))));self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));`;
  navigator.serviceWorker.register(URL.createObjectURL(new Blob([sw],{type:"application/javascript"}))).catch(()=>{});
}

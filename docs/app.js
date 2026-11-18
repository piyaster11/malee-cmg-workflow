/* Malee CMG → R&D → Finance workflow — static prototype. MOCK DATA ONLY.
   All data lives in localStorage under KEY. Replace the store + notify() for production. */
(function(){
'use strict';
const KEY='malee-cmg-workflow-v1';
const ROLES={CMG:'CMG (OEM team)',RND:'R&D',FIN:'Finance – Factory',ADMIN:'Admin'};
const ROLE_TH={CMG:'ทีม CMG',RND:'ฝ่ายวิจัยและพัฒนา',FIN:'บัญชีต้นทุน โรงงาน',ADMIN:'ผู้ดูแลระบบ'};
const USERS={CMG:'Demo CMG user',RND:'Demo R&D user',FIN:'Demo Finance user',ADMIN:'Demo Admin'};
// Placeholder distribution lists (example.com = not real addresses)
const MAIL={CMG:'cmg-team@example.com',RND:'rnd-team@example.com',FIN:'factory-finance@example.com',ADMIN:'workflow-admin@example.com'};
const STAGES=['Draft','Submitted','In formulation','Sent to Finance','Costing done'];
const STAGE_LABEL={'Draft':'Draft · ร่าง','Submitted':'Submitted to R&D · ส่ง R&D','In formulation':'In formulation · กำลังทำสูตร','Sent to Finance':'Sent to Finance · ส่งบัญชี','Costing done':'Costing done · คิดต้นทุนแล้ว','Returned':'Returned · ตีกลับ'};
const ALL_STATUS=[...STAGES,'Returned'];
const PRODUCT_TYPES=['Coconut water 100%','Coconut water with pulp','Coconut milk','Coconut cream','Coconut milk powder','Blended coconut drink','Other coconut product'];
const PACKS=['Aluminium can','Aseptic carton','PET bottle','Glass bottle','Pouch','Bulk / bag-in-box'];
const CLAIMS=['No added sugar','Organic','Non-GMO','Vegan / plant-based','Clean label','Low sugar','NFC (not from concentrate)','Gluten free'];
const CATS=['Coconut base','Sweetener','Stabiliser / emulsifier','Acid / vitamin','Flavour','Water','Packaging'];

const now=()=>new Date().toISOString();
const DAY=86400000;
const ago=(d,h=0)=>new Date(Date.now()-d*DAY-h*3600000).toISOString();
const fmtT=iso=>iso?new Date(iso).toLocaleString('en-GB',{timeZone:'Asia/Bangkok',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})+' ICT':'';
const fmtD=iso=>iso?new Date(iso).toLocaleDateString('en-GB',{timeZone:'Asia/Bangkok',day:'2-digit',month:'short',year:'numeric'}):'';
const days=(a,b)=>((b?new Date(b):new Date())-new Date(a))/DAY;
const n2=x=>x===''||x==null?'0.00':!isFinite(x)?'—':Number(x).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const CODE_RE=/^[A-Z0-9][A-Z0-9._\-\/]{1,39}$/; // RM-xxxxx in the mock; also allows ERP-style numeric codes
const ID_RE=/^CMG-\d{4}-\d{4,}$/;
const n4=x=>x===''||x==null?'0.00':!isFinite(x)?'—':Number(x).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4});
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const x=parseFloat(v);return isFinite(x)?x:NaN};
// Strict number parser for typed fields: accepts 1234.5 and thousands like 100,000 or 1,250.50; rejects 5,5 (decimal comma) and junk.
const parseNum=v=>{v=String(v).trim().replace(/\s/g,'');if(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(v))v=v.replace(/,/g,'');return /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(v)?parseFloat(v):NaN;};
const sid=()=>Math.random().toString(36).slice(2,10);
const stCls=s=>'s-'+s.replace(/[^A-Za-z]/g,'');
const pill=s=>`<span class="pill ${stCls(s)}">${esc(STAGE_LABEL[s]||s)}</span>`;

/* ---------- Seed data (MOCK) ---------- */
function seedMaterials(){
  const m=[
   ['RM-10001','Coconut water, NFC (Nam Hom type)','Coconut base','kg',18,'Supplier A (mock)'],
   ['RM-10002','Coconut water concentrate 60 °Brix','Coconut base','kg',95,'Supplier A (mock)'],
   ['RM-10003','Coconut cream 24% fat','Coconut base','kg',70,'Supplier B (mock)'],
   ['RM-10004','Coconut milk 17% fat','Coconut base','kg',55,'Supplier B (mock)'],
   ['RM-10005','Desiccated coconut, fine','Coconut base','kg',85,'Supplier C (mock)'],
   ['RM-10006','Coconut milk powder 60% fat','Coconut base','kg',160,'Supplier C (mock)'],
   ['RM-20001','Cane sugar, refined','Sweetener','kg',24,'Supplier D (mock)'],
   ['RM-20002','Coconut sugar','Sweetener','kg',90,'Supplier D (mock)'],
   ['RM-20003','Stevia extract (Reb A 97%)','Sweetener','kg',2800,'Supplier E (mock)'],
   ['RM-30001','Guar gum','Stabiliser / emulsifier','kg',180,'Supplier E (mock)'],
   ['RM-30002','Xanthan gum','Stabiliser / emulsifier','kg',220,'Supplier E (mock)'],
   ['RM-30003','Mono- & diglycerides (E471)','Stabiliser / emulsifier','kg',120,'Supplier F (mock)'],
   ['RM-30004','Citric acid, anhydrous','Acid / vitamin','kg',55,'Supplier F (mock)'],
   ['RM-30005','Ascorbic acid (vitamin C)','Acid / vitamin','kg',350,'Supplier F (mock)'],
   ['RM-40001','Natural coconut flavour','Flavour','kg',900,'Supplier G (mock)'],
   ['RM-40002','Natural pandan flavour','Flavour','kg',1100,'Supplier G (mock)'],
   ['RM-50001','Treated process water','Water','kg',0.05,'In-house (mock)'],
   ['RM-60001','Aluminium can 330 ml + lid','Packaging','ea',3.2,'Supplier H (mock)'],
   ['RM-60002','Aseptic carton 1 L + cap','Packaging','ea',4.5,'Supplier H (mock)'],
   ['RM-60003','Shrink-sleeve label','Packaging','ea',0.35,'Supplier J (mock)']];
  return m.map(r=>({code:r[0],desc:r[1],cat:r[2],unit:r[3],cost:r[4],supplier:r[5],active:true,updatedAt:now()}));
}
function seedState(){
  const s={schema:1,seq:0,materials:seedMaterials(),requests:[],notifications:[],emails:[],materialLog:[]};
  const baseForm={contactEmail:'',storage:'Ambient',sweetness:'None',halal:'Required',otherCerts:'',attachments:'',priority:'Normal',currency:'THB',priceBasis:'per unit, EXW factory',volumeUnit:'units',unitsPerCase:12};
  // 1: Costing done
  const r1={id:'CMG-2026-0001',createdAt:ago(14),status:'Draft',audit:[],form:Object.assign({},baseForm,{customer:'Example Coffee Chain (demo)',contact:'J. Demo',productType:'Coconut milk',packFormat:'Aseptic carton',packSize:1000,packUnit:'ml',brix:'',fat:3.2,ph:6.6,sweetness:'Low',flavour:'Barista coconut, neutral',shelfLife:12,claims:['Vegan / plant-based'],allergen:'Contains coconut (tree nut in some markets)',volume:240000,targetPrice:62,launchDate:'2027-04-01',market:'Thailand, Singapore',notes:'Barista-grade: must foam and not split in hot coffee.'})};
  // 2: Sent to Finance
  const r2={id:'CMG-2026-0002',createdAt:ago(7),status:'Draft',audit:[],form:Object.assign({},baseForm,{customer:'Demo Retail Brand EU',contact:'A. Sample',productType:'Coconut water 100%',packFormat:'Aluminium can',packSize:330,packUnit:'ml',unitsPerCase:24,brix:6,fat:'',ph:5.2,sweetness:'None',flavour:'Natural coconut',shelfLife:18,claims:['No added sugar','Organic','NFC (not from concentrate)'],allergen:'',halal:'Preferred',volume:600000,targetPrice:0.55,currency:'USD',priceBasis:'per unit, FOB Bangkok',launchDate:'2027-03-15',market:'Germany, Netherlands',notes:'Organic certificate required for EU.'})};
  // 3: Submitted to R&D
  const r3={id:'CMG-2026-0003',createdAt:ago(2,5),status:'Draft',audit:[],form:Object.assign({},baseForm,{customer:'Sample Juice Bar (demo)',contact:'K. Mock',productType:'Blended coconut drink',packFormat:'Aluminium can',packSize:330,packUnit:'ml',unitsPerCase:24,brix:9,fat:'',ph:5.0,sweetness:'Medium',flavour:'Coconut pandan',shelfLife:12,claims:['Low sugar'],allergen:'',volume:150000,targetPrice:14,launchDate:'2027-06-01',market:'Thailand',priority:'High',notes:'Ref: pandan colour should be natural; no artificial colours.'})};
  const A=(r,t,role,action,detail,status)=>{r.audit.push({t,user:USERS[role],role,action,detail:detail||'',status});if(status){r.status=status;r.statusSince=t;}r.updatedAt=t;};
  A(r1,ago(14),'CMG','Created draft','', 'Draft');A(r1,ago(13,20),'CMG','Submitted to R&D','', 'Submitted');
  A(r1,ago(12),'RND','Started formulation','v1','In formulation');
  r1.formulation={version:1,batchKg:1000,process:'Blend, UHT 140 °C / 4 s, homogenise 200/50 bar, aseptic fill.',notes:'Foam test passed in lab (mock).',
    lines:[{code:'RM-10004',pct:60},{code:'RM-50001',pct:37.4},{code:'RM-20001',pct:2},{code:'RM-30001',pct:0.15},{code:'RM-30003',pct:0.25},{code:'RM-40001',pct:0.2}],
    pack:[{code:'RM-60002',qty:1}],history:[]};
  r1.formulation.sentSnapshot=JSON.parse(JSON.stringify({version:1,lines:r1.formulation.lines,pack:r1.formulation.pack,batchKg:1000,process:r1.formulation.process}));
  A(r1,ago(9),'RND','Formulation v1 sent to Finance','6 ingredient lines, 1 packaging line','Sent to Finance');
  r1.costing={lossPct:3,labour:1.2,overhead:2.5,extraPack:0.6,marginPct:18,overrides:{},comment:'Approved at mock standard costs.',sentBefore:true};r1.costing.snapshot=Object.fromEntries([...r1.formulation.lines,...r1.formulation.pack].map(l=>[l.code,s.materials.find(m=>m.code===l.code).cost]));
  A(r1,ago(7),'FIN','Costing approved','Cost/unit computed from standard costs','Costing done');
  A(r2,ago(7),'CMG','Created draft','','Draft');A(r2,ago(6,22),'CMG','Submitted to R&D','','Submitted');
  A(r2,ago(6),'RND','Started formulation','v1','In formulation');
  r2.formulation={version:1,batchKg:2000,process:'Filter, add vitamin C, UHT 135 °C, hot-fill can, nitrogen dose.',notes:'Organic-certified coconut water source to be confirmed (mock).',
    lines:[{code:'RM-10001',pct:99.95},{code:'RM-30005',pct:0.05}],pack:[{code:'RM-60001',qty:1},{code:'RM-60003',qty:1}],history:[]};
  r2.formulation.sentSnapshot=JSON.parse(JSON.stringify({version:1,lines:r2.formulation.lines,pack:r2.formulation.pack,batchKg:2000,process:r2.formulation.process}));
  A(r2,ago(3),'RND','Formulation v1 sent to Finance','2 ingredient lines, 2 packaging lines','Sent to Finance');
  A(r3,ago(2,5),'CMG','Created draft','','Draft');A(r3,ago(2,4),'CMG','Submitted to R&D','','Submitted');
  s.requests=[r1,r2,r3];
  const N=(t,role,req,title)=>s.notifications.push({id:sid(),t,toRole:role,reqId:req,title,read:true});
  N(ago(13,20),'RND','CMG-2026-0001','New CMG request submitted');N(ago(9),'FIN','CMG-2026-0001','Formulation ready for costing');N(ago(7),'CMG','CMG-2026-0001','Costing completed');
  N(ago(6,22),'RND','CMG-2026-0002','New CMG request submitted');
  s.notifications.push({id:sid(),t:ago(3),toRole:'FIN',reqId:'CMG-2026-0002',title:'Formulation ready for costing',read:false});
  s.notifications.push({id:sid(),t:ago(2,4),toRole:'RND',reqId:'CMG-2026-0003',title:'New CMG request submitted',read:false});
  return s;
}

/* ---------- Store ---------- */
let S;
function load(){
  let raw=null;try{raw=localStorage.getItem(KEY);}catch(e){}
  let d=null;try{d=raw?JSON.parse(raw):null;}catch(e){d=null;}
  const v=d&&validateState(d);
  if(raw&&!v){try{localStorage.setItem(KEY+'-corrupt-backup',raw);}catch(e){} setTimeout(()=>toast('Saved data was unreadable — demo data restored (old copy kept as backup)'),300);}
  S=v||seedState();save();
}
let saveFailed=false;
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));saveFailed=false;return true;}catch(e){saveFailed=true;setTimeout(()=>toast('⚠ Could not save — browser storage is full or blocked. Export your data (Admin → Data tools) before closing.'),50);return false;}}
// Validate + sanitise a state object (used for localStorage and JSON import). Returns cleaned state or null.
function validateState(d){
  if(!d||typeof d!=='object'||!Array.isArray(d.materials)||!Array.isArray(d.requests))return null;
  const str=x=>x==null?'':String(x);
  const mats=[];for(const m of d.materials){if(!m||!CODE_RE.test(str(m.code)))return null;const c=num(m.cost);mats.push({code:str(m.code),desc:str(m.desc),cat:str(m.cat),unit:str(m.unit),cost:isFinite(c)&&c>=0?c:0,supplier:str(m.supplier),active:m.active!==false,updatedAt:str(m.updatedAt)});}
  const ids=new Set();const reqs=[];
  for(const r of d.requests){
    if(!r||!ID_RE.test(str(r.id))||ids.has(r.id)||!ALL_STATUS.includes(r.status)||!r.form||typeof r.form!=='object')return null;ids.add(r.id);
    const audit=(Array.isArray(r.audit)?r.audit:[]).map(a=>({t:str(a.t),user:str(a.user),role:ROLES[a.role]?a.role:'ADMIN',action:str(a.action),detail:str(a.detail),status:ALL_STATUS.includes(a.status)?a.status:''}));
    const F=r.formulation&&typeof r.formulation==='object'?r.formulation:null;
    if(F){F.version=Math.max(1,parseInt(F.version)||1);F.batchKg=num(F.batchKg)||0;F.lines=(Array.isArray(F.lines)?F.lines:[]).map(l=>({code:str(l.code),pct:l.pct===''?'':num(l.pct)}));F.pack=(Array.isArray(F.pack)?F.pack:[]).map(l=>({code:str(l.code),qty:num(l.qty)}));F.process=str(F.process);F.notes=str(F.notes);F.history=Array.isArray(F.history)?F.history.map(h=>Object.assign({},h,{version:parseInt(h.version)||1})):[];}
    const form=Object.assign({},r.form);form.claims=Array.isArray(form.claims)?form.claims.map(str):[];
    reqs.push(Object.assign({},r,{id:str(r.id),createdAt:str(r.createdAt)||now(),updatedAt:str(r.updatedAt)||str(r.createdAt)||now(),statusSince:str(r.statusSince)||str(r.updatedAt)||now(),returnedTo:ROLES[r.returnedTo]?r.returnedTo:null,audit,form,formulation:F,costing:r.costing&&typeof r.costing==='object'?r.costing:null}));
  }
  const notifs=(Array.isArray(d.notifications)?d.notifications:[]).filter(n=>n&&ROLES[n.toRole]).map(n=>({id:str(n.id)||sid(),t:str(n.t),toRole:n.toRole,reqId:str(n.reqId),title:str(n.title),read:!!n.read}));
  const emails=(Array.isArray(d.emails)?d.emails:[]).filter(Boolean).map(e=>({id:str(e.id)||sid(),t:str(e.t),to:str(e.to),cc:str(e.cc),subject:str(e.subject),body:str(e.body),channel:str(e.channel)}));
  return {schema:1,seq:0,materials:mats,requests:reqs,notifications:notifs,emails,materialLog:Array.isArray(d.materialLog)?d.materialLog.map(x=>({t:str(x.t),user:str(x.user),code:str(x.code),change:str(x.change)})):[]};
}
// Next request ID = highest existing number for this year + 1 (safe after reset / import)
function nextId(){const y=new Date().getFullYear();const max=S.requests.reduce((a,r)=>{const m=/^CMG-(\d{4})-(\d+)$/.exec(r.id);return m&&+m[1]===y?Math.max(a,+m[2]):a},0);return 'CMG-'+y+'-'+String(max+1).padStart(4,'0');}
let role=localStorage.getItem(KEY+'-role')||'CMG';
const mat=code=>S.materials.find(m=>m.code===code);
const reqById=id=>S.requests.find(r=>r.id===id);

/* ---------- Notifications ----------
   INTEGRATION POINT: in production replace the body of deliver() with a call to your backend
   (e.g. Power Automate HTTP trigger, Microsoft Graph sendMail / Teams webhook, Gmail API,
   LINE Messaging API). Everything else in the app already calls notify() at each handoff. */
function deliver(email){ /* e.g. fetch('https://<your-flow-url>',{method:'POST',body:JSON.stringify(email)}) */ }
function notify(toRole,req,title,body){
  const t=now();
  S.notifications.push({id:sid(),t,toRole,reqId:req.id,title,read:false});
  const email={id:sid(),t,to:MAIL[toRole],cc:toRole==='CMG'?'':MAIL.CMG,subject:`[${req.id}] ${title}`,channel:'Email (simulated)',
    body:`Dear ${ROLES[toRole]} team,\n\n${body}\n\nRequest: ${req.id}\nCustomer: ${req.form.customer}\nProduct: ${req.form.productType}, ${req.form.packFormat} ${req.form.packSize} ${req.form.packUnit}\nStatus: ${req.status}\nOpen: ${location.origin+location.pathname}#/req/${req.id}\n\n— Malee CMG Workflow (prototype, automated message)`};
  S.emails.push(email);deliver(email);
}
function audit(r,action,detail,status){const t=now();r.audit.push({t,user:USERS[role],role,action,detail:detail||'',status:status||''});if(status){r.status=status;r.statusSince=t;}r.updatedAt=t;}

/* ---------- Costing engine ---------- */
function fillKg(f){const s=num(f.packSize)||0;return f.packUnit==='ml'||f.packUnit==='g'?s/1000:s;}
function lineCost(r,code){const C=r.costing||{};const o=C.overrides&&C.overrides[code];if(o&&isFinite(num(o.cost)))return num(o.cost);
  if(r.status==='Costing done'&&C.snapshot&&isFinite(num(C.snapshot[code])))return num(C.snapshot[code]); // approved costing is frozen
  const m=mat(code);return m?m.cost:NaN;}
function costingErrors(r){const C=r.costing||{},e=[];const F=r.formulation||{lines:[],pack:[]};
  [['lossPct','Yield loss %'],['marginPct','Margin %']].forEach(([k,l])=>{const v=C[k]===''||C[k]==null?0:num(C[k]);if(!(v>=0&&v<100))e.push(l+' must be from 0 to below 100');});
  [['labour','Labour'],['overhead','Overhead'],['extraPack','Other packaging']].forEach(([k,l])=>{const v=C[k]===''||C[k]==null?0:num(C[k]);if(!(v>=0))e.push(l+' must be 0 or more');});
  Object.entries(C.overrides||{}).forEach(([k,o])=>{if(!String(o.reason||'').trim())e.push(`Override on ${k} needs a reason`);if(!(num(o.cost)>=0))e.push(`Override on ${k} must be 0 or more`);});
  [...F.lines,...F.pack].forEach(l=>{if(!isFinite(lineCost(r,l.code)))e.push(`${l.code}: no standard cost found in the material master — add it or override with a reason`);});
  if(!(fillKg(r.form)>0))e.push('Pack size on the request is missing — cannot cost per unit');return e;}
function compute(r){
  const F=r.formulation||{lines:[],pack:[]},C=Object.assign({lossPct:0,labour:0,overhead:0,extraPack:0,marginPct:0},r.costing||{});
  const kgPerKg=F.lines.reduce((a,l)=>a+(num(l.pct)||0)/100*lineCost(r,l.code),0);
  const fk=fillKg(r.form);const ingUnit=kgPerKg*fk;const loss=num(C.lossPct)||0;
  const ingAdj=ingUnit/(1-loss/100);
  const packUnit=F.pack.reduce((a,p)=>a+(num(p.qty)||0)*lineCost(r,p.code),0);
  const conv=(num(C.labour)||0)+(num(C.overhead)||0)+(num(C.extraPack)||0);
  const margin=num(C.marginPct)||0;const okRange=loss>=0&&loss<100&&margin>=0&&margin<100;
  const total=okRange?ingAdj+packUnit+conv:NaN;
  const price=total/(1-margin/100);const upc=num(r.form.unitsPerCase)>0?num(r.form.unitsPerCase):1;
  return {kgPerKg,fk,ingUnit,ingAdj,lossAmt:ingAdj-ingUnit,packUnit,labour:num(C.labour)||0,overhead:num(C.overhead)||0,extraPack:num(C.extraPack)||0,total,price,upc,caseCost:total*upc,casePrice:price*upc};
}

/* ---------- UI helpers ---------- */
const $=s=>document.querySelector(s);
function toast(m){const t=$('#toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.add('hidden'),2600);}
function go(h){location.hash=h;}
function navItems(){
  const it=[['#/dash','Dashboard · ภาพรวม']];
  if(role==='CMG'||role==='ADMIN')it.push(['#/new','New request · คำขอใหม่']);
  if(role==='RND'||role==='ADMIN')it.push(['#/rnd','R&D queue · คิว R&D']);
  if(role==='FIN'||role==='ADMIN')it.push(['#/fin','Finance queue · คิวบัญชี']);
  it.push(['#/materials','Material master · รหัสวัตถุดิบ'],['#/inbox','Inbox & email log'],['#/next','Next steps']);
  if(role==='ADMIN')it.push(['#/admin','Data tools']);
  return it;
}
function renderNav(){const h=location.hash.split('/').slice(0,2).join('/');$('#nav').innerHTML=navItems().map(([u,l])=>`<a href="${u}" class="${h===u?'on':''}">${esc(l)}</a>`).join('');
  const c=S.notifications.filter(n=>!n.read&&n.toRole===role).length;const b=$('#bellCount');b.textContent=c;b.classList.toggle('hidden',!c);}
function pipeline(r){
  const idx=STAGES.indexOf(r.status);
  return `<div class="pipe">${STAGES.map((s,i)=>`<div class="st ${r.status==='Returned'?'':(i<idx?'done':(i===idx?'cur':''))}">${esc(STAGE_LABEL[s])}</div>`).join('')}${r.status==='Returned'?`<div class="st ret">Returned to ${esc(ROLES[r.returnedTo]||'')}</div>`:''}</div>`;
}
function stageDurations(r){ // days spent in each status, from audit trail
  const out={};const ev=r.audit.filter(a=>a.status);
  ev.forEach((a,i)=>{const end=ev[i+1]?ev[i+1].t:(r.status==='Costing done'&&i===ev.length-1?a.t:null);out[a.status]=(out[a.status]||0)+days(a.t,end||undefined);});
  return out;
}
function owner(r){return {Draft:'CMG',Submitted:'RND','In formulation':'RND','Sent to Finance':'FIN','Costing done':'—',Returned:r.returnedTo||'CMG'}[r.status];}

/* ---------- Views ---------- */
const V={};
V.dash=()=>{
  const counts={};ALL_STATUS.forEach(s=>counts[s]=0);S.requests.forEach(r=>counts[r.status]++);
  const f=V.dash.f||(V.dash.f={status:'',type:'',q:''});
  const open=S.requests.filter(r=>r.status!=='Costing done'&&r.status!=='Draft');
  const avgAge=open.length?open.reduce((a,r)=>a+days(r.statusSince),0)/open.length:0;
  const done=S.requests.filter(r=>r.status==='Costing done');
  const cycle=done.length?done.reduce((a,r)=>{const sub=r.audit.find(x=>x.status==='Submitted');return a+(sub?days(sub.t,r.statusSince):0)},0)/done.length:0;
  const rows=S.requests.filter(r=>(!f.status||r.status===f.status)&&(!f.type||r.form.productType===f.type)&&(!f.q||(r.id+' '+r.form.customer+' '+r.form.market).toLowerCase().includes(f.q.toLowerCase()))).sort((a,b)=>b.id.localeCompare(a.id));
  return `<h1>Dashboard <span class="th">ภาพรวมคำขอ</span></h1><p class="sub">Signed in as <b>${esc(ROLES[role])}</b> (${ROLE_TH[role]}) — demo role switcher; real logins come later.</p>
  <div class="grid g6">${ALL_STATUS.map(s=>`<button type="button" class="stat" data-st="${esc(s)}" aria-pressed="${f.status===s}" aria-label="${esc(s)}: ${counts[s]} — filter table"><b>${counts[s]}</b>${pill(s)}</button>`).join('')}</div>
  <div class="grid g3" style="margin-top:12px">
   <div class="card"><small class="muted">Open requests (not draft / not done)</small><h2 style="margin:4px 0">${open.length}</h2></div>
   <div class="card"><small class="muted">Average days in current stage (open)</small><h2 style="margin:4px 0">${avgAge.toFixed(1)} d</h2></div>
   <div class="card"><small class="muted">Avg cycle time, submit → costing done</small><h2 style="margin:4px 0">${done.length?cycle.toFixed(1)+' d':'—'}</h2></div>
  </div>
  <div class="card"><h3 style="margin-top:0">All requests <span class="th">คำขอทั้งหมด</span></h3>
  <div class="grid g3 no-print" style="margin-bottom:10px">
   <select id="fSt" aria-label="Filter by status"><option value="">All statuses</option>${ALL_STATUS.map(s=>`<option ${f.status===s?'selected':''} value="${esc(s)}">${esc(STAGE_LABEL[s])}</option>`).join('')}</select>
   <select id="fTy" aria-label="Filter by product type"><option value="">All product types</option>${PRODUCT_TYPES.map(s=>`<option ${f.type===s?'selected':''}>${esc(s)}</option>`).join('')}</select>
   <input id="fQ" aria-label="Search requests" placeholder="Search ID, customer, market…" value="${esc(f.q)}">
  </div>
  <div class="tbl-wrap"><table><thead><tr><th>Request</th><th>Customer / brand</th><th>Product</th><th>Status</th><th>With</th><th class="num">Days in stage</th><th>Stage ageing (days)</th><th>Launch</th><th>Updated</th></tr></thead><tbody>
  ${rows.map(r=>{const d=stageDurations(r);return `<tr><td><a href="#/req/${esc(r.id)}"><b>${esc(r.id)}</b></a>${r.form.priority!=='Normal'?` <span class="pill s-Returned">${esc(r.form.priority)}</span>`:''}</td><td>${esc(r.form.customer)}<div class="small muted">${esc(r.form.market)}</div></td><td>${esc(r.form.productType)}<div class="small muted">${esc(r.form.packFormat)} ${esc(r.form.packSize)} ${esc(r.form.packUnit)}</div></td><td>${pill(r.status)}</td><td>${esc(ROLES[owner(r)]||'—')}</td><td class="num">${r.status==='Costing done'?'—':days(r.statusSince).toFixed(1)}</td><td class="small">${Object.entries(d).map(([k,v])=>`${esc(k)}: ${v.toFixed(1)}`).join('<br>')}</td><td>${esc(r.form.launchDate)}</td><td class="small">${fmtT(r.updatedAt)}</td></tr>`}).join('')||'<tr><td colspan="9" class="muted">No requests match.</td></tr>'}
  </tbody></table></div></div>`;
};
V.dash.after=()=>{
  const f=V.dash.f;const re=()=>render();
  $('#fSt').onchange=e=>{f.status=e.target.value;re()};$('#fTy').onchange=e=>{f.type=e.target.value;re()};
  $('#fQ').oninput=e=>{f.q=e.target.value;clearTimeout(V.dash.t);V.dash.t=setTimeout(()=>{re();const q=$('#fQ');q.focus();q.setSelectionRange(q.value.length,q.value.length)},300)};
  document.querySelectorAll('.stat').forEach(el=>el.onclick=()=>{f.status=f.status===el.dataset.st?'':el.dataset.st;re()});
};

/* CMG form */
const REQUIRED={unitsPerCase:'Units per case',customer:'Customer / brand',contact:'Contact person',productType:'Product type',packFormat:'Pack format',packSize:'Pack size',shelfLife:'Shelf life',volume:'Target volume / year',launchDate:'Target launch date',market:'Market / country'};
function formHTML(F,ro){
  const v=k=>esc(F[k]==null?'':F[k]);const dis=ro?'disabled':'';
  const inp=(k,label,th,type='text',extra='')=>{if(type==='number'){type='text';extra='inputmode="decimal" autocomplete="off"';}return `<label class="f"><span class="${REQUIRED[k]?'req':''}">${label} <span class="th">${th}</span></span><input name="${k}" type="${type}" value="${v(k)}" ${extra} ${dis}></label>`;};
  const sel=(k,label,th,opts)=>`<label class="f"><span class="${REQUIRED[k]?'req':''}">${label} <span class="th">${th}</span></span><select name="${k}" ${dis}><option value="">— select —</option>${opts.map(o=>`<option ${F[k]===o?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;
  return `<form id="reqForm" novalidate>
  <div class="card"><h3 style="margin-top:0">1. Customer <span class="th">ลูกค้า (OEM)</span></h3><div class="grid g3">
   ${inp('customer','Customer / brand','ลูกค้า/แบรนด์')}${inp('contact','Contact person','ผู้ติดต่อ')}${inp('contactEmail','Contact email','อีเมล','email')}
   ${inp('market','Market / country','ตลาด/ประเทศ')}${sel('priority','Priority','ความเร่งด่วน',['Normal','High','Urgent'])}</div></div>
  <div class="card"><h3 style="margin-top:0">2. Product & pack <span class="th">สินค้าและบรรจุภัณฑ์</span></h3><div class="grid g4">
   ${sel('productType','Product type','ประเภทสินค้า',PRODUCT_TYPES)}${sel('packFormat','Pack format','รูปแบบบรรจุ',PACKS)}
   ${inp('packSize','Pack size','ขนาด','number','min="0" step="any"')}${sel('packUnit','Unit','หน่วย',['ml','L','g','kg'])}
   ${inp('unitsPerCase','Units per case','ชิ้น/ลัง','number','min="1" step="1"')}</div></div>
  <div class="card"><h3 style="margin-top:0">3. Target specification <span class="th">สเปกเป้าหมาย</span></h3><div class="grid g4">
   ${inp('brix','Brix (°Bx)','ความหวาน °Bx','number','min="0" max="80" step="any"')}${inp('fat','Fat %','ไขมัน %','number','min="0" max="100" step="any"')}
   ${inp('ph','pH','ค่า pH','number','min="0" max="14" step="any"')}${sel('sweetness','Sweetness','ระดับหวาน',['None','Low','Medium','High'])}
   ${inp('flavour','Flavour profile','รสชาติ')}${inp('shelfLife','Shelf life (months)','อายุสินค้า (เดือน)','number','min="1" step="1"')}
   ${sel('storage','Storage','การเก็บรักษา',['Ambient','Chilled','Frozen'])}${sel('halal','Halal','ฮาลาล',['Required','Preferred','Not required'])}</div>
   <div style="margin-top:10px"><b>Claims</b> <span class="th">คำกล่าวอ้าง</span><div class="checks">${CLAIMS.map(c=>`<label><input type="checkbox" name="claims" value="${esc(c)}" ${(F.claims||[]).includes(c)?'checked':''} ${dis}>${esc(c)}</label>`).join('')}</div></div>
   <div class="grid g2" style="margin-top:10px">${inp('allergen','Allergen requirements','สารก่อภูมิแพ้')}${inp('otherCerts','Other certificates (e.g. organic body, FSSC)','ใบรับรองอื่น')}</div></div>
  <div class="card"><h3 style="margin-top:0">4. Commercial targets <span class="th">เป้าหมายเชิงพาณิชย์</span></h3><div class="grid g4">
   ${inp('volume','Target volume / year','ปริมาณ/ปี','number','min="0" step="any"')}${sel('volumeUnit','Volume unit','หน่วย',['units','cases','litres'])}
   ${inp('targetPrice','Target price / cost','ราคาเป้าหมาย','number','min="0" step="any"')}${sel('currency','Currency','สกุลเงิน',['THB','USD','EUR'])}
   ${inp('priceBasis','Price basis (per unit/case, EXW/FOB)','เงื่อนไขราคา')}${inp('launchDate','Target launch date','วันวางตลาด','date')}</div></div>
  <div class="card"><h3 style="margin-top:0">5. Attachments & notes <span class="th">ไฟล์แนบ/หมายเหตุ</span></h3><div class="grid g2">
   <label class="f">Attachment links (one per line — SharePoint/Drive URLs) <span class="th">ลิงก์ไฟล์แนบ</span><textarea name="attachments" ${dis}>${v('attachments')}</textarea></label>
   <label class="f">Notes <span class="th">หมายเหตุ</span><textarea name="notes" ${dis}>${v('notes')}</textarea></label></div></div>
  </form>`;
}
function readForm(){
  const fd=new FormData($('#reqForm'));const o={};
  for(const [k,v] of fd.entries()){if(k==='claims')continue;o[k]=v.trim();}
  o.claims=fd.getAll('claims');['packSize','unitsPerCase','brix','fat','ph','shelfLife','volume','targetPrice'].forEach(k=>{if(o[k]!=='')o[k]=parseNum(o[k]);});
  return o;
}
function validateForm(o){
  const errs=[];document.querySelectorAll('#reqForm .bad').forEach(e=>e.classList.remove('bad'));
  const bad=(k,m)=>{errs.push(m);const el=document.querySelector(`#reqForm [name="${k}"]`);if(el)el.classList.add('bad');};
  Object.entries(REQUIRED).forEach(([k,l])=>{if(o[k]===''||o[k]==null)bad(k,l+' is required');});
  ['packSize','unitsPerCase','brix','fat','ph','shelfLife','volume','targetPrice'].forEach(k=>{if(typeof o[k]==='number'&&isNaN(o[k]))bad(k,k+': not a valid number (use a dot for decimals, e.g. 5.5)');});
  if(!o.packUnit)bad('packUnit','Pack unit is required');
  if(o.packSize!==''&&!(o.packSize>0))bad('packSize','Pack size must be > 0');
  if(o.ph!==''&&(o.ph<0||o.ph>14))bad('ph','pH must be 0–14');
  if(o.brix!==''&&(o.brix<0||o.brix>80))bad('brix','Brix must be 0–80');
  if(o.fat!==''&&(o.fat<0||o.fat>100))bad('fat','Fat % must be 0–100');
  if(o.launchDate&&new Date(o.launchDate)<new Date(new Date().toDateString()))bad('launchDate','Launch date must be in the future');
  if(o.unitsPerCase!==''&&!(Number.isInteger(o.unitsPerCase)&&o.unitsPerCase>=1&&o.unitsPerCase<=10000))bad('unitsPerCase','Units per case must be a whole number from 1 to 10,000');
  if(o.shelfLife!==''&&!(o.shelfLife>0&&o.shelfLife<=120))bad('shelfLife','Shelf life must be 1–120 months');
  if(o.volume!==''&&!(o.volume>0&&o.volume<1e12))bad('volume','Volume must be more than 0');
  if(o.targetPrice!==''&&!(o.targetPrice>=0&&o.targetPrice<1e9))bad('targetPrice','Target price cannot be negative');
  if(o.packSize!==''&&o.packSize>1e6)bad('packSize','Pack size looks too large');
  ['customer','contact','market','flavour','allergen','otherCerts','priceBasis'].forEach(k=>{if(o[k]&&o[k].length>200)bad(k,(REQUIRED[k]||k)+' is limited to 200 characters');});
  ['notes','attachments'].forEach(k=>{if(o[k]&&o[k].length>4000)bad(k,k+' is limited to 4,000 characters');});
  if(o.contactEmail&&!/^\S+@\S+\.\S+$/.test(o.contactEmail))bad('contactEmail','Contact email looks invalid');
  return errs;
}
let editing=null; // request id being edited (draft/returned) or null for new
V.new=(arg)=>{
  if(!(role==='CMG'||role==='ADMIN'))return `<div class="card">Switch role to <b>CMG</b> to create requests.</div>`;
  let F={packUnit:'ml',unitsPerCase:12,sweetness:'None',storage:'Ambient',halal:'Required',currency:'THB',priceBasis:'per unit, EXW factory',volumeUnit:'units',priority:'Normal',claims:[]};
  editing=null;let title='New CMG request',note='';
  if(arg&&arg.startsWith('dup-')){const src=reqById(arg.slice(4));if(src){F=JSON.parse(JSON.stringify(src.form));F.launchDate='';note=`Template copied from <b>${esc(src.id)}</b> — review and update before submitting.`;}}
  else if(arg){const r=reqById(arg);if(r&&(r.status==='Draft'||(r.status==='Returned'&&r.returnedTo==='CMG'))){F=JSON.parse(JSON.stringify(r.form));editing=r.id;title='Edit '+esc(r.id);}}
  const prev=S.requests.slice().sort((a,b)=>b.id.localeCompare(a.id));
  return `<h1>${title} <span class="th">แบบฟอร์มคำขอพัฒนาสินค้า (มะพร้าว)</span></h1>
  <p class="sub">Coconut-product template for the CMG/OEM team. Request ID and timestamp are assigned automatically on save. Fields marked <span class="err">*</span> are required to submit.</p>
  ${note?`<div class="infobox" style="margin-bottom:12px">${note}</div>`:''}
  <div class="card no-print"><div class="grid g2"><label class="f">Start from a previous request (duplicate as template) <span class="th">คัดลอกจากคำขอเดิม</span><select id="dupSel"><option value="">— choose —</option>${prev.map(r=>`<option value="${esc(r.id)}">${esc(r.id)} · ${esc(r.form.customer)} · ${esc(r.form.productType)}</option>`).join('')}</select></label></div></div>
  ${formHTML(F,false)}
  <div id="formErr" class="err"></div>
  <div class="actions"><button class="btn sec" id="saveDraft">Save draft · บันทึกร่าง</button><button class="btn" id="submitReq">Submit to R&amp;D · ส่งให้ R&amp;D</button></div>`;
};
V.new.after=()=>{
  const ds=$('#dupSel');if(!ds)return;ds.onchange=()=>ds.value&&go('#/new/dup-'+ds.value);
  const persist=(submit)=>{
    const o=readForm();
    if(submit){const errs=validateForm(o);if(errs.length){$('#formErr').innerHTML='Please fix: '+errs.map(esc).join(' · ');toast('Missing / invalid fields');return;}}
    else if(!o.customer){$('#formErr').textContent='Enter at least the customer / brand to save a draft.';document.querySelector('[name=customer]').classList.add('bad');return;}
    else{const errs=validateForm(o).filter(x=>!/required|future/.test(x));if(errs.length){$('#formErr').innerHTML='Please fix: '+errs.map(esc).join(' · ');return;}}
    let r;
    if(editing){r=reqById(editing);const ch=Object.keys(Object.assign({},r.form,o)).filter(k=>JSON.stringify(r.form[k])!==JSON.stringify(o[k]));r.form=o;if(ch.length)audit(r,'Edited request','Changed: '+ch.join(', '));}
    else{const id=nextId();r={id,createdAt:now(),status:'Draft',audit:[],form:o};S.requests.push(r);audit(r,'Created draft','', 'Draft');}
    if(submit){const wasRet=r.status==='Returned';audit(r,wasRet?'Resubmitted to R&D':'Submitted to R&D','', 'Submitted');r.returnedTo=null;notify('RND',r,wasRet?'CMG request resubmitted':'New CMG request submitted',`A new coconut product request from CMG is ready for formulation.\nTarget launch: ${o.launchDate}. Volume: ${o.volume} ${o.volumeUnit}/yr.`);}
    if(!save())return;toast(submit?`${r.id} submitted · R&D notified`:`${r.id} saved as draft`);go('#/req/'+r.id);
  };
  $('#saveDraft').onclick=e=>{e.preventDefault();persist(false)};$('#submitReq').onclick=e=>{e.preventDefault();persist(true)};
};

/* Queues */
function queue(statuses,title,th,desc){
  const rows=S.requests.filter(r=>statuses(r)).sort((a,b)=>a.statusSince.localeCompare(b.statusSince));
  return `<h1>${title} <span class="th">${th}</span></h1><p class="sub">${desc}</p><div class="card tbl-wrap"><table><thead><tr><th>Request</th><th>Customer</th><th>Product</th><th>Status</th><th class="num">Waiting (days)</th><th>Launch</th><th></th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.form.customer)}</td><td>${esc(r.form.productType)} · ${esc(r.form.packSize)} ${esc(r.form.packUnit)}</td><td>${pill(r.status)}</td><td class="num">${days(r.statusSince).toFixed(1)}</td><td>${esc(r.form.launchDate)}</td><td><a class="btn sm" href="#/req/${esc(r.id)}">Open</a></td></tr>`).join('')||'<tr><td colspan="7" class="muted">Queue is empty 🎉</td></tr>'}
  </tbody></table></div>`;
}
V.rnd=()=>queue(r=>['Submitted','In formulation'].includes(r.status)||(r.status==='Returned'&&r.returnedTo==='RND'),'R&D queue','คิวงานวิจัยและพัฒนา','Requests submitted by CMG, plus any returned by Finance. Open one to build the formulation with material codes.');
V.fin=()=>queue(r=>r.status==='Sent to Finance','Finance (Factory) queue','คิวคิดต้นทุน','Formulations from R&D waiting for costing. Material costs are pulled automatically from the material master.');

/* Request detail */
function matOptions(filterPack){return S.materials.filter(m=>m.active&&(filterPack?m.cat==='Packaging':m.cat!=='Packaging')).map(m=>`<option value="${esc(m.code)} — ${esc(m.desc)}">`).join('');}
const codeOf=s=>String(s||'').split('—')[0].trim().toUpperCase();
function specKV(F){
  const rows=[['Customer / brand',F.customer],['Contact',F.contact+(F.contactEmail?' · '+F.contactEmail:'')],['Market',F.market],['Priority',F.priority],['Product type',F.productType],['Pack',`${F.packFormat} ${F.packSize} ${F.packUnit} · ${F.unitsPerCase||'?'} per case`],
   ['Brix / Fat % / pH',`${F.brix===''?'–':F.brix} °Bx / ${F.fat===''?'–':F.fat}% / ${F.ph===''?'–':F.ph}`],['Sweetness / flavour',`${F.sweetness} · ${F.flavour||'–'}`],['Shelf life / storage',`${F.shelfLife} months · ${F.storage}`],['Claims',(F.claims||[]).join(', ')||'–'],['Allergen',F.allergen||'–'],['Halal / other certs',`${F.halal} · ${F.otherCerts||'–'}`],
   ['Volume / year',`${Number(F.volume||0).toLocaleString()} ${F.volumeUnit}`],['Target price',F.targetPrice!==''&&F.targetPrice!=null?`${F.targetPrice} ${F.currency} ${F.priceBasis?'('+F.priceBasis+')':''}`:'–'],['Target launch',F.launchDate],['Attachments',(F.attachments||'').split('\n').filter(Boolean).map(u=>/^https?:\/\//.test(u)?`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`:esc(u)).join('<br>')||'–'],['Notes',F.notes||'–']];
  return `<div class="kv">${rows.map(([k,v])=>`<div>${esc(k)}</div><div>${k==='Attachments'?v:esc(v)}</div>`).join('')}</div>`;
}
function formulationEditor(r){
  const F=r.formulation;
  const lineRow=(l,i)=>{const m=mat(l.code);return `<tr data-i="${i}"><td><input aria-label="Ingredient ${i+1} mat code" class="mc line-in" list="dlIng" value="${m?esc(m.code+' — '+m.desc):esc(l.code||'')}" placeholder="Search code or name…"></td><td class="small">${m?esc(m.cat)+' · '+esc(m.unit):''}${m&&!m.active?' <span class="err">INACTIVE</span>':''}</td><td><input aria-label="Ingredient ${i+1} percent" class="pct line-in" type="number" step="any" min="0" value="${l.pct===''?'':esc(l.pct)}"></td><td><input aria-label="Ingredient ${i+1} kg per batch" class="kg line-in" type="number" step="any" min="0" value="${isFinite(num(l.pct))?+(num(l.pct)/100*F.batchKg).toFixed(4):''}"></td><td><button class="btn sm warn del" data-k="lines" aria-label="Remove ingredient ${i+1}">✕</button></td></tr>`};
  const packRow=(p,i)=>{const m=mat(p.code);return `<tr data-i="${i}"><td><input aria-label="Packaging ${i+1} mat code" class="mc line-in" list="dlPack" value="${m?esc(m.code+' — '+m.desc):esc(p.code||'')}" placeholder="Search packaging…"></td><td class="small">${m?esc(m.unit):''}</td><td><input aria-label="Packaging ${i+1} quantity per unit" class="qty line-in" type="number" step="any" min="0" value="${esc(p.qty)}"></td><td><button class="btn sm warn del" data-k="pack" aria-label="Remove packaging ${i+1}">✕</button></td></tr>`};
  const sum=F.lines.reduce((a,l)=>a+(num(l.pct)||0),0);
  return `<div class="card" id="fEd"><h3 style="margin-top:0">R&amp;D formulation · สูตรการผลิต <span class="pill s-Informulation">v${F.version}</span></h3>
  <datalist id="dlIng">${matOptions(false)}</datalist><datalist id="dlPack">${matOptions(true)}</datalist>
  <div class="grid g3"><label class="f">Batch size (kg) <span class="th">ขนาดแบทช์</span><input id="batchKg" type="number" min="1" step="any" value="${esc(F.batchKg)}"></label></div>
  <h3>Ingredients (% w/w must total 100) <span class="th">ส่วนผสม</span></h3>
  <div class="tbl-wrap"><table id="tLines"><thead><tr><th style="min-width:260px">Mat code (searchable)</th><th>Category · unit</th><th>% w/w</th><th>kg / batch</th><th></th></tr></thead><tbody>${F.lines.map(lineRow).join('')}</tbody>
  <tfoot><tr><td colspan="2"><button class="btn sm sec" id="addLine">+ Add ingredient</button></td><td class="num"><b id="pctSum" class="${Math.abs(sum-100)<0.001?'ok':'err'}">${n4(sum)}%</b></td><td class="num">${n2(sum/100*F.batchKg)} kg</td><td></td></tr></tfoot></table></div>
  <h3>Packaging per unit <span class="th">บรรจุภัณฑ์ต่อหน่วย</span></h3>
  <div class="tbl-wrap"><table id="tPack"><thead><tr><th style="min-width:260px">Mat code</th><th>Unit</th><th>Qty per unit</th><th></th></tr></thead><tbody>${F.pack.map(packRow).join('')}</tbody>
  <tfoot><tr><td colspan="4"><button class="btn sm sec" id="addPack">+ Add packaging</button></td></tr></tfoot></table></div>
  <div class="grid g2" style="margin-top:10px"><label class="f">Process notes <span class="th">ขั้นตอนการผลิต</span><textarea id="process">${esc(F.process)}</textarea></label><label class="f">R&amp;D notes <span class="th">หมายเหตุ</span><textarea id="fnotes">${esc(F.notes)}</textarea></label></div>
  ${historyHTML(F)}<div id="fErr" class="err" style="margin-top:8px"></div>
  <div class="actions"><button class="btn sec" id="saveF">Save formulation</button><button class="btn" id="sendF">Submit to Finance · ส่งคิดต้นทุน</button><button class="btn warn" id="retCMG">Return to CMG…</button></div></div>`;
}
function validateFormulation(F){
  const e=[];if(!(num(F.batchKg)>0))e.push('Batch size must be > 0');
  if(!F.lines.length)e.push('Add at least one ingredient line');
  F.lines.forEach((l,i)=>{const m=mat(l.code);if(!m)e.push(`Ingredient line ${i+1}: "${l.code||'(blank)'}" is not a valid mat code`);else if(!m.active)e.push(`Line ${i+1}: ${m.code} is inactive`);else if(m.cat==='Packaging')e.push(`Line ${i+1}: ${m.code} is packaging — put it in the packaging table`);if(!(num(l.pct)>0))e.push(`Line ${i+1}: % must be > 0`);});
  const codes=F.lines.map(l=>l.code);if(new Set(codes).size!==codes.length)e.push('Duplicate mat code in ingredients');
  const sum=F.lines.reduce((a,l)=>a+(num(l.pct)||0),0);if(F.lines.length&&Math.abs(sum-100)>0.001)e.push(`Ingredients total ${n4(sum)}% — must equal 100%`);
  F.pack.forEach((p,i)=>{const m=mat(p.code);if(!m)e.push(`Packaging line ${i+1}: invalid mat code`);else if(!m.active)e.push(`Packaging ${m.code} is inactive`);if(!(num(p.qty)>0))e.push(`Packaging line ${i+1}: qty must be > 0`);});
  return e;
}
function costTable(r,editable){
  const c=compute(r),F=r.formulation,C=r.costing||{};const cur='THB';
  const ov=C.overrides||{};
  const lineRows=F.lines.map(l=>{const m=mat(l.code)||{desc:'?',unit:''};const std=m.cost;const used=lineCost(r,l.code);const o=ov[l.code];
    return `<tr><td><b>${esc(l.code)}</b><div class="small muted">${esc(m.desc)}</div></td><td class="num">${n4(l.pct)}%</td><td class="num">${n4(std)}</td><td class="num">${editable?`<input aria-label="Override cost ${esc(l.code)}" class="ovc line-in" data-code="${esc(l.code)}" type="number" step="any" placeholder="std" value="${o?esc(o.cost):''}" style="width:90px">`:(o?`<b>${n4(o.cost)}</b>`:'—')}</td><td>${editable?`<input aria-label="Override reason ${esc(l.code)}" class="ovr" data-code="${esc(l.code)}" placeholder="Reason (required if override)" value="${o?esc(o.reason):''}">`:esc(o?o.reason:'')}</td><td class="num">${n4((num(l.pct)/100)*used*c.fk)}</td></tr>`}).join('');
  const packRows=F.pack.map(p=>{const m=mat(p.code)||{desc:'?'};const o=ov[p.code];const used=lineCost(r,p.code);
    return `<tr><td><b>${esc(p.code)}</b><div class="small muted">${esc(m.desc)}</div></td><td class="num">${esc(p.qty)} ea</td><td class="num">${n4(m.cost)}</td><td class="num">${editable?`<input aria-label="Override cost ${esc(p.code)}" class="ovc line-in" data-code="${esc(p.code)}" type="number" step="any" placeholder="std" value="${o?esc(o.cost):''}" style="width:90px">`:(o?`<b>${n4(o.cost)}</b>`:'—')}</td><td>${editable?`<input aria-label="Override reason ${esc(p.code)}" class="ovr" data-code="${esc(p.code)}" placeholder="Reason (required if override)" value="${o?esc(o.reason):''}">`:esc(o?o.reason:'')}</td><td class="num">${n4(num(p.qty)*used)}</td></tr>`}).join('');
  const fld=(k,l,th)=>`<label class="f">${l} <span class="th">${th}</span><input class="cin" data-k="${k}" type="number" step="any" min="0" value="${esc(C[k]==null?'':C[k])}" ${editable?'':'disabled'}></label>`;
  const perCase=/case/i.test(r.form.priceBasis||'');const tgt=r.form.currency==='THB'&&num(r.form.targetPrice)>0?num(r.form.targetPrice):null;const cmpP=perCase?c.casePrice:c.price;
  return `<div class="tbl-wrap"><table><thead><tr><th>Mat code</th><th class="num">% / qty</th><th class="num">Std cost ${cur}/unit</th><th class="num">Override</th><th>Override reason</th><th class="num">${cur} per pack unit</th></tr></thead><tbody>${lineRows}${packRows}</tbody></table></div>
  <p class="small muted">Fill weight used: ${n4(c.fk)} kg per unit (ml converted at 1 g/ml — prototype assumption; real density per product to be added). Ingredient cost ${n4(c.kgPerKg)} THB/kg of finished product.</p>
  <div class="grid g6">${fld('lossPct','Yield loss %','สูญเสีย %')}${fld('labour','Labour THB/unit','ค่าแรง')}${fld('overhead','Overhead THB/unit','โสหุ้ย')}${fld('extraPack','Other packaging THB/unit','บรรจุภัณฑ์อื่น')}${fld('marginPct','Margin %','กำไร %')}</div>
  <table class="costbox" style="max-width:520px;margin-top:12px"><tbody>
   <tr><td>Ingredients per unit</td><td class="num">${n4(c.ingUnit)}</td></tr><tr><td>+ Yield loss (${esc(C.lossPct||0)}%)</td><td class="num">${n4(c.lossAmt)}</td></tr>
   <tr><td>Packaging (from mat codes)</td><td class="num">${n4(c.packUnit)}</td></tr><tr><td>Other packaging</td><td class="num">${n4(c.extraPack)}</td></tr>
   <tr><td>Labour</td><td class="num">${n4(c.labour)}</td></tr><tr><td>Overhead</td><td class="num">${n4(c.overhead)}</td></tr>
   <tr class="tot"><td>Cost per unit (THB)</td><td class="num">${n2(c.total)}</td></tr><tr><td>Cost per case (${c.upc} units)</td><td class="num">${n2(c.caseCost)}</td></tr>
   <tr class="tot"><td>Price per unit @ ${esc(C.marginPct||0)}% margin</td><td class="num">${n2(c.price)}</td></tr><tr><td>Price per case</td><td class="num">${n2(c.casePrice)}</td></tr>
   ${tgt&&isFinite(cmpP)?`<tr><td>CMG target price (THB/${perCase?'case':'unit'})</td><td class="num ${cmpP<=tgt?'ok':'err'}">${n2(tgt)} ${cmpP<=tgt?'✓ within target':'✗ above target'}</td></tr>`:(r.form.targetPrice?`<tr><td>CMG target</td><td class="num small">${esc(r.form.targetPrice)} ${esc(r.form.currency)} — compare manually (FX not applied)</td></tr>`:'')}
  </tbody></table>`;
}
function historyHTML(F){if(!F.history||!F.history.length)return '';return `<details class="small" style="margin-top:8px"><summary>Earlier versions (${F.history.length}): ${F.history.map(h=>'v'+esc(h.version)).join(', ')}</summary>${F.history.slice().reverse().map(h=>`<div style="margin:6px 0"><b>v${esc(h.version)}</b> <span class="muted">superseded ${fmtT(h.t)} · batch ${esc(h.batchKg==null?'–':h.batchKg)} kg</span><br>${(h.lines||[]).map(l=>`${esc(l.code)} ${esc(l.pct)}%`).join(' · ')}${(h.pack||[]).length?' | pack: '+(h.pack||[]).map(p=>`${esc(p.code)}×${esc(p.qty)}`).join(' · '):''}</div>`).join('')}</details>`;}
function formulationView(r){
  const F=r.formulation;if(!F)return '';
  return `<div class="card"><h3 style="margin-top:0">Formulation v${F.version} <span class="th">สูตร</span></h3><p class="small muted">Batch ${esc(F.batchKg)} kg</p>
  <div class="tbl-wrap"><table><thead><tr><th>Mat code</th><th>Description</th><th class="num">% w/w</th><th class="num">kg / batch</th></tr></thead><tbody>
  ${F.lines.map(l=>{const m=mat(l.code)||{};return `<tr><td><b>${esc(l.code)}</b></td><td>${esc(m.desc)}</td><td class="num">${n4(l.pct)}</td><td class="num">${n4(num(l.pct)/100*F.batchKg)}</td></tr>`}).join('')}
  ${F.pack.map(p=>{const m=mat(p.code)||{};return `<tr><td><b>${esc(p.code)}</b></td><td>${esc(m.desc)} <span class="muted">(packaging)</span></td><td class="num">${esc(p.qty)} ea/unit</td><td></td></tr>`}).join('')}
  </tbody></table></div><p><b>Process:</b> ${esc(F.process)||'–'}<br><b>Notes:</b> ${esc(F.notes)||'–'}</p>
  ${historyHTML(F)}</div>`;
}
V.req=(id)=>{
  const r=reqById(id);if(!r)return `<div class="card">Request not found.</div>`;
  const canEditCMG=(role==='CMG'||role==='ADMIN')&&(r.status==='Draft'||(r.status==='Returned'&&r.returnedTo==='CMG'));
  const canRND=(role==='RND'||role==='ADMIN')&&(['Submitted','In formulation'].includes(r.status)||(r.status==='Returned'&&r.returnedTo==='RND'));
  const canFIN=(role==='FIN'||role==='ADMIN')&&r.status==='Sent to Finance';
  let body='';
  if(canRND){if(!r.formulation)r.formulation={version:1,batchKg:1000,lines:[{code:'',pct:''}],pack:[],process:'',notes:'',history:[]};body+=formulationEditor(r);}
  else body+=formulationView(r);
  if(r.formulation&&(canFIN||r.costing&&['Costing done','Returned'].includes(r.status)||r.status==='Sent to Finance')){
    if(!r.costing)r.costing={lossPct:3,labour:1,overhead:2,extraPack:0,marginPct:15,overrides:{},comment:''};
    body+=`<div class="card" id="costCard"><h3 style="margin-top:0">Finance costing · การคิดต้นทุน ${r.status==='Costing done'?'<span class="pill s-Costingdone">Approved</span>':''}</h3>${costTable(r,canFIN)}
    ${canFIN&&costingErrors(r).length?`<div class="warnbox" style="margin-top:10px">${costingErrors(r).map(esc).join('<br>')}</div>`:''}${r.status==='Costing done'&&r.costing.snapshot?'<p class="small muted">Material costs frozen at approval — later changes to the material master do not alter this approved costing.</p>':''}${canFIN?`<label class="f" style="margin-top:10px">Comment (required to send back) <span class="th">ความเห็น</span><textarea id="finComment">${esc(r.costing.comment||'')}</textarea></label><div id="cErr" class="err"></div>
    <div class="actions"><button class="btn sec" id="saveC">Save draft costing</button><button class="btn" id="approveC">Approve costing · อนุมัติต้นทุน</button><button class="btn warn" id="backC">Send back to R&amp;D</button></div>`:(r.costing.comment?`<p><b>Finance comment:</b> ${esc(r.costing.comment)}</p>`:'')}</div>`;
  }
  return `<div class="print-only"><h2>Malee CMG Workflow — Request summary (PROTOTYPE, MOCK DATA)</h2><p>Printed ${fmtT(now())}</p></div>
  <h1>${esc(r.id)} <span class="th">${esc(r.form.customer)}</span></h1><p class="sub">${pill(r.status)} &nbsp; Created ${fmtT(r.createdAt)} · last update ${fmtT(r.updatedAt)} · currently with <b>${esc(ROLES[owner(r)]||'—')}</b></p>
  ${pipeline(r)}
  <div class="actions no-print">${canEditCMG?`<a class="btn" href="#/new/${esc(r.id)}">Edit / submit</a>`:''}${(role==='CMG'||role==='ADMIN')?`<a class="btn sec" href="#/new/dup-${esc(r.id)}">Duplicate as new request</a>`:''}<button class="btn sec" id="printBtn">Print / PDF summary</button><button class="btn sec" id="expReq">Export JSON</button></div>
  ${r.status==='Returned'?`<div class="warnbox" style="margin-top:12px">Returned to <b>${esc(ROLES[r.returnedTo])}</b>: ${esc((r.audit.filter(a=>a.action.startsWith('Returned')||a.action.startsWith('Sent back')).pop()||{}).detail)}</div>`:''}
  <div class="card" style="margin-top:12px"><h3 style="margin-top:0">CMG request · สเปกที่ลูกค้าต้องการ</h3>${specKV(r.form)}</div>
  ${body}
  <div class="card"><h3 style="margin-top:0">Audit trail · ประวัติการดำเนินการ</h3><ol class="audit">${r.audit.map(a=>`<li><b>${fmtT(a.t)}</b> — ${esc(a.user)} <span class="muted">(${esc(ROLES[a.role])})</span>: ${esc(a.action)}${a.detail?` — <span class="muted">${esc(a.detail)}</span>`:''}${a.status?' → '+pill(a.status):''}</li>`).join('')}</ol></div>`;
};
V.req.after=(id)=>{
  const r=reqById(id);if(!r)return;
  if(role!=='ADMIN'){let ch=false;S.notifications.forEach(n=>{if(n.reqId===r.id&&n.toRole===role&&!n.read){n.read=true;ch=true;}});if(ch){save();renderNav();}}
  $('#printBtn').onclick=()=>window.print();
  $('#expReq').onclick=()=>download(r.id+'.json',JSON.stringify({request:r,materialsUsed:[...(r.formulation?r.formulation.lines:[]),...(r.formulation?r.formulation.pack:[])].map(l=>mat(l.code)).filter(Boolean),costing:r.formulation?compute(r):null},null,2));
  const ed=$('#fEd');
  if(ed){
    const F=r.formulation;
    const pull=()=>{F.batchKg=num($('#batchKg').value)||0;F.process=$('#process').value;F.notes=$('#fnotes').value;
      F.lines=[...document.querySelectorAll('#tLines tbody tr')].map(tr=>({code:codeOf(tr.querySelector('.mc').value),pct:tr.querySelector('.pct').value===''?'':num(tr.querySelector('.pct').value)}));
      F.pack=[...document.querySelectorAll('#tPack tbody tr')].map(tr=>({code:codeOf(tr.querySelector('.mc').value),qty:num(tr.querySelector('.qty').value)}));};
    const rer=()=>{pull();const y=scrollY;render();scrollTo(0,y);};
    $('#addLine').onclick=()=>{pull();F.lines.push({code:'',pct:''});render();};
    $('#addPack').onclick=()=>{pull();F.pack.push({code:'',qty:1});render();};
    ed.querySelectorAll('.del').forEach(b=>b.onclick=()=>{pull();const i=+b.closest('tr').dataset.i;F[b.dataset.k].splice(i,1);render();});
    ed.querySelectorAll('.mc').forEach(i=>i.onchange=rer);
    ed.querySelectorAll('#tLines .pct').forEach(i=>i.onchange=rer);
    ed.querySelectorAll('#tLines .kg').forEach(i=>i.onchange=()=>{const tr=i.closest('tr');const b=num($('#batchKg').value);if(b>0)tr.querySelector('.pct').value=+(num(i.value)/b*100).toFixed(6);rer();});
    $('#batchKg').onchange=rer;
    const start=()=>{if(r.status!=='In formulation'){audit(r,r.status==='Returned'?'Resumed formulation after return':'Started formulation','v'+F.version,'In formulation');r.returnedTo=null;}};
    $('#saveF').onclick=()=>{pull();start();audit(r,'Saved formulation draft','v'+F.version);save();toast('Formulation saved');render();};
    $('#sendF').onclick=()=>{pull();const e=validateFormulation(F);if(e.length){$('#fErr').innerHTML=e.map(esc).join('<br>');toast('Formulation has errors');return;}
      const prevSent=r.audit.some(a=>a.status==='Sent to Finance');start();if(prevSent){const last=r.formulation.sentSnapshot||{version:F.version,lines:F.lines,pack:F.pack,batchKg:F.batchKg,process:F.process};F.history.push(JSON.parse(JSON.stringify(Object.assign({},last,{version:F.version,t:now()}))));F.version++;}
      F.sentSnapshot=JSON.parse(JSON.stringify({version:F.version,lines:F.lines,pack:F.pack,batchKg:F.batchKg,process:F.process}));if(r.costing){r.costing.comment='';delete r.costing.snapshot;}audit(r,`Formulation v${F.version} sent to Finance`,`${F.lines.length} ingredient lines, ${F.pack.length} packaging lines`,'Sent to Finance');
      if(r.costing)r.costing.sentBefore=true;else r.costing={lossPct:3,labour:1,overhead:2,extraPack:0,marginPct:15,overrides:{},comment:'',sentBefore:true};
      notify('FIN',r,'Formulation ready for costing',`R&D has completed formulation v${F.version} with ${F.lines.length+F.pack.length} mat-code lines. Please complete costing.`);
      save();toast('Sent to Finance · Finance notified');render();};
    $('#retCMG').onclick=()=>{const why=(prompt('Reason for returning to CMG (required):')||'').trim();if(!why){toast('A reason is required to return a request');return;}pull();audit(r,'Returned to CMG by R&D',why,'Returned');r.returnedTo='CMG';notify('CMG',r,'Request returned by R&D',`R&D needs more information: ${why}`);save();render();};
  }
  const cc=$('#costCard');
  if(cc&&$('#approveC')){
    const C=r.costing;
    const pull=()=>{cc.querySelectorAll('.cin').forEach(i=>C[i.dataset.k]=i.value===''?'':num(i.value));C.comment=$('#finComment').value;
      const ov={};cc.querySelectorAll('.ovc').forEach(i=>{if(i.value!==''){const rs=cc.querySelector(`.ovr[data-code="${CSS.escape(i.dataset.code)}"]`).value.trim();ov[i.dataset.code]={cost:num(i.value),reason:rs};}});C.overrides=ov;};
    cc.querySelectorAll('.cin,.ovc,.ovr').forEach(i=>i.onchange=()=>{pull();const y=scrollY;render();scrollTo(0,y);});
    const check=()=>costingErrors(r);const _oldcheck=()=>{const e=[];Object.entries(C.overrides).forEach(([k,o])=>{if(!o.reason)e.push(`Override on ${k} needs a reason`);if(!(o.cost>=0))e.push(`Override on ${k} must be ≥ 0`);});if(num(C.lossPct)>=95||num(C.marginPct)>=95)e.push('Loss and margin must be below 95%');return e;};
    $('#saveC').onclick=()=>{pull();audit(r,'Saved costing draft','');save();toast('Costing saved');render();};
    $('#approveC').onclick=()=>{pull();const e=check();if(e.length){$('#cErr').innerHTML=e.map(esc).join('<br>');return;}const c=compute(r);
      const ovs=Object.entries(C.overrides).map(([k,o])=>`${k} → ${o.cost} (${o.reason})`).join('; ');
      C.snapshot=Object.fromEntries([...r.formulation.lines,...r.formulation.pack].map(l=>[l.code,lineCost(r,l.code)]));C.result={cost:c.total,price:c.price,caseCost:c.caseCost,at:now()};
      audit(r,'Costing approved',`Cost/unit ${n2(c.total)} THB · price/unit ${n2(c.price)} THB · per case ${n2(c.caseCost)} THB${ovs?' · overrides: '+ovs:''}`,'Costing done');
      notify('CMG',r,'Costing completed',`Finance (Factory) approved costing.\nCost per unit: ${n2(c.total)} THB\nIndicative price per unit at ${C.marginPct}% margin: ${n2(c.price)} THB\nCost per case (${c.upc}): ${n2(c.caseCost)} THB`);
      notify('RND',r,'Costing completed (FYI)',`Costing approved for formulation v${r.formulation.version}.`);save();toast('Costing approved · CMG & R&D notified');render();};
    $('#backC').onclick=()=>{pull();if(!C.comment.trim()){$('#cErr').textContent='Add a comment explaining what R&D should change.';return;}
      audit(r,'Sent back to R&D by Finance',C.comment,'Returned');r.returnedTo='RND';notify('RND',r,'Formulation sent back by Finance',`Finance comment: ${C.comment}`);save();toast('Sent back · R&D notified');render();};
  }
};

/* Materials */
V.materials=()=>{
  const ed=role==='ADMIN';const q=V.materials.q||'';
  const rows=S.materials.filter(m=>!q||(m.code+' '+m.desc+' '+m.cat+' '+m.supplier).toLowerCase().includes(q.toLowerCase()));
  return `<h1>Material master <span class="th">ทะเบียนรหัสวัตถุดิบ</span></h1>
  <p class="sub">${S.materials.length} materials (20 mock items seeded). Every formulation line must reference an active mat code here; Finance costs are pulled from the standard cost column. ${ed?'':'Switch to <b>Admin</b> to add, edit or import.'}</p>
  <div class="warnbox" style="margin-bottom:12px">MOCK codes, names, costs and suppliers — for demonstration only. The real list can be loaded via CSV import (Admin) once approved.</div>
  <div class="card"><div class="grid g3 no-print"><input id="mQ" aria-label="Search materials" placeholder="Search code, name, category, supplier…" value="${esc(q)}">${ed?`<button type="button" class="btn sec" id="csvBtn" style="justify-content:center">Import CSV</button><input id="csvIn" type="file" accept=".csv,text/csv" hidden aria-label="CSV file"><button class="btn sec" id="csvOut">Export CSV</button>`:''}</div>
  ${ed?`<p class="small muted">CSV columns: <code>code,description,category,unit,std_cost_thb,supplier,active</code> — existing codes are updated, new codes added.</p>`:''}
  <div class="tbl-wrap"><table><thead><tr><th>Mat code</th><th>Description</th><th>Category</th><th>Unit</th><th class="num">Std cost (THB/unit)</th><th>Supplier</th><th>Active</th>${ed?'<th></th>':''}</tr></thead><tbody>
  ${rows.map(m=>`<tr><td><b>${esc(m.code)}</b></td><td>${esc(m.desc)}</td><td>${esc(m.cat)}</td><td>${esc(m.unit)}</td><td class="num">${n4(m.cost)}</td><td>${esc(m.supplier)}</td><td>${m.active?'<span class="ok">Yes</span>':'<span class="err">No</span>'}</td>${ed?`<td><button class="btn sm sec medit" data-c="${esc(m.code)}">Edit</button></td>`:''}</tr>`).join('')}
  </tbody></table></div></div>
  ${ed?`<div class="card"><h3 style="margin-top:0">Material change log <span class="th">ประวัติการแก้ไข</span></h3>${(S.materialLog||[]).length?`<ul class="small">${S.materialLog.slice(-15).reverse().map(x=>`<li>${fmtT(x.t)} — ${esc(x.user)}: <b>${esc(x.code)}</b> ${esc(x.change)}</li>`).join('')}</ul>`:'<p class="small muted">No changes yet.</p>'}</div><div class="card" id="mForm"><h3 style="margin-top:0" id="mTitle">Add material · เพิ่มวัตถุดิบ</h3><div class="grid g4">
   <label class="f"><span class="req">Mat code (RM-#####)</span><input id="m_code" placeholder="RM-70001"></label><label class="f"><span class="req">Description</span><input id="m_desc"></label>
   <label class="f">Category<select id="m_cat">${CATS.map(c=>`<option>${esc(c)}</option>`).join('')}</select></label><label class="f">Unit<select id="m_unit"><option>kg</option><option>L</option><option>ea</option><option>g</option></select></label>
   <label class="f"><span class="req">Std cost THB/unit</span><input id="m_cost" type="number" step="any" min="0"></label><label class="f">Supplier<input id="m_sup"></label>
   <label class="f">Active<select id="m_act"><option value="1">Yes</option><option value="0">No</option></select></label></div><div id="mErr" class="err"></div>
   <div class="actions"><button class="btn" id="mSave">Save material</button><button class="btn sec" id="mClear">Clear</button></div></div>`:''}`;
};
function logMat(code,change){(S.materialLog=S.materialLog||[]).push({t:now(),user:USERS[role],code,change});}
function parseCSV(t){const rows=[];let row=[],f='',q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}else if(c==='"')q=true;else if(c===','){row.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f=''}else f+=c}if(f||row.length){row.push(f);rows.push(row)}return rows.filter(r=>r.some(x=>x.trim()!==''));}
const csvCell=v=>/[",\n]/.test(String(v))?`"${String(v).replace(/"/g,'""')}"`:String(v);
V.materials.after=()=>{
  $('#mQ').oninput=e=>{V.materials.q=e.target.value;clearTimeout(V.materials.t);V.materials.t=setTimeout(()=>{render();const q=$('#mQ');q.focus();q.setSelectionRange(q.value.length,q.value.length)},300)};
  if(role!=='ADMIN')return;
  const set=m=>{$('#m_code').value=m?m.code:'';$('#m_desc').value=m?m.desc:'';$('#m_cat').value=m?m.cat:CATS[0];$('#m_unit').value=m?m.unit:'kg';$('#m_cost').value=m?m.cost:'';$('#m_sup').value=m?m.supplier:'';$('#m_act').value=m&&!m.active?'0':'1';$('#m_code').disabled=!!m;$('#mTitle').textContent=m?'Edit '+m.code:'Add material · เพิ่มวัตถุดิบ';};
  document.querySelectorAll('.medit').forEach(b=>b.onclick=()=>{set(mat(b.dataset.c));$('#mForm').scrollIntoView({behavior:'smooth'});});
  $('#mClear').onclick=()=>set(null);
  $('#mSave').onclick=()=>{const code=$('#m_code').value.trim().toUpperCase(),desc=$('#m_desc').value.trim(),cost=num($('#m_cost').value);
    if(!CODE_RE.test(code))return $('#mErr').textContent='Code must be 2–40 letters/digits (e.g. RM-12345)';if(!desc)return $('#mErr').textContent='Description required';if(!(cost>=0))return $('#mErr').textContent='Std cost must be ≥ 0';
    const ex=mat(code),editMode=$('#m_code').disabled;if(ex&&!editMode)return $('#mErr').textContent='Code already exists — use Edit';
    const m={code,desc,cat:$('#m_cat').value,unit:$('#m_unit').value,cost,supplier:$('#m_sup').value.trim(),active:$('#m_act').value==='1',updatedAt:now()};
    if(ex){const ch=[];if(ex.cost!==m.cost)ch.push(`cost ${ex.cost} → ${m.cost}`);if(ex.active!==m.active)ch.push(m.active?'re-activated':'deactivated');if(ex.desc!==m.desc)ch.push('description edited');if(ch.length)logMat(code,ch.join(', '));Object.assign(ex,m);}else{S.materials.push(m);logMat(code,'added');}if(!save())return;toast(code+' saved');render();};
  $('#csvBtn').onclick=()=>$('#csvIn').click();
  $('#csvOut').onclick=()=>download('malee-material-master-MOCK.csv','\ufeff'+['code,description,category,unit,std_cost_thb,supplier,active',...S.materials.map(m=>[m.code,m.desc,m.cat,m.unit,m.cost,m.supplier,m.active?'Y':'N'].map(csvCell).join(','))].join('\n'));
  $('#csvIn').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;f.text().then(t=>{
    t=t.replace(/^\ufeff/,'');const rows=parseCSV(t);if(rows.length<2)return toast('CSV has no data rows');
    const h=rows[0].map(x=>x.trim().toLowerCase().replace(/^\ufeff/,''));const ix=k=>h.indexOf(k);
    if(ix('code')<0||ix('description')<0)return toast('CSV needs at least code,description columns');
    let add=0,upd=0;const errs=[],seen=new Set();
    rows.slice(1).forEach((r,ri)=>{const line=ri+2;const g=k=>ix(k)>=0?(r[ix(k)]||'').trim():'';const code=g('code').toUpperCase();
      if(!CODE_RE.test(code)){errs.push(`Row ${line}: invalid code "${code.slice(0,40)}"`);return;}
      if(seen.has(code)){errs.push(`Row ${line}: duplicate code ${code} in file (skipped)`);return;}seen.add(code);
      const desc=g('description');if(!desc){errs.push(`Row ${line}: ${code} has no description`);return;}
      const ex=mat(code);const cs=g('std_cost_thb').replace(/,/g,'');const cost=cs===''?(ex?ex.cost:NaN):num(cs);
      if(!(cost>=0)){errs.push(`Row ${line}: ${code} cost "${g('std_cost_thb')}" is not a valid number ≥ 0`);return;}
      const catIn=g('category');const cat=CATS.find(c=>c.toLowerCase()===catIn.toLowerCase())||catIn||(ex?ex.cat:'Coconut base');
      const m={code,desc,cat,unit:g('unit')||(ex?ex.unit:'kg'),cost,supplier:g('supplier'),active:!/^(n|no|0|false|inactive)$/i.test(g('active')),updatedAt:now()};
      if(ex){if(ex.cost!==m.cost)logMat(code,`cost ${ex.cost} → ${m.cost} (CSV)`);if(ex.active!==m.active)logMat(code,m.active?'re-activated (CSV)':'deactivated (CSV)');Object.assign(ex,m);upd++}else{S.materials.push(m);logMat(code,'added (CSV)');add++}});
    if(!save())return;render();const msg=`CSV imported: ${add} added, ${upd} updated${errs.length?`, ${errs.length} row(s) skipped`:''}`;toast(msg);
    if(errs.length){const box=document.createElement('div');box.className='warnbox';box.id='csvReport';box.innerHTML='<b>'+esc(msg)+'</b><br>'+errs.slice(0,50).map(esc).join('<br>')+(errs.length>50?'<br>…':'');$('#view').prepend(box);}
  });};
};

/* Inbox */
V.inbox=()=>{
  const mine=S.notifications.filter(n=>role==='ADMIN'||n.toRole===role).sort((a,b)=>b.t.localeCompare(a.t));
  const mails=S.emails.slice().sort((a,b)=>b.t.localeCompare(a.t));
  return `<h1>Inbox <span class="th">การแจ้งเตือน — ${esc(ROLES[role])}</span></h1>
  <div class="card" style="padding:0">${mine.map(n=>`<div class="notif ${n.read?'':'unread'}"><div>${n.read?'':'● '}${esc(n.title)} — <a href="#/req/${esc(n.reqId)}" data-n="${n.id}" class="nlink">${esc(n.reqId)}</a> ${role==='ADMIN'?`<span class="muted small">→ ${esc(ROLES[n.toRole])}</span>`:''}</div><div class="small muted">${fmtT(n.t)}</div></div>`).join('')||'<div class="notif muted">No notifications for this role.</div>'}</div>
  ${role==='ADMIN'?'<p class="small muted">Admin sees every role\'s notifications (read-only); read/unread belongs to each role.</p>':'<div class="actions"><button class="btn sec" id="markAll">Mark all read</button></div>'}
  <h2>Simulated email log <span class="th">อีเมลที่ระบบจะส่ง (จำลอง)</span></h2>
  <div class="hook"><b>Integration point:</b> each handoff calls <code>notify()</code> in app.js, which writes the in-app notification and builds the email below, then calls <code>deliver(email)</code>. In production, <code>deliver()</code> would post to Power Automate / Microsoft Graph (Outlook, Teams), the Gmail API, or the LINE Messaging API. No email is actually sent from this prototype. Addresses are placeholders (example.com).</div>
  <div style="margin-top:10px">${mails.map(m=>`<div class="email"><div class="small muted">${fmtT(m.t)} · ${esc(m.channel)}</div><b>${esc(m.subject)}</b><div class="small">To: ${esc(m.to)}${m.cc?' · Cc: '+esc(m.cc):''}</div><pre>${esc(m.body)}</pre></div>`).join('')||'<p class="muted">No emails yet in this session — submit a request or move one along the workflow to see one.</p>'}</div>`;
};
V.inbox.after=()=>{
  const mark=f=>{S.notifications.forEach(n=>{if(f(n))n.read=true});save();};
  if(role==='ADMIN')return;
  $('#markAll').onclick=()=>{mark(n=>n.toRole===role);render();};
  document.querySelectorAll('.nlink').forEach(a=>a.onclick=()=>mark(n=>n.id===a.dataset.n&&n.toRole===role));
};

/* Next steps */
V.next=()=>`<h1>Next steps to production <span class="th">ขั้นตอนสู่ระบบจริง</span></h1>
 <div class="card"><p>This page is a <b>clickable prototype</b> to agree the workflow, the form fields and the costing logic with CMG, R&amp;D and Finance. It is hosted publicly with mock data only — real formulations and costs must not be entered here.</p>
 <ol>
  <li><b>Backend & database</b> — replace browser storage with a shared database (options: Microsoft SharePoint Lists / Dataverse with Power Apps; Google Sheets + Apps Script / AppSheet; or a custom app on Supabase/Postgres). See the <a href="migration.html">migration guide</a>.</li>
  <li><b>Logins (SSO)</b> — replace the role switcher with company sign-in (e.g. Microsoft Entra ID or Google Workspace) and map people to roles CMG, R&amp;D, Finance-Factory, Admin.</li>
  <li><b>Real notifications</b> — wire <code>deliver()</code> to Outlook / Teams (Power Automate or Microsoft Graph), Gmail / Google Chat, or LINE.</li>
  <li><b>Full material code list</b> — load via CSV import, or better, sync from the ERP material master (if Malee uses SAP or another ERP — confirm with IT) so standard costs stay current.</li>
  <li><b>Pilot</b> — run one real coconut request end-to-end inside the internal system, then refine fields and go live.</li>
 </ol></div>`;

/* Admin tools */
function download(name,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/octet-stream'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);}
V.admin=()=>`<h1>Data tools <span class="th">จัดการข้อมูล</span></h1><div class="card">
 <p>All data lives in this browser only. Export to move it to another browser or to hand to IT as the data-model sample for migration.</p>
 <div class="actions"><button class="btn" id="expAll">Export all data (JSON)</button><button type="button" class="btn sec" id="impBtn">Import JSON</button><input id="impAll" type="file" accept=".json,application/json" hidden aria-label="JSON file"><button class="btn warn" id="reset">Reset demo data</button></div>
 <p class="small muted">${S.requests.length} requests · ${S.materials.length} materials · ${S.notifications.length} notifications · ${S.emails.length} simulated emails</p></div>`;
V.admin.after=()=>{
  $('#expAll').onclick=()=>download('malee-cmg-workflow-export.json',JSON.stringify(S,null,2));
  $('#impBtn').onclick=()=>$('#impAll').click();
  $('#impAll').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;f.text().then(t=>{let d=null;try{d=validateState(JSON.parse(t));}catch(_){d=null}if(!d){toast('Not a valid export file — nothing was changed');return;}S=d;save();toast(`Data imported: ${S.requests.length} requests, ${S.materials.length} materials`);render();});};
  $('#reset').onclick=()=>{if(confirm('Reset all data to the demo seed?')){S=seedState();save();toast('Demo data reset');go('#/dash');render();}};
};

/* Router */
function render(){
  const parts=(location.hash||'#/dash').slice(2).split('/');const name=parts[0]||'dash';const arg=parts.slice(1).join('/');
  const v=V[name]||V.dash;$('#view').innerHTML=v(arg);renderNav();if(v.after)v.after(arg);
}
function init(){
  load();const rs=$('#roleSel');rs.value=role;
  rs.onchange=()=>{role=rs.value;localStorage.setItem(KEY+'-role',role);toast('Now acting as '+ROLES[role]);const h=location.hash;if(h.startsWith('#/new')&&role!=='CMG'&&role!=='ADMIN')go('#/dash');render();};
  $('#bell').onclick=()=>go('#/inbox');
  window.addEventListener('hashchange',()=>{render();scrollTo(0,0)});
  window.addEventListener('storage',e=>{if(e.key===KEY){load();render();toast('Data updated in another tab');}});
  if(!location.hash)location.hash='#/dash';render();
}
window.MaleeCMG={get state(){return S},compute};
init();
})();

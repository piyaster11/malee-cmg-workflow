"""Regression / edge-case QA for the Malee CMG workflow prototype.
Usage: python3 tests/qa_regression.py [URL]   (default http://localhost:8765/)"""
import sys,json,re,urllib.request
from playwright.sync_api import sync_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
KEY='malee-cmg-workflow-v1'
errs=[];results=[]
def ok(name,cond,info=''):
    results.append((name,bool(cond),info)); print(('PASS ' if cond else 'FAIL ')+name+(' — '+str(info) if info and not cond else ''))
def fresh(pg,role='CMG'):
    pg.goto(URL+'#/dash'); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300); pg.select_option('#roleSel',role); pg.wait_for_timeout(100)
E=lambda pg,js: pg.evaluate(js)
def st(pg,id): return pg.evaluate(f"MaleeCMG.state.requests.find(r=>r.id==='{id}')")
def fill_min(pg,**kw):
    d=dict(customer='QA Brand',contact='QA',market='Japan',packSize='330',unitsPerCase='24',shelfLife='12',volume='1000',launchDate='2027-12-01'); d.update(kw)
    for k,v in d.items(): pg.fill(f'#reqForm [name="{k}"]',v)
    pg.select_option('#reqForm [name=productType]','Coconut water 100%'); pg.select_option('#reqForm [name=packFormat]','Aluminium can')
def setc(pg,k,v): pg.locator(f'.cin[data-k="{k}"]').fill(v); pg.locator(f'.cin[data-k="{k}"]').dispatch_event('change'); pg.wait_for_timeout(120)
def rnd_send(pg,id):
    pg.select_option('#roleSel','RND'); pg.goto(URL+'#/req/'+id); pg.wait_for_timeout(250); pg.click('#sendF'); pg.wait_for_timeout(250)
def fin_back(pg,id,msg):
    pg.select_option('#roleSel','FIN'); pg.goto(URL+'#/req/'+id); pg.wait_for_timeout(250); pg.fill('#finComment',msg); pg.click('#backC'); pg.wait_for_timeout(250)

with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':1360,'height':900},accept_downloads=True)
    pg=ctx.new_page()
    pg.on('pageerror',lambda e: errs.append('pageerror: '+str(e)))
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    prompt_answer={'v':'Need more info'}
    pg.on('dialog',lambda d: d.accept(prompt_answer['v']) if d.type=='prompt' else d.accept())

    # --- costing maths (seed CMG-2026-0001, hand calc 45.77804)
    fresh(pg)
    c=E(pg,"MaleeCMG.compute(MaleeCMG.state.requests[0])")
    ok('cost r1 total = 45.7780 (hand calc)',abs(c['total']-45.778041)<1e-4,c['total'])
    ok('cost r1 price @18% = 55.8269',abs(c['price']-55.826880)<1e-3,c['price'])
    ok('cost r1 per case x12 = 549.3365',abs(c['caseCost']-549.33650)<1e-3,c['caseCost'])
    # frozen after master change
    E(pg,"MaleeCMG.state.materials.find(m=>m.code==='RM-10004').cost=500")
    ok('approved costing frozen after master cost change',abs(E(pg,"MaleeCMG.compute(MaleeCMG.state.requests[0]).total")-45.778041)<1e-4)
    # yield 0 / 100 / margin 100 / negative labour on r2 (hand calc: ing (.9995*18+.0005*350)*.33 = 5.99475 ; pack 3.55)
    fresh(pg,'FIN'); pg.goto(URL+'#/req/CMG-2026-0002'); pg.wait_for_timeout(300)
    setc(pg,'lossPct','0'); setc(pg,'labour','0'); setc(pg,'overhead','0'); setc(pg,'marginPct','0')
    c=E(pg,"MaleeCMG.compute(MaleeCMG.state.requests[1])"); ok('yield loss 0 → materials only 9.54475',abs(c['total']-9.54475)<1e-4,c['total'])
    setc(pg,'lossPct','50'); c=E(pg,"MaleeCMG.compute(MaleeCMG.state.requests[1])"); ok('yield loss 50% doubles ingredient cost',abs(c['total']-(5.99475*2+3.55))<1e-4,c['total'])
    setc(pg,'lossPct','100'); c=E(pg,"MaleeCMG.compute(MaleeCMG.state.requests[1])"); ok('yield loss 100 → no number (not silently capped)',c['total'] is None or c['total']!=c['total'],c['total'])
    ok('yield 100 shows warning',('below 100' in pg.inner_text('#costCard')))
    pg.click('#approveC'); pg.wait_for_timeout(200); ok('yield 100 blocks approval',st(pg,'CMG-2026-0002')['status']=='Sent to Finance')
    setc(pg,'lossPct','0'); setc(pg,'marginPct','100'); pg.click('#approveC'); pg.wait_for_timeout(200)
    ok('margin 100 blocks approval',st(pg,'CMG-2026-0002')['status']=='Sent to Finance')
    setc(pg,'marginPct','10'); setc(pg,'labour','-50'); pg.click('#approveC'); pg.wait_for_timeout(200)
    ok('negative labour blocks approval',st(pg,'CMG-2026-0002')['status']=='Sent to Finance')
    setc(pg,'labour','1'); c=E(pg,"MaleeCMG.compute(MaleeCMG.state.requests[1])"); ok('margin 10% price = cost/0.9',abs(c['price']-c['total']/0.9)<1e-9)
    # missing material
    E(pg,"(()=>{const s=MaleeCMG.state;s.materials=s.materials.filter(m=>m.code!=='RM-30005')})()"); pg.goto(URL+'#/dash'); pg.goto(URL+'#/req/CMG-2026-0002'); pg.wait_for_timeout(200)
    pg.click('#approveC'); pg.wait_for_timeout(200); ok('missing mat cost blocks approval',st(pg,'CMG-2026-0002')['status']=='Sent to Finance' and 'no standard cost' in pg.inner_text('#cErr'))
    # per-case target basis
    fresh(pg,'FIN'); E(pg,"(()=>{const r=MaleeCMG.state.requests[0];r.form.priceBasis='per case, EXW';r.form.targetPrice=600})()"); pg.goto(URL+'#/req/CMG-2026-0001'); pg.wait_for_timeout(200)
    ok('per-case target compared to case price',('THB/case' in pg.inner_text('#costCard')))

    # --- form edge cases
    fresh(pg,'CMG'); pg.goto(URL+'#/new'); fill_min(pg,volume='-5',shelfLife='-1',targetPrice='-2',unitsPerCase='2.5'); pg.click('#submitReq'); pg.wait_for_timeout(200)
    e=pg.inner_text('#formErr'); ok('negatives/decimals blocked',all(x in e for x in ['Volume','Shelf life','Target price','Units per case']),e)
    pg.goto(URL+'#/dash'); pg.goto(URL+'#/new'); fill_min(pg,launchDate='2020-01-01'); pg.click('#submitReq'); pg.wait_for_timeout(200)
    ok('past launch date blocked','future' in pg.inner_text('#formErr'))
    pg.goto(URL+'#/dash'); pg.goto(URL+'#/new'); fill_min(pg); pg.fill('#reqForm [name=brix]','5,5'); pg.click('#submitReq'); pg.wait_for_timeout(200)
    if '#/req/' in pg.url: v=st(pg,pg.url.split('/')[-1])['form']['brix']; ok('comma decimal 5,5 not mis-read as 55',v in (5.5,''),v)
    else: e=pg.inner_text('#formErr'); ok('comma decimal 5,5 rejected with message','number' in e,e)
    pg.goto(URL+'#/dash'); pg.goto(URL+'#/new'); fill_min(pg,volume='100,000'); pg.click('#submitReq'); pg.wait_for_timeout(200)
    ok('thousands separator 100,000 accepted as 100000','#/req/' in pg.url and st(pg,pg.url.split('/')[-1])['form']['volume']==100000)
    pg.goto(URL+'#/dash'); pg.goto(URL+'#/new'); fill_min(pg,customer='x'*250); pg.click('#submitReq'); pg.wait_for_timeout(200)
    ok('over-long text blocked','200 characters' in pg.inner_text('#formErr'))
    pay='<script>window.__x=1</script><img src=x onerror="window.__x=1"> "q" & ไทย น้ำมะพร้าว'
    pg.goto(URL+'#/dash'); pg.goto(URL+'#/new'); fill_min(pg,customer=pay[:190],flavour=pay,notes=pay*20)
    pg.fill('#reqForm [name=attachments]','javascript:window.__x=1\nhttps://ex.com/"><img src=x onerror=window.__x=1>')
    pg.click('#submitReq'); pg.wait_for_timeout(300); rid=pg.url.split('/')[-1]
    ok('Thai + special chars submitted',rid.startswith('CMG-') and st(pg,rid)['status']=='Submitted',pg.url)
    for h in ['#/dash','#/req/'+rid,'#/inbox','#/rnd']:
        pg.select_option('#roleSel','RND'); pg.goto(URL+h); pg.wait_for_timeout(200)
    ok('no XSS from form fields',E(pg,"window.__x!==1"))
    pg.goto(URL+'#/req/'+rid); ok('script text shown literally','<script>' in pg.inner_text('#view') and 'น้ำมะพร้าว' in pg.inner_text('#view'))
    ok('javascript: link not rendered as link',E(pg,"![...document.querySelectorAll('#view a')].some(a=>a.href.startsWith('javascript'))"))
    sw=E(pg,"document.documentElement.scrollWidth"); ok('long text does not overflow page (desktop)',sw<=1360,sw)

    # --- drafts, edit audit, duplicate, ID sequence
    fresh(pg,'CMG'); pg.goto(URL+'#/new'); pg.fill('[name=customer]','Draft Co'); pg.click('#saveDraft'); pg.wait_for_timeout(200)
    ok('draft saved as CMG-YYYY-0004',pg.url.endswith('-0004') and st(pg,pg.url.split('/')[-1])['status']=='Draft',pg.url)
    did=pg.url.split('/')[-1]; pg.goto(URL+'#/new/'+did); pg.wait_for_timeout(200); fill_min(pg,customer='Draft Co'); pg.click('#submitReq'); pg.wait_for_timeout(200)
    a=st(pg,did)['audit']; ok('edit records changed fields in audit',any(x['action']=='Edited request' and 'market' in x['detail'] for x in a),a)
    pg.goto(URL+'#/new/dup-CMG-2026-0002'); pg.wait_for_timeout(200)
    ok('duplicate copies customer, clears launch date',pg.input_value('[name=customer]')=='Demo Retail Brand EU' and pg.input_value('[name=launchDate]')=='')
    pg.fill('[name=launchDate]','2027-12-01'); pg.click('#submitReq'); pg.wait_for_timeout(200)
    ok('duplicate gets new ID 0005',pg.url.endswith('-0005'),pg.url)
    # export -> import without seq / reset
    with pg.expect_download() as dl:
        pg.select_option('#roleSel','ADMIN'); pg.goto(URL+'#/admin'); pg.click('#expAll')
    path=dl.value.path(); data=json.load(open(path)); kb=E(pg,"JSON.stringify(MaleeCMG.state.requests.map(r=>[r.id,r.status,r.form,r.formulation&&r.formulation.lines,r.formulation&&r.formulation.version,r.costing&&r.costing.result,r.audit.length]))")
    data.pop('seq',None); json.dump(data,open('/tmp/qa_imp.json','w'))
    pg.click('#reset'); pg.wait_for_timeout(300); ok('reset → 3 demo requests',E(pg,"MaleeCMG.state.requests.length")==3)
    pg.goto(URL+'#/admin'); pg.set_input_files('#impAll','/tmp/qa_imp.json'); pg.wait_for_timeout(300)
    key="JSON.stringify(MaleeCMG.state.requests.map(r=>[r.id,r.status,r.form,r.formulation&&r.formulation.lines,r.formulation&&r.formulation.version,r.costing&&r.costing.result,r.audit.length]))"
    ok('JSON round-trip keeps requests identical',E(pg,key)==kb)
    pg.select_option('#roleSel','CMG'); pg.goto(URL+'#/new'); pg.fill('[name=customer]','After import'); pg.click('#saveDraft'); pg.wait_for_timeout(200)
    ok('ID after import (no seq) continues at 0006',pg.url.endswith('-0006'),pg.url)
    pg.select_option('#roleSel','ADMIN'); pg.goto(URL+'#/admin'); pg.click('#reset'); pg.wait_for_timeout(200)
    pg.select_option('#roleSel','CMG'); pg.goto(URL+'#/new'); pg.fill('[name=customer]','After reset'); pg.click('#saveDraft'); pg.wait_for_timeout(200)
    ok('ID after reset continues at 0004',pg.url.endswith('-0004'),pg.url)
    # malicious / invalid imports rejected
    bad=json.loads(json.dumps(data)); bad['requests'][0]['id']='<img src=x onerror="window.__y=1">'; json.dump(bad,open('/tmp/qa_bad.json','w'))
    dup=json.loads(json.dumps(data)); dup['requests'][1]['id']=dup['requests'][0]['id']; json.dump(dup,open('/tmp/qa_dup.json','w'))
    open('/tmp/qa_junk.json','w').write('not json')
    pg.select_option('#roleSel','ADMIN'); n0=E(pg,"MaleeCMG.state.requests.length")
    for f in ['/tmp/qa_bad.json','/tmp/qa_dup.json','/tmp/qa_junk.json']:
        pg.goto(URL+'#/admin'); pg.set_input_files('#impAll',f); pg.wait_for_timeout(250)
    pg.goto(URL+'#/dash'); pg.wait_for_timeout(200)
    ok('malicious/duplicate/junk JSON rejected, no XSS',E(pg,"MaleeCMG.state.requests.length")==n0 and E(pg,"window.__y!==1"))

    # --- repeated send-backs + version history
    fresh(pg,'FIN')
    for i in range(3):
        fin_back(pg,'CMG-2026-0002',f'Round {i+1}: adjust vitamin C')
        ok(f'send-back {i+1} → Returned to R&D',st(pg,'CMG-2026-0002')['status']=='Returned' and st(pg,'CMG-2026-0002')['returnedTo']=='RND')
        pg.select_option('#roleSel','RND'); pg.goto(URL+'#/req/CMG-2026-0002'); pg.wait_for_timeout(200)
        ok(f'R&D sees Finance comment round {i+1}',f'Round {i+1}' in pg.inner_text('#view'))
        loc=pg.locator('#tLines tbody tr').nth(1).locator('.pct'); loc.fill(str(0.05+0.01*(i+1))); loc.dispatch_event('change'); pg.wait_for_timeout(100)
        loc=pg.locator('#tLines tbody tr').nth(0).locator('.pct'); loc.fill(str(round(100-(0.05+0.01*(i+1)),4))); loc.dispatch_event('change'); pg.wait_for_timeout(100)
        pg.click('#sendF'); pg.wait_for_timeout(250)
    r=st(pg,'CMG-2026-0002'); F=r['formulation']
    ok('version is v4 after 3 resends',F['version']==4,F['version'])
    ok('history keeps v1..v3 with their lines',[h['version'] for h in F['history']]==[1,2,3] and F['history'][0]['lines'][1]['pct']==0.05 and abs(F['history'][1]['lines'][1]['pct']-0.06)<1e-9,F['history'])
    ok('old send-back comment cleared on resend',not (r['costing'] or {}).get('comment'))
    pg.select_option('#roleSel','FIN'); pg.goto(URL+'#/req/CMG-2026-0002'); pg.wait_for_timeout(200)
    ok('history visible in UI','Earlier versions (3)' in pg.inner_text('#view'))
    pg.click('#approveC'); pg.wait_for_timeout(200); r=st(pg,'CMG-2026-0002')
    acts=[a['action'] for a in r['audit']]
    ok('audit has every handoff (3 send-backs, 4 sends, 1 approval)',sum('Sent back' in a for a in acts)==3 and sum('sent to Finance' in a for a in acts)==4 and acts[-1]=='Costing approved',acts)
    ok('every status change audited with time+user+role',all(a['t'] and a['user'] and a['role'] for a in r['audit']))
    # R&D return to CMG with blank reason
    prompt_answer['v']='   '; pg.select_option('#roleSel','RND'); pg.goto(URL+'#/req/CMG-2026-0003'); pg.wait_for_timeout(200); pg.click('#retCMG'); pg.wait_for_timeout(200)
    ok('blank return reason rejected',st(pg,'CMG-2026-0003')['status']=='Submitted')
    prompt_answer['v']='Need halal cert detail'; pg.click('#retCMG'); pg.wait_for_timeout(200)
    ok('return to CMG works',st(pg,'CMG-2026-0003')['status']=='Returned' and st(pg,'CMG-2026-0003')['returnedTo']=='CMG')
    pg.select_option('#roleSel','CMG'); pg.goto(URL+'#/new/CMG-2026-0003'); pg.wait_for_timeout(200); pg.click('#submitReq'); pg.wait_for_timeout(200)
    ok('CMG resubmits returned request',st(pg,'CMG-2026-0003')['status']=='Submitted' and any(a['action']=='Resubmitted to R&D' for a in st(pg,'CMG-2026-0003')['audit']))

    # --- inactive material in old formulation
    fresh(pg,'ADMIN'); E(pg,"MaleeCMG.state.materials.find(m=>m.code==='RM-10004').active=false"); pg.goto(URL+'#/req/CMG-2026-0001'); pg.wait_for_timeout(200)
    ok('old formulation with inactive mat still displays','RM-10004' in pg.inner_text('#view'))
    E(pg,"MaleeCMG.state.materials.find(m=>m.code==='RM-10001').active=false"); fin_back(pg,'CMG-2026-0002','x'); rnd_send(pg,'CMG-2026-0002')
    ok('R&D cannot resend with inactive mat code','inactive' in pg.inner_text('#fErr') and st(pg,'CMG-2026-0002')['status']!='Sent to Finance')

    # --- CSV import
    fresh(pg,'ADMIN'); pg.goto(URL+'#/materials')
    open('/tmp/qa.csv','w',encoding='utf-8-sig').write('code,description,category,unit,std_cost_thb,supplier,active\n'
      'RM-70001,น้ำตาลมะพร้าวออร์แกนิก,sweetener,kg,"1,250.50",ผู้ขาย ก,Y\n'
      'RM-70002,Bad cost,Flavour,kg,abc,s,Y\n'
      'RM-70003,Negative,Flavour,kg,-5,s,Y\n'
      '"bad""code<x>",Inject,Flavour,kg,1,s,Y\n'
      'RM-70001,Duplicate row,Flavour,kg,9,s,Y\n'
      'RM-10002,Coconut water concentrate 60 °Brix,Coconut base,kg,99,Supplier A (mock),N\n'
      'RM-70004,,Flavour,kg,1,s,Y\n')
    pg.set_input_files('#csvIn','/tmp/qa.csv'); pg.wait_for_timeout(400)
    rep=pg.inner_text('#csvReport') if pg.locator('#csvReport').count() else ''
    m=E(pg,"MaleeCMG.state.materials.find(m=>m.code==='RM-70001')")
    ok('CSV BOM + Thai + "1,250.50" imported',m and m['desc']=='น้ำตาลมะพร้าวออร์แกนิก' and m['cost']==1250.5 and m['cat']=='Sweetener',m)
    ok('CSV bad/neg/invalid/duplicate/blank rows skipped & reported','1 added, 1 updated, 5 row(s) skipped' in rep,rep)
    ok('CSV can deactivate existing code',E(pg,"MaleeCMG.state.materials.find(m=>m.code==='RM-10002').active")==False)
    ok('material change log records CSV changes','RM-10002' in pg.inner_text('#view') and 'deactivated' in pg.inner_text('#view'))
    with pg.expect_download() as dl: pg.click('#csvOut')
    raw=open(dl.value.path(),'rb').read(); ok('CSV export has UTF-8 BOM (Thai in Excel)',raw.startswith(b'\xef\xbb\xbf'))
    pg.goto(URL+'#/materials'); pg.click('#m_cost'); pg.fill('#m_code','RM-80001'); pg.fill('#m_desc','Test'); pg.fill('#m_cost','-1'); pg.click('#mSave'); pg.wait_for_timeout(100)
    ok('material form rejects negative cost','≥ 0' in pg.inner_text('#mErr'))

    # --- dashboard counts + ageing
    fresh(pg,'CMG'); txt=[pg.locator('.stat').nth(i).inner_text().split('\n')[0] for i in range(6)]
    ok('dashboard counts per stage (0,1,0,1,1,0)',txt==['0','1','0','1','1','0'],txt)
    ok('ageing: 0003 ~2.2 days in stage','2.2' in pg.locator('tr',has_text='CMG-2026-0003').inner_text())
    pg.locator('.stat').nth(3).focus(); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    ok('stat card keyboard-activates filter',pg.locator('tbody tr').count()==1 and 'CMG-2026-0002' in pg.inner_text('tbody'))

    # --- notifications per role
    fresh(pg,'RND'); ok('R&D bell = 1 unread',pg.inner_text('#bellCount')=='1')
    pg.select_option('#roleSel','FIN'); ok('Finance bell = 1 unread',pg.inner_text('#bellCount')=='1')
    pg.select_option('#roleSel','ADMIN'); pg.goto(URL+'#/inbox'); ok('Admin inbox read-only (no mark-all)',pg.locator('#markAll').count()==0)
    pg.select_option('#roleSel','RND'); ok('Admin viewing did not clear R&D unread',pg.inner_text('#bellCount')=='1')
    pg.goto(URL+'#/req/CMG-2026-0003'); pg.wait_for_timeout(200); ok('opening request marks own notification read',pg.locator('#bellCount.hidden').count()==1)
    pg.select_option('#roleSel','FIN'); ok('Finance unread unaffected by R&D',pg.inner_text('#bellCount')=='1')
    pg.goto(URL+'#/inbox'); pg.click('#markAll'); pg.wait_for_timeout(100); ok('mark all read clears own bell',pg.locator('#bellCount.hidden').count()==1)

    # --- refresh / back mid-flow
    fresh(pg,'RND'); pg.goto(URL+'#/req/CMG-2026-0003'); pg.wait_for_timeout(200)
    l=pg.locator('#tLines tbody tr').nth(0).locator('.mc'); l.fill('RM-10001'); l.dispatch_event('change'); pg.wait_for_timeout(100); pg.click('#saveF'); pg.wait_for_timeout(200)
    pg.reload(); pg.wait_for_timeout(300); ok('saved formulation survives refresh',pg.locator('#tLines tbody tr').nth(0).locator('.mc').input_value().startswith('RM-10001'))
    pg.go_back(); pg.wait_for_timeout(200); pg.go_forward(); pg.wait_for_timeout(200); ok('back/forward re-renders without errors','CMG-2026-0003' in pg.inner_text('#view'))

    # --- corrupt / partial / quota
    pg.evaluate(f"localStorage.setItem('{KEY}','{{not json')"); pg.reload(); pg.wait_for_timeout(400)
    ok('corrupt JSON → demo data restored + backup kept',E(pg,"MaleeCMG.state.requests.length")==3 and E(pg,f"localStorage.getItem('{KEY}-corrupt-backup')")=='{not json')
    pg.evaluate(f"localStorage.setItem('{KEY}','{{\"materials\":[]}}')"); pg.reload(); pg.wait_for_timeout(400)
    ok('partial state → app still renders',E(pg,"MaleeCMG.state.requests.length")==3 and len(pg.inner_text('#view'))>50)
    n0=len(errs)
    pg.evaluate("(()=>{const o=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='"+KEY+"')throw new DOMException('full','QuotaExceededError');return o.call(this,k,v)}})()")
    pg.select_option('#roleSel','CMG'); pg.goto(URL+'#/new'); pg.fill('[name=customer]','Quota'); pg.click('#saveDraft'); pg.wait_for_timeout(300)
    ok('storage full → warning toast, no uncaught error','Could not save' in pg.inner_text('#toast') and not [e for e in errs[n0:] if 'pageerror' in e],errs[n0:])
    pg.reload()

    # --- print
    fresh(pg,'FIN'); pg.goto(URL+'#/req/CMG-2026-0001'); pg.emulate_media(media='print'); pg.wait_for_timeout(200)
    ok('print hides buttons/nav, shows print header',not pg.locator('.actions').first.is_visible() and pg.locator('.print-only').first.is_visible() and not pg.locator('#nav').is_visible())
    pg.pdf(path='/workspace/screenshots/cmg-print-summary.pdf'); pg.emulate_media(media='screen')

    # --- a11y basics
    fresh(pg,'ADMIN'); unl=[]
    for h in ['#/new','#/req/CMG-2026-0003','#/materials','#/admin','#/dash']:
        pg.select_option('#roleSel','ADMIN'); pg.goto(URL+h); pg.wait_for_timeout(200)
        unl+=E(pg,"[...document.querySelectorAll('input:not([type=hidden]):not([hidden]),select,textarea')].filter(el=>!(el.closest('label')||el.getAttribute('aria-label')||el.getAttribute('placeholder')||(el.id&&document.querySelector('label[for='+el.id+']')))).map(el=>location.hash+' '+(el.name||el.id||el.className))")
    ok('every form control has a label/aria-label',not unl,unl)
    pg.goto(URL+'#/admin'); ok('file import reachable by keyboard (button)',pg.locator('#impBtn').evaluate("e=>e.tagName")=='BUTTON')

    # --- links
    hrefs=set()
    for h in ['#/dash','#/next','#/inbox']: pg.goto(URL+h); pg.wait_for_timeout(150); hrefs|=set(E(pg,"[...document.querySelectorAll('a[href]')].map(a=>a.href)"))
    pg.goto(URL+'migration.html'); pg.wait_for_timeout(300); hrefs|=set(E(pg,"[...document.querySelectorAll('a[href],link[href]')].map(a=>a.href)"))
    bad=[]
    for u in sorted(hrefs):
        if u.startswith('http') and '#' not in u.split('/')[-1]:
            try: urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=15)
            except Exception as ex: bad.append((u,str(ex)))
    ok('no broken links',not bad,bad)
    pg.screenshot(path='/workspace/screenshots/cmg-migration.png',full_page=True)

    # --- mobile overflow
    for w in (360,390):
        mp=ctx.new_page(); mp.set_viewport_size({'width':w,'height':800}); mp.on('pageerror',lambda e: errs.append('pageerror: '+str(e)))
        mp.goto(URL); mp.evaluate("localStorage.clear()"); mp.reload(); mp.select_option('#roleSel','ADMIN'); over={}
        for h in ['#/dash','#/new','#/req/CMG-2026-0001','#/req/CMG-2026-0003','#/materials','#/inbox','#/next','#/admin','#/fin','#/rnd']:
            mp.goto(URL+h); mp.wait_for_timeout(200); sw=mp.evaluate("document.documentElement.scrollWidth")
            if sw>w: over[h]=sw
        mp.goto(URL+'migration.html'); mp.wait_for_timeout(200); sw=mp.evaluate("document.documentElement.scrollWidth")
        if sw>w: over['migration']=sw
        ok(f'no horizontal page overflow at {w}px',not over,over)
        if w==390:
            mp.goto(URL+'#/dash'); mp.wait_for_timeout(300); mp.screenshot(path='/workspace/screenshots/cmg-mobile-dashboard.png',full_page=True)
            mp.goto(URL+'#/req/CMG-2026-0002'); mp.select_option('#roleSel','FIN'); mp.wait_for_timeout(300); mp.screenshot(path='/workspace/screenshots/cmg-mobile-costing.png',full_page=True)
        mp.close()
    b.close()
errs=[e for e in errs if 'favicon' not in e]
ok('no console errors',not errs,errs)
f=[r for r in results if not r[1]]
print(f'\n{len(results)-len(f)}/{len(results)} checks passed'); print('ALL QA CHECKS PASSED' if not f else 'FAILURES: '+'; '.join(r[0] for r in f))
sys.exit(1 if f else 0)

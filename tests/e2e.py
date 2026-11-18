import sys,re
from playwright.sync_api import sync_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/'
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':1360,'height':900})
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.on('dialog',lambda d: d.accept('Need fat % confirmed') if d.type=='prompt' else d.accept())
    pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.goto(URL+'#/dash'); pg.reload(); pg.wait_for_timeout(800)
    pg.screenshot(path='/workspace/screenshots/cmg-dashboard.png',full_page=True)
    # CMG new request: validation
    pg.select_option('#roleSel','CMG'); pg.goto(URL+'#/new'); pg.wait_for_timeout(300)
    pg.click('#submitReq'); assert 'required' in pg.inner_text('#formErr'), 'validation'
    f=lambda n,v: pg.fill(f'#reqForm [name="{n}"]',str(v))
    s=lambda n,v: pg.select_option(f'#reqForm [name="{n}"]',v)
    f('customer','Test Brand (demo)');f('contact','Tester');f('market','Japan');s('productType','Coconut water 100%');s('packFormat','Aluminium can')
    f('packSize',330);f('unitsPerCase',24);f('brix',6);f('ph',5.1);f('shelfLife',12);f('volume',100000);f('targetPrice',15);f('launchDate','2027-09-01');f('flavour','Natural')
    pg.check('#reqForm input[value="No added sugar"]')
    pg.screenshot(path='/workspace/screenshots/cmg-form.png',full_page=True)
    pg.click('#submitReq'); pg.wait_for_timeout(400)
    assert '#/req/CMG-2026-0004' in pg.url, pg.url
    st=pg.evaluate("MaleeCMG.state.requests.find(r=>r.id==='CMG-2026-0004').status"); assert st=='Submitted',st
    # R&D
    pg.select_option('#roleSel','RND'); pg.wait_for_timeout(300)
    bell=pg.inner_text('#bellCount'); print('R&D bell',bell)
    pg.goto(URL+'#/rnd'); assert 'CMG-2026-0004' in pg.inner_text('#view')
    pg.goto(URL+'#/req/CMG-2026-0004'); pg.wait_for_timeout(300)
    def setline(i,code,pct):
        pg.locator('#tLines tbody tr').nth(i).locator('.mc').fill(code); pg.locator('#tLines tbody tr').nth(i).locator('.mc').dispatch_event('change'); pg.wait_for_timeout(100)
        pg.locator('#tLines tbody tr').nth(i).locator('.pct').fill(str(pct)); pg.locator('#tLines tbody tr').nth(i).locator('.pct').dispatch_event('change'); pg.wait_for_timeout(100)
    setline(0,'RM-10001 — Coconut water, NFC (Nam Hom type)',99)
    pg.click('#addLine'); setline(1,'RM-99999',0.5)
    pg.click('#sendF'); pg.wait_for_timeout(200); e=pg.inner_text('#fErr'); print('R&D validation:',e.replace('\n',' | ')); assert 'not a valid mat code' in e and 'must equal 100' in e
    setline(1,'RM-30005',1)
    pg.click('#addPack'); r=pg.locator('#tPack tbody tr').nth(0); r.locator('.mc').fill('RM-60001'); r.locator('.mc').dispatch_event('change'); pg.wait_for_timeout(100)
    pg.click('#addPack'); r=pg.locator('#tPack tbody tr').nth(1); r.locator('.mc').fill('RM-60003'); r.locator('.mc').dispatch_event('change'); pg.wait_for_timeout(100)
    pg.fill('#process','Filter, UHT, can fill (mock)')
    pg.wait_for_timeout(2700); pg.screenshot(path='/workspace/screenshots/cmg-rnd-formulation.png',full_page=True)
    pg.click('#sendF'); pg.wait_for_timeout(300)
    st=pg.evaluate("MaleeCMG.state.requests.find(r=>r.id==='CMG-2026-0004').status"); assert st=='Sent to Finance',st
    # Finance: send back first, then approve
    pg.select_option('#roleSel','FIN'); pg.goto(URL+'#/fin'); assert 'CMG-2026-0004' in pg.inner_text('#view')
    pg.goto(URL+'#/req/CMG-2026-0004'); pg.wait_for_timeout(300)
    pg.locator('.ovc[data-code="RM-10001"]').fill('20'); pg.locator('.ovc[data-code="RM-10001"]').dispatch_event('change'); pg.wait_for_timeout(200)
    pg.click('#approveC'); pg.wait_for_timeout(200); assert 'needs a reason' in pg.inner_text('#cErr')
    pg.locator('.ovr[data-code="RM-10001"]').fill('Q4 spot price (mock)'); pg.locator('.ovr[data-code="RM-10001"]').dispatch_event('change'); pg.wait_for_timeout(200)
    pg.wait_for_timeout(2700); pg.screenshot(path='/workspace/screenshots/cmg-finance-costing.png',full_page=True)
    c=pg.evaluate("(()=>{const r=MaleeCMG.state.requests.find(r=>r.id==='CMG-2026-0004');return MaleeCMG.compute(r)})()")
    print('cost/unit',round(c['total'],4),'price',round(c['price'],4),'case',round(c['caseCost'],2))
    # manual check: ing per kg = .99*20 + .01*350 = 23.3 ; *0.33 = 7.689 ; /0.97 = 7.9268 ; pack 3.55 ; conv 1+2+0 ; total 14.4768
    assert abs(c['total']-14.4768)<0.001, c
    pg.click('#approveC'); pg.wait_for_timeout(300)
    r=pg.evaluate("MaleeCMG.state.requests.find(r=>r.id==='CMG-2026-0004')")
    assert r['status']=='Costing done'
    print('audit:'); [print('  ',a['role'],a['action'],a.get('status')) for a in r['audit']]
    em=pg.evaluate("MaleeCMG.state.emails.map(e=>e.to+' | '+e.subject)"); print('emails:',em)
    # CMG inbox
    pg.select_option('#roleSel','CMG'); pg.wait_for_timeout(200)
    pg.goto(URL+'#/inbox'); assert 'Costing completed' in pg.inner_text('#view')
    # Finance send-back path on seeded CMG-2026-0002
    pg.select_option('#roleSel','FIN'); pg.goto(URL+'#/req/CMG-2026-0002'); pg.wait_for_timeout(300)
    pg.fill('#finComment','Please check vitamin C dose'); pg.click('#backC'); pg.wait_for_timeout(300)
    r2=pg.evaluate("MaleeCMG.state.requests.find(r=>r.id==='CMG-2026-0002')"); assert r2['status']=='Returned' and r2['returnedTo']=='RND'
    pg.select_option('#roleSel','RND'); pg.goto(URL+'#/req/CMG-2026-0002'); pg.wait_for_timeout(300); pg.click('#sendF'); pg.wait_for_timeout(300)
    r2=pg.evaluate("MaleeCMG.state.requests.find(r=>r.id==='CMG-2026-0002')"); print('resend version',r2['formulation']['version'],r2['status'])
    # R&D return to CMG on 0003
    pg.goto(URL+'#/req/CMG-2026-0003'); pg.wait_for_timeout(300); pg.click('#retCMG'); pg.wait_for_timeout(300)
    print('0003',pg.evaluate("MaleeCMG.state.requests.find(r=>r.id==='CMG-2026-0003').status"))
    # Admin materials + CSV import
    pg.select_option('#roleSel','ADMIN'); pg.goto(URL+'#/materials'); pg.wait_for_timeout(300)
    open('/tmp/m.csv','w').write('code,description,category,unit,std_cost_thb,supplier,active\nRM-70001,"Pineapple flavour, natural",Flavour,kg,950,Supplier X (mock),Y\nRM-10001,"Coconut water, NFC (Nam Hom type)",Coconut base,kg,19,Supplier A (mock),Y\n')
    pg.set_input_files('#csvIn','/tmp/m.csv'); pg.wait_for_timeout(500)
    n=pg.evaluate("MaleeCMG.state.materials.length"); print('materials after import',n); assert n==21
    pg.evaluate("localStorage.clear()"); pg.goto(URL+'#/materials'); pg.reload(); pg.select_option('#roleSel','ADMIN'); pg.wait_for_timeout(400)
    pg.screenshot(path='/workspace/screenshots/cmg-material-master.png',full_page=True)
    pg.goto(URL+'#/req/CMG-2026-0001'); pg.wait_for_timeout(300); pg.screenshot(path='/workspace/screenshots/cmg-request-summary.png',full_page=True)
    pg.goto(URL+'#/inbox'); pg.wait_for_timeout(200)
    pg.goto(URL+'#/admin'); pg.wait_for_timeout(200)
    pg.goto(URL+'#/next'); pg.wait_for_timeout(200)
    pg.goto(URL+'migration.html'); pg.wait_for_timeout(500); pg.screenshot(path='/workspace/screenshots/cmg-migration.png',full_page=True)
    m=b.new_page(viewport={'width':390,'height':844}); m.on('pageerror',lambda e: errs.append(str(e))); m.goto(URL+'#/new'); m.wait_for_timeout(500); m.screenshot(path='/workspace/screenshots/cmg-mobile.png')
    b.close()
errs=[e for e in errs if 'favicon' not in e]
print('CONSOLE ERRORS:',errs)
print('ALL TESTS PASSED' if not errs else 'ERRORS')

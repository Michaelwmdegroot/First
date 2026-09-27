'use strict';
const {chromium,webkit,devices}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const dir=process.env.GAME_DIR,out=process.env.REPORT_DIR;
const files=['index.html','style.css','data.js','sim.js','world.js','ui.js'];
fs.mkdirSync(out,{recursive:true});
const reportPath=path.join(out,'report.json');
const report=process.env.HOST_ONLY?JSON.parse(fs.readFileSync(reportPath,'utf8')):{version:'0.1.1',testedAt:new Date().toISOString(),browsers:[],hosting:{}};
const write=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.split('/').pop()||'index.html';if(!files.includes(name)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'application/javascript'})[path.extname(name)]);res.end(fs.readFileSync(path.join(dir,name)));});
async function test(engine,name,options,touch){
 const r={name,checks:[],errors:[]};report.browsers.push(r);
 const browser=await engine.launch({headless:true,...(engine===chromium?{args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});
 const context=await browser.newContext(options),page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>r.errors.push(e.message));
 const click=async selector=>{const el=page.locator(selector).first();if(touch)await el.tap();else await el.click();};
 const shot=async suffix=>page.screenshot({path:path.join(out,name+'-'+suffix+'.png')});
 try{
  await page.goto('http://127.0.0.1:8787/',{waitUntil:'load'});await page.waitForFunction(()=>!!window.tidefolk);
  assert.equal(await page.locator('#fatal').isVisible(),false);
  assert.equal(await page.evaluate(()=>tidefolk.version),'0.1.1');
  r.webgl=await page.evaluate(()=>!!tidefolk.view.gl);await shot('welcome');
  await click('[data-act="begin"]');await page.waitForFunction(()=>tidefolk.sim.s.started&&document.querySelector('#modal').hidden);
  assert.equal(await page.evaluate(()=>tidefolk.sim.people.length),4);await shot('opening');r.checks.push('Four founders and functional island rendering');
  await page.evaluate(()=>{window.qaResource=document.querySelector('#resources [data-act="knowledge"]');window.qaMarker=document.querySelector('#markers button');});
  await page.waitForTimeout(850);
  assert.ok(await page.evaluate(()=>qaResource===document.querySelector('#resources [data-act="knowledge"]')));
  assert.ok(await page.evaluate(()=>!qaMarker||qaMarker.isConnected));
  r.checks.push('HUD and map-marker DOM targets survive multiple redraws');
  for(const panel of ['people','build','knowledge','supplies','journal','settings']){
   await click('[data-act="'+panel+'"]');assert.equal(await page.locator('#panel').isVisible(),true);assert.equal(await page.evaluate(()=>tidefolk.sim.s.paused),true);await shot(panel);await click('[data-act="close"]');
  }
  r.checks.push('All six planning panels open and close with real touch/mouse input');
  await page.evaluate(()=>{tidefolk.act('people');tidefolk.save();});
  const ids=await page.evaluate(()=>tidefolk.sim.people.map(p=>p.id));
  assert.ok(await page.evaluate(()=>localStorage.getItem('tidefolk.firsthearth.v1')));
  await page.reload();await page.waitForFunction(()=>!!window.tidefolk);await click('[data-act="continue"]');
  assert.deepEqual(await page.evaluate(()=>tidefolk.sim.people.map(p=>p.id)),ids);
  r.checks.push('Native browser localStorage survives reload; Continue retains identities');
  // Save after welcome has paused the real game, before comparing sample isolation.
  await page.evaluate(()=>{tidefolk.act('mainmenu');tidefolk.save();});
  const realSave=await page.evaluate(()=>localStorage.getItem('tidefolk.firsthearth.v1'));
  await click('[data-act="demo"]');await page.waitForTimeout(600);await page.evaluate(()=>tidefolk.save());
  assert.equal(await page.evaluate(()=>localStorage.getItem('tidefolk.firsthearth.v1')),realSave);
  await shot('sample-village');r.checks.push('Sample village does not modify the real saved story');
  const zoom=await page.evaluate(()=>tidefolk.view.zoom);await click('[data-act="zoom:1"]');assert.ok(await page.evaluate(()=>tidefolk.view.zoom)>zoom);
  await click('[data-act="mainmenu"]');await click('[data-act="continue"]');
  // Advance the ordinary simulation, without changing stocks or granting resources.
  const salvage=await page.evaluate(()=>{const s=tidefolk.sim;s.s.paused=true;const message=s.orderNode('wreck');s.runDays(1);return{message,wood:s.s.stock.wood,fiber:s.s.stock.fiber};});
  assert.equal(salvage.message,'');assert.ok(salvage.wood>=5);r.salvage=salvage;
  await click('[data-act="build"]');await click('[data-act="preview:hearth"]');
  const point=await page.evaluate(()=>tidefolk.view.project(0,.55,1));
  if(touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
  assert.ok(await page.locator('[data-act="place"]').isEnabled(),await page.locator('#placement').innerText());
  await click('[data-act="place"]');await page.evaluate(()=>tidefolk.sim.runDays(1));
  assert.ok(await page.evaluate(()=>tidefolk.sim.has('hearth')));await shot('first-hearth');
  r.checks.push('Wreck salvage earns materials; ground tap and confirmation build a completed Hearth');
  const paths=await page.evaluate(()=>tidefolk.sim.s.paths.length);
  await click('[data-act="build"]');await click('[data-act="path"]');
  const points=await page.evaluate(()=>[tidefolk.view.project(-3,.55,0),tidefolk.view.project(-1,.55,0)]);
  await page.evaluate(points=>{const c=document.querySelector('#world');for(const [i,p] of points.entries()){c.dispatchEvent(new PointerEvent(i?'pointermove':'pointerdown',{pointerId:99,pointerType:'touch',clientX:p.x,clientY:p.y,bubbles:true}));}const p=points[points.length-1];c.dispatchEvent(new PointerEvent('pointerup',{pointerId:99,pointerType:'touch',clientX:p.x,clientY:p.y,bubbles:true}));},points).catch(()=>{});
  // Synthetic pointer capture is not supported on every engine; mouse path is the fallback exercise.
  if(await page.evaluate(()=>tidefolk.sim.s.paths.length)===paths){await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();await page.mouse.move(points[1].x,points[1].y,{steps:8});await page.mouse.up();}
  await click('[data-act="endpath"]');
  r.pathCount=await page.evaluate(()=>tidefolk.sim.s.paths.length);
  r.layout=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth}));assert.ok(r.layout.scrollWidth<=r.layout.width+1);
  // Save export is a real browser download and validates as versioned JSON.
  await click('[data-act="settings"]');
  const downloadPromise=page.waitForEvent('download');await click('[data-act="export"]');const download=await downloadPromise;
  const exported=path.join(out,name+'-save.json');await download.saveAs(exported);assert.equal(JSON.parse(fs.readFileSync(exported,'utf8')).version,1);
  r.checks.push('Versioned save export downloads successfully');
  // Invalid files must be rejected without replacing the current island.
  await page.locator('#importfile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":999}')});
  await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>tidefolk.sim.people.map(p=>p.id)),ids);
  r.checks.push('Invalid save import leaves the current story intact');
  assert.deepEqual(r.errors,[]);r.passed=true;
 }catch(e){r.passed=false;r.failure=String(e.stack).slice(0,2500);await shot('failure').catch(()=>{});}
 finally{await browser.close();write();}
}
async function hosting(){
 report.commit=process.env.RELEASE_SHA;
 const base='https://raw.githack.com/Michaelwmdegroot/First/'+report.commit+'/tidefolk-v01/';report.hosting={url:base+'index.html',files:[]};
 for(const name of files){try{const response=await fetch(base+name,{signal:AbortSignal.timeout(30000)}),bytes=Buffer.from(await response.arrayBuffer()),local=fs.readFileSync(path.join(dir,name));report.hosting.files.push({name,status:response.status,type:response.headers.get('content-type'),sameBytes:bytes.equals(local),sha256:crypto.createHash('sha256').update(local).digest('hex')});}catch(e){report.hosting.files.push({name,error:e.message});}}
 report.hosting.passed=report.hosting.files.every(r=>r.status===200&&r.sameBytes);write();console.log(JSON.stringify(report,null,2));if(!report.hosting.passed)process.exitCode=1;
}
(async()=>{
 if(process.env.HOST_ONLY){await hosting();return;}
 await new Promise(resolve=>server.listen(8787,'127.0.0.1',resolve));
 await test(chromium,'chromium-desktop',{viewport:{width:1440,height:960}},false);
 await test(chromium,'chromium-android',{...devices['Pixel 7']},true);
 await test(webkit,'webkit-iphone',{...devices['iPhone 13']},true);
 server.close();write();console.log(JSON.stringify(report,null,2));if(!report.browsers.every(r=>r.passed))process.exitCode=1;
})().catch(e=>{console.error(e);server.close();write();process.exitCode=1;});

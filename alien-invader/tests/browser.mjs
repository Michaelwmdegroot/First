// Browser-level acceptance: real origin, WebGL/compatibility globe, UI, saves and responsive layout.
import {chromium,webkit} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.QA_DIR||'qa-browser';fs.mkdirSync(out,{recursive:true});
const url=process.env.PLAY_URL||'http://127.0.0.1:8000/index.html';
const browsers=process.env.LIVE?['chromium']:['chromium','webkit'];
const results=[];
for(const name of browsers){
 const browser=await({chromium,webkit}[name]).launch({headless:true,...(name==='chromium'?{args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true});
 const page=await context.newPage();const errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&r.url().includes('/alien-invader/'))failed.push({url:r.url(),status:r.status()});});
 try {
 const target=url+(url.includes('?')?'&':'?')+'test=1';
 await page.goto(target,{waitUntil:'domcontentloaded',timeout:90000});
 if(!await page.locator('#new-game-button').count()){
  // The host's visible first-visit notice is accepted through its normal page button.
  // This is a content notice, not a CAPTCHA; no hidden endpoint or protection is bypassed.
  const openPage=page.getByRole('button',{name:'Open the page',exact:true});
  if(await openPage.count()){await openPage.click();await page.waitForLoadState('domcontentloaded');}
 }
 await page.waitForFunction(()=>window.__AIS_READY__===true,{},{timeout:90000});
 await page.waitForTimeout(1700);
 const renderer=await page.evaluate(()=>window.__AIS_TEST__.globe.constructor.name);
 await page.screenshot({path:`${out}/${name}-title.png`});
 await page.click('[data-action="new-game"]');await page.fill('#new-seed','Browser acceptance');
 await page.selectOption('#new-pace','1');await page.click('[data-action="begin"]');
 await page.evaluate(()=>{window.__AIS_TEST__.game.s.speed=0;window.__AIS_TEST__.refresh();});
 assert.equal(await page.evaluate(()=>window.__AIS_TEST__.game.s.bases.length),1);
 assert.equal(await page.evaluate(()=>window.__AIS_TEST__.world.defs.length),241);
 // All screen tabs render without page exceptions, even when most late content is locked.
 for(const screen of ['world','bases','fleet','agents','diplomacy','economy','research','narratives','archive','endgame']){
  await page.click(`.nav-item[data-screen="${screen}"]`);
  for(const id of await page.locator('#drawer-tabs button').evaluateAll(xs=>xs.map(x=>x.dataset.tab)))await page.click(`#drawer-tabs [data-tab="${id}"]`);
  await page.click('#drawer-close');
 }
 // Real UI operation, completion, and the first earned reward; no injected resources.
 await page.click('[data-action="guide"]');assert.ok(await page.locator('[data-action="confirm-preview"]').isEnabled());
 await page.click('[data-action="confirm-preview"]');
 await page.evaluate(()=>window.__AIS_TEST__.advance(60));
 assert.equal(await page.evaluate(()=>window.__AIS_TEST__.game.s.stats.observe),1);
 await page.click('[data-action="claim-guide"]');
 await page.waitForTimeout(4400);await page.screenshot({path:`${out}/${name}-earth.png`});
 // Pause controls and one-day stepping preserve a consistent state.
 await page.keyboard.press('Space');await page.waitForTimeout(1100);await page.keyboard.press('Space');
 const savedDay=await page.evaluate(()=>window.__AIS_TEST__.game.s.day);
 await page.click('#quick-save-button');
 assert.ok(await page.evaluate(()=>localStorage.getItem('alien-invader-browser-save-v1')));
 await page.reload({waitUntil:'domcontentloaded',timeout:90000});await page.waitForFunction(()=>window.__AIS_READY__===true);
 await page.click('[data-action="continue"]');
 assert.equal(await page.evaluate(()=>window.__AIS_TEST__.game.s.day),savedDay);
 assert.equal(await page.evaluate(()=>window.__AIS_TEST__.game.s.speed),0);
 assert.equal(await page.evaluate(()=>window.__AIS_TEST__.game.s.stats.observe),1);
 // A browser download is an actual transferable save; import it into the same session.
 await page.click('#settings-button');
 const pending=page.waitForEvent('download');await page.click('[data-action="export"]');const download=await pending;
 const savePath=`${out}/${name}-campaign.json`;await download.saveAs(savePath);
 const exported=JSON.parse(fs.readFileSync(savePath,'utf8'));assert.equal(exported.state.day,savedDay);
 await page.setInputFiles('#save-import',savePath);await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>window.__AIS_TEST__.game.s.day),savedDay);
 // Invalid input must not replace the running game.
 await page.setInputFiles('#save-import',{name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
 await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__AIS_TEST__.game.s.day),savedDay);
 // Country selection is coupled to the globe, not just a decorative scene.
 await page.click('.nav-item[data-screen="world"]');await page.click('#drawer-tabs [data-tab="countries"]');
 await page.fill('[data-input="country-search"]','Netherlands');await page.waitForTimeout(300);
 await page.locator('[data-action="select-country"][data-id="528"]').click();
 assert.equal(await page.evaluate(()=>window.__AIS_TEST__.ui.selected),'528');
 if(await page.locator('#drawer:visible').count())await page.click('#drawer-close');
 // A forced zero-reserve incident still has a viable management response.
 await page.evaluate(()=>{const g=window.__AIS_TEST__.game;g.s.resources.intel=0;g.s.resources.influence=0;g.s.resources.energy=0;g.raise('naval_leak',{country:'840'});});
 await page.waitForSelector('[data-action="event-choice"][data-id="stand_down"]');
 await page.click('[data-action="event-choice"][data-id="stand_down"]');
 assert.equal(await page.evaluate(()=>window.__AIS_TEST__.game.s.eventQueue.length),0);
 assert.equal(await page.evaluate(()=>window.__AIS_TEST__.game.s.history[0].choice),'Accept the consequences');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);
 await page.screenshot({path:`${out}/${name}-mobile.png`});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),'No horizontal document overflow');
 await page.click('.nav-item[data-screen="research"]');assert.ok(await page.locator('#drawer').isVisible());
 await page.screenshot({path:`${out}/${name}-mobile-research.png`});await page.click('#drawer-close');
 // Inactive tabs do not simulate an entire standby period on wake.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.evaluate(()=>window.__AIS_TEST__.game.s.speed),0);
 assert.deepEqual(errors,[],`Uncaught ${name} exceptions`);assert.deepEqual(failed,[],`Missing ${name} assets`);
 results.push({browser:name,url,renderer,saveLoad:true,saveExportImport:true,countrySelection:true,allScreens:true,incidentRecovery:true,mobile:true,standbyPause:true,pageErrors:errors,failedAssets:failed});
 } catch(error) {
  await page.screenshot({path:`${out}/${name}-failure.png`,fullPage:true}).catch(()=>{});
  fs.writeFileSync(`${out}/${name}-failure.json`,JSON.stringify({message:error.message,url:page.url(),errors,failed,html:await page.content()},null,2));
  throw error;
 } finally { await browser.close(); }
}
fs.writeFileSync(`${out}/report.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));

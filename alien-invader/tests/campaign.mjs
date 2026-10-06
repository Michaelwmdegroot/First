// End-to-end balancing smoke test: only normal player actions; no resource/technology grants.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Game,GUIDE} from '../engine.js';
import {decodeWorld} from '../world.js';
import {TECHS,CRAFT,PHYSICAL} from '../data.js';
const {defs}=decodeWorld(JSON.parse(fs.readFileSync(new URL('../vendor/countries-50m.json',import.meta.url))));
const targets=['840','156','250','710','682','392','643'];
function play(seed,ending='accord'){
 const g=new Game(defs,{seed});g.start();let iterations=0;
 const op=(k,id)=>{if(!g.opPreview(k,id).blocked.length)return g.launch(k,id).ok;return false;};
 const decisions=()=>{let guard=0;while(g.s.eventQueue.length&&guard++<12){const v=g.eventView(),choices=v.choices.filter(c=>!c.blocked.length);if(!choices.length){console.log(JSON.stringify({year:g.year,event:v,resources:g.s.resources},null,2));throw Error('No affordable incident response');}const score=c=>{const e=c.effects||{};return(e.trust||0)*1.5+(e.welfare||0)+(e.contact||0)*8+(e.intel||0)*.1-(e.evidence||0)*(ending==='occupation'?.2:4)-(e.coherence||0)*(ending==='occupation'?.1:1.8)-(e.hostility||0)*2-(e.pattern||0)*.4-(e.panic||0)*.6-(e.recall?15:0)+(e.coercion||0)*(ending==='occupation'?3:-1)+(e.open&&ending==='occupation'?60:0)+(e.agentAutonomy?10:0)-(e.evacuate?40:0);};choices.sort((a,b)=>score(b)-score(a));g.choose(choices[0].id);}};
 for(;iterations<1800&&!g.s.ended;iterations++){
  decisions();const s=g.s;
  if(GUIDE[s.guide]?.test(s))g.claimGuide();
  for(const k of Object.keys(s.resources))assert.ok(Number.isFinite(s.resources[k])&&s.resources[k]>=0,'resource invariant');
  if(s.projectReady){const r=g.finalize();if(r.ok)break;}
  if(!s.jobs.some(j=>j.kind==='project')&&!s.projectReady&&g.projectConditions(ending).every(x=>x.ok))g.startProject(ending);
  for(const t of s.treaties)if(t.active&&t.expiry-s.day<365&&s.resources.influence>30)g.renewTreaty(t.id);
  if(g.legal())for(const k of ['common','rare','precious','bio','nuclear'])if(s.resources[k]<15&&s.resources.capital>120)g.trade(k,10,true);
  for(const f of s.fronts){if(f.level<4&&s.resources.capital>60+f.level*25&&s.resources.influence>60)g.upgradeFront(f.id);if(s.footprint>65&&s.resources.capital>100)g.frontCover(f.id);}
  // Build the material foundation before spending on non-essential infrastructure.
  const priorities=['human1','information1','bio1','fabrication1','stealth1','cognitive1','extraction1','information2','information3','human2','bio2','human3','fabrication2','fabrication3','fabrication4','fabrication5','human4','human5','human6','cognitive2','cognitive3','cognitive4','cognitive5','cognitive6','information4','information5','information6','stealth2','stealth3','stealth4','stealth5','bio3','extraction2','extraction3',...Object.keys(TECHS)];
  for(const id of priorities)if(!g.researchPreview(id).blocked.length){g.research(id);if(s.jobs.filter(j=>j.kind==='research').length>=(g.tech('information3')?2:1))break;}
  const home=s.bases[0];if(!home)break;
  if(g.rates().energy<1.5||s.resources.energy<35)for(const b of s.bases)if(!g.modulePreview(b.id,'power').blocked.length){g.buildModule(b.id,'power');break;}
  for(const k of ['bio','intel','relay'])if(!g.hasModule(k)&&!s.jobs.some(j=>j.kind==='module'&&j.subtype===k))for(const b of s.bases)if(!g.modulePreview(b.id,k).blocked.length){g.buildModule(b.id,k);break;}
  if(g.hasModule('bio')&&g.rates().intel<.4&&(home.modules.intel||0)<2&&!g.modulePreview(home.id,'intel').blocked.length)g.buildModule(home.id,'intel');
  if(s.resources.exotic<30&&!s.jobs.some(j=>j.kind==='emergency')&&!(s.cooldowns.emergency>s.day))g.emergency();
  for(const a of s.craft)if(a.health<65&&!a.busy&&s.resources.common>8)g.repairCraft(a.id);
  if(s.craft.filter(a=>a.type==='scout').length<3&&!g.craftPreview('scout').blocked.length)g.buildCraft('scout');
  if(!s.craft.some(a=>a.type==='recovery')&&!g.craftPreview('recovery').blocked.length)g.buildCraft('recovery');
  for(const cid of targets){const c=g.country(cid);if(c.insight<30)op('observe',cid);if(!c.surveyed)op('survey',cid);if(c.contact<2)op('contact',cid);if(c.contact>=2&&c.trust<65&&(s.agents.length>0||s.resources.influence>24))op('cultivate',cid);
   if(c.contact>=2&&c.trust>=65&&!g.treaty(cid)&&!g.proposalPreview(cid,['resources','noninterference','sensors'],'intel').blocked.length)g.propose(cid,['resources','noninterference','sensors'],'intel');
   if(!s.fronts.some(f=>f.country===cid)&&s.resources.influence>18)op('front',cid);
   if(c.surveyed&&s.resources.exotic>7&&s.bases.length<8&&!s.bases.some(b=>b.country===cid&&b.type==='desert')&&!g.buildPreview('desert',cid).blocked.length)g.buildBase('desert',cid);
   if(g.tech('bio1')&&g.hasModule('bio')&&s.agents.length<8&&!s.agents.some(a=>a.country===cid)&&!s.jobs.some(j=>j.kind==='agent'&&j.country===cid)){const method=ending==='occupation'&&g.tech('bio2')&&s.doctrine.coercion<16?'replacement':'adviser';if(!g.agentPreview(method,cid,'media').blocked.length)g.recruit(method,cid,'media');}
   if(c.surveyed&&s.resources.exotic<25)op('salvage',cid);
   if(c.surveyed&&(s.resources.common<60||s.resources.rare<30||s.resources.precious<20))op('mine',cid);
   if(s.resources.bio<16&&g.hasModule('bio'))op('sample',cid);
   if(c.contact>=2&&s.doctrine.welfare<88&&s.resources.influence>30)op('relief',cid);
   if(s.resources.intel<45)op('observe',cid);
  }
  if(ending==='occupation'&&!s.open){const p=g.disclosurePreview('authority');if(!p.blocked.length)g.disclose('authority');}
  for(const a of s.agents)if(a.phase==='active'&&!a.busy&&s.resources.influence>35){if(a.access<90)g.agentAction(a.id,'promote');else if(g.control().total<84)g.agentAction(a.id,'policy');}
  for(const id of ['balloons','aircraft','circles','visitors','dimensions'])if(!s.narratives[id].active&&!g.narrativePreview(id,'seed').blocked.length&&s.resources.influence>25)g.narrativeAction(id,'seed');
  if(s.metrics.coherence>48&&s.resources.influence>35)for(const id of ['balloons','aircraft'])if(!g.narrativePreview(id,'coopt').blocked.length)g.narrativeAction(id,'coopt');
  g.advance(30);decisions();
 }
 const report={seed,desired:ending,ending:g.s.ended?.id||null,year:g.year,day:g.s.day,control:g.control(),research:g.s.researched.length,resources:g.s.resources,bases:g.s.bases.length,agents:g.s.agents.length,fronts:g.s.fronts.length,treaties:g.s.treaties.filter(t=>t.active).length,decisions:g.s.stats.decisions,metrics:g.s.metrics};
 console.log(JSON.stringify(report));
 if(!g.s.ended||g.s.ended.id!==ending){fs.writeFileSync(new URL(`./failed-${ending}.json`,import.meta.url),g.export());console.log(g.projectConditions(ending));throw Error('Expected normal-play '+ending+' ending');}
 return report;
}
const results=[];for(const ending of (process.env.ENDING?[process.env.ENDING]:['accord','silent','shepherd','merge','sovereign','occupation']))results.push(play('Playtest '+ending,ending));
console.log('PASS: six full campaigns reach six distinct endings using only normal actions.');
if(process.env.QA_REPORT)fs.writeFileSync(process.env.QA_REPORT,JSON.stringify(results,null,2));

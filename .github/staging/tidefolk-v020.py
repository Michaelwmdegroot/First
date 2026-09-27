from pathlib import Path
import sys, hashlib
# One-use release preparation. The workflow removes this file after tests pass.
game=Path(sys.argv[1])
BASE={'index.html':'30eafacf39d8ac4e71f63b3e376acb1dae8acfef5b95851a41e3e6ece6a5f58c','style.css':'2f3c1caee866464e5a045d06e3a4313116103ffe25f023efb9cf3cfdaf4bd0db','data.js':'3286367c020cca8d05898a20d4583bbc2dfbabf8f3aa0c5ee5eab404cf8fecd6','sim.js':'8c054753e3b4b2b739c47e81a8c5a64e1ac8ebfbd769df154c116d7d074b41c1','world.js':'f71927400691937619657a86333128be694a8905cb7bb4e37725413458b5c2f1','ui.js':'9a136f4e1ad6f93242a566784ac30b8055d39bf5c6f7e54325c6e6cbefed0f96'}
for name,digest in BASE.items():
 assert hashlib.sha256((game/name).read_bytes()).hexdigest()==digest,'Source changed: '+name
before={p.name:p.read_text() for p in game.glob('*') if p.name in BASE}
def rep(s,a,b):
 assert s.count(a)==1,(a[:100],s.count(a))
 return s.replace(a,b,1)
# Data and authored island.
s=before['data.js']
s=rep(s,'version:1, daysPerSeason:30, secondsPerDay:90, tick:1/480','version:2, daysPerSeason:30, secondsPerDay:360, tick:1/960')
s=rep(s,'speeds:[1,4,12]','speeds:[1,2,4], dayLengths:[360,600,900], walkPerDay:240')
s=rep(s,'function radiusAt(a){return 15.2+1.1*Math.sin(3*a+.8)+.65*Math.cos(5*a)+.45*Math.sin(7*a);}', '''function starterRadiusAt(a){return 15.2+1.1*Math.sin(3*a+.8)+.65*Math.cos(5*a)+.45*Math.sin(7*a);}
function radiusAt(a){return starterRadiusAt(a)+Math.max(0,-Math.sin(a))*(38+3*Math.sin(5*a)+1.6*Math.cos(7*a));}
function starterLandRatio(x,z){let a=Math.atan2(z/.82,x);return Math.hypot(x,z/.82)/starterRadiusAt(a);}''')
s=rep(s,'function makeWorld(){','function makeStarterWorld(){')
s+='''
// An authored, contiguous island. The original southern beach stays at the same coordinates.
const REGIONS=Object.freeze([
 {id:'home',name:'First Light Shore',x:0,z:4,icon:'house',color:'#b9c695',requires:[],hint:'Our landing beach, freshwater and first home.'},
 {id:'pinewood',name:'Whispering Wood',x:0,z:-16,icon:'leaf',color:'#82a88a',requires:['home'],hint:'A trail leads inland beneath the trees. What grows beyond the clearing?'},
 {id:'meadow',name:'Sunward Meadow',x:-16,z:-18,icon:'sprout',color:'#c4c68e',requires:['pinewood'],hint:'Warm light falls across an opening beyond the western woods.'},
 {id:'ridge',name:'Greyback Ridge',x:9,z:-27,icon:'stone',color:'#b1b9b2',requires:['pinewood'],hint:'Pale rock breaks through the trees to the north.'},
 {id:'cove',name:'Reedwater Cove',x:23,z:-14,icon:'fish',color:'#91beb4',requires:['pinewood'],hint:'Sea birds circle somewhere beyond the eastern treeline.'},
 {id:'headland',name:'Farwatch Headland',x:-2,z:-38,icon:'compass',color:'#b5b7a4',requires:['ridge'],hint:'The land rises again beyond the ridge. The horizon is waiting.'}
]);
const ISLAND_PATCHES=Object.freeze([
 {id:'wood_berries',name:'Woodland berry bushes',x:-4,z:-17,icon:'food',resource:'fresh',amount:4,left:12,desc:'A sheltered patch of edible berries. A scout has made this trail safe to use.'},
 {id:'meadow_seeds',name:'Wild grain',x:-16,z:-18,icon:'sprout',resource:'seeds',amount:2,left:6,desc:'Viable grain for planting more fields. Gather a few seed heads and carry them home.'},
 {id:'meadow_herbs',name:'Wildflower hollow',x:-19,z:-15,icon:'leaf',resource:'herbs',amount:3,left:8,desc:'Medicinal leaves grow in this sunny hollow.'},
 {id:'ridge_stone',name:'Loose ridge stone',x:12,z:-24,icon:'stone',resource:'stone',amount:5,left:20,desc:'Loose stone can be carried home without building a Stone Yard.'},
 {id:'cove_reeds',name:'Tall coastal reeds',x:23,z:-13,icon:'leaf',resource:'fiber',amount:6,left:18,desc:'Reeds for roofs and cordage grow along this new shore.'},
 {id:'cove_food',name:'Tidal shellfish beds',x:24,z:-15,icon:'fish',resource:'fresh',amount:4,left:12,desc:'Gather shellfish from the shallows and bring them back to the community.'}
]);
function regionAt(x,z){
 if(starterLandRatio(x,z)<=1.03)return 'home';
 let best=REGIONS[1],d=Infinity;
 for(const r of REGIONS.slice(1)){const n=Math.hypot(x-r.x,z-r.z);if(n<d){d=n;best=r;}}
 return best.id;
}
function regionKnown(state,x,z){return (state.world.explored||['home']).includes(regionAt(x,z));}
function expandIsland(world){
 if(world.layout===2)return world;
 const rng=rand(272026),trees=[];
 for(let i=0;i<1100&&trees.length<145;i++){
  const x=(rng()-.5)*60,z=-7-rng()*34,r=landRatio(x,z),region=regionAt(x,z);
  if(r>.85||region==='home'||REGIONS.some(q=>Math.hypot(q.x-x,q.z-z)<2.4)||ISLAND_PATCHES.some(q=>Math.hypot(q.x-x,q.z-z)<1.5))continue;
  if((region==='meadow'||region==='ridge')&&rng()<.65)continue;
  trees.push({id:'north_tree_'+i,x,z,size:.8+rng()*.55,wood:8,regrow:0});
 }
 world.trees.push(...trees);
 for(const p of ISLAND_PATCHES)if(!world.nodes.some(n=>n.id===p.id))world.nodes.push({...p,kind:'cache'});
 world.layout=2;world.explored=['home'];world.explorationLog=[];return world;
}
function makeWorld(){
 const w=expandIsland(makeStarterWorld());
 // Existing saves retain their old discoveries and placements. Only new islands use these landmarks.
 const places={stone:{x:9,z:-27},copper:{x:1,z:-36},lookout:{x:-3,z:-39}};
 for(const n of w.nodes)if(places[n.id])Object.assign(n,places[n.id]);
 return w;
}
'''
(game/'data.js').write_text(s)
# Simulation and non-destructive migration.
s=before['sim.js']
s=rep(s,"if(saved){this.s=saved;this.s.paused=true;this.s.speed=1;this.s.people.forEach(p=>{p.route=[];p.targetKey=null;});return;}","if(saved){this.s=saved;this.s.version=2;this.s.paused=true;this.s.speed=1;this.s.settings=this.s.settings||{};if(!BALANCE.dayLengths.includes(this.s.settings.daySeconds))this.s.settings.daySeconds=BALANCE.secondsPerDay;expandIsland(this.s.world);this.s.people.forEach(p=>{p.route=[];p.targetKey=null;});return;}")
s=rep(s,'this.s={version:1,seed:','this.s={version:2,seed:')
s=rep(s,"settings:{sound:false,quality:'auto'}","settings:{sound:false,quality:'auto',daySeconds:BALANCE.secondsPerDay}")
s=rep(s,'get day(){return this.s.day;}', '''get day(){return this.s.day;}
 get daySeconds(){return BALANCE.dayLengths.includes(this.s.settings?.daySeconds)?this.s.settings.daySeconds:BALANCE.secondsPerDay;}
 knownAt(x,z){return regionKnown(this.s,x,z);}
 region(id){return REGIONS.find(r=>r.id===id);}
 explored(id){return this.s.world.explored.includes(id);}
 scoutFor(id){return this.people.find(p=>p.task?.kind==='scout'&&p.task.region===id);}
 scoutReason(id){let r=this.region(id);if(!r||id==='home')return 'This is our home shore.';if(this.explored(id))return 'We have already explored this area.';if(this.scoutFor(id))return 'A scout is already on the trail.';if(!this.has('hearth'))return 'Build the Founding Hearth before heading inland.';let missing=r.requires.filter(q=>!this.explored(q));if(missing.length)return 'First explore '+missing.map(q=>this.region(q).name).join(' and ')+'.';return '';}
 orderScout(id,pId=null){
  let reason=this.scoutReason(id);if(reason)return reason;
  let candidates=this.people.filter(p=>this.available(p)&&!p.task?.manual&&p.task?.kind!=='deliver'&&(!pId||p.id===pId));
  candidates.sort((a,b)=>Number(!!a.job)-Number(!!b.job)||dist(a,this.region(id))-dist(b,this.region(id)));
  const p=candidates[0],r=this.region(id);if(!p)return 'No adult is free. Let someone finish carrying supplies, or free a worker.';
  p.task=this.makeTask('scout',r,.18,{manual:true,region:id});p.route=[];p.targetKey=null;
  this.log(p.first+' is following a new trail','Destination: '+r.name+'. Work resumes after the expedition.','compass');this.dirty=true;return '';
 }
 cancelScout(id){let p=this.scoutFor(id);if(!p)return;p.task=null;p.route=[];this.log('Returning to the familiar shore',p.first+' has stopped exploring for now.','compass');}
 finishScout(p,t){
  if(this.explored(t.region))return;const r=this.region(t.region);this.s.world.explored.push(r.id);
  this.s.world.explorationLog.push({region:r.id,person:p.id,name:p.first,day:this.day});
  this.record(p,'Explored '+r.name+' and opened its trails to the community.');
  this.award('explore_'+r.id,p.first+' discovered '+r.name,2);
  this.log('Beyond the familiar shore',r.name+' is now open. Inspect its resources in Explore; supplies still need to be gathered and carried home.','compass');this.dirty=true;
 }
 gatherCache(p,t,dt){
  if(!this.travel(p,t,dt)){p.status='Walking to gather supplies';return;}
  p.status='Gathering island resources';t.done+=dt/.5*this.capacity(p);this.xp(p,'foraging',dt*.7);
  if(t.done<t.work)return;let n=this.s.world.nodes.find(n=>n.id===t.node),cargo={};
  if(n&&n.left>0){n.left--;cargo[n.resource]=n.amount;this.dirty=true;}
  const store=this.buildings.find(b=>b.type==='store'&&b.built);p.task=Object.keys(cargo).length?this.makeTask('deliver',store?this.workTarget(store):this.hearthPos(),0,{cargo}):null;p.route=[];
 }
''')
s=rep(s,"let r=landRatio(x,z);if(r>.91||r<0)","if(!this.knownAt(x,z))return 'Explore this area before building here.';let r=landRatio(x,z);if(r>.91||r<0)")
s=rep(s,"if(!n)return 'Nothing to investigate.';", "if(!n)return 'Nothing to investigate.';if(!this.knownAt(n.x,n.z))return 'Explore '+this.region(regionAt(n.x,n.z)).name+' before investigating this resource.';if(n.left===0)return 'These supplies have been gathered.';")
s=rep(s,"kind:n.kind==='discover'?'discover':'gatherNode'", "kind:n.kind==='discover'?'discover':n.kind==='cache'?'cache':'gatherNode'")
s=rep(s,'filter(t=>t.wood>0)', 'filter(t=>t.wood>0&&this.knownAt(t.x,t.z))')
s=rep(s,'while(open.length&&count++<2300)', 'while(open.length&&count++<10000)')
s=rep(s,'if(Math.abs(x)>24||Math.abs(z)>23||', 'if(Math.abs(x)>48||z< -64||z>24||')
s=rep(s,'if(!best)return[{x:end.x,z:end.z}];','if(!best)return [];')
s=rep(s,'let budget=dt*150;', 'let budget=dt*BALANCE.walkPerDay;')
s=rep(s,'return p.route.length===0;','return Math.hypot(p.x-target.x,p.z-target.z)<.18;')
s=rep(s,'findPath(start,end){const cell=.75,', '''findPath(start,end){
  if(!this.s.paths.length){let clear=true,n=Math.ceil(dist(start,end)/.45);for(let i=1;i<=n;i++){let k=i/n;if(!this.navValid(start.x+(end.x-start.x)*k,start.z+(end.z-start.z)*k)){clear=false;break;}}if(clear)return[{x:end.x,z:end.z}];}
  const cell=.75,''')
s=rep(s,'if(!p.task)p.task=this.chooseTask(p);', '''if(!p.task)p.task=this.chooseTask(p);
  if(p.task?.kind==='scout'){const t=p.task;if(!this.travel(p,t,dt)){p.status='Exploring the trail to '+this.region(t.region).name;return;}p.status='Surveying '+this.region(t.region).name;t.done+=dt/.5*this.capacity(p);this.xp(p,'foraging',dt);if(t.done>=t.work){this.finishScout(p,t);p.task=this.makeTask('return',this.hearthPos(),0,{manual:true});p.route=[];}return;}
  if(p.task?.kind==='return'){p.status='Returning from the expedition';if(this.travel(p,p.task,dt))p.task=null;return;}
  if(p.task?.kind==='cache'){this.gatherCache(p,p.task,dt);return;}''')
s=rep(s,'*this.s.speed/BALANCE.secondsPerDay','*this.s.speed/this.daySeconds')
s=rep(s,"data.version!==1", "![1,2].includes(data.version)")
s=rep(s,"for(let [k,v]of Object.entries(data.stock))", "if(!Array.isArray(data.world.trees)||!Array.isArray(data.world.nodes)||!Number.isFinite(data.time)||data.time<0||data.time>=1)throw Error('Invalid island data.');if(data.version===2&&(!Array.isArray(data.world.explored)||data.world.explored.some(id=>!REGIONS.some(r=>r.id===id))))throw Error('Invalid exploration data.');for(let [k,v]of Object.entries(data.stock))")
s=rep(s,'Explore the lookout and copper outcrop. Learn Shorecraft and practise on the water.','Send scouts through Greyback Ridge to Farwatch Headland. Discover copper and the lookout; learn Shorecraft.')
(game/'sim.js').write_text(s)
# Renderer.
s=before['world.js']
s=rep(s,"this.cx=clamp(this.cx,-20,20);this.cz=clamp(this.cz,-17,17);", "this.cx=clamp(this.cx,-35,35);this.cz=clamp(this.cz,-48,20);")
s=rep(s,'terrain(g,season){','terrain(g,season,sim){')
a=s.index('  // The ridge and outcrops leave');b=s.index('  let rng=rand(562);',a)
s=s[:a]+'''  // Subtle meadow and ridge clearings give the new land a distinct visual identity.
  for(const r of REGIONS.slice(1))if(sim.explored(r.id)){
   if(r.id==='meadow')g.disk(r.x,.552,r.z,6,5,season===3?'#d5decd':'#b1b77e',40);
   if(r.id==='ridge')g.disk(r.x,.552,r.z,5.5,4.5,season===3?'#c6d5cb':'#9fae8c',40);
  }
  // Landmarks are drawn at their saved positions, so old islands remain intact.
  for(const node of sim.s.world.nodes){
   if(!sim.knownAt(node.x,node.z))continue;
   const {x,z}=node;
   if(['stone','copper','lookout'].includes(node.id)){
    for(let i=0;i<5;i++)g.ball(x+(i%3)*.6-.6,.65,z+Math.floor(i/3)*.5, .65,node.id==='lookout'?1.2+i*.13:.55,.6,node.id==='copper'?'#b89573':'#a4b0a6',6,3);
   }
   if(node.id==='spring'){g.disk(x,.563,z,1.1,.85,'#6da9a6',24,1);g.disk(x,.57,z,.65,.55,'#99c9b9',24,1);for(let i=0;i<9;i++){let a=i/9*Math.PI*2;g.ball(x+Math.cos(a)*1.1,.59,z+Math.sin(a)*.85,.25,.22,.2,COL.stone,5,3);}}
   if(node.kind==='cache'&&node.left>0){
    if(node.resource==='stone'){for(let i=0;i<5;i++)g.ball(x+(i%3)*.4,.64,z+Math.floor(i/3)*.35,.3,.3,.35,COL.stone,5,3);}
    else for(let i=0;i<6;i++){let a=i*2.4;g.cone(x+Math.cos(a)*.65,.56,z+Math.sin(a)*.65,.14,node.resource==='fiber'?.9:.42,node.resource==='seeds'?'#d4bf7b':'#8fa671',5);if(node.resource==='fresh'||node.resource==='herbs')g.ball(x+Math.cos(a)*.65,1,z+Math.sin(a)*.65,.13,.1,.12,node.resource==='herbs'?'#c4a0ac':'#b97974',5,3);}
   }
  }
''' +s[b:]
s=rep(s,"for(let [x,z,r]of [[-30,-24,3],[30,-29,4],[38,3,1.8]])", "for(let [x,z,r]of [[-43,-32,3],[39,-42,4],[43,3,1.8]])")
s=rep(s,'this.terrain(g,sim.season);','this.terrain(g,sim.season,sim);')
s=rep(s,'for(let t of sim.s.world.trees)this.tree(g,t,sim.season,t.wood<=0&&t.regrow>0);','for(let t of sim.s.world.trees)if(sim.knownAt(t.x,t.z))this.tree(g,t,sim.season,t.wood<=0&&t.regrow>0);')
s=rep(s,'this.staticCount=g.v.length/11;', '''// Soft, layered mist marks unexplored terrain without revealing resource locations.
  for(const r of REGIONS.slice(1))if(!sim.explored(r.id)){
   const rng=rand(hash(r.id));for(let i=0;i<10;i++){let x=r.x+(rng()-.5)*10,z=r.z+(rng()-.5)*8;if(landRatio(x,z)>.9||regionAt(x,z)==='home')continue;for(let j=0;j<4;j++)g.disk(x,.72+i*.004+j*.001,z,4.8-j*.62,3.6-j*.45,[.82,.88,.82,.11],24,3);}
  }
  this.staticCount=g.v.length/11;''')
s=rep(s,"let day=.94+.06*Math.sin((sim.s.time-.25)*Math.PI*2);if(sim.night)day=.58;day=clamp(day,.50,1);", "let light=clamp((Math.sin((sim.s.time-.25)*Math.PI*2)+.20)/.70,0,1);light=light*light*(3-2*light);let day=.50+.50*light;")
(game/'world.js').write_text(s)
# UI and touch controls.
s=before['ui.js']
s=rep(s,"function safeLoad(){try{let raw=localStorage.getItem(SAVEKEY);return raw?TideSim.validate(JSON.parse(raw)):null;}","function safeLoad(){try{let raw=localStorage.getItem(SAVEKEY);if(!raw)return null;let data=TideSim.validate(JSON.parse(raw));if(data.version===1&&!localStorage.getItem(SAVEKEY+'.backup-v1'))localStorage.setItem(SAVEKEY+'.backup-v1',raw);return data;}")
s=rep(s,'A little island. A life together.','An island to discover. A life together.')
s=rep(s,'30 days in every season · Saved on this device','Slower days · Uncharted trails · Saved on this device')
s=rep(s,"function nodePanel(n){if(!n)return '<p>Nothing here yet.</p>';", "function nodePanel(n){if(!n)return '<p>Nothing here yet.</p>';if(!sim.knownAt(n.x,n.z))return regionPanel(regionAt(n.x,n.z));if(n.kind==='cache')return `<div class=\"card-art\">${ico(n.icon)}</div><p>${esc(n.desc)}</p><div class=\"note\">${n.left>0?`${n.amount} ${esc(GOODS[n.resource][0].toLowerCase())} per trip · ${n.left} trips remaining. Supplies arrive only when the gatherer returns home.`:'This patch is exhausted. There may be more supplies elsewhere on the island.'}</div><button class=\"primary\" data-act=\"investigate:${n.id}\" ${n.left<=0?'disabled':''}>Gather supplies ${ico('basket')}</button><button class=\"secondary\" data-act=\"focusnode:${n.id}\">Show on island</button>`;")
a=s.index('function settingsPanel(){');b=s.index('\nfunction renderPanel()',a)
s=s[:a]+'''function settingsPanel(){return `<p><strong>Tidefolk · Beyond the Familiar Shore</strong><br>Playable concept v0.2.0</p><label for="daypace">How long should a day feel?</label><select id="daypace" data-change="daypace">${[[360,'Gentle — 6 minutes'],[600,'Unhurried — 10 minutes'],[900,'Leisurely — 15 minutes']].map(([v,n])=>`<option value="${v}" ${sim.daySeconds===v?'selected':''}>${n}</option>`).join('')}</select><div class="note">At 1×, a full day lasts ${sim.daySeconds/60} real minutes. Use 2× or 4× when you choose. Dawn, daylight and dusk blend gradually. Seasons still last 30 days, and planning pauses the clock.</div><button class="primary" data-act="save">${ico('save')} Save our story</button><button class="secondary" data-act="export">Export save file</button><button class="secondary" data-act="import">Import a save file</button><button class="secondary" data-act="mainmenu">Main menu</button><button class="secondary danger" data-act="newconfirm">Start again</button><div class="section-title">A larger island</div><p>Explore five new areas beyond the home shore. A named adult walks the trail, surveys the land, and opens it to gathering and construction. Resources must still be carried home.</p><p class="smallprint">Existing 0.1 saves are upgraded without removing people or buildings. Exported saves now use version 2; older builds cannot read them. An original version-1 browser save is backed up locally before upgrading.</p><p class="smallprint">No offline decay or cloud save. Island Two remains a discovery endpoint. ${UI.storageOK?'Your story is saved in this browser. Keep an exported backup.':'Browser saving is unavailable: export your story before leaving.'}</p>`;}
function islandChart(){
 const pts=Array.from({length:90},(_,i)=>{let a=i/90*Math.PI*2;return `${100+Math.cos(a)*radiusAt(a)*2},${117+Math.sin(a)*radiusAt(a)*.82*2}`;}).join(' ');
 return `<div class="island-chart"><svg viewBox="0 0 200 151" role="img" aria-label="Island chart showing six regions from the southern home shore to the far northern headland"><polygon points="${pts}" fill="#e2d4b5" stroke="#f5eddb" stroke-width="3"/>${REGIONS.map(r=>{let known=sim.explored(r.id),x=100+r.x*2,y=117+r.z*2;return `<g data-act="region:${r.id}" style="cursor:pointer" role="button" aria-label="${r.name}"><circle cx="${x}" cy="${y}" r="${r.id==='home'?18:15}" fill="${known?r.color:'#c7d0c7'}" opacity=".8"/><text x="${x}" y="${y+3}" text-anchor="middle" font-size="8" fill="#405d55">${known?'✓':'?'}</text></g>`;}).join('')}<text x="100" y="13" text-anchor="middle" font-size="6" letter-spacing="2" fill="#567e7a">NORTH</text></svg><span>First Light Island · ${sim.s.world.explored.length} / ${REGIONS.length} areas explored</span></div>`;
}
function explorePanel(){return `<p>The beach is only the beginning. Choose an uncharted area to send a scout.</p>${islandChart()}<button class="secondary" data-act="overview">${ico('compass')} See the whole island</button><div class="region-list">${[...REGIONS.slice(1),REGIONS[0]].map(r=>{let known=sim.explored(r.id),scout=sim.scoutFor(r.id),ready=r.requires.every(id=>sim.explored(id));return `<button class="region-card" data-act="region:${r.id}"><span class="region-icon" style="background:${r.color}">${ico(known?r.icon:scout?'people':'compass')}</span><span><strong>${r.name}</strong><small>${known?'Explored · inspect resources':scout?`${esc(scout.first)} is on the trail`:ready?'Unexplored · send a scout':'Beyond the next trail'}</small></span><span>${ico(known?'check':'arrow')}</span></button>`;}).join('')}</div>`;}
function regionPanel(id){let r=sim.region(id);if(!r)return '<p>No such trail.</p>';let known=sim.explored(id),scout=sim.scoutFor(id),reason=sim.scoutReason(id);let nodes=sim.s.world.nodes.filter(n=>regionAt(n.x,n.z)===id);let who=sim.s.world.explorationLog?.find(q=>q.region===id);return `<div class="card-art">${ico(r.icon)}</div><p>${esc(r.hint)}</p>${known?`<div class="note">${who?`${esc(who.name)} opened this trail on Day ${who.day}.`:'This is the shore where our story began.'} You can gather supplies and place buildings here.</div><button class="primary" data-act="focusregion:${id}">Visit ${r.name} ${ico('compass')}</button><div class="section-title">Resources & landmarks</div>${nodes.map(n=>`<button class="region-card" data-act="node:${n.id}"><span>${ico(n.icon)}</span><span><strong>${esc(n.name)}</strong><small>${n.kind==='cache'?`${n.left} gathering trips left`:n.found?'Discovered':'Inspect this place'}</small></span>${ico('arrow')}</button>`).join('')}<p class="smallprint">${sim.s.world.trees.filter(t=>t.wood>0&&regionAt(t.x,t.z)===id).length} mature trees in this area.</p>`:scout?`<div class="note">${esc(scout.first)}: ${esc(scout.status)}. Scouts rest at night and resume the trail in the morning.</div><button class="primary" data-act="watchscout:${id}">Follow ${esc(scout.first)}</button><button class="secondary" data-act="cancelscout:${id}">Recall scout</button>`:`<div class="note">A scout must walk here and survey the area before its resources are revealed. This does not spend materials or grant instant supplies.</div><button class="primary" data-act="scout:${id}" ${reason?'disabled':''}>Explore this area ${ico('compass')}</button>${reason?`<p class="smallprint">${esc(reason)}</p>`:''}`}<button class="secondary" data-act="explore">All island areas</button>`;}
''' +s[b:]
s=rep(s,"if(kind==='goals'){", "if(kind==='explore'){title='Beyond the familiar shore';body=explorePanel();kicker='Explore First Light Island';}if(kind==='region'){title=sim.region(id)?.name||'The island';body=regionPanel(id);kicker='One island, many discoveries';}\n if(kind==='goals'){")
s=rep(s,"$('#clock').textContent=s.time<.26?'Dawn':s.time<.5?'Morning':s.time<.76?'Afternoon':'Evening';", "let hour=Math.floor(s.time*24),minute=Math.floor(s.time*1440)%60,clock=String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0'),phase=s.time<.23?'Night':s.time<.30?'Dawn':s.time<.50?'Morning':s.time<.72?'Afternoon':s.time<.86?'Dusk':'Night';$('#clock').textContent=clock;$('#year').textContent='Year '+sim.year+' · '+clock+' · '+(s.paused?'Paused':phase);$('#calendar').style.setProperty('--day-progress',s.time);$('#speedbar').title='Full day: '+sim.daySeconds/60+' minutes at 1×';")
a=s.index('function paintMarkers(){let nodes=');b=s.index("let str='';",a)
s=s[:a]+"function paintMarkers(){let nodes=sim.s.world.nodes.filter(n=>sim.knownAt(n.x,n.z)&&!n.found&&(n.kind==='cache'?n.left>0:n.id==='wreck'?n.left>0:['spring','seeds','fishing'].includes(n.id)||sim.day>5));"+s[b:]
s=rep(s,"stableMarkers(str);", '''for(const r of REGIONS.slice(1))if(!sim.explored(r.id)&&r.requires.every(id=>sim.explored(id))){let p=view.project(r.x,2.4,r.z);if(p.x>28&&p.x<view.w-28&&p.y>170&&p.y<view.h-175)str+=`<button class="marker trail" style="left:${p.x}px;top:${p.y}px" data-act="region:${r.id}" aria-label="Explore ${r.name}">${ico('compass')}<small>${r.name}</small></button>`;}
 stableMarkers(str);''')
s=rep(s,'t.s.world.nodes.forEach(n=>n.found=true);',"t.s.world.nodes.forEach(n=>n.found=true);t.s.world.explored=REGIONS.map(r=>r.id);")
s=rep(s,"if(a==='begin'){", '''if(a==='explore'){openPanel('explore');return;}
 if(a==='region'){openPanel('region',id);return;}
 if(a==='scout'){let msg=sim.orderScout(id);if(msg){error(msg);renderPanel();}else{closePanel();sim.s.paused=false;save();}return;}
 if(a==='cancelscout'){sim.cancelScout(id);renderPanel();save();return;}
 if(a==='watchscout'){let p=sim.scoutFor(id);if(p){view.cx=p.x;view.cz=p.z;view.zoom=1.6;UI.selected={kind:'person',id:p.id};closePanel();}return;}
 if(a==='focusregion'||a==='focusnode'){let r=a==='focusregion'?sim.region(id):sim.s.world.nodes.find(n=>n.id===id);if(r){view.cx=r.x;view.cz=r.z;view.zoom=1.15;view.camera();closePanel();}return;}
 if(a==='overview'){view.cx=0;view.cz=-14;view.zoom=.58;view.camera();closePanel();return;}
 if(a==='begin'){''')
s=s.replace(',.65,3.5)',',.38,3.5)')
s=rep(s,"if(a==='job')error", "if(a==='daypace'){let seconds=Number(v);if(BALANCE.dayLengths.includes(seconds))sim.s.settings.daySeconds=seconds;}\n if(a==='job')error")
s=rep(s,"if(landRatio(p.x,p.z)<.88)stroke.push(p);", "if(landRatio(p.x,p.z)<.88&&sim.knownAt(p.x,p.z))stroke.push(p);")
s=rep(s,"if(landRatio(p.x,p.z)<.89&&", "if(landRatio(p.x,p.z)<.89&&sim.knownAt(p.x,p.z)&&")
s=rep(s,"version:'0.1.1'", "version:'0.2.0'")
(game/'ui.js').write_text(s)
s=before['index.html']
s=rep(s,'data-act="speed:4">4×</button><button class="speed" data-act="speed:12">12×','data-act="speed:2">2×</button><button class="speed" data-act="speed:4">4×')
s=rep(s,'data-act="supplies"><span data-icon="basket"></span><span>Supplies</span>', 'data-act="explore"><span data-icon="compass"></span><span>Explore</span>')
(game/'index.html').write_text(s)
s=before['style.css']+'''
/* v0.2.0 — calm day pacing and an explorable first island. */
#calendar{overflow:hidden}#calendar:after{content:'';position:absolute;left:0;bottom:0;height:3px;width:100%;background:#b6b983;transform-origin:left;transform:scaleX(var(--day-progress,0));transition:transform .35s linear}
.region-list{margin-top:18px}.region-card{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:13px 8px;border-bottom:1px solid #deded0;min-height:65px}.region-card>span:nth-child(2){flex:1;min-width:0}.region-card strong{display:block;font-size:12px}.region-card small{display:block;font-size:10px;line-height:1.45;color:#7b8879;margin-top:4px}.region-card>.ico{width:17px}.region-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:12px;flex-shrink:0}.region-icon svg{width:21px}.island-chart{border:1px solid #aec4b9;background:#abd0c8;border-radius:18px;overflow:hidden;margin:16px 0}.island-chart svg{display:block;width:100%;max-height:225px}.island-chart>span{display:block;padding:10px;text-align:center;background:#f1efe2;font-size:10px;color:#63766a}.marker.trail{width:38px;height:38px;color:#4d7368;border:2px solid #f5e6bd}.marker.trail small{position:absolute;top:40px;padding:4px 7px;border-radius:7px;background:#f5efdd;white-space:nowrap;font-size:10px;color:#48655b;box-shadow:0 2px 8px #304f3822}
@media(max-width:600px){#toast.show~#demoBadge{transform:translateX(-50%) translateY(62px)}#year{font-size:9px}.region-card{min-height:65px}.region-card strong{font-size:13px}.region-card small{font-size:11px}.island-chart svg{max-height:115px}.island-chart{margin:10px 0}.region-list{margin-top:9px}#calendar{max-width:calc(100% - 134px)}.calendar-main{font-size:11px}.welcome .subtitle{font-size:15px}}
'''
(game/'style.css').write_text(s)
TARGET={'index.html':'8846ffa63e71c26437edb8d66edd96cf2bf6afb6dfc6ec45c4909a384bdd20fd','style.css':'a83eb0411df5043865b6e4b88580e66b12da0fb4145272b77766edea3ca6894a','data.js':'ad4b4f835818ec213a8b22790488994b24281d812c81a7389c6bbb4bfc0278fd','sim.js':'99f6cf1d3f984651a2b1a738530586f55f2dcdc7e559dde28ce6ffe0b92d4bb5','world.js':'25f8a9478085c1226fec5c7a66eda28f74499493d3afc4b8fd3bfadc075e88cb','ui.js':'b44431346cbbb77b7b05aedb9e6f4165116cb37546fb405697806cb3d7f3e637'}
for name,digest in TARGET.items():
 assert hashlib.sha256((game/name).read_bytes()).hexdigest()==digest,'Prepared bytes differ from tested source: '+name
print('Prepared exact locally tested Tidefolk 0.2.0. Browser and simulation gates must pass before publication.')
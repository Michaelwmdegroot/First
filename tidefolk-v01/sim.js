'use strict';
class TideSim {
 constructor(saved=null){
  this.dirty=true; this.revision=0; this.acc=0; this.onEvent=()=>{}; this.pathCache=null;
  if(saved){this.s=saved;this.s.version=2;this.s.paused=true;this.s.speed=1;this.s.settings=this.s.settings||{};if(!BALANCE.dayLengths.includes(this.s.settings.daySeconds))this.s.settings.daySeconds=BALANCE.secondsPerDay;expandIsland(this.s.world);this.s.people.forEach(p=>{p.route=[];p.targetKey=null;});return;}
  const stock={};Object.keys(GOODS).forEach(k=>stock[k]=0);stock.food=BALANCE.initialRations;stock.tools=2;
  this.s={version:2,seed:8222026,day:1,time:.28,speed:1,paused:true,started:false,stock,
    people:[],buildings:[],paths:[],world:makeWorld(),nextId:1,insight:0,pendingInsight:0,
    known:[],pendingDiscoveries:[],flags:{},awards:{},logs:[],freshBatches:[],pendingArrival:null,
    lastArrival:0,councilCount:0,councilNotice:false,boat:{stage:'none',progress:0,crew:[],name:'The Hope'},
    policies:{wood:35,fresh:20,food:80},stats:{produced:{},consumed:{},yesterday:{},dayProduced:{},dayUsed:{}},
    settings:{sound:false,quality:'auto',daySeconds:BALANCE.secondsPerDay},demo:false};
  [['Tomas','Vale','m',28,'#be7858','Tool roll'],['Mara','Reed','f',26,'#dfa55a','Cooking pot'],['Elias','Finch','m',31,'#587e86','Hand axe'],['Lena','Moss','f',25,'#838f60','Utility knife']].forEach((a,i)=>this.addPerson(...a,-1+i*.7,7));
  this.log('The first shore','Four people, one island, and a chance to begin again.','compass');
 }
 get day(){return this.s.day;}
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
 get season(){return Math.floor((this.s.day-1)/30)%4;}
 get year(){return Math.floor((this.s.day-1)/120)+1;}
 get seasonDay(){return (this.s.day-1)%30+1;}
 get night(){return this.s.time>=.76||this.s.time<.23;}
 get people(){return this.s.people;} get buildings(){return this.s.buildings;}
 get food(){return this.s.stock.food+this.s.stock.fresh;}
 get adults(){return this.people.filter(p=>this.age(p)>=18);}
 get stage(){if(this.s.boat.stage==='arrived')return 'Seafaring village';if(this.has('workshop')&&this.s.flags.winter&&this.has('house'))return 'Village';if(this.has('house')&&this.has('store')&&this.people.length>=5)return 'Settlement';if(this.has('shelter')&&this.has('woodpost')&&this.has('hunt'))return 'Camp';return 'Castaways';}
 age(p){return (this.s.day-p.birthDay)/120;}
 life(p){let a=this.age(p);return a<3?'Baby':a<12?'Child':a<18?'Teen':a<60?'Adult':'Elder';}
 skill(p,k){return Math.min(10,Math.sqrt(p.skills[k]||0)*1.65);}
 rank(p,k){let n=this.skill(p,k);return n<1?'Untrained':n<3?'Novice':n<5?'Practised':n<7?'Skilled':n<9?'Expert':'Master';}
 xp(p,k,n){p.skills[k]=(p.skills[k]||0)+n;}
 addPerson(first,last,sex,age,color,item,x=0,z=7){let p={id:'p'+this.s.nextId++,first,last,sex,birthDay:this.s.day-age*120,color,item,skin:['#ddb993','#c89973','#a87454','#e3bfa1'][this.people.length%4],
   x,z,home:null,job:null,profession:'Castaway',skills:{},well:90,status:'Taking in the island',task:null,route:[],friend:0,partner:null,married:false,pregnantUntil:null,recoveryUntil:0,careUntil:0,parents:[],history:[{day:this.s.day,text:'Arrived on the first shore.'}]};
  this.people.push(p);this.dirty=true;return p;}
 has(type){return this.buildings.some(b=>b.type===type&&b.built);}
 getB(id){return this.buildings.find(b=>b.id===id);}
 learned(t){return !t||this.s.known.includes(t);}
 stockCap(){return 60+this.buildings.filter(b=>b.type==='store'&&b.built).reduce((n,b)=>n+(b.up?300:180),0);}
 usedStorage(){return Object.entries(this.s.stock).filter(([k])=>!['water','seeds'].includes(k)).reduce((n,[k,v])=>n+v,0);}
 canPay(cost){return Object.entries(cost).every(([k,v])=>this.s.stock[k]+1e-6>=v);}
 missing(cost){return Object.entries(cost).filter(([k,v])=>this.s.stock[k]+1e-6<v).map(([k,v])=>`${Math.ceil(v-this.s.stock[k])} ${GOODS[k][0]}`).join(', ');}
 pay(cost){if(!this.canPay(cost))return false;for(let[k,v]of Object.entries(cost)){this.s.stock[k]=Math.max(0,this.s.stock[k]-v);this.s.stats.dayUsed[k]=(this.s.stats.dayUsed[k]||0)+v;if(k==='fresh')this.consumeFresh(v);}return true;}
 add(k,n){if(n<=0)return;if(k==='fresh')this.s.freshBatches.push({n,until:this.s.day+(this.has('store')?9:6)});this.s.stock[k]=(this.s.stock[k]||0)+n;this.s.stats.produced[k]=(this.s.stats.produced[k]||0)+n;this.s.stats.dayProduced[k]=(this.s.stats.dayProduced[k]||0)+n;}
 consumeFresh(n){let left=n;for(let b of this.s.freshBatches){let a=Math.min(b.n,left);b.n-=a;left-=a;if(left<=0)break;}this.s.freshBatches=this.s.freshBatches.filter(b=>b.n>1e-5);}
 eat(n){let f=Math.min(this.s.stock.fresh,n);this.s.stock.fresh-=f;this.consumeFresh(f);let r=Math.min(this.s.stock.food,n-f);this.s.stock.food-=r;this.s.stats.dayUsed.fresh=(this.s.stats.dayUsed.fresh||0)+f;this.s.stats.dayUsed.food=(this.s.stats.dayUsed.food||0)+r;return f+r;}
 log(title,text,icon='leaf'){this.s.logs.unshift({day:this.day,time:this.s.time,title,text,icon});if(this.s.logs.length>200)this.s.logs.pop();this.onEvent({title,text,icon});}
 award(id,title,points=1){if(this.s.awards[id])return;this.s.awards[id]=true;this.s.flags[id]=true;this.s.pendingInsight+=points;this.log(title,`${points} insight to share at the Hearth.`, 'spark');this.dirty=true;}
 record(p,text){p.history.unshift({day:this.day,text});if(p.history.length>60)p.history.pop();}
 homePos(p){let b=this.getB(p.home);if(b&&b.built)return{x:b.x,z:b.z+BUILD[b.type].size+0.3};let h=this.buildings.find(b=>b.type==='shelter'&&b.built);return h?{x:h.x,z:h.z+1.7}:{x:0,z:7};}
 hearthPos(){let h=this.buildings.find(b=>b.type==='hearth'&&b.built);return h?{x:h.x,z:h.z}:{x:0,z:6.5};}
 beds(b){return b.type==='house'&&b.up?5:BUILD[b.type].beds||0;}
 occupancy(b){return this.people.filter(p=>p.home===b.id);}
 reservedBeds(b){return this.occupancy(b).filter(p=>p.pregnantUntil).length;}
 freeBeds(b){return this.beds(b)-this.occupancy(b).length-this.reservedBeds(b);}
 available(p){return this.age(p)>=18&&!p.pregnantUntil&&p.recoveryUntil<=this.day&&!this.s.boat.crew.includes(p.id);}
 capacity(p){if(!this.available(p))return 0;let v=p.careUntil>this.day?.65:1;if(this.age(p)>=60)v*=.8;return v*clamp(p.well/85,.55,1)*(this.has('water')?1:.9);}
 assign(pId,bId){const p=this.people.find(p=>p.id===pId);if(!p)return 'Person not found.';if(!this.available(p))return 'This person is not available for work.';
  if(bId&&bId!=='builder'){let b=this.getB(bId);if(!b||!b.built||!BUILD[b.type].skill)return 'Choose a completed workplace.';const old=this.people.find(q=>q.id!==pId&&q.job===bId);if(old){old.job=null;if(old.task?.kind!=='deliver'){old.task=null;old.route=[];}} }
  p.job=bId||null;if(p.task?.kind!=='deliver'){p.task=null;p.route=[];}this.dirty=true;return '';
 }
 setHome(pId,bId){let p=this.people.find(q=>q.id===pId),b=this.getB(bId);if(!p||!b||!b.built||!this.beds(b))return 'Choose a completed home.';if(this.freeBeds(b)<(p.pregnantUntil?2:1)&&p.home!==bId)return 'There are no free beds.';if(p.pregnantUntil&&b.type!=='house')return 'An expecting household needs a permanent home.';p.home=bId;p.task=null;this.record(p,'Moved into '+this.buildingName(b)+'.');return '';}
 buildingName(b){return b.up&&BUILD[b.type].up?BUILD[b.type].up.name:BUILD[b.type].name;}
 placement(type,x,z,ignoreId=null){let d=BUILD[type];if(!d)return 'Unknown building.';if(!this.learned(d.tech))return 'Learn '+TECH[d.tech].name+' at the Hearth first.';
  if(d.unique&&this.buildings.some(b=>b.type===type&&b.id!==ignoreId))return 'The community already has one.';if(!this.knownAt(x,z))return 'Explore this area before building here.';let r=landRatio(x,z);if(r>.91||r<0)return 'Choose dry, buildable ground.';if(d.coast&&r<.62)return 'This building needs to be close to the shore.';
  if(this.buildings.some(b=>b.id!==ignoreId&&Math.hypot(x-b.x,z-b.z)<d.size+BUILD[b.type].size+.3))return 'Leave a little space between buildings.';
  if(this.s.world.nodes.some(n=>['spring','stone','copper','lookout'].includes(n.id)&&Math.hypot(x-n.x,z-n.z)<d.size+1))return 'Leave this landmark accessible.';
  return '';
 }
 orderBuild(type,x,z,rot=0){let err=this.placement(type,x,z);if(err)return {error:err};let d=BUILD[type];if(!this.canPay(d.cost))return{error:'Need '+this.missing(d.cost)};this.pay(d.cost);
  let b={id:'b'+this.s.nextId++,type,x,z,rot,built:false,progress:0,up:false,growth:0,tended:0,recipe:type==='forge'?'fittings':type==='smoker'?'preserve':'planks',mode:'stone',family:false,paused:false};this.buildings.push(b);
  this.s.world.trees.forEach(t=>{if(Math.hypot(t.x-x,t.z-z)<d.size+.35){t.wood=0;t.regrow=0;}});this.pathCache=null;this.dirty=true;this.log('A place for '+d.name.toLowerCase(),'The materials are reserved. Free villagers will build it.','tools');return {building:b};
 }
 moveBuilding(id,x,z,rot){let b=this.getB(id);if(!b)return 'Building not found.';let reason=this.placement(b.type,x,z,id);if(reason)return reason;b.x=x;b.z=z;b.rot=rot;for(let p of this.people){p.route=[];p.targetKey=null;if(p.task?.b===id&&p.task.kind!=='deliver')p.task=null;}for(let t of this.s.world.trees)if(dist(t,b)<BUILD[b.type].size+.35){t.wood=0;t.regrow=0;}this.pathCache=null;this.dirty=true;return '';}
 cancelBuild(id){let b=this.getB(id);if(!b||b.built)return false;for(let[k,v]of Object.entries(BUILD[b.type].cost))this.add(k,v);this.s.buildings=this.buildings.filter(q=>q.id!==id);this.people.forEach(p=>{if(p.task?.b===id){p.task=null;p.route=[];}});this.pathCache=null;this.dirty=true;return true;}
 upgrade(id){let b=this.getB(id),u=b&&BUILD[b.type].up;if(!u||b.up)return 'There is no further first-island upgrade.';if(!this.learned(u.tech))return 'Learn '+TECH[u.tech].name+' first.';if(!this.canPay(u.cost))return 'Need '+this.missing(u.cost);if(u.cost.fittings&&this.s.boat.stage==='none'&&this.s.stock.fittings+(this.s.stock.ore+(this.s.oreLeft??40))/2-u.cost.fittings<6)return 'Keep six fittings available for the first vessel.';this.pay(u.cost);b.up=true;if(b.type==='woodpost')for(let t of this.s.world.trees)if(t.wood<=0&&!t.regrow&&dist(t,b)<8&&!this.buildings.some(q=>dist(q,t)<BUILD[q.type].size+.4))t.regrow=this.day+90;this.dirty=true;this.log(u.name,'The community can do a little more now.','spark');return '';}
 researchReason(id){let t=TECH[id];if(!t)return 'Unknown idea.';if(this.learned(id))return 'Already learned.';let missing=t.req.filter(r=>!this.learned(r));if(missing.length)return 'First learn '+missing.map(r=>TECH[r].name).join(' and ')+'.';if(t.event&&!this.s.flags[t.event])return 'First discover: '+t.event.replaceAll('_',' ')+'.';if(!this.has('hearth'))return 'Build the Hearth first.';if(!this.night)return 'Share this idea at the Hearth tonight.';if(this.s.insight<t.cost)return `Need ${t.cost-this.s.insight} more insight.`;return '';}
 research(id){let err=this.researchReason(id);if(err)return err;this.s.insight-=TECH[id].cost;this.s.known.push(id);this.log('We learned '+TECH[id].name.toLowerCase(),TECH[id].desc,'spark');this.dirty=true;return '';}
 orderNode(id,pId=null){let n=this.s.world.nodes.find(n=>n.id===id);if(!n)return 'Nothing to investigate.';if(!this.knownAt(n.x,n.z))return 'Explore '+this.region(regionAt(n.x,n.z)).name+' before investigating this resource.';if(n.left===0)return 'These supplies have been gathered.';if(n.kind==='discover'&&n.found)return 'This place is already known.';if(this.people.some(p=>p.task?.manual&&p.task.node===id))return 'Someone is already heading there.';let candidates=this.people.filter(p=>this.available(p)&&!p.task?.manual&&p.task?.kind!=='deliver'&&(!pId||p.id===pId));candidates.sort((a,b)=>Number(!!a.job)-Number(!!b.job)||dist(a,n)-dist(b,n));let p=candidates[0];if(!p)return 'No one is free to go right now.';
  p.task={kind:n.kind==='discover'?'discover':n.kind==='cache'?'cache':'gatherNode',node:id,x:n.x,z:n.z,work:n.kind==='discover'?.20:.16,done:0,manual:true};p.route=[];p.status='Heading to '+n.name.toLowerCase();this.dirty=true;return '';}
 nearestTree(p){return this.s.world.trees.filter(t=>t.wood>0&&this.knownAt(t.x,t.z)).sort((a,b)=>dist(a,p)-dist(b,p))[0];}
 workTarget(b){return{x:b.x,z:b.z+BUILD[b.type].size+.22};}
 makeTask(kind,target,work,extra={}){return{kind,x:target.x,z:target.z,work,done:0,...extra};}
 chooseTask(p){
  if(p.task?.manual)return p.task;
  if(this.food<this.adults.length*1.4&&this.s.flags.first_hearth&&p.job!==this.buildings.find(b=>b.type==='hunt')?.id&&p.job!==this.buildings.find(b=>b.type==='fish')?.id)return this.makeTask('forage',{x:-6,z:2},.5);
  let b=this.getB(p.job);
  if(b&&b.built&&!b.paused){let at=this.workTarget(b),kind=b.type;
   if(kind==='woodpost'&&this.s.stock.wood<this.s.policies.wood){let t=this.nearestTree(p);if(t)return this.makeTask('wood',t,.85,{tree:t.id,b:b.id});}
   if(kind==='hunt'&&this.s.stock.fresh<this.s.policies.fresh)return this.makeTask('hunt',{x:b.x+.7,z:b.z+1.1},1,{b:b.id});
   if(kind==='fish'&&this.s.stock.fresh<this.s.policies.fresh)return this.makeTask('fish',at,1,{b:b.id});
   if(kind==='field'&&this.season!==3){if(b.growth>=14)return this.makeTask('harvest',at,.30,{b:b.id});if(b.tended<this.day)return this.makeTask('tend',at,.10,{b:b.id});}
   if(kind==='water'&&this.s.stock.water<(b.up?40:14))return this.makeTask('water',this.s.world.nodes.find(n=>n.id==='spring'),.45,{b:b.id});
   if(kind==='quarry'){if(b.mode==='copper'&&this.learned('copperwork')&&(this.s.oreLeft??40)>0)return this.makeTask('copper',this.s.world.nodes.find(n=>n.id==='copper'),.75,{b:b.id});if(b.mode!=='copper'&&this.s.stock.stone<50)return this.makeTask('stone',this.s.world.nodes.find(n=>n.id==='stone'),.75,{b:b.id});}
   if(['workshop','forge','smoker'].includes(kind)){let r=RECIPES[b.recipe];if(r&&!(b.recipe==='tools'&&this.s.boat.stage==='none'&&this.s.stock.fittings<8)&&this.canPay(r.cost)&&this.usedStorage()<this.stockCap()-5&&!(kind==='smoker'&&this.s.stock.food>=this.s.policies.food))return this.makeTask('craft',at,r.work,{b:b.id,recipe:b.recipe});}
   if(kind==='boatyard'&&this.s.boat.stage==='building')return this.makeTask('boat',at,.4,{b:b.id});
   if(kind==='healer'){let q=this.people.find(q=>q.well<75);if(q&&this.s.stock.herbs>=1)return this.makeTask('heal',at,.5,{b:b.id,patient:q.id});}
   if(kind==='school')return this.makeTask('teach',at,.5,{b:b.id});
  }
  if(!b||p.job==='builder'||b.type==='field'||b.type==='water'||['woodpost','quarry','workshop','smoker','forge','healer'].includes(b.type)){
   let sites=this.buildings.filter(q=>!q.built);if(sites.length){let site=sites.sort((a,b)=>dist(a,p)-dist(b,p))[0];return this.makeTask('build',this.workTarget(site),.15,{b:site.id});}
   if(this.s.stock.fresh<this.s.policies.fresh*.55)return this.makeTask('forage',{x:-6,z:2},.5);
   if(this.s.stock.wood<12){let t=this.nearestTree(p);if(t)return this.makeTask('wood',t,.85,{tree:t.id});return this.makeTask('branches',{x:4,z:9},.8);}
   if(this.s.stock.fiber<12)return this.makeTask('fiber',this.s.world.nodes.find(n=>n.id==='reeds'),.7);
   if(this.has('water')&&this.s.stock.water<this.people.length*1.5)return this.makeTask('water',this.s.world.nodes.find(n=>n.id==='spring'),.45);
  }
  return null;
 }
 navValid(x,z){if(landRatio(x,z)>.99)return false;for(let b of this.buildings){if(['field','bench','lamp','hearth'].includes(b.type))continue;let r=BUILD[b.type].size*.78;if(Math.abs(x-b.x)<r&&Math.abs(z-b.z)<r)return false;}return true;}
 findPath(start,end){
  if(!this.s.paths.length){let clear=true,n=Math.ceil(dist(start,end)/.45);for(let i=1;i<=n;i++){let k=i/n;if(!this.navValid(start.x+(end.x-start.x)*k,start.z+(end.z-start.z)*k)){clear=false;break;}}if(clear)return[{x:end.x,z:end.z}];}
  const cell=.75,key=(x,z)=>x+','+z;let sx=Math.round(start.x/cell),sz=Math.round(start.z/cell),ex=Math.round(end.x/cell),ez=Math.round(end.z/cell);
  // A small eight-connected grid keeps people out of houses; paths reduce travel cost.
  let open=[{x:sx,z:sz,g:0,f:0}],seen=new Map(),closed=new Set();seen.set(key(sx,sz),open[0]);let best=null,count=0;
  while(open.length&&count++<10000){open.sort((a,b)=>a.f-b.f);let a=open.shift(),k=key(a.x,a.z);if(closed.has(k))continue;closed.add(k);if(Math.hypot(a.x-ex,a.z-ez)<=1){best=a;break;}
   for(let [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){let x=a.x+dx,z=a.z+dz,nk=key(x,z);if(Math.abs(x)>48||z< -64||z>24||closed.has(nk)||!this.navValid(x*cell,z*cell))continue;if(dx&&dz&&(!this.navValid((a.x+dx)*cell,a.z*cell)||!this.navValid(a.x*cell,(a.z+dz)*cell)))continue;
    let onPath=this.s.paths.some(path=>path.some(p=>Math.hypot(p.x-x*cell,p.z-z*cell)<.65));let g=a.g+Math.hypot(dx,dz)*(onPath?.78:1),old=seen.get(nk);if(old&&old.g<=g)continue;let n={x,z,g,f:g+Math.hypot(x-ex,z-ez)*.75,prev:a};seen.set(nk,n);open.push(n);}
  }
  if(!best)return [];let route=[{x:end.x,z:end.z}];while(best.prev){route.push({x:best.x*cell,z:best.z*cell});best=best.prev;}route.reverse();return route;
 }
 travel(p,target,dt){if(Math.hypot(p.x-target.x,p.z-target.z)<.18){p.route=[];return true;}
  if(!p.route?.length||p.targetKey!==`${target.x.toFixed(1)},${target.z.toFixed(1)}`){p.route=this.findPath(p,target);p.targetKey=`${target.x.toFixed(1)},${target.z.toFixed(1)}`;}
  let budget=dt*BALANCE.walkPerDay;while(p.route.length&&budget>0){let n=p.route[0],dx=n.x-p.x,dz=n.z-p.z,d=Math.hypot(dx,dz);if(d<=budget){p.x=n.x;p.z=n.z;p.route.shift();budget-=d;}else{p.x+=dx/d*budget;p.z+=dz/d*budget;budget=0;}p.facing=Math.atan2(dx,dz);}
  return Math.hypot(p.x-target.x,p.z-target.z)<.18;
 }
 tickPerson(p,dt){
  if(this.s.boat.crew.includes(p.id)&&['sailing','arrived'].includes(this.s.boat.stage)){p.status='On the first voyage';return;}
  let stage=this.life(p),home=this.homePos(p),h=this.hearthPos();
  if(p.task?.kind==='deliver'&&this.s.time>=.23&&this.s.time<=.9){p.status='Carrying supplies home';if(this.travel(p,p.task,dt)){for(let[k,v]of Object.entries(p.task.cargo))this.add(k,v);p.task=null;this.dirty=true;}return;}
  if(stage==='Baby'){p.status='At home with family';this.travel(p,home,dt);return;}
  if(this.s.time<.23||this.s.time>.9){p.status='Sleeping';this.travel(p,home,dt);return;}
  if(this.s.time>.76){p.status='Sharing the evening';let angle=hash(p.id)%628/100;this.travel(p,{x:h.x+Math.cos(angle)*1.8,z:h.z+Math.sin(angle)*1.8},dt);return;}
  if(!this.available(p)){p.status=p.pregnantUntil?'Expecting a child':p.recoveryUntil>this.day?'Resting and recovering':stage==='Child'?'Learning and playing':'Learning';let school=this.buildings.find(b=>b.type==='school'&&b.built);this.travel(p,stage==='Child'&&school?this.workTarget(school):{x:h.x+1.7,z:h.z+1.8},dt);return;}
  if(this.s.time<.26){p.status='Breakfast';this.travel(p,h,dt);return;}
  if(!p.task)p.task=this.chooseTask(p);
  if(p.task?.kind==='scout'){const t=p.task;if(!this.travel(p,t,dt)){p.status='Exploring the trail to '+this.region(t.region).name;return;}p.status='Surveying '+this.region(t.region).name;t.done+=dt/.5*this.capacity(p);this.xp(p,'foraging',dt);if(t.done>=t.work){this.finishScout(p,t);p.task=this.makeTask('return',this.hearthPos(),0,{manual:true});p.route=[];}return;}
  if(p.task?.kind==='return'){p.status='Returning from the expedition';if(this.travel(p,p.task,dt))p.task=null;return;}
  if(p.task?.kind==='cache'){this.gatherCache(p,p.task,dt);return;}
  let t=p.task;if(!t){p.status=this.getB(p.job)&&['workshop','forge','smoker'].includes(this.getB(p.job).type)?(this.usedStorage()>=this.stockCap()-5?'Storage is full':'Waiting for recipe materials'):'Taking a little time';let a=(hash(p.id)%600)/100;this.travel(p,{x:h.x+Math.cos(a)*2,z:h.z+Math.sin(a)*2},dt);return;}
  if(!this.travel(p,t,dt)){p.status=t.kind==='deliver'?'Carrying supplies home':'Walking to '+(t.manual?'explore':t.kind==='build'?'the building site':'work');return;}
  if(t.kind==='deliver'){for(let[k,v]of Object.entries(t.cargo))this.add(k,v);p.task=null;this.dirty=true;return;}
  p.status={wood:'Gathering timber',hunt:'Tracking wildlife',fish:'Fishing the cove',forage:'Foraging',fiber:'Gathering thatch',build:'Building together',discover:'Exploring',gatherNode:'Recovering the wreck',tend:'Tending the field',harvest:'Gathering the harvest',craft:'Working at the bench',water:'Filling water containers',stone:'Quarrying stone',copper:'Mining copper',heal:'Caring for neighbours',teach:'Sharing knowledge',boat:'Building the vessel',branches:'Gathering driftwood'}[t.kind]||'Working';
  let skill={wood:'woodworking',hunt:'hunting',fish:'fishing',forage:'foraging',fiber:'foraging',build:'construction',discover:'foraging',gatherNode:'scavenging',tend:'farming',harvest:'farming',water:'foraging',stone:'mining',copper:'mining',heal:'medicine',teach:'teaching',boat:'carpentry',branches:'woodworking'}[t.kind]||BUILD[this.getB(t.b)?.type]?.skill||'carpentry';
  let work=dt/.5*this.capacity(p)*(1+this.skill(p,skill)*.035);if(this.season===3&&['build','wood','stone'].includes(t.kind))work*=.8;if(this.getB(t.b)?.up&&this.getB(t.b)?.type==='workshop')work*=1.15;
  this.xp(p,skill,work*BALANCE.skillXP);t.done+=work;if(t.done+1e-6<t.work)return;
  let cargo={},b=this.getB(t.b);
  if(t.kind==='wood'){let tree=this.s.world.trees.find(q=>q.id===t.tree);if(tree){let n=Math.min(tree.wood,5);tree.wood-=n;cargo.wood=n;if(tree.wood<=0){tree.regrow=b?.up?this.day+90:0;this.dirty=true;}}}
  if(t.kind==='hunt'){cargo.fresh=3.6*[1,.95,1.05,.8][this.season];this.award('local_meal','The island fed us',1);}
  if(t.kind==='fish'){cargo.fresh=(b?.up||this.has('jetty')?4.2:3.5)*[1,1.1,1,.78][this.season];if(b?.up||this.has('jetty'))this.xp(p,'seamanship',.35);this.award('first_fish','Silver in the shallows',1);}
  if(t.kind==='forage'){cargo.fresh=1.65*[1.2,1,.85,.5][this.season];if(this.s.flags.herbs&&this.s.stock.herbs<12)cargo.herbs=.3;}
  if(t.kind==='fiber')cargo.fiber=4;
  if(t.kind==='branches')cargo.wood=3;
  if(t.kind==='water')cargo.water=7;
  if(t.kind==='stone')cargo.stone=4;
  if(t.kind==='copper'){let n=Math.min(2,this.s.oreLeft??40);this.s.oreLeft=(this.s.oreLeft??40)-n;cargo.ore=n;}
  if(t.kind==='discover'){let n=this.s.world.nodes.find(q=>q.id===t.node);if(n&&!n.found){n.found=true;this.s.pendingDiscoveries.push(n.id);if(n.id==='seeds')cargo.seeds=2;if(n.id==='herbs')cargo.herbs=4;this.log('Found: '+n.name,'Bring this discovery to the Hearth tonight.','compass');this.dirty=true;}}
  if(t.kind==='gatherNode'){let n=this.s.world.nodes.find(q=>q.id===t.node);if(n&&n.left>0){if(n.id==='wreck'){cargo={wood:7,fiber:6};if(n.left===3)cargo.cloth=1;this.award('salvaged','What the sea gave back',1);}else if(n.id==='drift')cargo.wood=5;else cargo.fiber=5;n.left--;this.dirty=true;}}
  if(t.kind==='build'&&b&&!b.built){b.progress+=.15*(1+this.skill(p,'construction')*.05);if(b.progress>=BUILD[b.type].labor){b.built=true;b.progress=BUILD[b.type].labor;this.finishBuilding(b,p);}this.dirty=true;}
  if(t.kind==='tend'&&b)b.tended=this.day;
  if(t.kind==='harvest'&&b){cargo.fresh=b.up?45:30;cargo.seeds=1;b.growth=0;b.tended=this.day;this.award('harvest','Our first harvest',3);this.dirty=true;}
  if(t.kind==='craft'&&b){let r=RECIPES[t.recipe];if(!(t.recipe==='tools'&&this.s.boat.stage==='none'&&this.s.stock.fittings<8)&&this.pay(r.cost)){cargo={...r.out};if(t.recipe==='planks')this.award('first_planks','Craft with purpose',2);if(t.recipe==='fittings')this.award('first_fittings','Copper takes shape',2);}}
  if(t.kind==='heal'){let q=this.people.find(q=>q.id===t.patient);if(q&&this.pay({herbs:1})){q.well=Math.min(100,q.well+20);cargo={};}}
  if(t.kind==='teach'){let learners=this.people.filter(q=>q.id!==p.id&&!q.pregnantUntil&&this.age(q)>=3).sort((a,b)=>Number(this.age(a)>=18)-Number(this.age(b)>=18)).slice(0,4);for(let q of learners){this.xp(q,'construction',.1);this.xp(q,'carpentry',.08);}this.award('lesson','Knowledge passed on',2);}
  if(t.kind==='boat'&&b){this.s.boat.progress+=.4;this.xp(p,'construction',.15);if(this.s.boat.progress>=BALANCE.boatWork){this.s.boat.stage='ready';this.s.boat.progress=BALANCE.boatWork;p.profession='Shipwright';this.record(p,'Built the first expedition vessel.');this.award('first_boat','A vessel of our own',4);this.dirty=true;}}
  if(b&&BUILD[b.type].profession&&p.job===b.id){let prof=b.type==='woodpost'&&b.up?'Forester':BUILD[b.type].profession;if(p.profession!==prof){p.profession=prof;this.record(p,'Became a '+prof+'.');this.award('profession_'+prof,p.first+' found a calling: '+prof,1);}}
  if(t.kind==='build'&&p.job==='builder'&&p.profession!=='Builder'){p.profession='Builder';this.record(p,'Became a Builder.');}
  if(Object.keys(cargo).length){let store=this.buildings.find(q=>q.type==='store'&&q.built);p.task=this.makeTask('deliver',store?this.workTarget(store):this.hearthPos(),0,{cargo});}else p.task=null;p.route=[];
 }
 finishBuilding(b,p){this.pathCache=null;this.award('first_'+b.type,'Built: '+this.buildingName(b),b.type==='hearth'||b.type==='shelter'?1:2);this.record(p,'Helped build the '+this.buildingName(b)+'.');
  if(b.type==='shelter'){this.people.filter(q=>!q.home).slice(0,4).forEach(q=>q.home=b.id);}
  if(b.type==='house'){let arr=this.adults.filter(q=>!q.home||this.getB(q.home)?.type==='shelter');arr.slice(0,2).forEach(q=>q.home=b.id);}
  if(BUILD[b.type].skill){let candidate=this.people.filter(q=>this.available(q)&&!q.job&&q.id!==p.id)[0]||(!p.job?p:null);if(candidate)this.assign(candidate.id,b.id);}
 }
 council(){if(!this.has('hearth'))return;this.s.councilCount++;for(let id of this.s.pendingDiscoveries){this.s.flags[id]=true;this.award('discovery_'+id,'Shared: '+(this.s.world.nodes.find(n=>n.id===id)?.name||id),id==='lookout'?3:2);}this.s.pendingDiscoveries=[];let pts=this.s.pendingInsight;this.s.insight+=pts;this.s.pendingInsight=0;if(pts||this.s.councilCount===1){this.s.councilNotice=true;this.log('Tonight at the Hearth',`${pts} insight shared. ${this.s.insight} available for the community.`, 'fire');}this.dirty=true;}
 foodDemand(){return this.people.reduce((n,p)=>n+(this.age(p)<3?.4:this.age(p)<12?.6:this.age(p)<18?.8:p.pregnantUntil?1.2:1),0);}
 nextDay(){
  const need=this.foodDemand(),ate=this.eat(need),ratio=ate/Math.max(1,need),heated=this.season!==3||this.pay({wood:.75+this.buildings.filter(b=>b.type==='house'&&b.built).length*.35});
  let waterOK=!!this.s.flags.spring;if(this.has('water')){waterOK=this.s.stock.water>=need;this.s.stock.water=Math.max(0,this.s.stock.water-need);}
  for(let p of this.people){let home=this.getB(p.home),quality=home?.type==='house'?1:home?.type==='shelter'?.7:.3;p.well=clamp(p.well+(ratio>=.99?1.2:-5)+(heated?0:-2)+(quality===1?.4:-.1)+(waterOK?0:-1),30,100);}
  if(ratio<.9&&this.day%3===0)this.log('The food reserve is low','Free villagers are gathering emergency food. Reassign someone to hunting or fishing.','food');
  if(this.has('signal'))this.pay({wood:.35});
  for(let b of this.buildings)if(b.built&&b.type==='water'&&b.up&&this.day%4===0&&this.season!==3)this.add('water',Math.min(6,Math.max(0,40-this.s.stock.water)));
  this.s.day++;for(let b of this.s.freshBatches){if(b.until<=this.day){this.s.stock.fresh=Math.max(0,this.s.stock.fresh-b.n);b.n=0;}}this.s.freshBatches=this.s.freshBatches.filter(b=>b.n>0);
  for(let t of this.s.world.trees){if(t.regrow&&t.regrow<=this.day){t.wood=8;t.regrow=0;this.dirty=true;}}
  if(this.day%5===0)this.s.world.nodes.find(n=>n.id==='drift').left=Math.min(20,this.s.world.nodes.find(n=>n.id==='drift').left+2);
  if(this.seasonDay===1){this.dirty=true;this.log(BALANCE.seasonNames[this.season]+' has arrived',this.season===3?'Keep the fire fed and preserve your food.':'Another season on the island we call home.','leaf');if(this.day>120)this.award('winter','We made it through winter',6);}
  let pending=this.s.pendingArrival;
  if(!pending&&this.people.length<12&&((this.day===9&&this.has('shelter'))||(this.has('signal')&&this.day-this.s.lastArrival>=18&&this.s.stock.wood>.5))){let i=this.people.length-4;let names=[['Noah','Bennett','m'],['Ada','Rowan','f'],['Finn','Ash','m'],['June','Hale','f'],['Owen','Reed','m'],['Nora','Bay','f'],['Otis','Pine','m'],['Iris','Coast','f']];let n=names[clamp(i,0,7)];this.s.pendingArrival={first:n[0],last:n[1],sex:n[2],x:7,z:9};this.log('Someone on the shore','A survivor has found your island. Welcome them through the People book.','people');}
  for(let b of this.buildings.filter(b=>b.built&&b.type==='house')){
   let adults=this.occupancy(b).filter(p=>this.age(p)>=18);let pair=adults.slice(0,2);if(pair.length===2){let[a,c]=pair;let related=a.parents.includes(c.id)||c.parents.includes(a.id)||a.parents.some(id=>c.parents.includes(id));if(a.sex!==c.sex&&!related&&(!a.partner||a.partner===c.id)&&(!c.partner||c.partner===a.id)){
    a.friend=(a.friend||0)+1;c.friend=(c.friend||0)+1;if(a.friend>=12&&!a.partner){a.partner=c.id;c.partner=a.id;this.record(a,'Became close to '+c.first+'.');this.log('Lives growing together',a.first+' and '+c.first+' have become partners.','heart');}
    if(a.friend>=22&&!a.married){a.married=c.married=true;this.record(a,'Married '+c.first+'.');this.record(c,'Married '+a.first+'.');this.award('first_marriage',a.first+' & '+c.first+' married at the Hearth',2);}
    let woman=pair.find(p=>p.sex==='f');if(b.family&&a.married&&woman&&!woman.pregnantUntil&&woman.careUntil<=this.day&&woman.recoveryUntil<=this.day&&this.age(woman)<45&&this.occupancy(b).length<this.beds(b)&&this.food>need*4&&a.well>65&&c.well>65){woman.pregnantUntil=this.day+90;woman.task=null;this.record(woman,'Expecting a child.');this.log('A child is expected',woman.first+' is resting from work. Her household will welcome a child in 90 days.','heart');}
   }}
  }
  for(let p of [...this.people])if(p.pregnantUntil&&p.pregnantUntil<=this.day){p.pregnantUntil=null;p.recoveryUntil=this.day+5;p.careUntil=this.day+240;let names=['Anna','Wren','Theo','Robin','Elio','Rose'],name=this.s.flags.first_child?names[(this.people.length-4)%names.length]:'Anna';let baby=this.addPerson(name,p.last,this.people.length%2?'m':'f',0,'#cfa679','Born on the island',p.x,p.z);baby.home=p.home;baby.parents=[p.id,p.partner].filter(Boolean);baby.history=[{day:this.day,text:'Born on First Light Island.'}];this.record(p,'Welcomed '+name+' to the family.');this.award('first_child','Welcome to the island, '+name,3);}
  this.evaluateGoals();
  this.s.stats.yesterday={produced:{...this.s.stats.dayProduced},consumed:{...this.s.stats.dayUsed}};this.s.stats.dayProduced={};this.s.stats.dayUsed={};this.dirty=true;
 }
 welcome(){let a=this.s.pendingArrival;if(!a)return 'There is no one waiting.';let p=this.addPerson(a.first,a.last,a.sex,24+(this.people.length%9),['#709597','#c49067','#b29a5c','#8f7fa0'][this.people.length%4],'A story of their own',a.x,a.z);let home=this.buildings.find(b=>b.built&&this.freeBeds(b)>0);if(home)p.home=home.id;this.s.lastArrival=this.day;this.s.pendingArrival=null;this.award('arrival_'+p.id,p.first+' joined the community',2);return '';}
 startBoat(){if(!this.has('boatyard'))return 'Build a Boatyard first.';if(this.s.boat.stage!=='none')return 'The vessel is already underway.';let qualified=this.adults.find(p=>this.available(p)&&this.skill(p,'construction')>=3&&this.skill(p,'carpentry')>=2);if(!qualified)return 'A builder needs Construction 3 and Carpentry 2. Work or learn at the Schoolhouse.';if(!this.canPay(BOAT_COST))return 'Need '+this.missing(BOAT_COST);this.pay(BOAT_COST);this.s.boat.stage='building';let yard=this.buildings.find(b=>b.type==='boatyard');this.assign(qualified.id,yard.id);this.record(qualified,'Laid the keel of the first vessel.');this.log('The first keel','The whole village helped make this possible.','sail');this.dirty=true;return '';}
 launch(ids){if(this.s.boat.stage!=='ready')return 'The vessel is not finished yet.';let chosen=this.people.filter(p=>ids.includes(p.id));if(chosen.length!==2||chosen.some(p=>!this.available(p)))return 'Choose two available adults.';if(!chosen.some(p=>this.skill(p,'seamanship')>=1))return 'At least one crew member needs Seamanship 1. Use a Jetty or skiff fishing.';if(this.adults.filter(p=>this.available(p)).length-chosen.length<3)return 'Leave at least three working adults at home.';if(!this.canPay(VOYAGE_COST))return 'Need '+this.missing(VOYAGE_COST);this.pay(VOYAGE_COST);this.s.boat.crew=ids;this.s.boat.stage='sailing';this.s.boat.travel=0;chosen.forEach(p=>{p.task=null;this.record(p,'Sailed aboard '+this.s.boat.name+'.');});this.log('The first voyage',this.s.boat.name+' is leaving for the island on the horizon.','sail');this.dirty=true;return '';}
 evaluateGoals(){for(let g of GOALS)if(!this.s.awards[g.id]&&g.test(this))this.award(g.id,g.title,g.reward);}
 tick(dt){let prev=this.s.time;this.s.time+=dt;if(prev<.79&&this.s.time>=.79){this.evaluateGoals();this.council();}if(this.s.time>=1){this.s.time-=1;this.nextDay();}
  for(let b of this.buildings)if(b.type==='field'&&b.built&&this.season!==3)b.growth=Math.min(14,b.growth+dt*[1,1.15,.85,0][this.season]*(b.tended>=this.day-2?1:.3));
  for(let p of this.people)this.tickPerson(p,dt);
  if(this.s.boat.stage==='sailing'){this.s.boat.travel+=dt;if(this.s.boat.travel>=2){this.s.boat.stage='arrived';this.s.paused=true;this.award('new_shore','A new shore',5);this.log('Land beyond the horizon','A copper-rich island lies ahead. Your first chapter is complete.','compass');this.dirty=true;}}
 }
 advance(seconds){if(this.s.paused||!this.s.started)return;this.acc+=Math.min(seconds,.15)*this.s.speed/this.daySeconds;let count=0;while(this.acc>=BALANCE.tick&&count++<120){this.tick(BALANCE.tick);this.acc-=BALANCE.tick;}}
 runDays(n){const step=BALANCE.tick;for(let i=0;i<Math.round(n/step);i++)this.tick(step);this.dirty=true;}
 meetTonight(){let d=this.s.time<.79?.8-this.s.time:1.8-this.s.time;this.runDays(d);this.s.paused=true;return '';}
 toJSON(){let o=JSON.parse(JSON.stringify(this.s));o.people.forEach(p=>{p.route=[];p.targetKey=null;});return o;}
 static validate(data){if(!data||![1,2].includes(data.version)||!Number.isFinite(data.day)||data.day<1||data.day>100000||!data.stock||!Array.isArray(data.people)||data.people.length>80||!Array.isArray(data.buildings)||data.buildings.length>300||!data.world||!Array.isArray(data.known))throw Error('This is not a compatible Tidefolk save.');if(!Array.isArray(data.world.trees)||!Array.isArray(data.world.nodes)||!Number.isFinite(data.time)||data.time<0||data.time>=1)throw Error('Invalid island data.');if(data.version===2&&(!Array.isArray(data.world.explored)||data.world.explored.some(id=>!REGIONS.some(r=>r.id===id))))throw Error('Invalid exploration data.');for(let [k,v]of Object.entries(data.stock))if(!(k in GOODS)||!Number.isFinite(v)||v<0)throw Error('Invalid resource data.');for(let b of data.buildings)if(!(b.type in BUILD)||!Number.isFinite(b.x)||!Number.isFinite(b.z))throw Error('Invalid building data.');return data;}
}
const GOALS=[
 {id:'g_salvage',title:'What the sea gave back',desc:'Send a castaway to recover supplies from the broken vessel.',test:s=>s.s.flags.salvaged,action:'node:wreck',label:'Find the wreck',reward:1},
 {id:'g_hearth',title:'A first light',desc:'Place the Hearth. Free villagers will carry the materials and build it.',test:s=>s.has('hearth'),action:'build:hearth',label:'Place a Hearth',reward:1},
 {id:'g_shelter',title:'Somewhere dry to sleep',desc:'Build a four-person shelter and investigate the freshwater spring.',test:s=>s.has('shelter')&&s.s.world.nodes.find(n=>n.id==='spring').found,action:'opening',label:'Make a camp',reward:2},
 {id:'g_work',title:'Tomorrow has a rhythm',desc:'Learn Woodcraft and Hunting at the Hearth, then build and staff both posts.',test:s=>s.has('woodpost')&&s.has('hunt')&&s.people.some(p=>s.getB(p.job)?.type==='woodpost')&&s.people.some(p=>s.getB(p.job)?.type==='hunt'),action:'knowledge',label:'Community knowledge',reward:2},
 {id:'g_seed',title:'Plant tomorrow’s food',desc:'Explore the sunlit meadow. Share the seeds, learn Agriculture, and plant a field.',test:s=>s.has('field'),action:'seeds',label:'Find a future harvest',reward:2},
 {id:'g_home',title:'This could be home',desc:'A Small House creates a household. A Storehouse keeps supplies organized.',test:s=>s.has('house')&&s.has('store'),action:'build',label:'Build something lasting',reward:2},
 {id:'g_fish',title:'Let the island feed us',desc:'Discover the sheltered cove and build a Fishing Hut. More than one food source brings security.',test:s=>s.has('fish')&&s.s.flags.harvest,action:'fish',label:'Explore the cove',reward:2},
 {id:'g_people',title:'Leave a light on',desc:'Build a Signal Fire and welcome a new survivor into the community.',test:s=>s.has('signal')&&s.people.length>4,action:'people',label:'Our people',reward:2},
 {id:'g_craft',title:'Made by our own hands',desc:'Build a Workshop and a Water Station. Upgrade a Woodcutter Post to manage the forest.',test:s=>s.has('workshop')&&s.has('water')&&s.buildings.some(b=>b.type==='woodpost'&&b.up),action:'build',label:'Grow the settlement',reward:3},
 {id:'g_winter',title:'For the colder days',desc:'Keep 60 preserved food and 55 wood in reserve. A Smokehouse will help.',test:s=>s.s.stock.food>=60&&s.s.stock.wood>=55,action:'supplies',label:'Plan our reserves',reward:3},
 {id:'g_horizon',title:'A shape on the horizon',desc:'Send scouts through Greyback Ridge to Farwatch Headland. Discover copper and the lookout; learn Shorecraft.',test:s=>s.s.flags.lookout&&s.s.flags.copper&&s.learned('shorecraft'),action:'node:lookout',label:'Look beyond home',reward:3},
 {id:'g_vessel',title:'Build what carries us',desc:'Learn Boatbuilding, prepare the materials and train a builder. Construct a vessel at the Boatyard.',test:s=>['ready','sailing','arrived'].includes(s.s.boat.stage),action:'voyage',label:'The first vessel',reward:3},
 {id:'g_voyage',title:'A new shore',desc:'Provision the vessel, choose two crew, and follow the horizon.',test:s=>s.s.boat.stage==='arrived',action:'voyage',label:'Prepare the voyage',reward:0}
];

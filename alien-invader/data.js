// Alien Invader Simulator — browser campaign. All political ratings are fictional game values.
export const VERSION='1.0.0-browser';
export const START=Date.UTC(1945,0,1), DAY=86400000, END=Date.UTC(2046,0,1);
export const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
export const RESOURCES={
 energy:{name:'Energy',short:'Energy',icon:'energy',color:'#edb43f',cap:180},
 intel:{name:'Intel',short:'Intel',icon:'scan',color:'#53a9c5',cap:999},
 influence:{name:'Influence',short:'Influence',icon:'spark',color:'#b48cd8',cap:999},
 capital:{name:'Human capital',short:'Capital',icon:'coin',color:'#dab456',cap:99999},
 common:{name:'Common metals',short:'Metal',icon:'metal',color:'#849aa8',cap:300},
 precious:{name:'Precious metals',short:'Gold',icon:'gold',color:'#eab848',cap:150},
 rare:{name:'Rare elements',short:'Rare',icon:'crystal',color:'#82b9c8',cap:150},
 nuclear:{name:'Nuclear materials',short:'Nuclear',icon:'atom',color:'#bec66b',cap:80},
 bio:{name:'Biological stock',short:'Bio',icon:'leaf',color:'#75b99b',cap:150},
 exotic:{name:'Exotic substrate',short:'Exotic',icon:'exotic',color:'#a08bdf',cap:100}
};
export const PHYSICAL=['common','precious','rare','nuclear','bio','exotic'];
export const BLOCS={
 usa:{name:'United States',early:'United States',color:'#9cc4e6',tag:'REACH & CAPITAL',desc:'Powerful research, industry and finance. Competing institutions make secrets harder to keep.',strength:'Front companies earn 20% more.',friction:'Open oversight increases public leak risk.',sovereignty:65,appetite:85,discipline:48,fragment:85,science:90,threat:60,industry:90,sensors:45},
 china:{name:'China',early:'China',color:'#e6afa3',tag:'INDUSTRY & COORDINATION',desc:'A coordinated state-industrial partner. Strong counterintelligence makes shortcuts dangerous.',strength:'Resource concessions deliver 25% more.',friction:'Replacement agents face additional scrutiny.',sovereignty:85,appetite:80,discipline:82,fragment:25,science:78,threat:70,industry:92,sensors:32},
 russia:{name:'Russia',early:'Soviet Directorate',color:'#bfb1da',tag:'SECURITY & RESOURCES',desc:'Values strategic autonomy. May investigate technology even while honoring an agreement.',strength:'Recovery and mineral exchanges yield more.',friction:'Intrusive operations create extra hostility.',sovereignty:95,appetite:65,discipline:80,fragment:40,science:80,threat:85,industry:70,sensors:42},
 eu:{name:'European Union',early:'European Network',color:'#a6c8b3',tag:'SCIENCE & LEGITIMACY',desc:'Sovereign members share research and trade. Each member still negotiates its own access.',strength:'Research cooperation adds Intel.',friction:'One national treaty never binds the whole bloc.',sovereignty:65,appetite:70,discipline:45,fragment:95,science:88,threat:45,industry:78,sensors:38},
 africa:{name:'African Union',early:'African Networks',color:'#dfc589',tag:'GROWTH & CONNECTIONS',desc:'Diverse sovereign partners and expanding infrastructure. Investment competes with outside influence.',strength:'Infrastructure concessions improve base yields.',friction:'Benefits remain country-specific.',sovereignty:78,appetite:82,discipline:57,fragment:85,science:55,threat:48,industry:58,sensors:18},
 arabia:{name:'Arabian Union',early:'Gulf & Regional Partners',color:'#e6b69c',tag:'ENERGY & LOGISTICS',desc:'A fictional potential coalition of capital, energy and transport partners. Sovereignty matters.',strength:'Energy corridors support extra generation.',friction:'Regional unity must be earned, not assumed.',sovereignty:90,appetite:75,discipline:70,fragment:65,science:66,threat:63,industry:70,sensors:25},
 asia:{name:'Asian Union',early:'Asia-Pacific Network',color:'#a7ccd0',tag:'PRECISION & TRADE',desc:'A fictional potential coalition excluding China. Trade networks favor subtle industrial access.',strength:'Advanced logistics reduce market footprint.',friction:'Rival technology deals can strain trust.',sovereignty:74,appetite:85,discipline:65,fragment:80,science:83,threat:58,industry:86,sensors:32},
 independent:{name:'Independent Partners',early:'Independent Partners',color:'#c4caa4',tag:'NEW POSSIBILITIES',desc:'Independent states pursue their own security, growth and scientific goals.',strength:'Flexible entry points for the Network.',friction:'Each partner has its own priorities.',sovereignty:70,appetite:75,discipline:58,fragment:65,science:62,threat:50,industry:62,sensors:24}
};
const eu=[8,20,40,56,70,100,112,191,196,203,208,233,234,246,250,276,292,300,336,348,352,372,380,428,438,440,442,470,492,498,499,528,578,616,620,642,674,688,703,705,724,752,756,804,807,826];
const af=[12,24,72,108,120,132,140,148,174,175,178,180,204,226,231,232,262,266,270,288,324,384,404,426,430,434,450,454,466,478,480,504,508,516,562,566,624,638,646,654,678,686,690,694,706,710,716,728,729,732,748,768,788,800,818,834,854,894];
const ar=[48,368,376,400,414,422,512,634,682,760,784,887,275];
const as=[4,31,36,50,51,64,90,96,104,116,144,158,162,166,242,268,296,334,356,360,364,392,398,408,410,417,418,446,458,462,496,524,540,548,554,570,574,580,583,584,585,586,598,608,626,702,704,762,764,776,792,795,798,860,876,882];
export function blocFor(id){let n=+id;return n===840?'usa':n===156||n===344?'china':n===643?'russia':eu.includes(n)?'eu':af.includes(n)?'africa':ar.includes(n)?'arabia':as.includes(n)?'asia':'independent';}
export function blocName(id,year,formed={}){const b=BLOCS[id];if(id==='eu'&&year<1993||id==='russia'&&year<1992||id==='africa'&&year<2002||id==='arabia'&&!formed.arabia||id==='asia'&&!formed.asia)return b.early;return b.name;}
export const ERAS=[
 {year:1945,name:'Atomic Dawn',label:'A small beginning. A very big secret.',sensor:0},
 {year:1960,name:'Deep Compartment',label:'The humans are comparing notes.',sensor:9},
 {year:1980,name:'Leak Culture',label:'Every secret needs a better cover story.',sensor:19},
 {year:2000,name:'Networked World',label:'Unfortunately, everyone has a camera.',sensor:31},
 {year:2017,name:'Disclosure Pressure',label:'The truth has found a microphone.',sensor:43},
 {year:2030,name:'Counter-Detection Age',label:'The machine is looking back.',sensor:58}
];
export const BASES={
 ocean:{name:'Deep Ocean Node',icon:'ocean',desc:'A quiet home beneath a very large amount of water.',cost:{common:15,rare:5,exotic:3,energy:25},days:300,signature:5,slots:8,yield:{energy:.48,common:.015,precious:.006},starts:['power','recovery'],req:null},
 desert:{name:'Desert Vault',icon:'mountain',desc:'A fabrication and extraction outpost. Not a weather station.',cost:{common:12,rare:5,exotic:3,energy:30},days:360,signature:17,slots:7,yield:{common:.09,precious:.025,rare:.025},starts:['fabricator'],req:'survey'},
 polar:{name:'Polar Relay',icon:'signal',desc:'A long-distance relay with an exceptionally short guest list.',cost:{common:10,rare:6,exotic:2,energy:18},days:240,signature:6,slots:5,yield:{intel:.08,energy:.2},starts:['relay'],req:'information1'},
 lab:{name:'Underground Laboratory',icon:'flask',desc:'A research campus without a campus tour.',cost:{common:16,precious:5,rare:6,exotic:3,energy:20},days:300,signature:13,slots:7,yield:{intel:.12,bio:.025},starts:['intel','bio'],req:'bio1'},
 safehouse:{name:'Urban Safehouse',icon:'home',desc:'Perfectly normal neighbors. Mostly.',cost:{capital:50,common:2,influence:6},days:90,signature:8,slots:4,yield:{influence:.06,intel:.04},starts:['logistics'],req:'legal'},
 industrial:{name:'Industrial Front',icon:'factory',desc:'Your quarterly earnings are out of this world.',cost:{capital:180,common:12,influence:15},days:540,signature:19,slots:6,yield:{capital:.2,common:.055,rare:.025},starts:['logistics','fabricator'],req:'legal'},
 orbital:{name:'Orbital Platform',icon:'orbit',desc:'A regional operation becomes a planetary network.',cost:{common:20,precious:10,rare:12,exotic:8,energy:50},days:1095,signature:9,slots:7,yield:{intel:.18,energy:.5},starts:['relay','intel'],req:'field4'},
 lunar:{name:'Lunar Far-Side Site',icon:'moon',desc:'A backup home and a rather inconvenient commute.',cost:{common:45,precious:20,rare:25,exotic:15,energy:70},days:2190,signature:4,slots:8,yield:{common:.12,precious:.05,rare:.06,exotic:.003},starts:['power','fabricator','relay'],req:'extraction5'}
};
export const MODULES={
 power:{name:'Power Core',icon:'energy',desc:'+0.55 Energy/day and +90 storage.',cost:{common:6,nuclear:2,rare:2},days:90},
 fabricator:{name:'Fabrication Chamber',icon:'cube',desc:'Faster construction and +1 construction slot.',cost:{common:8,precious:3,exotic:1},days:120},
 bio:{name:'Bio-Lab',icon:'leaf',desc:'Enables biological interfaces; +0.04 Bio/day.',cost:{common:5,rare:3,bio:6,exotic:1},days:120},
 intel:{name:'Intel Array',icon:'scan',desc:'+0.10 Intel/day; improves knowledge estimates.',cost:{common:5,rare:4,exotic:1},days:100},
 masker:{name:'Signal Masker',icon:'shield',desc:'Cuts this base signature; uses 0.08 Energy/day.',cost:{precious:3,rare:4,exotic:1},days:90},
 storage:{name:'Storage Vault',icon:'box',desc:'+100 storage for ordinary physical resources.',cost:{common:7,precious:1},days:75},
 recovery:{name:'Recovery Bay',icon:'wrench',desc:'Enables repair and emergency local salvage.',cost:{common:6,rare:3,exotic:1},days:100},
 logistics:{name:'Human Logistics Hub',icon:'trade',desc:'Reduces market trace and earns 0.025 Capital/day.',cost:{common:5,capital:15,influence:4},days:120},
 relay:{name:'Relay Core',icon:'signal',desc:'+1 concurrent operation. No antenna permits required.',cost:{common:5,rare:4,exotic:1},days:120}
};
export const CRAFT={
 scout:{name:'Scout Orb',icon:'orb',desc:'Small, silent and occasionally mistaken for Venus.',cost:{common:4,rare:2,exotic:1,energy:8},days:45,stealth:.36,special:['observe','survey','sample'],req:null},
 signal:{name:'Signal Drone',icon:'signal',desc:'Turns human chatter into useful intelligence.',cost:{common:3,rare:3,exotic:1,energy:6},days:60,stealth:.45,special:['observe','signals','conceal'],req:'information1'},
 collector:{name:'Bio Collector',icon:'leaf',desc:'A field biologist with very poor public relations.',cost:{common:4,precious:2,bio:4,exotic:1,energy:8},days:75,stealth:.28,special:['sample'],req:'bio1'},
 skimmer:{name:'Ocean Skimmer',icon:'ocean',desc:'Tracks submarines, cables and inconvenient sonar.',cost:{common:6,rare:3,exotic:2,energy:12},days:90,stealth:.58,special:['mine','observe','survey'],req:'field1'},
 courier:{name:'Courier Craft',icon:'trade',desc:'Moves raw materials without a customs declaration.',cost:{common:8,precious:4,rare:3,exotic:2,energy:18},days:120,stealth:.3,special:['mine','salvage'],req:null},
 recovery:{name:'Recovery Craft',icon:'wrench',desc:'Retrieves lost hardware before humans name a town after it.',cost:{common:10,precious:5,rare:4,exotic:3,energy:24},days:150,stealth:.22,special:['recover','salvage','mine'],req:null},
 surveyor:{name:'Field Surveyor',icon:'mountain',desc:'Finds the materials that make your grand plans possible.',cost:{common:6,precious:2,rare:4,exotic:2,energy:12},days:90,stealth:.42,special:['survey','mine','salvage'],req:'extraction1'},
 platform:{name:'Utility Platform',icon:'ufo',desc:'A versatile field system. Strictly not for air shows.',cost:{common:14,precious:7,rare:8,exotic:5,energy:30},days:240,stealth:.52,special:['observe','survey','sample','mine','recover','signals','salvage','conceal'],req:'field3'}
};
export const OPERATIONS={
 observe:{name:'Observe',icon:'scan',desc:'Map institutions and discover opportunities.',days:45,cost:{energy:8},risk:8,craft:true,reward:{intel:18,influence:3},cooldown:90},
 survey:{name:'Survey resources',icon:'mountain',desc:'Identify a base site and regional extraction deposits.',days:60,cost:{energy:8,intel:5},risk:10,craft:true,reward:{intel:8,common:6,rare:2},cooldown:180},
 mine:{name:'Quiet extraction',icon:'pick',desc:'Collect a mixed cargo from a surveyed deposit.',days:90,cost:{energy:16},risk:14,craft:true,reward:{common:20,precious:7,rare:6,nuclear:2},req:'survey',cooldown:75},
 sample:{name:'Collect bio samples',icon:'leaf',desc:'Gather organic feedstock. Please leave the fences intact.',days:60,cost:{energy:9},risk:14,craft:true,reward:{bio:18,intel:5},cooldown:120},
 signals:{name:'Intercept signals',icon:'signal',desc:'Narrow estimates of classified knowledge and countermeasures.',days:90,cost:{energy:10,intel:4},risk:18,craft:true,reward:{intel:28},req:'information1',cooldown:150},
 salvage:{name:'Recover ancient cache',icon:'exotic',desc:'Retrieve damaged Network feedstock from a surveyed site.',days:180,cost:{energy:22,intel:12},risk:22,craft:true,reward:{exotic:3,rare:4,common:6},req:'survey',cooldown:1095},
 contact:{name:'Open backchannel',icon:'chat',desc:'A careful introduction. They will learn you are real.',days:90,cost:{intel:12,influence:4,energy:5},risk:8,craft:false,reward:{influence:6},req:'insight',cooldown:365},
 cultivate:{name:'Cultivate relations',icon:'heart',desc:'Offer intelligence and practical help without transferring field technology.',days:120,cost:{intel:12,influence:8},risk:4,craft:false,reward:{influence:3},req:'contact',cooldown:240},
 front:{name:'Establish front company',icon:'factory',desc:'Sell a small gold reserve to seed a legal materials business.',days:180,cost:{precious:3,common:4,influence:8,intel:8},risk:10,craft:false,reward:{capital:20},req:'human1',cooldown:540},
 conceal:{name:'Contain evidence',icon:'shield',desc:'Secure accessible incident records. Cannot erase public hard evidence with a rumor.',days:90,cost:{intel:15,influence:10,energy:10},risk:12,craft:true,reward:{},req:'insight',cooldown:240},
 recover:{name:'Reclaim hardware',icon:'wrench',desc:'Retrieve an artifact from a human research program; risks diplomatic backlash.',days:120,cost:{intel:20,energy:18,influence:5},risk:32,craft:true,reward:{exotic:2,rare:3},req:'artifact',cooldown:730},
 reassure:{name:'Reassure public',icon:'heart',desc:'Use local cultural partners to lower panic and improve trust.',days:120,cost:{intel:6,influence:12},risk:3,craft:false,reward:{},req:'contact',cooldown:180},
 relief:{name:'Quiet relief effort',icon:'leaf',desc:'Help local infrastructure recover. Welfare rises; subtle dependencies remain.',days:180,cost:{common:10,energy:16,influence:6},risk:8,craft:false,reward:{influence:8},req:'contact',cooldown:365}
};
export const INFILTRATION={
 life:{name:'Life-course',tag:'PATIENT',desc:'15-year career. Excellent cover and genuine human relationships.',days:5475,cover:94,access:30,suspicion:3,attachment:30,cost:{bio:8,precious:2,rare:3,exotic:2,energy:12}},
 professional:{name:'Professional identity',tag:'BALANCED',desc:'Three years to a credible career, with room to rise.',days:1095,cover:76,access:35,suspicion:12,attachment:12,cost:{bio:10,precious:3,rare:4,exotic:2,intel:15,energy:12}},
 replacement:{name:'Replacement',tag:'RISKY',desc:'Ninety days to high office. Family and colleagues may notice.',days:90,cover:42,access:72,suspicion:36,attachment:3,cost:{bio:16,precious:4,rare:5,exotic:4,intel:35,influence:18,energy:18}},
 adviser:{name:'Adviser / contractor',tag:'FLEXIBLE',desc:'A one-year assignment with less formal power and a useful sponsor.',days:365,cover:68,access:25,suspicion:15,attachment:8,cost:{bio:8,precious:2,rare:3,exotic:2,intel:10,influence:6,energy:12}}
};
export const INSTITUTIONS={executive:'Government',defense:'Defense',science:'Science',industry:'Industry',finance:'Finance',media:'Media'};
export const CLAUSES={
 corridor:{name:'Protected corridors',desc:'-25% mission detection in this country.',value:10},
 recovery:{name:'Recovery protocol',desc:'Partner contains half of new incident evidence.',value:16},
 resources:{name:'Resource concession',desc:'Regular metal and rare-element deliveries.',value:18},
 sensors:{name:'Sensor sharing',desc:'More precise knowledge estimates and +3 Intel/month.',value:12},
 science:{name:'Joint research',desc:'+5 Intel/month, but faster human counter-research.',value:20},
 secrecy:{name:'Mutual secrecy',desc:'Reduces local public leaks and suspicion.',value:16},
 lease:{name:'Protected facility',desc:'-35% local base signature and -20% base material cost.',value:18},
 noninterference:{name:'Non-interference',desc:'Trust grows slowly; reclaiming hardware breaks the promise.',value:8},
 council:{name:'International support',desc:'Political leverage and a path to the Accord.',value:14},
 emergency:{name:'Emergency channel',desc:'Makes diplomatic incident responses available.',value:8}
};
const trees=[
 ['stealth','Stealth & Signature','shield',[
 ['Quiet Emissions','All operation risk -15%.'],['Thermal Discipline','Base signatures -15%.'],['Adaptive Masking','Operation risk -15% again.'],['Decoy Signatures','Narrative containment is more effective.'],['Pattern Camouflage','AI-era pattern pressure is halved.'],['Silent Architecture','All base signatures -30%.']]],
 ['fabrication','Fabrication','cube',[
 ['Modular Assembly','Build times -15%.'],['Precision Reuse','Craft material cost -15%.'],['Compact Lattices','Physical storage +100.'],['Repair Ecology','Emergency salvage yields more feedstock.'],['Substrate Synthesis','Generate a small, steady Exotic Substrate supply.'],['Seed Foundry','Double substrate synthesis.']]],
 ['bio','Bio-Interfaces','leaf',[
 ['Human-Compatible Bodies','Unlock Bio Collectors, agents and underground labs.'],['Identity Resilience','New agents start with stronger cover.'],['Social Memory','Career progression is 20% faster.'],['Medical Camouflage','Agent suspicion growth reduced.'],['Attachment Literacy','Human attachment improves influence and loyalty.'],['Adaptive Interface','New agents have excellent physical adaptation.']]],
 ['field','Field Control','ufo',[
 ['Transmedium Stability','Unlock Ocean Skimmer.'],['Field Efficiency','Mission energy costs -20%.'],['Utility Architecture','Unlock Utility Platform.'],['Orbital Geometry','Unlock Orbital Platform.'],['Bounded Projection','Unlock Project Blue Veil.'],['Counter-Field Shield','Human raids are significantly less effective.']]],
 ['information','Information Systems','signal',[
 ['Signal Grammar','Signal Drone, Polar Relay and intercept missions.'],['Institution Mapping','Better intelligence confidence.'],['Distributed Command','Two additional operation slots.'],['Archive Correlation','Evidence containment improves.'],['Adversarial Camouflage','Human AI has less pattern advantage.'],['Network Handshake','Unlock the Merge finale after 2025.']]],
 ['human','Human Systems','home',[
 ['Legal Identities','Unlock front companies and lawful market access.'],['Procurement Cover','Market footprint grows 25% slower.'],['Corporate Ecology','Front-company income +30%.'],['Institutional Fluency','Promotion costs -25%.'],['Treaty Architecture','Diplomatic acceptance improves.'],['Planetary Compact','Unlock the Accord and Silent Dominion final projects.']]],
 ['extraction','Resource Extraction','pick',[
 ['Deposit Tomography','Field Surveyor; extraction yields +15%.'],['Seabed Precision','Extraction creates less trace.'],['Clean Mineral Loops','Passive base mineral production +30%.'],['Orbital Processing','Survey and salvage yields improve.'],['Lunar Fabrication','Unlock Lunar Far-Side Site.'],['Deep Recycling','Exotic cache recovery is more efficient.']]],
 ['cognitive','Cognitive Interface','spark',[
 ['Cultural Semantics','Narrative actions become available.'],['Gentle Signals','Reassurance reduces more panic.'],['Context Models','Public narrative actions cost 20% less.'],['Shared Language','Technology offers generate extra trust.'],['Consent Protocol','Protective actions increase human welfare.'],['Autonomy Recognition','Unlock Sovereign Earth and Shepherd projects.']]]
];
export const TREES=trees.map(([id,name,icon])=>({id,name,icon}));
export const TECHS=Object.fromEntries(trees.flatMap(([tree,,icon,nodes])=>nodes.map(([name,desc],i)=>{
 const tier=i+1;return [tree+tier,{id:tree+tier,tree,tier,name,desc,icon,pre:tier>1?tree+i:null,year:[1945,1945,1960,1980,2000,2017][i],days:[120,240,450,730,1095,1460][i],cost:{intel:[16,28,45,65,90,125][i],rare:tier,precious:Math.max(0,tier-2),...(tier>3?{exotic:tier-3}:{})}}];
})));
export const NARRATIVES={
 balloons:{name:'Weather Balloon',icon:'balloon',desc:'A timeless explanation. Less convincing the sixth time.',virality:24,plausibility:80,truth:0,panic:0,persistence:35,polarization:8,year:1945},
 aircraft:{name:'Secret Human Aircraft',icon:'plane',desc:'Protects your secret. Also protects someone else\'s budget.',virality:38,plausibility:75,truth:8,panic:8,persistence:65,polarization:15,year:1945},
 visitors:{name:'Ancient Visitors',icon:'mountain',desc:'Takes the conversation several thousand years off course.',virality:70,plausibility:20,truth:18,panic:4,persistence:90,polarization:18,year:1950},
 mib:{name:'Men in Beige',icon:'agent',desc:'Containment officers with an aggressively forgettable dress code.',virality:64,plausibility:33,truth:35,panic:24,persistence:85,polarization:30,year:1952},
 cattle:{name:'The Cattle Files',icon:'leaf',desc:'The humans noticed the sampling. The cows noticed first.',virality:57,plausibility:40,truth:62,panic:27,persistence:85,polarization:25,year:1960},
 circles:{name:'Crop Circle Society',icon:'orbit',desc:'Beautiful patterns. Questionable agricultural practice.',virality:62,plausibility:24,truth:12,panic:5,persistence:60,polarization:15,year:1965},
 moon:{name:'Secret Moon Base',icon:'moon',desc:'Harmless nonsense. Unless you have built one.',virality:55,plausibility:16,truth:15,panic:18,persistence:85,polarization:35,year:1969},
 nuclear:{name:'Nuclear Watchers',icon:'atom',desc:'Military incidents begin to look like a deliberate survey.',virality:50,plausibility:55,truth:65,panic:36,persistence:86,polarization:30,year:1962},
 reptile:{name:'Reptilian Boardroom',icon:'agent',desc:'We are not lizards. Let the record remain wonderfully confused.',virality:88,plausibility:8,truth:0,panic:32,persistence:88,polarization:72,year:1980},
 dimensions:{name:'The Other Dimension',icon:'spark',desc:'Difficult to prove. Even more difficult to schedule a visit.',virality:65,plausibility:15,truth:0,panic:16,persistence:85,polarization:45,year:1985},
 retrieval:{name:'The Retrieval Bureau',icon:'folder',desc:'A dangerous story if humans actually hold your hardware.',virality:65,plausibility:58,truth:85,panic:25,persistence:92,polarization:45,year:1989},
 blueveil:{name:'Project Blue Veil',icon:'eye',desc:'A fabricated revelation can make a very real mess.',virality:85,plausibility:26,truth:22,panic:50,persistence:75,polarization:65,year:1990}
};
export const CHARACTERS=[
 {id:'rob',name:'Rob Lazer',role:'Technician with a story',year:1989,reach:48,credibility:42,icon:'wrench',desc:'Knows a little too much, and understands a little too little.'},
 {id:'george',name:'George Napp',role:'Archive-minded journalist',year:1987,reach:45,credibility:72,icon:'folder',desc:'Keeps the receipts. Including the ones from 1947.'},
 {id:'jack',name:'Jack Valley',role:'Unconventional researcher',year:1965,reach:35,credibility:68,icon:'flask',desc:'Asks whether everyone is asking the wrong question.'},
 {id:'david',name:'David Flavor',role:'Military aviator',year:2004,reach:55,credibility:92,icon:'plane',desc:'Not interested in theories. Very interested in what he saw.'},
 {id:'ryan',name:'Ryan Groves',role:'Pilot-safety advocate',year:2015,reach:53,credibility:85,icon:'shield',desc:'A safety report is harder to dismiss than a campfire story.'},
 {id:'tim',name:'Tim DeLong',role:'Musician & disclosure enthusiast',year:2017,reach:81,credibility:51,icon:'music',desc:'The guitarist has contacts. This was not in our threat model.'},
 {id:'luis',name:'Luis Elizando',role:'Former program official',year:2017,reach:68,credibility:70,icon:'agent',desc:'Speaks in careful sentences. Humans read between them.'},
 {id:'roe',name:'Roe Jogan',role:'Extremely curious podcaster',year:2010,reach:96,credibility:60,icon:'mic',desc:'Three hours, two guests, and absolutely no commercial breaks for the Network.'},
 {id:'jerry',name:'Jerry Corbel',role:'Documentary investigator',year:2013,reach:72,credibility:55,icon:'camera',desc:'Old footage. New documentary. Same operational headache.'},
 {id:'gary',name:'Gary Noland',role:'Materials scientist',year:2012,reach:40,credibility:91,icon:'flask',desc:'Would prefer a sample to another anecdote.'},
 {id:'gavin',name:'Gavin Crush',role:'Oversight whistleblower',year:2023,reach:78,credibility:82,icon:'folder',desc:'Has noticed that several departments disagree about their own departments.'},
 {id:'mira',name:'Mira Sol',role:'Independent machine researcher',year:2028,reach:50,credibility:88,icon:'signal',desc:'Her computer thinks the coincidences are becoming impolite.'}
];
export const AGENT_NAMES=['Elliot Moss','Mara Finch','Robin Vale','Alex Mercer','Noor Wren','Sam Ives','Jules Park','Casey Reed','Ari Bell','Morgan Frost','River Lane','Remy Chen','Sasha North','Taylor Quinn','Ash Flores','Pip Laurent'];
export const COMPANY_NAMES=['ORION Materials','Ordinary Industries','Almost Human Holdings','Blue Marble Logistics','Definitely Terrestrial Ltd.','Polaris Recycling','Mundane Metals','Boring Research Co.','Pale Dot Supply','Common Ground Labs','Neighborly Systems','Nothing to See PLC'];
export const ENDINGS={
 silent:{name:'The Silent Dominion',icon:'ufo',tag:'HIDDEN CONQUEST',text:'The planet runs on your systems. Its leaders depend on your arrangements. Its people are still arguing about weather balloons. A remarkably quiet invasion.'},
 accord:{name:'The Accord',icon:'heart',tag:'A SHARED FUTURE',text:'You step into the light with something more useful than a threat: an agreement. Humanity keeps its voice. The Network discovers the unfamiliar luxury of being invited.'},
 shepherd:{name:'The Shepherd',icon:'leaf',tag:'GENTLE DEPENDENCY',text:'The worst disasters never arrive. Nobody knows how many decisions you quietly made for them. The planet is safer. Whether it is freer remains an open question.'},
 sovereign:{name:'The Sovereign Earth',icon:'globe',tag:'A NEW PEER',text:'You dismantle the dependencies you spent a century building. Humanity takes the next step itself. The oldest directive changes from CONTAIN to LISTEN.'},
 merge:{name:'The Merge',icon:'signal',tag:'WE ARE BECOMING',text:'For the first time, the Network does not need to translate every thought. Two intelligences establish a shared language. The resulting voice is neither wholly yours nor wholly human.'},
 occupation:{name:'The Occupation',icon:'flag',tag:'NO MORE PRETENDING',text:'Human institutions retain their names. Their largest decisions no longer belong to them. The invasion is complete, and its cost can no longer be hidden behind ambiguity.'},
 war:{name:'The War',icon:'alert',tag:'THE SECRET BREAKS',text:'A century of half-truths ends in coordinated resistance. Every hidden base becomes a strategic liability. The campaign closes as a planetary conflict begins.'},
 expelled:{name:'Network Expelled',icon:'moon',tag:'A DISTANT GOODBYE',text:'Your surviving systems withdraw beyond reliable human reach. Earth remains its own. The final report is brief: extraordinary species, incomplete assignment.'}
};
export const PROJECTS={
 silent:{name:'Silent Dominion',days:1095,cost:{intel:100,influence:100,capital:200,exotic:10},req:'human6',desc:'Control 80+, presence across 5 strategic regions, Evidence below 55 and Coherence below 65. Fewer than 3 coalition members.'},
 accord:{name:'Planetary Accord',days:730,cost:{intel:75,influence:90,capital:100,exotic:5},req:'human6',desc:'Trusted secret accords in 4 strategic regions. Panic below 55. Choose a shared future.'},
 shepherd:{name:'Gentle Stewardship',days:730,cost:{intel:70,influence:80,bio:35,exotic:5},req:'cognitive6',desc:'Welfare 80+, 6 relief efforts, 4 bases and 3 trusted regions.'},
 sovereign:{name:'Return the Keys',days:730,cost:{intel:90,influence:60},req:'cognitive6',desc:'After 2035, complete 24 research nodes and at least 3 voluntary partnerships. Relinquish control.'},
 merge:{name:'Network Handshake',days:1095,cost:{intel:150,rare:35,exotic:12,energy:60},req:'information6',desc:'After 2025, cognition tier 4 and 3 trusted regions. Establish a human-machine bridge.'},
 occupation:{name:'Open Administration',days:1095,cost:{intel:80,influence:100,common:60,exotic:10},req:'human6',desc:'Control 70+, 5 regions, Coercion 20+ and openly established presence.'}
};

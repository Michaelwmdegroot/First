'use strict';
/* Tidefolk: First Hearth. All prototype tuning lives here, not in presentation. */
const BALANCE = Object.freeze({version:1, daysPerSeason:30, secondsPerDay:90, tick:1/480,
  maxCitizens:18, workStart:.26, workEnd:.76, pregnancyDays:90, recoveryDays:5,
  speeds:[1,4,12], initialRations:12, treeWood:8, treeRegrowth:90,
  seasonNames:['Spring','Summer','Autumn','Winter'],
  foodRates:[1,1,.95,.78], skillXP:.45, boatWork:12});
const GOODS = {
 wood:['Wood','log'],fiber:['Thatch','leaf'],stone:['Stone','stone'],fresh:['Fresh food','food'],
 food:['Preserved food','basket'],water:['Water','water'],seeds:['Seeds','sprout'],
 planks:['Planks','log'],rope:['Cordage','rope'],ore:['Copper ore','stone'],
 fittings:['Copper fittings','tools'],tools:['Tools','tools'],herbs:['Herbs','leaf'],cloth:['Sailcloth','sail']
};
const TECH = {
 woodcraft:{name:'Woodcraft',branch:'Craft',cost:1,req:[],event:'first_hearth',desc:'A regular timber job. Build a Woodcutter Post.'},
 hunting:{name:'Hunting',branch:'Food',cost:1,req:[],event:'first_hearth',desc:'Track wildlife and feed the camp. Build a Hunting Post.'},
 construction:{name:'A place to call home',branch:'Home',cost:2,req:[],event:'first_shelter',desc:'Build Small Houses. Three beds; a real household.'},
 agriculture:{name:'Basic agriculture',branch:'Food',cost:2,req:[],event:'seeds',desc:'Plant found seeds in fields. A harvest takes 14 growing days.'},
 storage:{name:'Organized stores',branch:'Home',cost:2,req:['construction'],desc:'A Storehouse protects food and holds materials for the future.'},
 fishing:{name:'Coastal fishing',branch:'Food',cost:2,req:[],event:'fishing',desc:'Build a Fishing Hut on the shore.'},
 signaling:{name:'A light for others',branch:'Community',cost:2,req:['construction'],desc:'Keep a Signal Fire alight to welcome new survivors.'},
 waterkeeping:{name:'Waterkeeping',branch:'Stewardship',cost:2,req:['storage'],event:'spring',desc:'Store water near home. A carrier can supply several households.'},
 forestry:{name:'Care for the forest',branch:'Stewardship',cost:2,req:['woodcraft'],desc:'Upgrade wood posts to replant trees. Saplings mature in 90 days.'},
 carpentry:{name:'Carpentry',branch:'Craft',cost:3,req:['woodcraft','storage'],desc:'A Workshop makes planks, cordage and tools.'},
 stonework:{name:'Stoneworking',branch:'Craft',cost:2,req:['construction'],event:'stone',desc:'Open a Stone Yard and build with more durable materials.'},
 preservation:{name:'Save the harvest',branch:'Food',cost:2,req:['storage'],desc:'A Smokehouse turns 5 fresh food and 1 wood into 4 preserved food.'},
 farmcare:{name:'A managed farm',branch:'Food',cost:2,req:['agriculture','waterkeeping'],event:'harvest',desc:'Upgrade fields for larger harvests and automatic replanting.'},
 medicine:{name:'Herbal care',branch:'Community',cost:2,req:['construction'],event:'herbs',desc:'Build a Healer Hut. Care shortens recovery.'},
 education:{name:'Passing it on',branch:'Community',cost:3,req:['carpentry'],desc:'A Schoolhouse lets a teacher educate children and mentor adults.'},
 copperwork:{name:'Copperworking',branch:'Craft',cost:3,req:['stonework','carpentry'],event:'copper',desc:'Extract the small copper vein and forge useful fittings.'},
 shorecraft:{name:'Shorecraft',branch:'Seafaring',cost:3,req:['fishing','carpentry'],desc:'Build a Jetty. A fisher can learn seamanship from a shore skiff.'},
 navigation:{name:'Beyond the horizon',branch:'Seafaring',cost:3,req:['shorecraft'],event:'lookout',desc:'Chart a bearing toward the distant island.'},
 housing:{name:'Room to grow',branch:'Home',cost:3,req:['carpentry','stonework'],desc:'Upgrade a Small House into a five-bed Family Cottage.'},
 planning:{name:'Shared responsibility',branch:'Community',cost:3,req:['storage','signaling'],desc:'Use stock targets and suggested replacements for absent workers.'},
 boatbuilding:{name:'Boatbuilding',branch:'Seafaring',cost:4,req:['navigation','copperwork','preservation'],desc:'Build a Boatyard. Train a builder, construct a vessel, and provision the first voyage.'}
};
const BUILD = {
 hearth:{name:'Founding Hearth',category:'Home',icon:'fire',cost:{wood:4,fiber:2},labor:.25,size:.9,unique:true,desc:'Warmth, shared meals, and every new idea. The heart of your community.'},
 shelter:{name:'Emergency Shelter',category:'Home',icon:'tent',cost:{wood:8,fiber:8},labor:1,size:1.5,beds:4,desc:'A dry place for four castaways. Not a permanent household.'},
 woodpost:{name:'Woodcutter Post',category:'Work',icon:'axe',tech:'woodcraft',cost:{wood:5,fiber:1},labor:.5,size:1,skill:'woodworking',profession:'Woodcutter',desc:'One worker gathers mature timber. Upgrade to replant woodland.',up:{name:'Forester Station',tech:'forestry',cost:{wood:8,stone:3},desc:'Replants harvested trees; more efficient timber work.'}},
 hunt:{name:'Hunting Post',category:'Food',icon:'bow',tech:'hunting',cost:{wood:4,fiber:2},labor:.5,size:1,skill:'hunting',profession:'Hunter',desc:'A repeatable source of fresh food. Leave space for wildlife.'},
 field:{name:'Field Plot',category:'Food',icon:'sprout',tech:'agriculture',cost:{seeds:1},labor:.65,size:1.8,skill:'farming',profession:'Farmer',desc:'Tend and harvest a small field. Seeds return after a successful harvest.',up:{name:'Managed Field',tech:'farmcare',cost:{wood:8,planks:2},desc:'A better-tended field produces a larger harvest.'}},
 house:{name:'Small House',category:'Home',icon:'house',tech:'construction',cost:{wood:16,fiber:8},labor:2.5,size:1.55,beds:3,desc:'Three beds, warm windows and a place for a household to grow.',up:{name:'Family Cottage',tech:'housing',cost:{planks:8,stone:6,fiber:4},desc:'Five beds, better warmth, and space for a growing family.'}},
 store:{name:'Storehouse',category:'Work',icon:'basket',tech:'storage',cost:{wood:14,fiber:6},labor:2,size:1.6,desc:'Dry storage. Increases capacity and keeps fresh food for nine days.',up:{name:'Shelves & Reserve Board',tech:'planning',cost:{planks:5,wood:5},desc:'More storage. Keep a clear view of reserves.'}},
 fish:{name:'Fishing Hut',category:'Food',icon:'fish',tech:'fishing',coast:true,cost:{wood:10,fiber:4},labor:1.5,size:1.25,skill:'fishing',profession:'Fisher',desc:'Build near the shore. A fisher brings fresh food home each day.',up:{name:'Skiff Fishing',tech:'shorecraft',cost:{planks:5,rope:2},desc:'A little skiff increases the catch and teaches seamanship.'}},
 signal:{name:'Signal Fire',category:'Community',icon:'beacon',tech:'signaling',cost:{wood:8,stone:2},labor:1,size:.8,unique:true,desc:'Burns a little wood each night. Survivors may see your light.'},
 water:{name:'Water Station',category:'Work',icon:'water',tech:'waterkeeping',cost:{wood:6,stone:2},labor:1,size:1,skill:'foraging',profession:'Water Carrier',desc:'Assign a carrier to stock water near home.',up:{name:'Rain Cistern',tech:'stonework',cost:{stone:10,wood:4},desc:'Holds more water and catches the rain.'}},
 workshop:{name:'Workshop',category:'Work',icon:'tools',tech:'carpentry',cost:{wood:20,stone:8},labor:4,size:1.55,skill:'carpentry',profession:'Carpenter',desc:'Choose a recipe: planks, cordage or tools.',up:{name:'Advanced Workbench',tech:'copperwork',cost:{planks:5,fittings:2},desc:'A second bench makes craft work more efficient.'}},
 quarry:{name:'Stone Yard',category:'Work',icon:'stone',tech:'stonework',cost:{wood:8},labor:1.5,size:1.15,skill:'mining',profession:'Miner',desc:'Quarry stone, or extract the limited copper vein after Copperworking.'},
 smoker:{name:'Smokehouse',category:'Food',icon:'food',tech:'preservation',cost:{wood:10,stone:6},labor:2,size:1.15,skill:'cooking',profession:'Cook',desc:'Preserve fresh food for winter and the voyage.'},
 forge:{name:'Copper Forge',category:'Work',icon:'tools',tech:'copperwork',cost:{stone:12,wood:8,planks:2},labor:3,size:1.3,skill:'metalworking',profession:'Metalworker',desc:'Two copper ore become one fitting. Needs fuel and a worker.'},
 healer:{name:'Healer Hut',category:'Community',icon:'heart',tech:'medicine',cost:{wood:12,fiber:6},labor:2,size:1.25,skill:'medicine',profession:'Healer',desc:'A healer uses local herbs to help people recover.'},
 school:{name:'Schoolhouse',category:'Community',icon:'book',tech:'education',cost:{wood:18,fiber:8,stone:4},labor:3,size:1.5,skill:'teaching',profession:'Teacher',desc:'Education for children and shared craft lessons for adults.'},
 jetty:{name:'Timber Jetty',category:'Seafaring',icon:'sail',tech:'shorecraft',coast:true,cost:{planks:6,wood:4},labor:2,size:1.35,desc:'A first foothold on the sea. Fishers practise close to shore.'},
 boatyard:{name:'Boatyard',category:'Seafaring',icon:'sail',tech:'boatbuilding',coast:true,cost:{wood:18,planks:12,stone:10},labor:4,size:2,unique:true,skill:'carpentry',profession:'Shipwright',desc:'Lay the keel of the first expedition boat. Assemble a crew and set sail.'},
 bench:{name:'Gathering Bench',category:'Details',icon:'bench',cost:{wood:2},labor:.15,size:.65,desc:'A little place to sit, talk, and watch the sea.'},
 lamp:{name:'Lantern Post',category:'Details',icon:'lantern',tech:'carpentry',cost:{wood:2,fiber:1},labor:.15,size:.35,desc:'Warm light along your paths. A little welcome in the dark.'}
};
const RECIPES={
 planks:{name:'Saw planks',cost:{wood:2},out:{planks:1},work:.17},
 rope:{name:'Twist cordage',cost:{fiber:2},out:{rope:1},work:.17},
 tools:{name:'Make tools',cost:{wood:2,fittings:2},out:{tools:1},work:.35},
 fittings:{name:'Forge copper fittings',cost:{ore:2,wood:.3},out:{fittings:1},work:.22},
 preserve:{name:'Preserve food',cost:{fresh:5,wood:1},out:{food:4},work:.42}
};
const BOAT_COST={planks:30,rope:12,fittings:6,cloth:1,tools:2};
const VOYAGE_COST={food:12,water:12,wood:6,herbs:1};
const SKILL_NAMES={construction:'Construction',woodworking:'Woodworking',hunting:'Hunting',fishing:'Fishing',farming:'Farming',foraging:'Foraging',scavenging:'Scavenging',carpentry:'Carpentry',mining:'Mining',metalworking:'Metalworking',cooking:'Cooking',medicine:'Medicine',teaching:'Teaching',seamanship:'Seamanship'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const hash=(a)=>{let h=2166136261;for(let i=0;i<String(a).length;i++)h=Math.imul(h^String(a).charCodeAt(i),16777619);return h>>>0;};
const rand=(seed)=>{let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};};
function radiusAt(a){return 15.2+1.1*Math.sin(3*a+.8)+.65*Math.cos(5*a)+.45*Math.sin(7*a);}
function landRatio(x,z){let a=Math.atan2(z/.82,x);return Math.hypot(x,z/.82)/radiusAt(a);}
function groundY(x,z){let r=landRatio(x,z);return r<.87?.55:r<1? .55*(1-(r-.87)/.13):-.10;}
function makeWorld(){const rng=rand(8222026),trees=[];for(let i=0;i<220&&trees.length<68;i++){let x=(rng()-.5)*29,z=(rng()-.5)*23,r=landRatio(x,z);if(r<.78&&r>.13&&(z<-3.1||x>7.5||x<-9.2)&&Math.hypot(x+7,z+5)>2.2&&Math.hypot(x-6,z+7)>2)trees.push({id:'tree'+i,x,z,size:.7+rng()*.6,wood:8,regrow:0});}
 return {trees,nodes:[
 {id:'wreck',name:'The broken vessel',icon:'basket',x:-2,z:10.7,kind:'salvage',left:3,desc:'Planks, sail scraps, a few things the sea gave back.'},
 {id:'drift',name:'Driftwood',icon:'log',x:5,z:10,kind:'drift',left:20,desc:'Loose timber. Gather it by hand.'},
 {id:'reeds',name:'Coastal reeds',icon:'leaf',x:-10,z:4.8,kind:'fiber',left:999,desc:'Leaves and reeds for thatch and cordage.'},
 {id:'spring',name:'A freshwater spring',icon:'water',x:-7,z:-5,kind:'discover',found:false,desc:'A clear trickle of water among the rocks.'},
 {id:'seeds',name:'The sunlit meadow',icon:'sprout',x:-7,z:1,kind:'discover',found:false,desc:'Wild plants grow here. Perhaps some can be cultivated.'},
 {id:'fishing',name:'The sheltered cove',icon:'fish',x:9,z:6.8,kind:'discover',found:false,desc:'Silver shapes move beneath the water.'},
 {id:'stone',name:'The stone outcrop',icon:'stone',x:6,z:-7,kind:'discover',found:false,desc:'Exposed stone. The beginning of more lasting buildings.'},
 {id:'copper',name:'Copper in the rock',icon:'stone',x:10,z:-4,kind:'discover',found:false,desc:'Something warm-coloured glints in the stone.'},
 {id:'herbs',name:'Wild herb garden',icon:'leaf',x:-11,z:-1,kind:'discover',found:false,desc:'Sweet-smelling leaves beside the woodland.'},
 {id:'lookout',name:'The high lookout',icon:'compass',x:0,z:-10,kind:'discover',found:false,desc:'The highest point. What lies beyond the horizon?'}]};}

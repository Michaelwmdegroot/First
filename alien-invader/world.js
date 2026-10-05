import {blocFor} from './data.js';
// World Atlas geometry is Natural Earth public-domain cartography. Borders are a fixed modern baseline.
const centers={
 '840':[38,-98],'156':[35,103],'643':[60,90],'124':[57,-108],'036':[-25,134],'076':[-10,-53],'250':[46.5,2.4],'826':[54,-2.5],'392':[36.5,138],'356':[22,79],'710':[-29,25],'682':[24,45],'410':[36,128],'528':[52.2,5.3],'360':[-3,117],'032':[-35,-65],'276':[51,10],'404':[0.5,38],'231':[9,40],'180':[-3,24],'484':[23,-102],'010':[-81,10],'578':[64,11],'304':[72,-42],'554':[-42,173],'170':[4,-73],'818':[27,30],'566':[9,8],'724':[40,-4],'380':[42.5,12.5],'764':[16,101],'704':[17,107],'458':[4,103],'608':[12,123],'050':[24,90],'586':[30,69],'620':[39.5,-8],'616':[52,19],'752':[63,16],'246':[64,26],'792':[39,35],'364':[32,54]
};
const aliases={'United States of America':'United States','Dem. Rep. Congo':'DR Congo','Dominican Rep.':'Dominican Republic','Central African Rep.':'Central African Republic','Eq. Guinea':'Equatorial Guinea','Bosnia and Herz.':'Bosnia & Herzegovina','S. Sudan':'South Sudan','Solomon Is.':'Solomon Islands','N. Cyprus':'Northern Cyprus','W. Sahara':'Western Sahara','Czechia':'Czech Republic'};
export function decodeWorld(topology){
 const tr=topology.transform||{scale:[1,1],translate:[0,0]}, cache=new Map();
 const arc=index=>{const key=index<0?~index:index;let pts=cache.get(key);if(!pts){let x=0,y=0;pts=topology.arcs[key].map(p=>{x+=p[0];y+=p[1];return [x*tr.scale[0]+tr.translate[0],y*tr.scale[1]+tr.translate[1]];});cache.set(key,pts);}return index<0?[...pts].reverse():pts;};
 const ring=ids=>ids.flatMap((id,i)=>{const a=arc(id);return i?a.slice(1):a;});
 const features=[],defs=[],used=new Set();let index=0;
 for(const g of topology.objects.countries.geometries){index++;let id=g.id==null?'X'+index:String(g.id).padStart(3,'0');if(used.has(id))id=id+'_'+index;used.add(id);
  const polygons=(g.type==='MultiPolygon'?g.arcs:[g.arcs]).map(poly=>poly.map(ring));const rawName=g.properties?.name||`Territory ${index}`;const name=aliases[rawName]||rawName;
  let coords=centers[id];if(!coords){const biggest=polygons.slice().sort((a,b)=>b[0].length-a[0].length)[0]?.[0]||[[0,0]];let x=0,y=0,z=0;for(const[lon,lat]of biggest){const a=lat*Math.PI/180,b=lon*Math.PI/180;x+=Math.cos(a)*Math.cos(b);y+=Math.sin(a);z+=Math.cos(a)*Math.sin(b);}coords=[Math.atan2(y,Math.hypot(x,z))*180/Math.PI,Math.atan2(z,x)*180/Math.PI];}
  const def={id,name,lat:coords[0],lon:coords[1],bloc:blocFor(id),mapIndex:features.length+1};defs.push(def);features.push({...def,polygons});
 }
 return {features,defs:defs.sort((a,b)=>a.name.localeCompare(b.name))};
}
export async function loadWorld(){const response=await fetch(new URL('./vendor/countries-50m.json',import.meta.url));if(!response.ok)throw new Error(`World data could not load (${response.status}). Please reload this page.`);return decodeWorld(await response.json());}
export function drawFeature(ctx,feature,width,height,fill,stroke=null){
 for(const poly of feature.polygons){
  for(const wrap of [-width,0,width]){ctx.beginPath();for(const ring of poly){if(!ring.length)continue;let prior=null;for(let i=0;i<ring.length;i++){let x=(ring[i][0]+180)/360*width;const y=(90-ring[i][1])/180*height;if(prior!==null){while(x-prior>width/2)x-=width;while(x-prior<-width/2)x+=width;}prior=x;if(i===0)ctx.moveTo(x+wrap,y);else ctx.lineTo(x+wrap,y);}ctx.closePath();}if(fill){ctx.fillStyle=fill;ctx.fill('evenodd');}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
 }
}

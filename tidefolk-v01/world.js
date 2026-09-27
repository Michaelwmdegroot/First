'use strict';
/* Small, dependency-free WebGL diorama renderer. The simulation never depends on it. */
const COL={grass:'#91af6b',grass2:'#a3ba78',sand:'#ead3a5',soil:'#99765a',wood:'#957253',woodDark:'#63513e',cream:'#f3e2ba',roof:'#be775c',stone:'#9dada8',water:'#6caeb1'};
function rgba(hex,a=1){if(Array.isArray(hex))return hex;let n=parseInt(hex.replace('#',''),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255,a];}
function mixColor(a,b,t){a=rgba(a);b=rgba(b);return[a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t,a[2]*(1-t)+b[2]*t,1];}
class Geo {
 constructor(){this.v=[];this.transforms=[];this.tint=null;}
 point(p){let [x,y,z]=p;for(let i=this.transforms.length-1;i>=0;i--){let t=this.transforms[i],c=Math.cos(t.r),s=Math.sin(t.r),a=x*c+z*s;z=-x*s+z*c;x=a;x+=t.x;y+=t.y;z+=t.z;}return[x,y,z];}
 at(x,y,z,r,fn){this.transforms.push({x,y,z,r:r||0});fn();this.transforms.pop();}
 tri(a,b,c,color,mode=0){a=this.point(a);b=this.point(b);c=this.point(c);let u=b.map((v,i)=>v-a[i]),w=c.map((v,i)=>v-a[i]),n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],d=Math.hypot(...n)||1;n=n.map(v=>v/d);color=rgba(this.tint||color);for(let p of [a,b,c])this.v.push(...p,...n,...color,mode);}
 quad(a,b,c,d,col,mode=0){this.tri(a,b,c,col,mode);this.tri(a,c,d,col,mode);}
 box(x,y,z,w,h,d,c,mode=0){let a=x-w/2,b=x+w/2,f=z-d/2,k=z+d/2,t=y+h;this.quad([a,y,k],[b,y,k],[b,t,k],[a,t,k],c,mode);this.quad([b,y,f],[a,y,f],[a,t,f],[b,t,f],c,mode);this.quad([a,y,f],[a,y,k],[a,t,k],[a,t,f],c,mode);this.quad([b,y,k],[b,y,f],[b,t,f],[b,t,k],c,mode);this.quad([a,t,k],[b,t,k],[b,t,f],[a,t,f],c,mode);}
 cone(x,y,z,r,h,c,n=8,top=0){for(let i=0;i<n;i++){let a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,p=[x+Math.cos(a)*r,y,z+Math.sin(a)*r],q=[x+Math.cos(b)*r,y,z+Math.sin(b)*r],u=[x+Math.cos(b)*top,y+h,z+Math.sin(b)*top],v=[x+Math.cos(a)*top,y+h,z+Math.sin(a)*top];this.quad(p,q,u,v,c);this.tri([x,y+h,z],v,u,c);}}
 ball(x,y,z,rx,ry,rz,c,n=7,m=4){for(let j=0;j<m;j++)for(let i=0;i<n;i++){let p=(u,v)=>[x+rx*Math.sin(v)*Math.cos(u),y+ry*Math.cos(v),z+rz*Math.sin(v)*Math.sin(u)],a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n,v=j*Math.PI/m,w=(j+1)*Math.PI/m;this.quad(p(a,v),p(b,v),p(b,w),p(a,w),c);}}
 disk(x,y,z,rx,rz,c,n=24,mode=0){for(let i=0;i<n;i++){let a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;this.tri([x,y,z],[x+Math.cos(b)*rx,y,z+Math.sin(b)*rz],[x+Math.cos(a)*rx,y,z+Math.sin(a)*rz],c,mode);}}
 ring(x,y,z,r,width,c,n=40){for(let i=0;i<n;i++){let a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,p=(ang,rad)=>[x+Math.cos(ang)*rad,y,z+Math.sin(ang)*rad];this.quad(p(a,r),p(b,r),p(b,r+width),p(a,r+width),c,3);}}
 roof(x,y,z,w,h,d,col){let a=x-w/2,b=x+w/2,f=z-d/2,k=z+d/2;this.quad([a,y,f],[a,y,k],[x,y+h,k],[x,y+h,f],col);this.quad([x,y+h,f],[x,y+h,k],[b,y,k],[b,y,f],col);this.tri([a,y,k],[b,y,k],[x,y+h,k],COL.cream);this.tri([b,y,f],[a,y,f],[x,y+h,f],COL.cream);}
 beam(a,b,r,col){let dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz);this.at(a[0],a[1],a[2],Math.atan2(dx,dz),()=>this.box(0,0,len/2,r,r,len,col));}
}
function matMul(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){o[c*4+r]=0;for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];}return o;}
class IslandView {
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});if(!this.gl){this.ctx=canvas.getContext('2d');this.software=true;}
  this.yaw=.35;this.elev=.82;this.zoom=1;this.cx=0;this.cz=0;this.visualPeople=new Map();this.lastSeason=-1;
  if(this.software){this.resize();window.addEventListener('resize',()=>this.resize());return;}
  const gl=this.gl,vs=`attribute vec3 aP; attribute vec3 aN; attribute vec4 aC; attribute float aM; uniform mat4 uM; varying vec3 p; varying vec3 n; varying vec4 c; varying float m; void main(){p=aP;n=aN;c=aC;m=aM;gl_Position=uM*vec4(aP,1.0);}`,
  fs=`precision mediump float; varying vec3 p; varying vec3 n; varying vec4 c; varying float m; uniform float uT; uniform float uDay; uniform vec3 uH; void main(){vec3 col=c.rgb;float shade=.72+.28*max(0.0,dot(normalize(n),normalize(vec3(-.5,.9,.4)))); if(m>0.5&&m<1.5){float w=sin(p.x*.95+p.z*1.4+uT*.48)+sin(p.x*1.6-p.z*.6+uT*.32);float g=smoothstep(1.74,1.99,w);col=mix(col,col+vec3(.10,.14,.12),g*.30);shade=1.0;} if(m>2.5&&m<3.5){gl_FragColor=vec4(col,c.a);return;} col*=shade*mix(.42,1.0,uDay);col+=vec3(.30,.15,.04)*exp(-length(p.xz-uH.xz)*.55)*(1.0-uDay);col=mix(col,vec3(.29,.47,.53),.11*(1.0-uDay));gl_FragColor=vec4(col,c.a);}`;
  const compile=(t,s)=>{let a=gl.createShader(t);gl.shaderSource(a,s);gl.compileShader(a);if(!gl.getShaderParameter(a,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(a));return a;};
  this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
  this.attr=['aP','aN','aC','aM'].map(n=>gl.getAttribLocation(this.program,n));this.uni={};['uM','uT','uDay','uH'].forEach(n=>this.uni[n]=gl.getUniformLocation(this.program,n));this.staticBuffer=gl.createBuffer();this.dynamicBuffer=gl.createBuffer();
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(.45,.69,.69,1);
  this.resize();window.addEventListener('resize',()=>this.resize());canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();window.tidefolk?.save();if(window.tidefolk)window.tidefolk.sim.s.paused=true;document.getElementById('fatal').textContent=window.tidefolk?.UI.storageOK?'Graphics were interrupted. Your latest progress is saved; reload to continue.':'Graphics were interrupted. Browser saving is unavailable; try reloading.';document.getElementById('fatal').hidden=false;});
 }
 resize(){this.w=window.innerWidth;this.h=window.innerHeight;let dpr=Math.min(window.devicePixelRatio||1,1.7);this.canvas.width=Math.round(this.w*dpr);this.canvas.height=Math.round(this.h*dpr);this.canvas.style.width=this.w+'px';this.canvas.style.height=this.h+'px';if(this.gl)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);this.camera();}
 camera(){let span=this.w<700?38:Math.max(47,42*this.w/this.h),width=span/this.zoom,height=width*this.h/this.w;this.px=this.w/width;let c=Math.cos(this.yaw),s=Math.sin(this.yaw),se=Math.sin(this.elev),ce=Math.cos(this.elev);let right=[c,0,-s],up=[-s*se,ce,-c*se],back=[s*ce,se,c*ce];let tx=this.cx,tz=this.cz;this.matrix=new Float32Array([2/width*right[0],2/height*up[0],-back[0]/70,0,0,2/height*up[1],-back[1]/70,0,2/width*right[2],2/height*up[2],-back[2]/70,0,-2/width*(right[0]*tx+right[2]*tz),-2/height*(up[0]*tx+up[2]*tz),.0,1]);}
 project(x,y,z){let m=this.matrix;return{x:(m[0]*x+m[4]*y+m[8]*z+m[12]+1)*this.w/2,y:(1-(m[1]*x+m[5]*y+m[9]*z+m[13]))*this.h/2};}
 ground(sx,sy){let x=(sx-this.w/2)/this.px,v=(this.h/2-sy)/this.px,c=Math.cos(this.yaw),s=Math.sin(this.yaw),h=-(v-.55*Math.cos(this.elev))/Math.sin(this.elev);return{x:c*x+s*h+this.cx,z:-s*x+c*h+this.cz};}
 pan(dx,dy){let c=Math.cos(this.yaw),s=Math.sin(this.yaw);this.cx-=c*dx/this.px+s*dy/(this.px*Math.sin(this.elev));this.cz+=s*dx/this.px-c*dy/(this.px*Math.sin(this.elev));this.cx=clamp(this.cx,-20,20);this.cz=clamp(this.cz,-17,17);this.camera();}
 shadow(g,x,z,rx,rz,y=.563){g.disk(x+.2,y,z+.2,rx,rz,[.23,.32,.22,.09]);g.disk(x+.2,y+.001,z+.2,rx*.8,rz*.8,[.22,.30,.20,.12]);}
 tree(g,t,season,small=false){let y=groundY(t.x,t.z),s=t.size*(small?.38:1);if(t.wood<=0&&!small){g.cone(t.x,y,t.z,.21,.18,COL.wood,7,.19);return;}this.shadow(g,t.x,t.z,s,s*.75,y+.016);g.at(t.x,y,t.z,0,()=>{
  g.cone(0,0,0,.16*s,1.25*s,COL.wood,7,.09*s);
  let a=season===2?'#c9a367':season===3?'#c9d8cf':'#71935d',b=season===2?'#d7b774':season===3?'#e4e8d7':'#97b875';
  g.ball(0,1.65*s,0,.91*s,.94*s,.84*s,a,7,4);g.ball(-.38*s,1.48*s,.3*s,.53*s,.58*s,.58*s,b,6,3);g.ball(.33*s,2.07*s,-.05*s,.56*s,.64*s,.51*s,b,6,3);
 });}
 terrain(g,season){g.quad([-150,-.3,-150],[-150,-.3,150],[150,-.3,150],[150,-.3,-150],'#6aadae',1);const n=80;
  let rings=[[1.14,-.27,'#83bfba'],[1.085,-.19,'#a3cec2'],[1.035,-.02,'#c5d9c0'],[1,.06,COL.sand],[.955,.22,COL.sand],[.867,.55,season===3?'#c5d1b3':season===2?'#b0b279':COL.grass]];
  for(let r=0;r<rings.length;r++){let [sz,y,col]=rings[r];for(let i=0;i<n;i++){let a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,pt=(ang,rad,h)=>[Math.cos(ang)*radiusAt(ang)*rad,h,Math.sin(ang)*radiusAt(ang)*rad*.82];if(r===rings.length-1)g.tri([0,y,0],pt(b,sz,y),pt(a,sz,y),col /* uninterrupted meadow; no radial colour spokes */);else{let next=rings[r+1];g.quad(pt(a,sz,y),pt(b,sz,y),pt(b,next[0],next[1]),pt(a,next[0],next[1]),col);}}
  }
  // An irregular shore is framed with small white foam breaks.
  for(let i=0;i<58;i++){let a=i/58*Math.PI*2,r=radiusAt(a)*1.024;g.at(Math.cos(a)*r,.012,Math.sin(a)*r*.82,-a,()=>g.box(0,0,0,.65,.012,.05,[.88,.94,.84,.5],3));}
  // The ridge and outcrops leave the central meadow open for building.
  for(let i=0;i<5;i++){let x=-1+i*.75,z=-9.6+(i%2)*.2;g.ball(x,.65,z,1.1,1.35+i*.09,1.1,season===3?'#cbd4cd':'#a0b0a2',6,3);}
  for(let i=0;i<6;i++)g.ball(6+(i%3)*.58,.65,-7+Math.floor(i/3)*.54,.65,.4+(i%3)*.25,.6,'#a7b3aa',6,3);
  g.ball(10,.7,-4,1,.8,.8,'#ae9b7c',7,3);g.ball(10.3,1.0,-3.65,.35,.25,.32,'#bc895e',5,3);
  g.disk(-7,.563,-5,1.1,.85,'#6da9a6',24,1);g.disk(-7,.57,-5,.65,.55,'#99c9b9',24,1);for(let i=0;i<9;i++){let a=i/9*Math.PI*2;g.ball(-7+Math.cos(a)*1.1,.59,-5+Math.sin(a)*.85,.25,.22,.2,COL.stone,5,3);}
  let rng=rand(562);for(let i=0;i<140;i++){let x=(rng()-.5)*29,z=(rng()-.5)*23,r=landRatio(x,z);if(r<.86&&r>.35){let c=season===2?'#bfbb82':season===3?'#dce0c5':'#c6cb8c';g.cone(x,.56,z,.08,.14,c,4);if(i%4===0)g.ball(x,.7,z,.07,.07,.07,i%2?'#efe5ba':'#d7bb98',4,2);}}
  // Three distant islets make the horizon feel larger without unlocking Island Two.
  for(let [x,z,r]of [[-30,-24,3],[30,-29,4],[38,3,1.8]]){g.cone(x,-.26,z,r,.65,'#c6d6b5',10,r*.65);g.ball(x,.65,z,r*.55,.7,r*.47,'#7f9c7d',8,3);}
 }
 boat(g,x,y,z,r=0,scale=1,sail=true){const start=g.v.length;g.at(x,y,z,r,()=>{
  g.quad([-.62,0,1.25],[.62,0,1.25],[.65,.45,-.8],[-.65,.45,-.8],COL.wood);g.tri([-.65,.45,-.8],[.65,.45,-.8],[0,.55,-1.65],COL.woodDark);g.quad([-.62,0,1.25],[-.65,.45,-.8],[0,-.12,-1.15],[0,-.12,1],COL.woodDark);g.quad([0,-.12,1],[0,-.12,-1.15],[.65,.45,-.8],[.62,0,1.25],COL.wood);g.box(0,.34,.28,1.15,.09,1.7,'#be9b6b');g.box(0,.35,0,.09,2.15,.09,COL.woodDark);
  if(sail){g.tri([.07,2.45,0],[.07,.75,0],[1.28,.82,.13],COL.cream);g.tri([-.06,2.22,0],[-1.04,.85,.07],[-.06,.74,0],'#e1bd90');g.tri([.08,2.45,0],[.08,2.12,0],[.53,2.13,.05],'#bd775b');}
 });if(scale!==1)for(let i=start;i<g.v.length;i+=11){g.v[i]=x+(g.v[i]-x)*scale;g.v[i+1]=y+(g.v[i+1]-y)*scale;g.v[i+2]=z+(g.v[i+2]-z)*scale;}}
 building(g,b,season,ghost=false){let d=BUILD[b.type],y=groundY(b.x,b.z);this.shadow(g,b.x,b.z,d.size,d.size*.8,y+.012);g.at(b.x,y,b.z,b.rot,()=>{
  const post=(x,z,h=1.15)=>g.box(x,0,z,.12,h,.12,COL.woodDark),log=(x,z,r=.15)=>g.cone(x,r,z,r,1,COL.wood,7,r),window=(x,z=.77)=>{g.box(x,.67,z,.28,.36,.04,'#e7b769',3);g.box(x,.82,z+.025,.3,.03,.05,COL.woodDark);g.box(x,.66,z+.025,.025,.39,.05,COL.woodDark);};
  if(!b.built&&!ghost){g.box(0,0,0,d.size*1.5,.07,d.size*1.4,'#bdad88');for(let x of [-1,1])for(let z of [-1,1])post(x*d.size*.7,z*d.size*.65,Math.max(.2,Math.min(1.25,b.progress/d.labor*1.7)));g.box(0,.1,.3,d.size*1.2,.11,.12,COL.wood);return;}
  if(b.type==='hearth'){g.disk(0,.01,0,1,.85,'#b5a17e',20);for(let i=0;i<11;i++){let a=i/11*6.283;g.ball(Math.cos(a)*.68,.17,Math.sin(a)*.68,.2,.15,.2,'#a6a899',5,3);}g.box(0,.11,0,1,.18,.2,COL.woodDark);g.box(0,.13,0,.2,.18,1,COL.woodDark);for(let x of[-1.3,1.3]){g.box(x,.1,.1,.23,.22,1.2,COL.wood);}}
  else if(b.type==='shelter'){post(-1,-.55,1.0);post(1,-.55,1.0);g.quad([-1.28,1.35,-.6],[1.28,1.35,-.6],[1.28,.12,1],[-1.28,.12,1],'#d8bd88');g.box(0,.03,.2,2.2,.08,1.3,'#a7956a');}
  else if(b.type==='field'){g.box(0,0,0,2.7,.12,2.7,'#917356');for(let i=0;i<5;i++){g.box(-1.05+i*.52,.12,0,.25,.04,2.5,'#ad8c65');for(let j=0;j<5;j++){let h=season===3?.04:.10+b.growth/14*.43,c=b.growth>11?'#dac078':'#9cb46b';g.cone(-1.04+i*.52,.15,-1.02+j*.5,.12,h,c,5);}}for(let x of[-1.45,1.45]){post(x,-1.4,.4);post(x,1.4,.4);g.box(x,.26,0,.06,.06,2.8,COL.wood);}}
  else if(b.type==='house'||b.type==='school'||b.type==='healer'){let w=b.up?2.6:2.2,h=1.5,dep=1.7;g.box(0,0,0,w,.18,dep+.15,'#9b9b85');g.box(0,.18,0,w,h,dep,COL.cream);g.roof(0,1.68,0,w+.45,.84,dep+.5,b.type==='healer'?'#83a499':b.type==='school'?'#b99e63':b.up?'#a08065':COL.roof);g.box(0,.18,.88,.4,.88,.07,COL.woodDark);window(-.66,.88);window(.66,.88);g.box(.64,1.5,-.45,.3,1.0,.33,'#b1ada0');if(b.type==='healer'){g.box(0,1.2,.91,.35,.09,.03,'#96b1a0');g.box(0,1.08,.92,.09,.33,.03,'#96b1a0');}if(b.type==='school')g.box(-.9,.25,1,.35,.25,.3,'#bd9a69');g.box(0,.05,1.02,.65,.12,.4,'#b7ac8b');}
  else if(b.type==='woodpost'){post(-.65,-.5,.9);post(.65,-.5,.9);g.box(0,.87,-.25,1.7,.12,1.2,b.up?'#9dad78':'#c4b37e');g.cone(.45,0,.35,.36,.42,COL.wood,8,.33);for(let i=0;i<5;i++)g.box(-.55,.08+Math.floor(i/3)*.2,-.1+(i%3)*.19,.7,.16,.15,'#bc976a');if(b.up){g.box(-.65,.05,.65,.28,.13,.5,'#91a071');g.cone(-.65,.18,.6,.14,.5,'#78a068',5);}}
  else if(b.type==='hunt'){post(-.6,-.4);post(.6,-.4);g.box(0,1.15,-.4,1.4,.08,.12,COL.woodDark);g.box(0,.48,.2,1.3,.08,.6,COL.wood);g.tri([-.6,1.2,-.4],[.6,1.2,-.4],[.55,.15,-.4],'#c0a075');g.box(.48,.56,.2,.32,.1,.24,'#c18e68');}
  else if(b.type==='store'||b.type==='workshop'){let w=2.35,dep=1.65;g.box(0,.08,-.65,w,1.2,.18,'#b89b76');for(let x of[-1,1])for(let z of[-.6,.6])post(x,z,1.35);g.roof(0,1.4,0,w+.35,.65,dep+.3,b.type==='store'?'#a2916b':'#8e9b78');g.box(0,0,0,w,.12,dep,'#aa9b7c');if(b.type==='store'){for(let i=0;i<4;i++){g.box(-.7+(i%2)*.85,.12+Math.floor(i/2)*.45,-.2,.7,.4,.7,'#c4a775');g.box(-.7+(i%2)*.85,.27+Math.floor(i/2)*.45,.16,.72,.06,.04,COL.woodDark);}}else{g.box(0,.55,.15,1.75,.12,.7,COL.wood);post(-.7,.15,.55);post(.7,.15,.55);g.box(-.4,.69,.15,.65,.06,.3,'#ddbf8c');}}
  else if(b.type==='fish'||b.type==='jetty'){for(let i=0;i<8;i++)g.box(0,.2,i*.35,1.1,.1,.28,'#c1a17a');post(-.62,.4,.8);post(.62,2.2,.8);if(b.type==='fish'){post(-.65,-.35,1.5);post(.65,-.35,1.5);g.roof(0,1.5,-.25,1.65,.55,1.15,'#7e9f97');g.cone(-.45,.31,.5,.22,.34,'#c8b38a',8,.24);g.box(.44,.31,.0,.2,.8,.04,COL.woodDark);}}
  else if(b.type==='water'){for(let x of[-.48,.48]){g.cone(x,.07,0,.35,b.up?.9:.65,'#a68b63',10,.37);g.disk(x,b.up?.98:.74,0,.33,.33,'#8ab7ad',16,1);g.ring(x,.3,0,.35,.035,COL.woodDark,16);}if(b.up)g.roof(0,1.6,0,1.7,.3,1.3,'#88a496');}
  else if(b.type==='quarry'){g.box(0,.05,0,1.8,.12,1.3,'#b3aa8e');for(let i=0;i<6;i++)g.ball(-.5+(i%3)*.5,.3+Math.floor(i/3)*.15,(i%2)*.45-.3,.36,.33,.32,COL.stone,5,3);post(-.75,-.4,1.45);post(.75,-.4,1.45);g.box(0,1.4,-.4,1.7,.12,.15,COL.woodDark);}
  else if(b.type==='forge'||b.type==='smoker'){g.box(0,0,0,1.4,1.3,1.15,b.type==='forge'?'#9b9e8d':'#b8a079');g.roof(0,1.3,0,1.7,.4,1.45,'#777f72');g.box(.42,1.1,-.3,.36,1.25,.36,COL.stone);g.box(0,.3,.59,.55,.6,.02,'#71553e');g.box(0,.38,.62,.35,.27,.03,'#e39a54',3);}
  else if(b.type==='signal'){for(let x of[-.45,.45])for(let z of[-.45,.45])post(x,z,1.65);g.box(0,1.65,0,1.15,.15,1.15,COL.woodDark);g.cone(0,1.8,0,.45,.12,COL.stone,8,.5);}
  else if(b.type==='boatyard'){for(let i=0;i<9;i++)g.box(0,.06,-1.3+i*.4,2.8,.11,.3,'#beaa85');for(let x of[-1.4,1.4]){post(x,-1,2.1);post(x,1.4,2.1);}g.box(0,2.03,-1,3.1,.13,.16,COL.woodDark);g.box(0,2.03,1.4,3.1,.13,.16,COL.woodDark);}
  else if(b.type==='bench'){g.box(0,.3,0,1.1,.1,.38,COL.wood);g.box(-.4,0,0,.12,.3,.28,COL.woodDark);g.box(.4,0,0,.12,.3,.28,COL.woodDark);g.box(0,.45,-.17,1.1,.23,.08,COL.wood);}
  else if(b.type==='lamp'){post(0,0,1.6);g.box(.1,1.55,0,.35,.07,.12,COL.woodDark);g.box(.22,1.19,0,.23,.32,.23,'#f4cb78',3);g.roof(.22,1.5,0,.32,.15,.32,COL.woodDark);}
 });}
 rebuild(sim){const g=new Geo();this.terrain(g,sim.season);
  for(let path of sim.s.paths)for(let i=1;i<path.length;i++){let a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,n=Math.hypot(dx,dz)||1,w=.25;g.quad([a.x-dz/n*w,.562,a.z+dx/n*w],[b.x-dz/n*w,.562,b.z+dx/n*w],[b.x+dz/n*w,.562,b.z-dx/n*w],[a.x+dz/n*w,.562,a.z-dx/n*w],'#c7b78b');}
  for(let t of sim.s.world.trees)this.tree(g,t,sim.season,t.wood<=0&&t.regrow>0);
  let wr=sim.s.world.nodes.find(n=>n.id==='wreck');if(wr.left>0){g.at(wr.x,.13,wr.z,.4,()=>{g.box(0,.12,0,2.8,.25,.9,COL.woodDark);for(let i=0;i<5;i++)g.box(-1+i*.45,.35,0,.32,.12,1.05,COL.wood);g.box(-.6,.4,0,.09,1.6,.09,COL.woodDark);g.tri([-.6,1.9,0],[-.6,.7,0],[.65,.6,.3],'#cfbb93');g.box(1.5,.13,.1,.5,.42,.5,'#b99a70');});}
  g.at(5,.08,10,.8,()=>{g.box(0,0,0,2,.2,.2,COL.wood);g.box(0,.08,.4,1.4,.15,.18,COL.wood);});
  for(let b of sim.buildings)this.building(g,b,sim.season);
  this.staticCount=g.v.length/11;this.staticVerts=new Float32Array(g.v);const gl=this.gl;if(gl){gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,this.staticVerts,gl.STATIC_DRAW);}this.lastSeason=sim.season;sim.dirty=false;
 }
 person(g,p,sim,t){let old=this.visualPeople.get(p.id)||{x:p.x,z:p.z};old.x+=(p.x-old.x)*.2;old.z+=(p.z-old.z)*.2;this.visualPeople.set(p.id,old);let walking=Math.hypot(p.x-old.x,p.z-old.z)>.03,life=sim.life(p),scale=life==='Baby'?.40:life==='Child'?.65:life==='Teen'?.84:1,y=groundY(old.x,old.z);
  this.shadow(g,old.x,old.z,.3*scale,.2*scale,y+.015);g.at(old.x,y,old.z,p.facing||0,()=>{let stride=walking?Math.sin(t*9+hash(p.id))*.12:0;
   g.box(-.10*scale,0,stride,.115*scale,.28*scale,.14*scale,'#576259');g.box(.10*scale,0,-stride,.115*scale,.28*scale,.14*scale,'#576259');g.cone(0,.23*scale,0,.19*scale,.37*scale,p.color,7,.16*scale);g.ball(0,.75*scale,0,.2*scale,.23*scale,.19*scale,p.skin,8,4);g.ball(0,.89*scale,-.03*scale,.205*scale,.13*scale,.19*scale,['#66503e','#96724f','#584d43','#a78454'][hash(p.id)%4],7,3);
   g.box(-.23*scale,.27*scale,-stride,.10*scale,.27*scale,.1*scale,p.skin);g.box(.23*scale,.27*scale,stride,.10*scale,.27*scale,.1*scale,p.skin);if(p.task?.kind==='deliver')g.box(0,.34*scale,.29*scale,.44*scale,.22*scale,.22*scale,'#b49360');
  });
 }
 drawSoftware(dynamic,day,t){
  // A real geometry-based fallback for browsers without a usable WebGL context.
  const ctx=this.ctx,dpr=this.canvas.width/this.w,m=this.matrix,triangles=[];
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#75b5b3';ctx.fillRect(0,0,this.w,this.h);
  const collect=v=>{for(let i=0;i<v.length;i+=33){let pts=[],dep=0;
   for(let j=0;j<3;j++){let k=i+j*11,x=v[k],y=v[k+1],z=v[k+2];pts.push([(m[0]*x+m[4]*y+m[8]*z+m[12]+1)*this.w/2,(1-m[1]*x-m[5]*y-m[9]*z-m[13])*this.h/2]);dep+=m[2]*x+m[6]*y+m[10]*z;}
   if(pts.every(p=>p[0]<0)||pts.every(p=>p[0]>this.w)||pts.every(p=>p[1]<0)||pts.every(p=>p[1]>this.h))continue;
   let n=[v[i+3],v[i+4],v[i+5]],shade=.72+.28*Math.max(0,(-.5*n[0]+.9*n[1]+.4*n[2])/1.105),mode=v[i+10];
   if(mode===1)shade=1;let k=mode===3?1:shade*(.42+.58*day),r=Math.min(255,Math.round(v[i+6]*255*k)),g=Math.min(255,Math.round(v[i+7]*255*k)),b=Math.min(255,Math.round(v[i+8]*255*k));
   if(Math.max(v[i+1],v[i+12],v[i+23])<.58)dep=100000-(v[i+1]+v[i+12]+v[i+23])*100;triangles.push({p:pts,z:dep,c:`rgba(${r},${g},${b},${v[i+9]})`,a:v[i+9]});
  }};
  collect(this.staticVerts);collect(dynamic);triangles.sort((a,b)=>b.z-a.z);
  for(let q of triangles){ctx.fillStyle=q.c;ctx.beginPath();ctx.moveTo(...q.p[0]);ctx.lineTo(...q.p[1]);ctx.lineTo(...q.p[2]);ctx.closePath();ctx.fill();if(q.a>.99){ctx.lineWidth=.5;ctx.strokeStyle=q.c;ctx.stroke();}}
 }
 drawBuffer(buffer,count){let gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);let stride=44,offset=0;[3,3,4,1].forEach((n,i)=>{gl.enableVertexAttribArray(this.attr[i]);gl.vertexAttribPointer(this.attr[i],n,gl.FLOAT,false,stride,offset);offset+=n*4;});gl.drawArrays(gl.TRIANGLES,0,count);}
 render(sim,t,selection=null,ghost=null){if(this.software&&t-(this.lastSoft||0)<.12)return;this.lastSoft=t;this.camera();if(sim.dirty||this.lastSeason!==sim.season)this.rebuild(sim);let day=.94+.06*Math.sin((sim.s.time-.25)*Math.PI*2);if(sim.night)day=.58;day=clamp(day,.50,1);if(!sim.s.started)day=.95;
  let gl=this.gl;if(gl){gl.useProgram(this.program);gl.clearColor(.41*day+.14*(1-day),.68*day+.22*(1-day),.68*day+.28*(1-day),1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniformMatrix4fv(this.uni.uM,false,this.matrix);gl.uniform1f(this.uni.uT,t);gl.uniform1f(this.uni.uDay,day);let hp=sim.hearthPos();gl.uniform3f(this.uni.uH,hp.x,.5,hp.z);this.drawBuffer(this.staticBuffer,this.staticCount);}
  let g=new Geo();for(let p of sim.people)if(!sim.s.boat.crew.includes(p.id)||!['sailing','arrived'].includes(sim.s.boat.stage))this.person(g,p,sim,t);
  for(let b of sim.buildings.filter(b=>b.built)){
   if(['hearth','signal'].includes(b.type)){let y=groundY(b.x,b.z)+(b.type==='signal'?1.95:.2);g.cone(b.x,y,b.z,.22+.05*Math.sin(t*9),.60+.1*Math.sin(t*8),'#efac5f',7);g.cone(b.x,y+.1,b.z,.12,.50,'#ffdb8c',6);for(let i=0;i<4;i++){let a=t*.35+i*.8;g.ball(b.x+Math.sin(a)*.12,y+.7+(a%1)*1.0,b.z,.09,.12,.08,[.83,.79,.67,.21],5,3);}}
   if(['house','forge','smoker'].includes(b.type))for(let i=0;i<3;i++){let h=(t*.25+i*.3)%1;g.ball(b.x+.6+h*.25,groundY(b.x,b.z)+2.35+h*1.3,b.z-.35,.13+h*.12,.18+h*.12,.12,[.8,.79,.7,(1-h)*.3],6,3);}
   if(b.type==='fish'&&b.up){let a=t*.08+hash(b.id)%10;this.boat(g,b.x+Math.sin(a)*1.2,.0,b.z+2.5+Math.cos(a)*.4,.3,.5,false);}
  }
  let boat=sim.s.boat,yard=sim.buildings.find(b=>b.type==='boatyard'&&b.built);
  if(yard&&['sailing','arrived'].includes(boat.stage)){
   const nx=yard.x+38,nz=yard.z+21;
   g.cone(nx,-.22,nz,8.5,.36,'#b2cec0',32,8.1);g.cone(nx,.14,nz,8.1,.38,'#e3cc9d',32,7.1);g.cone(nx,.52,nz,7.1,.15,'#98b482',32,6.9);
   for(let i=0;i<7;i++)g.ball(nx+1.5+Math.cos(i)*2,.8+i*.07,nz-1.6+Math.sin(i)*1.3,.7,.85,.8,i%2?'#b98c63':'#899d8f',7,4);
   for(let i=0;i<7;i++){let a=i*2.3;this.tree(g,{x:nx+Math.cos(a)*4,z:nz+Math.sin(a)*3.9,size:.75,wood:8},0);}
   if(boat.stage==='arrived')for(let i=0;i<boat.crew.length;i++){let p=sim.people.find(p=>p.id===boat.crew[i]);if(p){g.at(nx-4+i*.65,.65,nz+1,0,()=>{g.cone(0,0,0,.18,.55,p.color);g.ball(0,.73,0,.2,.22,.2,p.skin);});}}
  }
  if(yard&&boat.stage!=='none'){if(boat.stage==='building'||boat.stage==='ready')this.boat(g,yard.x,.78,yard.z,yard.rot,1,boat.progress>6);else{let travel=clamp((boat.travel||0)/2,0,1),x=yard.x+travel*30,z=yard.z+travel*18;this.boat(g,x,.1+Math.sin(t)*.05,z,-2.1);}}
  if(sim.s.pendingArrival){let p={...sim.s.pendingArrival,id:'pending',color:'#a6806b',skin:'#ddaf8b',birthDay:-3000};this.person(g,p,sim,t);}
  for(let i=0;i<5;i++){let a=t*.14+i*1.26,x=Math.cos(a)*(14+i),z=Math.sin(a)*(10+i),y=3.2+i*.3;let w=.26+Math.sin(t*7+i)*.09;g.tri([x-w,y,z],[x,y-.06,z+.08],[x+w,y,z],'#ebeadd',3);}
  if(sim.season===3)for(let i=0;i<45;i++){let h=hash(i),x=h%300/10-15,z=(h>>8)%240/10-12,y=1+((h/100+t*.5)%5);g.ball(x,y,z,.035,.035,.035,'#eef1e4',3,2);}
  if(selection){let obj=selection.kind==='person'?sim.people.find(p=>p.id===selection.id):selection.kind==='building'?sim.getB(selection.id):sim.s.world.nodes.find(n=>n.id===selection.id);if(obj)g.ring(obj.x,groundY(obj.x,obj.z)+.035,obj.z,selection.kind==='building'?BUILD[obj.type].size+.12:.6,.045,'#f3e2af');}
  if(this.previewPath)for(let i=1;i<this.previewPath.length;i++){let a=this.previewPath[i-1],b=this.previewPath[i];g.beam([a.x,.62,a.z],[b.x,.62,b.z],.16,'#e5d6a5');}
  if(ghost){let bad=sim.placement(ghost.type,ghost.x,ghost.z,ghost.moveId),color=bad?'#d69478':'#edf0c5';g.ring(ghost.x,groundY(ghost.x,ghost.z)+.03,ghost.z,BUILD[ghost.type].size,.07,color);g.tint=rgba(bad?'#bc735c':'#eef0da',.5);this.building(g,{...ghost,built:true},sim.season,true);g.tint=null;}
  if(gl){gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.v),gl.DYNAMIC_DRAW);this.drawBuffer(this.dynamicBuffer,g.v.length/11);}else this.drawSoftware(g.v,day,t);
 }
}

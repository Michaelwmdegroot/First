"""Tidefolk 0.1.1: deterministic, scoped recovery of the published prototype."""
from pathlib import Path
import sys
root=Path(sys.argv[1] if len(sys.argv)>1 else 'tidefolk-v01')

def replace(text,old,new):
    assert text.count(old)==1, 'Unexpected source; refusing patch: '+old[:100]
    return text.replace(old,new,1)

ui=(root/'ui.js').read_text()
if "version:'0.1.1'" in ui:
    print('Tidefolk 0.1.1 recovery already applied; leaving all source unchanged.')
    sys.exit(0)
assert "version:'0.1.0'" in ui, 'Not the expected release; no recovery changes made.'
helpers='''// Preserve live touch targets across HUD updates, including moving map markers.
function patchTree(target, source){
 const incoming=Array.from(source.childNodes);
 incoming.forEach((next,i)=>{
  const old=target.childNodes[i];
  if(!old){target.appendChild(next.cloneNode(true));return;}
  if(old.nodeType!==next.nodeType||old.nodeName!==next.nodeName){old.replaceWith(next.cloneNode(true));return;}
  if(next.nodeType===3){if(old.nodeValue!==next.nodeValue)old.nodeValue=next.nodeValue;return;}
  if(next.nodeType===1){patchAttributes(old,next);patchTree(old,next);}
 });
 while(target.childNodes.length>incoming.length)target.lastChild.remove();
}
function patchAttributes(target,source){
 for(const a of Array.from(target.attributes))if(!source.hasAttribute(a.name))target.removeAttribute(a.name);
 for(const a of source.attributes)if(target.getAttribute(a.name)!==a.value)target.setAttribute(a.name,a.value);
}
function stableHTML(target,html){
 if(target._tideHTML===html)return;
 const template=document.createElement('template');template.innerHTML=html;
 patchTree(target,template.content);target._tideHTML=html;
}
function stableMarkers(html){
 const target=$('#markers');if(target._tideHTML===html)return;
 const template=document.createElement('template');template.innerHTML=html;
 const existing=new Map(Array.from(target.children).map(el=>[el.dataset.act,el]));
 for(const next of template.content.children){
  const old=existing.get(next.dataset.act);
  if(old){patchAttributes(old,next);patchTree(old,next);existing.delete(next.dataset.act);}
  else target.appendChild(next.cloneNode(true));
 }
 for(const old of existing.values())old.remove();
 target._tideHTML=html;
}
'''
ui=replace(ui,'function paintHUD(){',helpers+'function paintHUD(){')
ui=replace(ui,"$('#resources').innerHTML=rs.map", "stableHTML($('#resources'),rs.map")
ui=replace(ui,"</small></span></button>`).join('');", "</small></span></button>`).join(''));")
ui=replace(ui,"$('#pausebtn').innerHTML=ico(s.paused?'play':'pause');", "stableHTML($('#pausebtn'),ico(s.paused?'play':'pause'));")
ui=replace(ui,"$('#objective').innerHTML=`", "stableHTML($('#objective'),`")
ui=replace(ui,'${done/GOALS.length*100}%"></i></div>`;', '${done/GOALS.length*100}%"></i></div>`);')
ui=replace(ui,"$('#markers').innerHTML=str;", "stableMarkers(str);")
ui=replace(ui,"document.addEventListener('visibilitychange',()=>{if(document.hidden){save();if(UI.sound)UI.sound.ctx.suspend();}});", "document.addEventListener('visibilitychange',()=>{if(document.hidden){save();if(UI.sound)UI.sound.ctx.suspend().catch(()=>{});}else if(UI.sound)UI.sound.ctx.resume().catch(()=>{});});")
ui=replace(ui,"version:'0.1.0'", "version:'0.1.1'")

world=(root/'world.js').read_text()
world=replace(world,"e.preventDefault();document.getElementById('fatal').textContent='The graphics context was paused. Your game is saved; reload to continue.';", "e.preventDefault();window.tidefolk?.save();if(window.tidefolk)window.tidefolk.sim.s.paused=true;document.getElementById('fatal').textContent=window.tidefolk?.UI.storageOK?'Graphics were interrupted. Your latest progress is saved; reload to continue.':'Graphics were interrupted. Browser saving is unavailable; try reloading.';")
world=replace(world,"mixColor(col,i%3?'#9ab57b':'#c2ce99',.07*(i%4))", "col /* uninterrupted meadow; no radial colour spokes */")

css=(root/'style.css').read_text()
css+='''
/* 0.1.1: readable mobile forms, safe focus sizing, accessible panel dismissal. */
@media(max-width:600px){select,input[type=text],input[type=number]{font-size:16px}.close{width:40px;height:40px}.panel-body p{font-size:13px}.welcome .smallprint{font-size:10px}}
@media(prefers-reduced-motion:reduce){button,#toast{transition:none!important}}
'''
# Write only after every source precondition has passed.
(root/'ui.js').write_text(ui)
(root/'world.js').write_text(world)
(root/'style.css').write_text(css)
print('Recovered only ui.js, world.js and style.css; version 0.1.1, save schema unchanged.')

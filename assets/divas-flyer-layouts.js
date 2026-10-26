/* Responsive art direction. Geometry is pure; every generated element remains editable. */
(function(root){
 'use strict';
 const families={atelier_cover:'Portada · impacto',atelier_magazine:'Revista · retrato',atelier_poster:'Escenario · protagonista',atelier_invitation:'Invitación · joya',atelier_stage:'Noche · luces',atelier_minimal:'Editorial · aire'};
 const apps=[{key:'salsa',role:'app3',name:'Salsa'},{key:'cafe',role:'app2',name:'Café'},{key:'buzzcast',role:'app1',name:'BuzzCast'}];
 function plan(size,layout,count=0){
  const W=size.ancho,H=size.alto,ratio=W/H,banner=ratio>3,wide=ratio>1.18,tall=ratio<.78,R=(x,y,w,h)=>({x:x*W,y:y*H,w:w*W,h:h*H});let s;
  const variant=Object.keys(families).indexOf(layout),mirror=layout==='atelier_magazine';
  if(banner){s={logo:R(.10,.24,.15,.31),idea_kicker:R(.415,.11,.42,.07),titulo:R(.415,.40,.43,.43),idea_fecha:R(.415,.69,.43,.075),descripcion:R(.415,.85,.43,.19),idea_hero:R(.78,.32,.25,.51),accion:R(.81,.75,.27,.09),base_accion:R(.81,.75,.30,.15),contacto:R(.81,.92,.31,.07),imageArea:R(.10,.88,.14,.13),align:'left',brandAlign:'center',appArea:R(.10,.63,.16,.20)};}
  else if(wide){s={logo:R(.29,.10,.27,.12),idea_kicker:R(.29,.225,.45,.055),titulo:R(.29,.42,.46,.27),idea_fecha:R(.29,.59,.44,.05),descripcion:R(.29,.70,.44,.13),idea_hero:R(.77,.43,.38,.68),accion:R(.29,.84,.40,.05),base_accion:R(.29,.84,.44,.085),contacto:R(.29,.95,.44,.045),imageArea:R(.77,.79,.31,.055),align:'left',brandAlign:'left',appArea:R(.77,.91,.29,.10)};}
  else if(layout==='atelier_cover'||mirror){s={logo:R(.29,.105,.39,.14),idea_kicker:R(.29,.225,.44,.055),titulo:R(.29,.385,.44,.24),idea_fecha:R(.29,.54,.44,.05),descripcion:R(.29,.65,.44,.15),idea_hero:R(.77,.38,.38,.55),accion:R(.5,.79,.78,.048),base_accion:R(.5,.79,.84,.078),contacto:R(.5,.96,.80,.042),imageArea:R(.77,.715,.32,.055),align:'left',brandAlign:'left',appArea:R(.5,.88,.51,.075)};}
  else if(layout==='atelier_poster'){s={logo:R(.5,.08,.36,.11),idea_kicker:R(.5,.18,.80,.045),titulo:R(.5,.55,.84,.18),idea_fecha:R(.5,.665,.80,.04),descripcion:R(.5,.737,.80,.085),idea_hero:R(.5,.325,.52,tall?.245:.25),accion:R(.5,.908,.78,.042),base_accion:R(.5,.908,.84,.066),contacto:R(.5,.971,.80,.03),imageArea:R(.5,.465,.66,.025),align:'center',brandAlign:'center',appArea:R(.5,.83,.51,.065)};}
  else if(layout==='atelier_invitation'){s={logo:R(.5,.12,.36,.13),idea_kicker:R(.5,.245,.75,.045),titulo:R(.5,.38,.74,.19),idea_fecha:R(.5,.51,.72,.045),descripcion:R(.5,.605,.72,.12),idea_hero:R(.86,.13,.16,.17),accion:R(.5,.835,.70,.047),base_accion:R(.5,.835,.76,.08),contacto:R(.5,.935,.74,.045),imageArea:R(.5,.765,.58,.025),align:'center',brandAlign:'center',appArea:R(.5,.715,.48,.07)};}
  else if(layout==='atelier_stage'){s={logo:R(.26,.105,.38,.14),idea_kicker:R(.26,.27,.40,.085),titulo:R(.5,.475,.84,.19),idea_fecha:R(.5,.605,.80,.045),descripcion:R(.5,.69,.80,.105),idea_hero:R(.755,.22,.42,.32),accion:R(.5,.885,.78,.045),base_accion:R(.5,.885,.84,.075),contacto:R(.5,.963,.80,.035),imageArea:R(.5,.768,.65,.025),align:'center',brandAlign:'left',appArea:R(.5,.817,.51,.065)};}
  else{s={logo:R(.28,.10,.38,.13),idea_kicker:R(.28,.225,.43,.045),titulo:R(.28,.40,.43,.27),idea_fecha:R(.28,.575,.43,.05),descripcion:R(.5,.69,.84,.12),idea_hero:R(.765,.34,.38,.49),accion:R(.5,.886,.78,.047),base_accion:R(.5,.886,.84,.078),contacto:R(.5,.96,.80,.04),imageArea:R(.77,.615,.32,.05),align:'left',brandAlign:'left',appArea:R(.5,.808,.51,.065)};}
  // Mirroring changes the reading direction and focal point, not just a colour.
  if(mirror&&!banner){for(const [key,box] of Object.entries(s))if(box&&typeof box==='object')box.x=W-box.x;s.align='right';s.brandAlign='right';}
  if(wide&&!banner&&[2,3,4].includes(variant)){s.titulo.y=H*.405;s.titulo.h=H*.30;s.idea_hero.w*=variant===3?.76:1;s.idea_hero.h*=variant===3?.78:1;}
  s.idea_marca={...s.logo};s.idea_brush={...s.titulo,w:s.titulo.w*1.07,h:s.titulo.h*1.1};s.motif={...s.idea_hero};s.full=false;s.variant=variant;
  const a=s.appArea,cell=Math.min(a.w/3*.78,a.h);apps.forEach((app,i)=>s[app.role]=R((a.x+(i-1)*a.w/3)/W,a.y/H,cell/W,cell/H));
  const area=s.imageArea,cols=Math.max(1,Math.min(count,4)),rows=Math.max(1,Math.ceil(count/cols));
  s.images=Array.from({length:count},(_,i)=>({x:area.x+(i%cols-(Math.min(cols,count-Math.floor(i/cols)*cols)-1)/2)*area.w/cols,y:area.y+(Math.floor(i/cols)-(rows-1)/2)*area.h/rows,w:area.w/cols*.85,h:area.h/rows*.9}));
  return s;
 }
 const api={families,apps,plan};if(typeof module==='object'&&module.exports)module.exports=api;else root.DivasFlyerLayouts=api;
})(typeof window==='undefined'?globalThis:window);

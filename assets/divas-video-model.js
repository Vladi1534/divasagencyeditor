/* Versioned, browser-independent rules. v39 backups are migrated without changing their media. */
(function(root){
 'use strict';
 const LIMITS={scenes:30,layers:12,audio:4,seconds:180,totalBytes:150*1024*1024,imageBytes:20*1024*1024,videoBytes:80*1024*1024,audioBytes:30*1024*1024};
 const uid=()=>globalThis.crypto.randomUUID();
 const number=(x,f,min,max)=>x!==null&&x!==''&&Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):f;
 const clean=(x,max=80)=>String(x??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').slice(0,max);
 const color=(x,f='#ffffff')=>/^#[0-9a-f]{6}$/i.test(x)?x:f;
 const formats={'9:16':[1080,1920],'1:1':[1080,1080],'16:9':[1920,1080]};
 const imageTypes=['image/png','image/jpeg','image/webp'],videoTypes=['video/mp4','video/webm','video/quicktime'],audioTypes=['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/flac','audio/x-flac'];
 const kindOf=t=>imageTypes.includes(t)?'image':videoTypes.includes(t)?'video':audioTypes.includes(t)?'audio':null;
 const duration=c=>c.kind==='video'||c.kind==='audio'?c.out-c.in:c.duration;
 const timeline=p=>{let t=0;return p.scenes.map(c=>{const start=t;t+=duration(c);return {scene:c,start,end:t};});};
 const stackOrder=p=>{const ids=['base',...(p.layers||[]).map(c=>c.id)],seen=new Set();return [...(Array.isArray(p.visualOrder)?p.visualOrder:[]),...ids].filter(id=>ids.includes(id)&&!seen.has(id)&&seen.add(id));};
 const stackId=(p,id)=>p.scenes.some(c=>c.id===id)?'base':id;
 const rows=p=>{const order=stackOrder(p);return [...timeline(p),...(p.layers||[]).map(c=>({scene:c,start:c.start,end:c.start+duration(c)}))].sort((a,b)=>order.indexOf(stackId(p,a.scene.id))-order.indexOf(stackId(p,b.scene.id)));};
 const audioRows=p=>(p.audio||[]).map(c=>({scene:c,start:c.start,end:c.start+duration(c)}));
 const total=p=>Math.max(0,...rows(p).map(r=>r.end),...audioRows(p).map(r=>r.end));
 const at=(p,t)=>timeline(p).find(r=>t>=r.start&&t<r.end)||null;
 const active=(p,t)=>rows(p).filter(r=>t>=r.start&&t<r.end&&!r.scene.hidden);
 const pose=(v={},fallback={})=>({x:number(v.x,fallback.x??.5,-1,2),y:number(v.y,fallback.y??.5,-1,2),scale:number(v.scale,fallback.scale??1,.05,4),rotation:number(v.rotation,fallback.rotation??0,-360,360),opacity:number(v.opacity,fallback.opacity??1,0,1)});
 const blank=()=>({format:'divas-video-2',id:uid(),name:'Mi video Divas',ratio:'9:16',background:'#201424',scenes:[],layers:[],visualOrder:['base'],audio:[],music:null,quality:720});
 const keyer=()=>({enabled:false,color:'#00ff00',tolerance:.18,softness:.08,spill:.5});
 const scene=a=>({id:uid(),assetId:a.id,kind:a.kind,name:clean(a.name),duration:5,in:0,out:Math.min(a.duration||5,15),fit:'contain',mask:'none',motion:'none',transition:'fade',volume:1,fadeIn:0,fadeOut:0,title:'',titlePosition:'bottom',titleColor:'#ffffff',titleSize:6,titleStyle:'glow',titleFont:'Arial',titleMotion:'fade',transform:pose(),animation:{enabled:false,end:pose(),easing:'smooth'},keyer:keyer(),adjust:{brightness:0,contrast:0,saturation:0},hidden:false,locked:false});
 const layer=(a,start=0)=>{const c=scene(a);c.start=start;c.transition='cut';c.transform.scale=.55;c.animation.end=pose(c.transform);return c;};
 const textLayer=(start=0)=>{const c=layer({name:'Texto',kind:'text'},start);c.assetId=null;c.title='Tu mensaje';c.titlePosition='center';c.titleSize=9;c.titleStyle='gold';c.transform.scale=1;c.animation.end=pose(c.transform);return c;};
 const audioLayer=(a,start=0)=>({id:uid(),kind:'audio',assetId:a.id,name:clean(a.name),start,in:0,out:Math.min(a.duration,30),volume:.7,fadeIn:.3,fadeOut:.5});
 const usedIds=p=>new Set([...p.scenes,...p.layers||[],...p.audio||[],...(p.music?[p.music]:[])].map(c=>c.assetId).filter(Boolean));
 function validateAsset(a){
  if(!a||typeof a.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(a.id)||kindOf(a.type)!==a.kind)throw Error('El respaldo contiene un recurso no admitido.');
  if(!Number.isFinite(a.size)||a.size<1||a.size>LIMITS[a.kind+'Bytes'])throw Error('Un recurso supera el tamaño permitido.');
  if(a.kind!=='audio'&&(!Number.isFinite(a.width)||!Number.isFinite(a.height)||a.width<1||a.height<1||a.width*a.height>48000000))throw Error('Las dimensiones del recurso no son válidas.');
  if(a.kind!=='image'&&(!Number.isFinite(a.duration)||a.duration<.1||a.duration>3600))throw Error('La duración del recurso no es válida.');
  return a;
 }
 function normalize(raw,assets){
  if(!raw||!['divas-video-1','divas-video-2'].includes(raw.format)||!Array.isArray(raw.scenes)||raw.scenes.length>LIMITS.scenes)throw Error('Este archivo no es un proyecto de video Divas válido.');
  for(const [key,max] of [['layers',LIMITS.layers],['audio',LIMITS.audio]])if(raw[key]!==undefined&&(!Array.isArray(raw[key])||raw[key].length>max))throw Error('Usa hasta 12 capas y 4 pistas de audio adicionales.');
  const map=new Map();let bytes=0;
  for(const a of assets){validateAsset(a);if(map.has(a.id))throw Error('El respaldo tiene recursos duplicados.');map.set(a.id,a);bytes+=a.size;}
  if(bytes>LIMITS.totalBytes)throw Error('Usa hasta 150 MB de recursos por video.');
  const p=blank();p.id=typeof raw.id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(raw.id)?raw.id:p.id;
  p.name=clean(raw.name)||p.name;p.ratio=Object.hasOwn(formats,raw.ratio)?raw.ratio:'9:16';p.background=color(raw.background,'#201424');p.quality=raw.quality===1080?1080:720;
  const ids=new Set(['base']);
  function unique(id){const v=typeof id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(id)&&!ids.has(id)?id:uid();ids.add(v);return v;}
  function visual(v,overlay=false){
   const a=map.get(v.assetId),text=overlay&&v.kind==='text';if(!text&&(!a||!['image','video'].includes(a.kind)))throw Error('Falta una foto o un clip del proyecto.');
   const c=text?textLayer():scene(a);c.id=unique(v.id);c.name=clean(v.name)||c.name;c.duration=number(v.duration,5,.25,180);
   if(c.kind==='video'){c.in=number(v.in,0,0,Math.max(0,a.duration-.1));c.out=number(v.out,Math.min(a.duration,15),c.in+.1,a.duration);}else{c.in=0;c.out=c.duration;}
   if(overlay)c.start=number(v.start,0,0,180);
   c.fit=['cover','adaptive'].includes(v.fit)?v.fit:'contain';c.mask=['none','circle','rounded'].includes(v.mask)?v.mask:'none';c.motion=['none','zoom','pan'].includes(v.motion)?v.motion:'none';c.transition=v.transition==='fade'?'fade':'cut';c.volume=number(v.volume,1,0,1);
   c.fadeIn=number(v.fadeIn,0,0,duration(c)/2);c.fadeOut=number(v.fadeOut,0,0,duration(c)/2);
   c.title=clean(v.title,500);c.titlePosition=['top','center','bottom'].includes(v.titlePosition)?v.titlePosition:'bottom';c.titleColor=color(v.titleColor);c.titleSize=number(v.titleSize,6,2,30);c.titleStyle=['glow','gold','neon','plate','plain'].includes(v.titleStyle)?v.titleStyle:'glow';c.titleFont=['Arial','Georgia','Impact','Trebuchet MS'].includes(v.titleFont)?v.titleFont:'Arial';c.titleMotion=['none','fade','rise','pop'].includes(v.titleMotion)?v.titleMotion:'fade';
   c.transform=pose(v.transform);c.animation={enabled:v.animation?.enabled===true,end:pose(v.animation?.end,c.transform),easing:v.animation?.easing==='linear'?'linear':'smooth'};
   const k=v.keyer||{};c.keyer={enabled:k.enabled===true,color:color(k.color,'#00ff00'),tolerance:number(k.tolerance,.18,.005,.8),softness:number(k.softness,.08,.005,.4),spill:number(k.spill,.5,0,1)};
   const f=v.adjust||{};c.adjust={brightness:number(f.brightness,0,-.5,.5),contrast:number(f.contrast,0,-.8,1),saturation:number(f.saturation,0,-1,1)};c.hidden=v.hidden===true;c.locked=v.locked===true;return c;
  }
  p.scenes=raw.scenes.map(v=>visual(v));p.layers=(raw.layers||[]).map(v=>visual(v,true));p.visualOrder=stackOrder({...p,visualOrder:raw.visualOrder});
  p.audio=(raw.audio||[]).map(v=>{const a=map.get(v.assetId);if(!a||a.kind!=='audio')throw Error('Falta una pista de audio.');const c=audioLayer(a);c.id=unique(v.id);c.name=clean(v.name)||c.name;c.start=number(v.start,0,0,180);c.in=number(v.in,0,0,a.duration-.1);c.out=number(v.out,a.duration,c.in+.1,a.duration);c.volume=number(v.volume,.7,0,1);c.fadeIn=number(v.fadeIn,0,0,duration(c)/2);c.fadeOut=number(v.fadeOut,0,0,duration(c)/2);return c;});
  if(total(p)>LIMITS.seconds+.001)throw Error('El proyecto admite videos de hasta 3 minutos.');
  const videos=rows(p).filter(r=>r.scene.kind==='video'&&!r.scene.hidden);for(const row of videos)if(videos.filter(r=>r.start<=row.start&&r.end>row.start).length>4)throw Error('Usa hasta 4 clips de video simultáneos para mantener la reproducción fluida.');
  if(raw.music){const a=map.get(raw.music.assetId);if(!a||a.kind!=='audio')throw Error('Falta la música del proyecto.');p.music={assetId:a.id,offset:number(raw.music.offset,0,0,Math.max(0,a.duration-.1)),volume:number(raw.music.volume,.3,0,1),loop:raw.music.loop===true};}
  return p;
 }
 function split(p,id,time){
  const overlay=(p.layers||[]).some(c=>c.id===id),list=overlay?p.layers:p.scenes;
  if(list.length>=(overlay?LIMITS.layers:LIMITS.scenes))throw Error('Alcanzaste el límite de elementos de esta pista.');
  const row=rows(p).find(r=>r.scene.id===id);if(!row)throw Error('Selecciona una escena o capa.');
  const local=time-row.start,d=duration(row.scene);if(local<.25||d-local<.25)throw Error('Mueve el cabezal dentro del elemento, al menos 0,25 s de cada extremo.');
  const left=structuredClone(row.scene),right={...structuredClone(row.scene),id:uid(),transition:'cut'};
  if(left.kind==='video'){left.out=left.in+local;right.in=left.out;}else{left.duration=local;left.out=local;right.duration=d-local;right.out=right.duration;}
  if(overlay)right.start=row.start+local;
  if(left.animation.enabled){const middle=animatedPose(row.scene,local/d);left.animation.end=middle;right.transform=middle;}
  if(overlay){const order=stackOrder(p);order.splice(order.indexOf(id)+1,0,right.id);p.visualOrder=order;}list.splice(list.findIndex(c=>c.id===id),1,left,right);return right.id;
 }
 function animatedPose(c,t){const a=c.transform||pose();if(!c.animation?.enabled)return {...a};let u=Math.min(1,Math.max(0,t));if(c.animation.easing!=='linear')u=u*u*(3-2*u);const b=c.animation.end;return Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+(b[k]-a[k])*u]));}
 function envelope(c,local){const d=duration(c);return Math.min(1,c.fadeIn?Math.max(0,local/c.fadeIn):1,c.fadeOut?Math.max(0,(d-local)/c.fadeOut):1);}
 // Placement changes keep the same media and ID. The caller validates and records one undo step.
 function placeStack(p,id,before=null){
  const order=stackOrder(p).reverse().filter(k=>k!==id),i=before?order.indexOf(before):-1;
  order.splice(i<0?order.length:i,0,id);p.visualOrder=order.reverse();
 }
 function toLayer(p,id,{start=0,before='base'}={}){
  const i=p.scenes.findIndex(c=>c.id===id),c=i>=0?p.scenes[i]:p.layers.find(c=>c.id===id);
  if(!c||c.locked)throw Error('Selecciona un elemento desbloqueado.');
  if(i>=0&&p.layers.length>=LIMITS.layers)throw Error('Usa hasta 12 capas independientes.');
  if(i>=0){p.scenes.splice(i,1);p.layers.push(c);}
  c.start=number(start,0,0,LIMITS.seconds-duration(c));placeStack(p,id,before);return c;
 }
 function toSequence(p,id,index=p.scenes.length){
  const c=[...p.scenes,...p.layers].find(c=>c.id===id);
  if(!c||!['image','video'].includes(c.kind)||c.locked)throw Error('Elige una foto o vídeo desbloqueado.');
  if(!p.scenes.includes(c)&&p.scenes.length>=LIMITS.scenes)throw Error('Usa hasta 30 clips en la secuencia.');
  p.scenes=p.scenes.filter(x=>x.id!==id);p.layers=p.layers.filter(x=>x.id!==id);delete c.start;
  p.scenes.splice(number(index,p.scenes.length,0,p.scenes.length),0,c);p.visualOrder=stackOrder(p).filter(k=>k!==id);return c;
 }
 function frame(c,fit){
  if(!c||!['image','video'].includes(c.kind)||c.locked)throw Error('Elige una foto o vídeo desbloqueado.');
  if(!['contain','cover','adaptive'].includes(fit))throw Error('El encuadre no es válido.');
  c.fit=fit;c.transform=pose({opacity:c.transform.opacity});c.animation={enabled:false,end:pose(c.transform),easing:'smooth'};c.motion='none';
 }
 function asBackground(p,id){
  const c=toLayer(p,id,{start:0,before:null}),remaining=Math.max(0,...rows(p).filter(r=>r.scene.id!==id).map(r=>r.end),...audioRows(p).map(r=>r.end));
  if(c.kind==='image'&&remaining>0)c.duration=remaining;
  c.transition='cut';frame(c,'adaptive');return c;
 }
 function changeRatio(p,ratio,assets=[]){
  if(!Object.hasOwn(formats,ratio))throw Error('Formato no válido.');p.ratio=ratio;
  for(const c of p.scenes){const t=c.transform,a=assets.find(a=>a.id===c.assetId);
   if(c.kind==='image'&&a?.hasAlpha===false&&c.fit==='contain'&&c.mask==='none'&&c.motion==='none'&&!c.animation.enabled&&t.x===.5&&t.y===.5&&t.scale===1&&t.rotation===0)c.fit='adaptive';
  }
 }
 function snapTime(p,id,value,threshold=.15){
  const points=[0,...rows(p).filter(r=>r.scene.id!==id).flatMap(r=>[r.start,r.end])];let best=Math.max(0,value),distance=threshold;
  for(const point of points){const d=Math.abs(point-value);if(d<distance){distance=d;best=point;}}return Math.round(best*100)/100;
 }
 const api={LIMITS,uid,number,clean,color,formats,kindOf,duration,timeline,stackOrder,stackId,rows,audioRows,total,at,active,blank,scene,layer,textLayer,audioLayer,normalize,validateAsset,split,pose,animatedPose,envelope,usedIds,keyer,placeStack,toLayer,toSequence,frame,asBackground,changeRatio,snapTime};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DivasVideoModel=api;
})(typeof window!=='undefined'?window:globalThis);

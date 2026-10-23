/* Data and timing rules shared by the editor, backup reader and tests. */
(function(root){
 'use strict';
 const LIMITS={scenes:30,seconds:180,totalBytes:150*1024*1024,imageBytes:20*1024*1024,videoBytes:80*1024*1024,audioBytes:30*1024*1024};
 const uid=()=>globalThis.crypto.randomUUID();
 const number=(x,f,min,max)=>Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):f;
 const clean=(x,max=80)=>String(x??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').slice(0,max);
 const color=(x,f='#ffffff')=>/^#[0-9a-f]{6}$/i.test(x)?x:f;
 const formats={'9:16':[1080,1920],'1:1':[1080,1080],'16:9':[1920,1080]};
 const imageTypes=['image/png','image/jpeg','image/webp'];
 const videoTypes=['video/mp4','video/webm','video/quicktime'];
 const audioTypes=['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/flac','audio/x-flac'];
 const kindOf=t=>imageTypes.includes(t)?'image':videoTypes.includes(t)?'video':audioTypes.includes(t)?'audio':null;
 const duration=c=>c.kind==='video'?c.out-c.in:c.duration;
 const timeline=p=>{let t=0;return p.scenes.map(c=>{const start=t;t+=duration(c);return {scene:c,start,end:t};});};
 const total=p=>p.scenes.reduce((n,c)=>n+duration(c),0);
 const at=(p,t)=>{const rows=timeline(p);return rows.find((r,i)=>t>=r.start&&(t<r.end||i===rows.length-1))||rows[0]||null;};
 const blank=()=>({format:'divas-video-1',id:uid(),name:'Mi video Divas',ratio:'9:16',background:'#201424',scenes:[],music:null,quality:720});
 const scene=(a)=>({id:uid(),assetId:a.id,kind:a.kind,name:clean(a.name),duration:5,in:0,out:Math.min(a.duration||5,15),fit:'contain',motion:'none',transition:'fade',volume:1,title:'',titlePosition:'bottom',titleColor:'#ffffff',titleSize:6,titleStyle:'glow',titleMotion:'fade'});
 function validateAsset(a){
  if(!a||typeof a.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(a.id)||kindOf(a.type)!==a.kind)throw Error('El respaldo contiene un recurso no admitido.');
  if(!Number.isFinite(a.size)||a.size<1||a.size>LIMITS[a.kind+'Bytes'])throw Error('Un recurso supera el tamaño permitido.');
  if(a.kind!=='audio'&&(!Number.isFinite(a.width)||!Number.isFinite(a.height)||a.width<1||a.height<1||a.width*a.height>48000000))throw Error('Las dimensiones del recurso no son válidas.');
  if(a.kind!=='image'&&(!Number.isFinite(a.duration)||a.duration<.1||a.duration>3600))throw Error('La duración del recurso no es válida.');
  return a;
 }
 function normalize(raw,assets){
  if(!raw||raw.format!=='divas-video-1'||!Array.isArray(raw.scenes)||raw.scenes.length>LIMITS.scenes)throw Error('Este archivo no es un proyecto de video Divas válido.');
  const map=new Map();let bytes=0;
  for(const a of assets){validateAsset(a);if(map.has(a.id))throw Error('El respaldo tiene recursos duplicados.');map.set(a.id,a);bytes+=a.size;}
  if(bytes>LIMITS.totalBytes)throw Error('Usa hasta 150 MB de recursos por video.');
  const p=blank();p.id=typeof raw.id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(raw.id)?raw.id:p.id;
  p.name=clean(raw.name)||p.name;p.ratio=Object.hasOwn(formats,raw.ratio)?raw.ratio:'9:16';p.background=color(raw.background,'#201424');p.quality=raw.quality===1080?1080:720;
  const ids=new Set();
  p.scenes=raw.scenes.map(v=>{
   const a=map.get(v.assetId);if(!a||!['image','video'].includes(a.kind))throw Error('Falta una foto o un clip del proyecto.');
   const c=scene(a);c.id=typeof v.id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(v.id)&&!ids.has(v.id)?v.id:uid();ids.add(c.id);
   c.name=clean(v.name)||c.name;c.duration=number(v.duration,5,.25,60);
   if(a.kind==='video'){c.in=number(v.in,0,0,Math.max(0,a.duration-.1));c.out=number(v.out,Math.min(a.duration,15),c.in+.1,a.duration);}else{c.in=0;c.out=c.duration;}
   c.fit=v.fit==='cover'?'cover':'contain';c.motion=['none','zoom','pan'].includes(v.motion)?v.motion:'none';c.transition=v.transition==='fade'?'fade':'cut';c.volume=number(v.volume,1,0,1);
   c.title=clean(v.title,180);c.titlePosition=['top','center','bottom'].includes(v.titlePosition)?v.titlePosition:'bottom';c.titleColor=color(v.titleColor);c.titleSize=number(v.titleSize,6,3,12);c.titleStyle=['glow','plate','plain'].includes(v.titleStyle)?v.titleStyle:'glow';c.titleMotion=v.titleMotion==='none'?'none':'fade';return c;
  });
  if(total(p)>LIMITS.seconds+.001)throw Error('Esta primera versión admite videos de hasta 3 minutos.');
  if(raw.music){const a=map.get(raw.music.assetId);if(!a||a.kind!=='audio')throw Error('Falta la música del proyecto.');p.music={assetId:a.id,offset:number(raw.music.offset,0,0,Math.max(0,a.duration-.1)),volume:number(raw.music.volume,.3,0,1),loop:raw.music.loop===true};}
  return p;
 }
 function split(p,id,time){
  if(p.scenes.length>=LIMITS.scenes)throw Error('Puedes usar hasta 30 escenas.');
  const rows=timeline(p),row=rows.find(r=>r.scene.id===id);if(!row)throw Error('Selecciona una escena.');
  const local=time-row.start,d=duration(row.scene);if(local<.25||d-local<.25)throw Error('Mueve el cabezal dentro de la escena, al menos 0,25 s de cada extremo.');
  const left={...row.scene},right={...row.scene,id:uid(),transition:'cut'};
  if(left.kind==='video'){left.out=left.in+local;right.in=left.out;}else{left.duration=local;right.duration=d-local;}
  const i=p.scenes.findIndex(c=>c.id===id);p.scenes.splice(i,1,left,right);return right.id;
 }
 const api={LIMITS,uid,number,clean,formats,kindOf,duration,timeline,total,at,blank,scene,normalize,validateAsset,split};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DivasVideoModel=api;
})(typeof window!=='undefined'?window:globalThis);

/* Divas Video: browser-local editing, real media export, isolated from flyer state. */
(function(){
 'use strict';
 const M=window.DivasVideoModel;if(!M)return;
 const exportURL=new URL('./divas-video-export.mjs?v=39',document.currentScript.src).href;
 let exportModule;
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const V={bridge:null,project:null,assets:new Map(),players:new Map(),owner:null,epoch:0,selected:null,time:0,playing:false,starting:false,playback:0,raf:0,clock:0,start:0,active:null,busy:false,exporting:false,cancelled:false,dirty:false,revision:0,savedVersion:0,saveTask:null,timer:0,ctx:null,master:null,destination:null,monitor:null,sources:new Map(),wake:null,operation:0};
 let dbPromise;
 const id='divasVideoDialog',selected=()=>V.project?.scenes.find(c=>c.id===V.selected),total=()=>V.project?M.total(V.project):0;
 const owner=()=>String(V.bridge?.session()?.owner||'local');
 const guard=epoch=>{if(epoch!==V.epoch||V.owner!==owner())throw Error('La cuenta cambió. Abre nuevamente tus videos.');};
 const stamp=s=>{const t=Math.max(0,s);return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')+'.'+Math.floor(t%1*10);};
 const usedIds=p=>new Set([...p.scenes.map(c=>c.assetId),...(p.music?[p.music.assetId]:[])]);
 function assetList(p=V.project){const ids=usedIds(p);return [...V.assets.values()].filter(a=>ids.has(a.id));}
 function message(text,error=false){$('dvMessage').textContent=text;$('dvMessage').classList.toggle('dv-error',error);}
 function size(exporting=false){const [w,h]=M.formats[V.project.ratio],edge=exporting?V.project.quality:360;const f=edge/Math.min(w,h);return {w:Math.round(w*f/2)*2,h:Math.round(h*f/2)*2};}
 function makeUI(){
  if($(id))return;
  const dialog=document.createElement('dialog');dialog.id=id;dialog.className='dv-shell';dialog.dataset.panel='preview';dialog.setAttribute('aria-label','Divas Video');
  dialog.innerHTML=`<div class="dv-layout">
   <div class="dv-topbar"><div class="dv-brand"><strong>Divas <span style="color:var(--dv-accent)">Video</span></strong><small>Tus ideas en movimiento</small></div><label class="dv-name"><input id="dvName" aria-label="Nombre del video" maxlength="80" value="Mi video Divas"></label><button class="dv-close" data-dv="close" aria-label="Volver al editor">×</button><div class="dv-top-actions"><button data-dv="library">Mis videos</button><button data-dv="save">Guardar</button><span class="dv-save-status" id="dvSaveStatus" role="status">En este dispositivo</span><button class="dv-primary" data-dv="export" id="dvExport">Exportar video</button></div></div>
   <div class="dv-progress" id="dvProgress" hidden><span id="dvProgressText">Preparando…</span><progress id="dvProgressBar" max="100" value="0"></progress><button data-dv="cancel">Cancelar</button></div>
   <div class="dv-body" id="dvBody"><div class="dv-stage"><div class="dv-stage-head"><label>Formato <select id="dvRatio"><option value="9:16">9:16 · Reel</option><option value="1:1">1:1</option><option value="16:9">16:9</option></select></label><small id="dvDimensions"></small></div><div class="dv-preview-wrap"><canvas id="dvCanvas" width="360" height="640" aria-label="Vista previa del video"></canvas><div class="dv-empty" id="dvEmpty"><strong>Dale movimiento a tu idea</strong><p>Añade fotos o clips, o trae el flyer que tienes abierto.</p></div></div><div class="dv-transport"><button data-dv="rewind" aria-label="Ir al inicio">↤</button><button data-dv="play" id="dvPlay" aria-label="Reproducir">▶</button><input id="dvSeek" type="range" min="0" max="5" step="0.01" value="0" aria-label="Posición en el video"><span class="dv-time" id="dvTime">0:00.0 / 0:00.0</span></div></div>
   <div class="dv-mobile-tabs" role="tablist" aria-label="Herramientas de video"><button role="tab" data-dv="panel" data-panel="preview" aria-selected="true">Vista previa</button><button role="tab" data-dv="panel" data-panel="scene" aria-selected="false">Escena y texto</button><button role="tab" data-dv="panel" data-panel="audio" aria-selected="false">Música y salida</button></div>
   <aside class="dv-inspector" aria-label="Ajustes del video"><div class="dv-scene-fields dv-fields"><h2 id="dvSceneName">Selecciona una escena</h2><div class="dv-clip-tools"><button data-dv="left" title="Mover antes" aria-label="Mover escena antes">←</button><button data-dv="right" title="Mover después" aria-label="Mover escena después">→</button><button data-dv="duplicate" title="Duplicar escena">Duplicar</button><button data-dv="remove" class="dv-danger" title="Quitar escena">Quitar</button></div><label id="dvDurationLabel">Duración (segundos)<input id="dvDuration" type="number" min="0.25" max="60" step="0.1" value="5"></label><div class="dv-row" id="dvTrim" hidden><label>Desde (s)<input id="dvIn" type="number" min="0" step="0.1"></label><label>Hasta (s)<input id="dvOut" type="number" min="0.1" step="0.1"></label></div><button data-dv="split">✂ Dividir en el cabezal</button><div class="dv-row"><label>Encuadre<select id="dvFit"><option value="contain">Completo</option><option value="cover">Llenar</option></select></label><label>Movimiento<select id="dvMotion"><option value="none">Quieto</option><option value="zoom">Acercamiento</option><option value="pan">Desplazamiento</option></select></label></div><label>Transición<select id="dvTransition"><option value="fade">Fundido suave</option><option value="cut">Corte directo</option></select></label><label id="dvVolumeLabel" hidden>Audio del clip <input id="dvVolume" type="range" min="0" max="1" step="0.01" value="1"></label><hr class="dv-divider"><h3>Texto sobre esta escena</h3><label>Mensaje<textarea id="dvTitle" rows="2" maxlength="180" placeholder="Escribe tu mensaje…"></textarea></label><div class="dv-row"><label>Posición<select id="dvTitlePosition"><option value="bottom">Abajo</option><option value="center">Centro</option><option value="top">Arriba</option></select></label><label>Estilo<select id="dvTitleStyle"><option value="glow">Brillo Divas</option><option value="plate">Fondo oscuro</option><option value="plain">Limpio</option></select></label></div><div class="dv-row"><label>Color<input id="dvTitleColor" type="color" value="#ffffff"></label><label>Tamaño<input id="dvTitleSize" type="number" min="3" max="12" step="0.5" value="6"></label></div><label class="dv-check"><input id="dvTitleAnimate" type="checkbox" checked>Entrada suave del texto</label></div>
   <div class="dv-audio-fields dv-fields"><hr class="dv-divider"><h2>Música</h2><button data-dv="audio">＋ Elegir audio</button><p id="dvAudioName" class="dv-audio-name">Sin música</p><div id="dvMusicFields" class="dv-fields" hidden><label>Empezar desde (s)<input id="dvAudioOffset" type="number" min="0" step="0.1" value="0"></label><label>Volumen de música<input id="dvAudioVolume" type="range" min="0" max="1" step="0.01" value="0.3"></label><label class="dv-check"><input id="dvAudioLoop" type="checkbox">Repetir música</label><button data-dv="removeAudio">Quitar música</button></div><p class="dv-hint">Usa música propia o con permiso. También se conserva el audio de cada clip.</p><hr class="dv-divider"><h3>Salida</h3><label>Calidad<select id="dvQuality"><option value="720">HD · 720p</option><option value="1080">Full HD · 1080p</option></select></label><label>Color de fondo<input id="dvBackground" type="color" value="#201424"></label><p class="dv-hint" id="dvExportHint"></p></div></aside></div>
   <div class="dv-timeline" id="dvTimeline"><div class="dv-timeline-head"><h2>Escenas <span id="dvCount"></span></h2><span class="dv-total">Hasta 3 min</span><button data-dv="capture">＋ Flyer abierto</button><button data-dv="media" class="dv-primary">＋ Fotos / clips</button></div><div class="dv-scenes" id="dvScenes" aria-label="Escenas del video"></div></div>
   <div class="dv-footer"><p id="dvMessage" role="status" aria-live="polite">El video se guarda en este navegador. Descarga un respaldo para llevarlo a otro dispositivo.</p><button data-dv="backup">Respaldo</button><button data-dv="restore">Abrir respaldo</button></div>
   <section class="dv-library" id="dvLibrary" aria-label="Mis videos" hidden><div class="dv-library-top"><h2>Mis videos en este dispositivo</h2><button data-dv="new" class="dv-primary">＋ Nuevo video</button><button data-dv="restore">Abrir respaldo</button><button data-dv="hideLibrary">Volver</button></div><p class="dv-library-note">Los videos y sus archivos se guardan aquí, separados por cuenta. Descarga un respaldo para usarlos en otro equipo.</p><div class="dv-projects" id="dvProjects"></div></section>
   <input type="file" id="dvFiles" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden><input type="file" id="dvAudioFile" accept="audio/*" hidden><input type="file" id="dvBackupFile" accept=".divasvideo" hidden>
  </div>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('click',e=>{const b=e.target.closest('[data-dv]');if(b){e.stopPropagation();perform(b.dataset.dv,b).catch(err=>message(err.message,true));}});
  dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.code==='Space'&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();perform('play').catch(err=>message(err.message,true));}});
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(V.exporting){V.cancelled=true;stop();}else close().catch(err=>message(err.message,true));});
  $('dvSeek').addEventListener('input',()=>{if(V.exporting)return;const t=+$('dvSeek').value;stop();V.time=t;seek().catch(err=>message(err.message,true));});
  for(const name of ['Name','Ratio','Quality','Background','Duration','In','Out','Fit','Motion','Transition','Volume','Title','TitlePosition','TitleStyle','TitleColor','TitleSize','TitleAnimate','AudioOffset','AudioVolume','AudioLoop']){
   $('dv'+name).addEventListener(name==='Title'||name==='Name'?'input':'change',()=>edit(name));
  }
  $('dvFiles').addEventListener('change',()=>job(()=>addFiles([...$('dvFiles').files])).finally(()=>$('dvFiles').value=''));
  $('dvAudioFile').addEventListener('change',()=>job(()=>addFiles([...$('dvAudioFile').files],true)).finally(()=>$('dvAudioFile').value=''));
  $('dvBackupFile').addEventListener('change',()=>job(()=>restore($('dvBackupFile').files[0])).finally(()=>$('dvBackupFile').value=''));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&V.playing){if(V.exporting){V.cancelled=true;message('La exportación se interrumpió al cambiar de pestaña. Vuelve a exportar manteniendo Divas visible.',true);}stop();}});
  window.addEventListener('pagehide',()=>{V.cancelled=true;stop();});
  window.addEventListener('beforeunload',e=>{if(V.dirty||V.exporting){e.preventDefault();e.returnValue='';}});
 }
 async function job(fn){if(V.busy||V.exporting)return;V.busy=true;setBusy();try{await fn();}catch(e){message(e.message||'No se pudo completar. Inténtalo otra vez.',true);}finally{V.busy=false;setBusy();}}
 function setBusy(){if(!$(id))return;const on=V.busy||V.exporting;$('dvBody').inert=on;$('dvTimeline').inert=on;$(id).querySelectorAll('.dv-topbar button,.dv-topbar input,.dv-footer button,.dv-library button').forEach(b=>b.disabled=on);$('dvProgress').hidden=!V.exporting;exportInfo();}
 function db(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('divas-video-v1',1);r.onupgradeneeded=()=>{for(const s of ['projects','summaries'])if(!r.result.objectStoreNames.contains(s))r.result.createObjectStore(s,{keyPath:'key'});};r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};r.onerror=()=>{dbPromise=null;reject(Error('No se pudo abrir el guardado de este navegador. Descarga un respaldo.'));};r.onblocked=()=>reject(Error('Cierra otras pestañas de Divas e inténtalo otra vez.'));});return dbPromise;
 }
 async function getRecord(key,store='projects'){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 function savedLabel(){if(!V.project)return;$('dvSaveStatus').textContent=V.dirty?'Cambios sin guardar':'En este dispositivo';$('dvSaveStatus').classList.toggle('dv-error',V.dirty);}
 function changed(){V.dirty=true;V.revision++;savedLabel();clearTimeout(V.timer);V.timer=setTimeout(()=>save().catch(e=>message(e.message,true)),900);}
 async function save(){
  if(!V.project||!V.dirty)return;
  if(V.saveTask){await V.saveTask;if(V.dirty)return save();return;}
  const task=(async()=>{
  const epoch=V.epoch,revision=V.revision,project=structuredClone(V.project),assets=assetList(project),key=V.owner+':'+project.id,expected=V.savedVersion,d=await db();guard(epoch);
  const image=assets.find(a=>a.id===project.scenes[0]?.assetId)?.thumb||'';
  const record={key,owner:V.owner,project,assets,version:expected+1,modified:Date.now()};
  const summary={key,owner:V.owner,id:project.id,name:project.name,modified:record.modified,scenes:project.scenes.length,seconds:M.total(project),thumb:image};
  await new Promise((resolve,reject)=>{let problem;const tx=d.transaction(['projects','summaries'],'readwrite'),s=tx.objectStore('projects'),r=s.get(key);
   r.onsuccess=()=>{if((r.result?.version||0)!==expected){problem=Error('Este video cambió en otra pestaña. Descarga un respaldo o usa Guardar copia para conservar tus cambios.');tx.abort();return;}s.put(record);tx.objectStore('summaries').put(summary);};
   tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(problem||Error('No se pudo guardar en este dispositivo. Revisa el espacio disponible y descarga un respaldo.'));
  });
  guard(epoch);V.savedVersion=expected+1;if(V.revision===revision)V.dirty=false;savedLabel();})();
  V.saveTask=task;try{await task;}finally{if(V.saveTask===task)V.saveTask=null;}
 }
 async function listProjects(){
  const epoch=V.epoch,d=await db();const all=await new Promise((resolve,reject)=>{const r=d.transaction('summaries').objectStore('summaries').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});guard(epoch);
  const records=all.filter(p=>p.owner===V.owner).sort((a,b)=>b.modified-a.modified);
  $('dvProjects').innerHTML=records.length?records.map(p=>`<article class="dv-project">${p.thumb?`<img src="${esc(p.thumb)}" alt="" loading="lazy">`:''}<h3>${esc(p.name)}</h3><small>${p.scenes} escenas · ${stamp(p.seconds)} · ${new Date(p.modified).toLocaleDateString('es-CL')}</small><div class="dv-project-buttons"><button data-dv="load" data-id="${esc(p.id)}">Abrir</button><button data-dv="delete" data-id="${esc(p.id)}" class="dv-danger">Eliminar</button></div></article>`).join(''):'<p>Aún no hay videos guardados. Crea el primero con tus fotos, clips o un flyer.</p>';
 }
 function disposePlayers(){for(const p of V.players.values()){if(p.el.pause)p.el.pause();p.el.removeAttribute?.('src');if(p.el.load)p.el.load();URL.revokeObjectURL(p.url);}V.players.clear();for(const s of V.sources.values()){try{s.source.disconnect();s.gain.disconnect();}catch{}}V.sources.clear();V.active=null;}
 function discard(){stop();clearTimeout(V.timer);disposePlayers();V.assets.clear();V.project=null;V.selected=null;V.time=0;V.dirty=false;V.revision=0;V.savedVersion=0;}
 async function open(){
  makeUI();await V.bridge.ready?.();if(V.bridge.session()?.blocked)throw Error('Termina la ayuda compartida antes de abrir el editor de video.');
  if(V.owner!==owner()){discard();V.owner=owner();V.epoch++;}
  if(!V.project){V.project=M.blank();V.selected=null;}
  $('dvLibrary').hidden=true;refresh();V.bridge.show(id);message('Guardado en este navegador. Usa Respaldo para llevar el video a otro dispositivo.');
 }
 async function close(){if(V.busy||V.exporting)return;stop();try{await save();$(id).close();}catch(e){message(e.message+' Pulsa Respaldo antes de salir.',true);}}
 async function newProject(){stop();await save();discard();V.project=M.blank();refresh();$('dvLibrary').hidden=true;message('Añade fotos, clips o el flyer abierto para comenzar.');}
 async function loadProject(projectId){
  stop();await save();const epoch=V.epoch,record=await getRecord(V.owner+':'+projectId);guard(epoch);if(!record||record.owner!==V.owner)throw Error('No se encontró este video en tu cuenta local.');
  const p=M.normalize(record.project,record.assets);discard();V.project=p;V.savedVersion=record.version;V.assets=new Map(record.assets.map(a=>[a.id,a]));V.selected=p.scenes[0]?.id||null;
  await preparePlayers();guard(epoch);$('dvLibrary').hidden=true;refresh();await seek();message('Video abierto desde este dispositivo.');
 }
 function waitFor(el,event,ready){return new Promise((resolve,reject)=>{if(ready?.())return resolve();const timer=setTimeout(()=>finish(Error('El archivo no pudo abrirse a tiempo. Prueba un clip más pequeño.')),20000);const ok=()=>finish(),bad=()=>finish(Error('El navegador no puede reproducir este archivo. Prueba otro MP4, WebM o audio.'));function finish(error){clearTimeout(timer);el.removeEventListener(event,ok);el.removeEventListener('error',bad);error?reject(error):resolve();}el.addEventListener(event,ok,{once:true});el.addEventListener('error',bad,{once:true});});}
 async function player(a){
  if(V.players.has(a.id))return V.players.get(a.id);
  const url=URL.createObjectURL(a.blob),el=a.kind==='image'?new Image():document.createElement(a.kind==='video'?'video':'audio');
  if(a.kind!=='image'){el.preload='auto';el.playsInline=true;el.setAttribute('playsinline','');el.muted=false;}
  const p={el,url,kind:a.kind};V.players.set(a.id,p);el.src=url;
  try{if(a.kind==='image')await waitFor(el,'load',()=>el.complete&&el.naturalWidth>0);else{el.load();await waitFor(el,'loadeddata',()=>el.readyState>=2);}}
  catch(e){V.players.delete(a.id);URL.revokeObjectURL(url);throw e;}return p;
 }
 async function inspect(file){
  const type=file.type.toLowerCase().split(';')[0],kind=M.kindOf(type);if(!kind)throw Error('Usa fotos PNG/JPG/WebP, clips MP4/WebM o un archivo de audio compatible.');
  if(file.size<1||file.size>M.LIMITS[kind+'Bytes'])throw Error('Límite por archivo: fotos 20 MB, clips 80 MB y música 30 MB.');
  const a={id:M.uid(),name:M.clean(file.name||'Flyer Divas'),kind,type,size:file.size,blob:file,thumb:''};
  try{const {el}=await player(a);if(kind==='image'){a.width=el.naturalWidth;a.height=el.naturalHeight;}else{a.duration=el.duration;if(kind==='video'){a.width=el.videoWidth;a.height=el.videoHeight;}}
   M.validateAsset(a);
   if(kind!=='audio'){const c=document.createElement('canvas');c.width=160;c.height=100;const x=c.getContext('2d');x.fillStyle='#201424';x.fillRect(0,0,160,100);fitDraw(x,el,a.width,a.height,160,100,'contain');a.thumb=c.toDataURL('image/jpeg',.65);}return a;
  }catch(e){dropPlayer(a.id);throw e;}
 }
 function dropPlayer(assetId){const p=V.players.get(assetId);if(p){p.el.pause?.();p.el.removeAttribute?.('src');p.el.load?.();URL.revokeObjectURL(p.url);V.players.delete(assetId);}const source=V.sources.get(assetId);if(source){try{source.source.disconnect();source.gain.disconnect();}catch{}V.sources.delete(assetId);}}
 function prune(){const ids=usedIds(V.project);for(const a of V.assets.values())if(!ids.has(a.id)){dropPlayer(a.id);V.assets.delete(a.id);}}
 async function addFiles(files,music=false){
  if(!files.length)return;stop();const epoch=V.epoch,candidates=[],p=structuredClone(V.project);
  try{for(const f of files){message('Abriendo '+f.name+'…');const a=await inspect(f);candidates.push(a);guard(epoch);if(music&&a.kind!=='audio')throw Error('Elige un archivo de música o voz.');if(!music&&a.kind==='audio')throw Error('Añade la música desde Elegir audio.');if(music)p.music={assetId:a.id,offset:0,volume:.3,loop:false};else p.scenes.push(M.scene(a));}
   const assets=[...assetList(p),...candidates];M.normalize(p,assets);for(const a of candidates)V.assets.set(a.id,a);V.project=p;V.selected=music?V.selected:p.scenes.at(-1).id;prune();changed();refresh();await seekSelected();message(music?'Música añadida. Ajusta el volumen antes de exportar.':'Archivos añadidos. Selecciona una escena para ajustar su duración y texto.');
  }catch(e){for(const a of candidates)if(!V.assets.has(a.id))dropPlayer(a.id);throw e;}
 }
 async function capture(){
  const epoch=V.epoch;message('Preparando tu flyer…');const result=await V.bridge.capture();guard(epoch);if(!result)throw Error('Abre primero un diseño en Divas y vuelve a pulsar Flyer abierto.');
  const file=new File([result.blob],result.name+'.png',{type:'image/png'});await addFiles([file]);message('Flyer añadido con sus colores, fuentes y logos. El diseño original sigue editable en Divas.');
 }
 async function preparePlayers(){for(const a of assetList())await player(a);}
 function updateInspector(){
  const c=selected(),a=c&&V.assets.get(c.assetId);$('dvSceneName').textContent=c?c.name:'Selecciona una escena';
  $(id).querySelectorAll('.dv-scene-fields input,.dv-scene-fields select,.dv-scene-fields textarea,.dv-scene-fields button').forEach(n=>n.disabled=!c);
  $('dvTrim').hidden=c?.kind!=='video';$('dvDurationLabel').hidden=c?.kind==='video';$('dvVolumeLabel').hidden=c?.kind!=='video';
  if(c){for(const [name,key] of [['Duration','duration'],['In','in'],['Out','out'],['Fit','fit'],['Motion','motion'],['Transition','transition'],['Volume','volume'],['Title','title'],['TitlePosition','titlePosition'],['TitleStyle','titleStyle'],['TitleColor','titleColor'],['TitleSize','titleSize']])$('dv'+name).value=c[key];$('dvTitleAnimate').checked=c.titleMotion!=='none';$('dvIn').max=Math.max(0,(a.duration||0)-.1);$('dvOut').max=a.duration||60;}
  const music=V.project.music,ma=music&&V.assets.get(music.assetId);$('dvAudioName').textContent=ma?.name||'Sin música';$('dvMusicFields').hidden=!music;
  if(music){$('dvAudioOffset').value=music.offset;$('dvAudioOffset').max=Math.max(0,ma.duration-.1);$('dvAudioVolume').value=music.volume;$('dvAudioLoop').checked=music.loop;}
 }
 function refresh(){
  if(!V.project)return;$('dvName').value=V.project.name;$('dvRatio').value=V.project.ratio;$('dvQuality').value=V.project.quality;$('dvBackground').value=V.project.background;
  const dim=size();if($('dvCanvas').width!==dim.w||$('dvCanvas').height!==dim.h){$('dvCanvas').width=dim.w;$('dvCanvas').height=dim.h;}
  exportInfo();probeExport();
  $('dvCount').textContent='· '+V.project.scenes.length;$('dvEmpty').hidden=!!V.project.scenes.length;
  $('dvScenes').innerHTML=V.project.scenes.length?V.project.scenes.map((c,i)=>`<button class="dv-scene" data-dv="select" data-id="${esc(c.id)}" aria-pressed="${c.id===V.selected}" aria-label="Escena ${i+1}: ${esc(c.name)}"><img src="${esc(V.assets.get(c.assetId)?.thumb||'')}" alt=""><span class="dv-index">${i+1}</span><strong>${esc(c.name)}</strong><small>${c.kind==='video'?'Clip':'Imagen'} · ${M.duration(c).toFixed(1)} s</small></button>`).join(''):'<p class="dv-scene-empty">Tus escenas aparecerán aquí, en el orden del video.</p>';
  V.time=Math.min(V.time,total());$('dvSeek').max=Math.max(.01,total());updateInspector();savedLabel();transport();draw();
 }
 function transport(){if(!V.project)return;$('dvSeek').value=V.time;$('dvTime').textContent=stamp(V.time)+' / '+stamp(total());$('dvPlay').textContent=V.playing?'Ⅱ':'▶';$('dvPlay').setAttribute('aria-label',V.playing?'Pausar':'Reproducir');$('dvPlay').disabled=!V.project.scenes.length;}
 function edit(name){
  if(V.busy||V.exporting||!V.project)return;stop();const old=structuredClone(V.project),c=selected(),el=$('dv'+name);
  try{
   if(name==='Name')V.project.name=M.clean(el.value)||'Mi video Divas';else if(name==='Ratio')V.project.ratio=el.value;else if(name==='Quality')V.project.quality=+el.value;else if(name==='Background')V.project.background=el.value;
   else if(name.startsWith('Audio')&&V.project.music){const k={AudioOffset:'offset',AudioVolume:'volume',AudioLoop:'loop'}[name];V.project.music[k]=name==='AudioLoop'?el.checked:+el.value;}
   else if(c){const key={Duration:'duration',In:'in',Out:'out',Fit:'fit',Motion:'motion',Transition:'transition',Volume:'volume',Title:'title',TitlePosition:'titlePosition',TitleStyle:'titleStyle',TitleColor:'titleColor',TitleSize:'titleSize',TitleAnimate:'titleMotion'}[name];c[key]=name==='TitleAnimate'?(el.checked?'fade':'none'):['Duration','In','Out','Volume','TitleSize'].includes(name)?+el.value:el.value;
    if(c.kind==='video'&&(c.out-c.in<.1||c.in<0||c.out>V.assets.get(c.assetId).duration+.01))throw Error('El final debe estar después del inicio y dentro de la duración del clip.');
   }
   V.project=M.normalize(V.project,assetList());changed();if(['Title','Name'].includes(name)){draw();return;}refresh();seek().catch(e=>message(e.message,true));
  }catch(e){V.project=old;refresh();message(e.message,true);}
 }
 function fitDraw(x,el,iw,ih,w,h,fit,motion='none',progress=0){
  let scale=fit==='cover'?Math.max(w/iw,h/ih):Math.min(w/iw,h/ih);if(motion==='zoom')scale*=1+progress*.08;if(motion==='pan')scale*=1.06;
  const dw=iw*scale,dh=ih*scale,dx=(w-dw)/2+(motion==='pan'?(progress-.5)*w*.05:0);x.drawImage(el,dx,(h-dh)/2,dw,dh);
 }
 function titleLines(ctx,text,width){const out=[];for(const para of text.split('\n')){let line='';for(const word of para.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width<=width){line=next;continue;}if(line)out.push(line);line='';for(const ch of word){if(ctx.measureText(line+ch).width>width&&line){out.push(line);line='';}line+=ch;}}out.push(line);}return out;}
 function draw(frameOverride=null){
  if(!V.project)return;const canvas=$('dvCanvas'),x=canvas.getContext('2d'),w=canvas.width,h=canvas.height;x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.fillStyle=V.project.background;x.fillRect(0,0,w,h);
  const row=M.at(V.project,V.time);if(!row)return;const c=row.scene,a=V.assets.get(c.assetId),p=V.players.get(c.assetId),local=Math.max(0,V.time-row.start),duration=M.duration(c),progress=Math.min(1,local/duration),fade=Math.min(.35,duration/4);
  const alpha=c.transition==='fade'?Math.min(1,local/fade,(duration-local)/fade):1;
  x.save();x.globalAlpha=Math.max(0,alpha);if(frameOverride||p&&(a.kind==='image'||p.el.readyState>=2))fitDraw(x,frameOverride||p.el,frameOverride?.width||a.width,frameOverride?.height||a.height,w,h,c.fit,c.motion,progress);
  if(c.title){const margin=w*.07;let font=w*c.titleSize/100;x.textAlign='center';x.textBaseline='middle';x.font='700 '+font+'px Arial, sans-serif';let lines=titleLines(x,c.title,w-margin*2);while(lines.length*font*1.2>h*.4&&font>w*.025){font*=.92;x.font='700 '+font+'px Arial, sans-serif';lines=titleLines(x,c.title,w-margin*2);}const lh=font*1.2,blockH=lines.length*lh;let cy=c.titlePosition==='top'?h*.14+blockH/2:c.titlePosition==='center'?h/2:h*.84-blockH/2;const entrance=c.titleMotion==='fade'?Math.min(1,local/.55):1;cy+=(1-entrance)*h*.025;x.globalAlpha*=entrance;
   if(c.titleStyle==='plate'){x.fillStyle='#140a1fe0';x.fillRect(margin/2,cy-blockH/2-font*.3,w-margin,blockH+font*.6);}
   x.fillStyle=c.titleColor;if(c.titleStyle==='glow'){x.shadowColor='#ed69bb';x.shadowBlur=font*.4;x.strokeStyle='#3d173a';x.lineWidth=Math.max(1,font*.055);}
   lines.forEach((line,i)=>{const y=cy+(i-(lines.length-1)/2)*lh;if(c.titleStyle==='glow')x.strokeText(line,w/2,y);x.fillText(line,w/2,y);});
  }x.restore();
 }
 async function audioGraph(){
  if(!V.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Tu navegador no permite mezclar audio. Usa una versión reciente de Chrome o Safari.');V.ctx=new AC();V.master=V.ctx.createGain();V.master.gain.value=.8;const limiter=V.ctx.createDynamicsCompressor();V.master.connect(limiter);V.destination=V.ctx.createMediaStreamDestination();limiter.connect(V.destination);V.monitor=V.ctx.createGain();limiter.connect(V.monitor);V.monitor.connect(V.ctx.destination);}
  await V.ctx.resume();for(const a of assetList()){if(a.kind==='image'||V.sources.has(a.id))continue;const p=await player(a),source=V.ctx.createMediaElementSource(p.el),gain=V.ctx.createGain();gain.gain.value=0;source.connect(gain);gain.connect(V.master);V.sources.set(a.id,{source,gain});}
 }
 function silence(){for(const p of V.players.values())p.el.pause?.();for(const s of V.sources.values())s.gain.gain.value=0;}
 async function seekMedia(el,t){const value=Math.max(0,Math.min(t,Math.max(0,el.duration-.025)));if(Math.abs(el.currentTime-value)<.025&&el.readyState>=2)return;const done=waitFor(el,'seeked',()=>false);el.currentTime=value;await done;}
 async function seek(){
  const row=M.at(V.project,V.time);if(!row){draw();return;}const a=V.assets.get(row.scene.assetId),p=await player(a),op=++V.operation;
  if(a.kind==='video')await seekMedia(p.el,row.scene.in+Math.max(0,V.time-row.start));if(op===V.operation){draw();transport();}
 }
 async function seekSelected(){const row=M.timeline(V.project).find(r=>r.scene.id===V.selected);if(row)V.time=row.start+Math.min(.4,M.duration(row.scene)/2);await seek();}
 async function syncStart(){
  silence();const row=M.at(V.project,V.time);if(!row)return;const c=row.scene,p=await player(V.assets.get(c.assetId));V.active=c.id;
  if(c.kind==='video'){await seekMedia(p.el,c.in+V.time-row.start);V.sources.get(c.assetId).gain.gain.value=c.volume;await p.el.play();}
  const music=V.project.music;if(music){const a=V.assets.get(music.assetId),mp=await player(a),available=a.duration-music.offset,position=music.loop?music.offset+(V.time%available):music.offset+V.time;
   if(position<a.duration-.025){mp.el.loop=false;await seekMedia(mp.el,position);V.sources.get(a.id).gain.gain.value=music.volume;await mp.el.play();}}
 }
 function stop(){V.playing=false;V.starting=false;V.playback++;cancelAnimationFrame(V.raf);silence();V.operation++;if(V.project&&$(id))transport();}
 async function play(){
  if(V.playing||V.starting){stop();return;}if(!V.project.scenes.length)return;if(document.hidden)throw Error('Mantén Divas visible para reproducir o exportar.');if(V.time>=total()-.03)V.time=0;
  if(!V.exporting)V.cancelled=false;V.starting=true;const token=++V.playback,epoch=V.epoch;
  try{await preparePlayers();await audioGraph();guard(epoch);if(token!==V.playback)return;await syncStart();guard(epoch);if(token!==V.playback){silence();return;}V.playing=true;V.clock=performance.now();V.start=V.time;transport();tick();}
  finally{if(token===V.playback)V.starting=false;}
 }
 function tick(){
  if(!V.playing)return;V.time=Math.min(total(),V.start+(performance.now()-V.clock)/1000);
  if(V.time>=total()){draw();stop();return;}
  const row=M.at(V.project,V.time);
  if(row.scene.id!==V.active){const token=V.playback;V.playing=false;V.starting=true;syncStart().then(()=>{if(token!==V.playback||V.cancelled||!$(id).open){silence();return;}V.starting=false;V.playing=true;V.start=V.time;V.clock=performance.now();tick();}).catch(e=>{message(e.message,true);V.cancelled=true;stop();});return;}
  const music=V.project.music;if(music){const a=V.assets.get(music.assetId),p=V.players.get(a.id);if(music.loop&&p.el.ended){p.el.currentTime=music.offset;p.el.play().catch(e=>{V.cancelled=true;message(e.message,true);stop();});}}
  draw();transport();if(V.exporting){$('dvProgressBar').value=V.time/total()*100;$('dvProgressText').textContent='Exportando '+Math.round(V.time/total()*100)+'% · '+stamp(V.time)+' / '+stamp(total());}
  V.raf=requestAnimationFrame(tick);
 }
 function exportInfo(){
  if(!V.project)return;const dim=size(true),format=V.output?.extension.toUpperCase();$('dvDimensions').textContent=dim.w+' × '+dim.h+' · '+(format||(V.probeDone?'Sin exportación':'Comprobando…'));
  $('dvExportHint').textContent=format?(format==='MP4'?'MP4 disponible en este navegador.':'Este navegador exporta WebM.')+' El archivo se genera a 30 fotogramas por segundo.':V.probeDone?'Este navegador no admite la exportación. Descarga un respaldo para abrirlo en una versión reciente de Chrome, Edge o Safari.':'Comprobando los formatos de exportación…';
  $('dvExport').disabled=V.busy||V.exporting||!V.output||!V.project.scenes.length;
 }
 async function probeExport(){
  if(!V.project)return;const dim=size(true),key=dim.w+'x'+dim.h;if(V.probeKey===key)return;V.probeKey=key;V.output=null;V.probeDone=false;exportInfo();
  try{exportModule=exportModule||import(exportURL);const engine=await exportModule,config=await engine.probe(dim);if(V.probeKey!==key)return;V.output=config;V.probeDone=true;exportInfo();}
  catch(e){V.probeKey=null;V.probeDone=true;exportModule=null;exportInfo();message('No se pudo cargar la exportación. Comprueba la conexión y vuelve a abrir Video.',true);}
 }
 async function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 const filename=()=>M.clean(V.project.name,60).replace(/[^\p{L}\p{N} _-]/gu,'').trim()||'divas-video';
 async function exportVideo(){
  if(V.busy||V.exporting)return;if(!V.project.scenes.length)throw Error('Añade al menos una escena.');if(!V.output)throw Error('La exportación todavía no está disponible en este navegador.');
  stop();await save();V.exporting=true;V.cancelled=false;setBusy();const epoch=V.epoch,dim=size(true),canvas=$('dvCanvas'),config=V.output;
  try{
   const engine=await exportModule;await preparePlayers();guard(epoch);canvas.width=dim.w;canvas.height=dim.h;try{V.wake=await navigator.wakeLock?.request('screen');}catch{}
   const blob=await engine.encode({project:structuredClone(V.project),assets:assetList(),canvas,config,
    render:(time,frame)=>{guard(epoch);V.time=time;draw(frame);transport();},
    progress:(n,text)=>{$('dvProgressBar').value=n;$('dvProgressText').textContent=text;},
    cancelled:()=>V.cancelled||epoch!==V.epoch||owner()!==V.owner});
   guard(epoch);await download(blob,filename()+'.'+config.extension);message('Video descargado · '+dim.w+' × '+dim.h+' · '+config.extension.toUpperCase()+' · 30 fps.');
  }finally{stop();try{await V.wake?.release();}catch{}V.wake=null;V.exporting=false;setBusy();refresh();}
 }
 const MAGIC=new TextEncoder().encode('DIVASVIDEO1\n');
 async function backup(){
  const assets=assetList();const manifest={project:V.project,assets:assets.map(({blob,thumb,...a})=>a)},json=new TextEncoder().encode(JSON.stringify(manifest)),length=new Uint8Array(4);new DataView(length.buffer).setUint32(0,json.length,true);
  await download(new Blob([MAGIC,length,json,...assets.map(a=>a.blob)],{type:'application/octet-stream'}),filename()+'.divasvideo');message('Respaldo descargado con todos los clips, imágenes y música. Ábrelo con Abrir respaldo.');
 }
 async function restore(file){
  if(!file)return;if(file.size>M.LIMITS.totalBytes+1048576)throw Error('El respaldo supera los 150 MB permitidos.');const head=new Uint8Array(await file.slice(0,MAGIC.length+4).arrayBuffer());if(head.length<MAGIC.length+4||MAGIC.some((v,i)=>v!==head[i]))throw Error('Este archivo no es un respaldo de video Divas.');
  const len=new DataView(head.buffer).getUint32(MAGIC.length,true);if(len<2||len>1048576||len+head.length>file.size)throw Error('El respaldo está incompleto.');const raw=JSON.parse(await file.slice(head.length,head.length+len).text());
  if(!Array.isArray(raw.assets)||raw.assets.length>31)throw Error('La lista de archivos del respaldo no es válida.');let offset=head.length+len;const assets=[];for(const a of raw.assets){M.validateAsset(a);if(offset+a.size>file.size)throw Error('Faltan archivos dentro del respaldo.');assets.push({...a,blob:file.slice(offset,offset+a.size,a.type),thumb:''});offset+=a.size;}if(offset!==file.size)throw Error('El tamaño del respaldo no coincide con su contenido.');
  let project=M.normalize(raw.project,assets);project.id=M.uid();await save();const epoch=V.epoch;const ready=[];
  try{for(const a of assets){const verified=await inspect(new File([a.blob],a.name,{type:a.type}));guard(epoch);if(verified.kind!==a.kind)throw Error('Un recurso del respaldo no coincide con su formato.');ready.push(verified);const prior=a.id;a.id=verified.id;a.width=verified.width;a.height=verified.height;a.duration=verified.duration;a.thumb=verified.thumb;for(const c of project.scenes)if(c.assetId===prior)c.assetId=a.id;if(project.music?.assetId===prior)project.music.assetId=a.id;}
   project=M.normalize(project,assets);
  }catch(e){ready.forEach(a=>dropPlayer(a.id));throw e;}
  const keep=new Set(assets.map(a=>a.id));for(const old of [...V.players.keys()])if(!keep.has(old))dropPlayer(old);stop();V.project=project;V.assets=new Map(assets.map(a=>[a.id,a]));V.selected=project.scenes[0]?.id||null;V.savedVersion=0;V.revision=0;V.time=0;changed();await save();$('dvLibrary').hidden=true;refresh();await seek();message('Respaldo recuperado como un video nuevo.');
 }
 function panel(name){$(id).dataset.panel=name;$(id).querySelectorAll('[data-dv=panel]').forEach(b=>b.setAttribute('aria-selected',b.dataset.panel===name));}
 async function perform(action,b){
  if(action==='cancel'){V.cancelled=true;stop();return;}if(V.busy||V.exporting)return;
  if(action==='play')return play();if(action==='close')return close();if(action==='panel'){panel(b.dataset.panel);return;}
  if(action==='media'){$('dvFiles').click();return;}if(action==='audio'){$('dvAudioFile').click();return;}if(action==='restore'){$('dvBackupFile').click();return;}
  if(action==='export')return exportVideo();
  if(action==='library'){stop();try{await save();}catch(e){message(e.message,true);}await listProjects();$('dvLibrary').hidden=false;return;}
  if(action==='hideLibrary'){$('dvLibrary').hidden=true;return;}
  if(action==='new')return job(newProject);if(action==='load')return job(()=>loadProject(b.dataset.id));if(action==='capture')return job(capture);if(action==='backup')return job(backup);
  if(action==='save'){try{await save();message('Video guardado en este dispositivo.');}catch(e){message(e.message,true);const copy=document.createElement('button');copy.dataset.dv='saveCopy';copy.textContent='Guardar copia';$('dvMessage').append(' ',copy);}return;}
  if(action==='saveCopy'){V.project.id=M.uid();V.savedVersion=0;changed();await save();message('Copia guardada en este dispositivo.');return;}
  if(action==='delete'){if(!confirm('¿Eliminar este video guardado en este dispositivo?'))return;const epoch=V.epoch,d=await db(),key=V.owner+':'+b.dataset.id;guard(epoch);await new Promise((resolve,reject)=>{const tx=d.transaction(['projects','summaries'],'readwrite');tx.objectStore('projects').delete(key);tx.objectStore('summaries').delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});if(V.project.id===b.dataset.id){discard();V.project=M.blank();refresh();}await listProjects();return;}
  stop();if(action==='rewind'){V.time=0;await seek();return;}if(action==='select'){V.selected=b.dataset.id;refresh();await seekSelected();return;}
  const c=selected();if(action==='removeAudio'){V.project.music=null;prune();changed();refresh();return;}if(!c)throw Error('Selecciona primero una escena.');
  const old=structuredClone(V.project);try{const i=V.project.scenes.indexOf(c);
   if(action==='left'&&i>0)[V.project.scenes[i-1],V.project.scenes[i]]=[c,V.project.scenes[i-1]];
   else if(action==='right'&&i<V.project.scenes.length-1)[V.project.scenes[i],V.project.scenes[i+1]]=[V.project.scenes[i+1],c];
   else if(action==='duplicate'){const copy={...c,id:M.uid()};V.project.scenes.splice(i+1,0,copy);V.selected=copy.id;}
   else if(action==='remove'){V.project.scenes.splice(i,1);V.selected=V.project.scenes[Math.min(i,V.project.scenes.length-1)]?.id||null;}
   else if(action==='split')V.selected=M.split(V.project,c.id,V.time);
   M.normalize(V.project,assetList());prune();changed();refresh();await seekSelected();
  }catch(e){V.project=old;V.selected=c.id;refresh();throw e;}
 }
 function reset(){V.epoch++;V.cancelled=true;stop();discard();V.owner=null;$(id)?.close();}
 window.DivasVideo={init(bridge){V.bridge=bridge;makeUI();document.addEventListener('click',e=>{const b=e.target.closest('[data-dv-open]');if(!b)return;e.preventDefault();e.stopPropagation();open().catch(err=>V.bridge.notify(err.message));});},open,reset};
})();

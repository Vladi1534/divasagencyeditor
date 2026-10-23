/* Divas Video: browser-local editing, real media export, isolated from flyer state. */
(function(){
 'use strict';
 const M=window.DivasVideoModel;if(!M)return;
 const exportURL=new URL('./divas-video-export.mjs?v=40',document.currentScript.src).href;
 const renderURL=new URL('./divas-video-render.mjs?v=40',document.currentScript.src).href;
 let exportModule,renderer;
 let renderModule=import(renderURL);
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const V={bridge:null,project:null,assets:new Map(),players:new Map(),owner:null,epoch:0,selected:null,history:[],future:[],lastEdit:null,picking:false,original:false,isolate:false,endPose:false,zoom:32,time:0,playing:false,starting:false,playback:0,raf:0,clock:0,start:0,active:null,busy:false,exporting:false,cancelled:false,dirty:false,revision:0,savedVersion:0,saveTask:null,timer:0,ctx:null,master:null,destination:null,monitor:null,sources:new Map(),wake:null,operation:0};
 let dbPromise;
 const id='divasVideoDialog',selected=()=>[...V.project?.scenes||[],...V.project?.layers||[],...V.project?.audio||[]].find(c=>c.id===V.selected),total=()=>V.project?M.total(V.project):0;
 const owner=()=>String(V.bridge?.session()?.owner||'local');
 const guard=epoch=>{if(epoch!==V.epoch||V.owner!==owner())throw Error('La cuenta cambió. Abre nuevamente tus videos.');};
 const stamp=s=>{const t=Math.max(0,s);return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')+'.'+Math.floor(t%1*10);};
 const usedIds=M.usedIds;
 function assetList(p=V.project){const ids=usedIds(p);return [...V.assets.values()].filter(a=>ids.has(a.id));}
 function message(text,error=false){$('dvMessage').textContent=text;$('dvMessage').classList.toggle('dv-error',error);}
 function size(exporting=false){const [w,h]=M.formats[V.project.ratio],edge=exporting?V.project.quality:360;const f=edge/Math.min(w,h);return {w:Math.round(w*f/2)*2,h:Math.round(h*f/2)*2};}
 function makeUI(){
  if($(id))return;
  const dialog=document.createElement('dialog');dialog.id=id;dialog.className='dv-shell';dialog.dataset.panel='preview';dialog.setAttribute('aria-label','Divas Video');
  dialog.innerHTML=`<div class="dv-layout">
   <header class="dv-topbar"><div class="dv-brand"><strong>Divas <span>Video</span></strong><small>Tu estudio en movimiento</small></div><label class="dv-name"><input id="dvName" aria-label="Nombre del video" maxlength="80" value="Mi video Divas"></label><button class="dv-close" data-dv="close" aria-label="Volver al editor">×</button><div class="dv-top-actions"><button data-dv="undo" aria-label="Deshacer" title="Deshacer · Ctrl Z">↶</button><button data-dv="redo" aria-label="Rehacer" title="Rehacer · Ctrl Shift Z">↷</button><button data-dv="library">Mis videos</button><button data-dv="save">Guardar</button><span class="dv-save-status" id="dvSaveStatus" role="status">En este dispositivo</span><button class="dv-primary" data-dv="export" id="dvExport">Exportar</button></div></header>
   <div class="dv-progress" id="dvProgress" hidden><span id="dvProgressText">Preparando…</span><progress id="dvProgressBar" max="100" value="0"></progress><button data-dv="cancel">Cancelar</button></div>
   <div class="dv-quickbar"><button class="dv-cutout-entry" data-dv="cutout">✦ Quitar fondo</button><button data-dv="overlay">+ Capa</button><button data-dv="addText">T Texto</button><button data-dv="animateFlyer">✧ Animar flyer</button></div>
   <div class="dv-body" id="dvBody"><div class="dv-stage"><div class="dv-stage-head"><label>Formato <select id="dvRatio"><option value="9:16">9:16 · Reel</option><option value="1:1">1:1</option><option value="16:9">16:9</option></select></label><small id="dvDimensions"></small><button data-dv="cleanPreview" aria-pressed="false" title="Ocultar controles de selección">Vista limpia</button></div><div class="dv-preview-wrap"><canvas id="dvCanvas" width="360" height="640" aria-label="Vista previa del video"></canvas><div class="dv-pick-banner" id="dvPickBanner" hidden>Toca el color que quieres quitar <button data-dv="cancelPick">Cancelar</button></div><div class="dv-empty" id="dvEmpty"><strong>Dale movimiento a tu idea</strong><p>Añade un clip, un flyer o un texto. Después combina tus capas.</p></div><div class="dv-canvas-tools" id="dvCanvasTools" hidden><button data-dv="lock" aria-label="Bloquear o desbloquear capa">♧</button><button data-dv="remove" aria-label="Eliminar elemento seleccionado">×</button></div></div><div class="dv-transport"><button data-dv="rewind" aria-label="Ir al inicio">↤</button><button data-dv="play" id="dvPlay" aria-label="Reproducir">▶</button><input id="dvSeek" type="range" min="0" max="5" step="0.01" value="0" aria-label="Posición en el video"><span class="dv-time" id="dvTime">0:00.0 / 0:00.0</span></div></div>
   <div class="dv-mobile-tabs" role="tablist" aria-label="Herramientas de video"><button role="tab" data-dv="panel" data-panel="preview" aria-selected="true">Lienzo</button><button role="tab" data-dv="panel" data-panel="scene" aria-selected="false">Editar capa</button><button role="tab" data-dv="panel" data-panel="audio" aria-selected="false">Audio</button></div>
   <aside class="dv-inspector" aria-label="Ajustes del video" data-tool="clip"><div class="dv-tool-tabs" role="tablist" aria-label="Ajustes de la capa"><button role="tab" data-dv="tool" data-tool="clip" aria-selected="true">Tiempo</button><button role="tab" data-dv="tool" data-tool="cutout" aria-selected="false">Fondo</button><button role="tab" data-dv="tool" data-tool="transform" aria-selected="false">Mover</button><button role="tab" data-dv="tool" data-tool="text" aria-selected="false">Texto</button><button role="tab" data-dv="tool" data-tool="color" aria-selected="false">Color</button><button role="tab" data-dv="tool" data-tool="audio" aria-selected="false">Audio</button></div>
   <div class="dv-scene-fields dv-fields"><div class="dv-selected-heading"><h2 id="dvSceneName">Selecciona una escena o capa</h2><button data-dv="hideLayer" aria-label="Ocultar o mostrar capa">◉</button></div>
   <section class="dv-fields dv-tool-content" data-content="clip"><div class="dv-clip-tools"><button data-dv="left" aria-label="Mover escena antes" title="Antes / detrás">←</button><button data-dv="right" aria-label="Mover escena después" title="Después / delante">→</button><button data-dv="duplicate">Duplicar</button><button data-dv="remove" class="dv-danger">Eliminar</button></div><label id="dvStartLabel">Aparece en (segundos)<input id="dvStart" type="number" min="0" max="180" step="0.1"></label><label id="dvDurationLabel">Dura (segundos)<input id="dvDuration" type="number" min="0.25" max="180" step="0.1" value="5"></label><div class="dv-row" id="dvTrim" hidden><label>Recortar desde (s)<input id="dvIn" type="number" min="0" step="0.1"></label><label>Hasta (s)<input id="dvOut" type="number" min="0.1" step="0.1"></label></div><button data-dv="split">✂ Dividir aquí</button><label>Entrada y salida<select id="dvTransition"><option value="fade">Fundido suave</option><option value="cut">Directa</option></select></label><p class="dv-hint">Arrastra las capas en la línea de tiempo. Sus extremos ajustan cuándo aparecen y desaparecen.</p></section>
   <section class="dv-fields dv-tool-content" data-content="cutout"><div class="dv-feature-heading"><span>✦</span><h3>Quitar fondo por color</h3></div><p class="dv-hint">Para fondos de un color: tócalo en el video o usa Automático.</p><div class="dv-cutout-actions"><button class="dv-primary" data-dv="pickColor" title="Toca el color que quieres quitar en el video">◎ Elegir color</button><button data-dv="autoColor" title="Detectar el color de un fondo uniforme">✧ Automático</button></div><div class="dv-swatches"><button data-dv="keyColor" data-color="#00ff00" style="--swatch:#00ff00" aria-label="Quitar verde"></button><button data-dv="keyColor" data-color="#0000ff" style="--swatch:#0000ff" aria-label="Quitar azul"></button><button data-dv="keyColor" data-color="#ffffff" style="--swatch:#ffffff" aria-label="Quitar blanco"></button><button data-dv="keyColor" data-color="#000000" style="--swatch:#000000" aria-label="Quitar negro"></button></div><label class="dv-check"><input id="dvKeyEnabled" type="checkbox">Quitar este color</label><label>Color elegido<input id="dvKeyColor" type="color" value="#00ff00"></label><label>Intensidad <output id="dvKeyToleranceValue"></output><input id="dvKeyTolerance" type="range" min="0.005" max="0.8" step="0.005"></label><label>Suavizar bordes <output id="dvKeySoftnessValue"></output><input id="dvKeySoftness" type="range" min="0.005" max="0.4" step="0.005"></label><label>Limpiar reflejo del color <input id="dvKeySpill" type="range" min="0" max="1" step="0.01"></label><div class="dv-row"><button data-dv="original" aria-pressed="false">Ver antes</button><button data-dv="isolate" aria-pressed="false">Ver recorte</button></div><button data-dv="resetKey">Restablecer fondo</button><p class="dv-hint">Si desaparece parte del sujeto, baja la intensidad. «Ver recorte» muestra transparencia solo en la vista previa; el vídeo final usa el fondo o las capas de debajo.</p></section>
   <section class="dv-fields dv-tool-content" data-content="transform"><p class="dv-hint">Arrastra en el lienzo para mover. Las esquinas cambian el tamaño sin deformar.</p><label>Encuadre<select id="dvFit"><option value="contain">Imagen completa</option><option value="cover">Llenar el lienzo</option></select></label><label>Forma de la capa<select id="dvMask"><option value="none">Original</option><option value="circle">Círculo</option><option value="rounded">Esquinas redondeadas</option></select></label><div class="dv-row"><label>Horizontal (%)<input id="dvX" type="number" min="-100" max="200" step="1"></label><label>Vertical (%)<input id="dvY" type="number" min="-100" max="200" step="1"></label></div><label>Tamaño sin deformar (%)<input id="dvScale" type="range" min="5" max="400" step="1"><output id="dvScaleValue"></output></label><div class="dv-row"><label>Girar (°)<input id="dvRotation" type="number" min="-360" max="360" step="1"></label><label>Opacidad (%)<input id="dvOpacity" type="number" min="0" max="100" step="1"></label></div><button data-dv="resetTransform">Centrar y ajustar</button><label>Movimiento rápido<select id="dvMotion"><option value="none">Quieto</option><option value="zoom">Acercamiento</option><option value="pan">Desplazamiento</option></select></label><label class="dv-check"><input id="dvAnimation" type="checkbox">Animar de inicio a final</label><div class="dv-row"><button data-dv="poseStart" aria-pressed="true">Editar inicio</button><button data-dv="poseEnd" aria-pressed="false">Editar final</button></div><p class="dv-hint">Activa la animación y cambia la posición o tamaño del final. Divas crea el movimiento entre ambos puntos.</p></section>
   <section class="dv-fields dv-tool-content" data-content="text"><label>Tu mensaje<textarea id="dvTitle" rows="3" maxlength="500" placeholder="Escribe tu mensaje…"></textarea></label><div class="dv-row"><label>Estilo<select id="dvTitleStyle"><option value="gold">Dorado Divas</option><option value="glow">Glow</option><option value="neon">Neón</option><option value="plate">Fondo oscuro</option><option value="plain">Limpio</option></select></label><label>Letra<select id="dvTitleFont"><option>Arial</option><option>Georgia</option><option>Impact</option><option>Trebuchet MS</option></select></label></div><div class="dv-row"><label>Color<input id="dvTitleColor" type="color" value="#ffffff"></label><label>Tamaño<input id="dvTitleSize" type="number" min="2" max="30" step="0.5" value="6"></label></div><label>Ubicación<select id="dvTitlePosition"><option value="bottom">Abajo</option><option value="center">Centro</option><option value="top">Arriba</option></select></label><label>Animación del texto<select id="dvTitleMotion"><option value="fade">Suave</option><option value="rise">Desde abajo</option><option value="pop">Aparición con zoom</option><option value="none">Sin animación</option></select></label><input id="dvTitleAnimate" type="checkbox" hidden checked><p class="dv-hint">«T Texto» crea mensajes con su propio tiempo. El glow conserva un frente nítido.</p></section>
   <section class="dv-fields dv-tool-content" data-content="color"><label>Luz<input id="dvBrightness" type="range" min="-0.5" max="0.5" step="0.01"></label><label>Contraste<input id="dvContrast" type="range" min="-0.8" max="1" step="0.01"></label><label>Color<input id="dvSaturation" type="range" min="-1" max="1" step="0.01"></label><button data-dv="resetColor">Restablecer color</button></section></div>
   <div class="dv-audio-fields dv-fields dv-tool-content" data-content="audio"><h2>Audio de la selección</h2><label id="dvVolumeLabel" hidden>Volumen<input id="dvVolume" type="range" min="0" max="1" step="0.01" value="1"></label><div id="dvTrackFields" class="dv-fields" hidden><div class="dv-row"><label>Aparece (s)<input id="dvTrackStart" type="number" min="0" max="180" step="0.1"></label><label>Desde el archivo (s)<input id="dvTrackIn" type="number" min="0" step="0.1"></label></div><label>Hasta el archivo (s)<input id="dvTrackOut" type="number" min="0.1" step="0.1"></label><button data-dv="remove">Eliminar pista</button></div><div class="dv-row"><label>Entrada suave (s)<input id="dvFadeIn" type="number" min="0" max="20" step="0.1"></label><label>Salida suave (s)<input id="dvFadeOut" type="number" min="0" max="20" step="0.1"></label></div><button data-dv="audioTrack">+ Pista de voz o sonido</button><hr class="dv-divider"><h3>Música de fondo</h3><button data-dv="audio">+ Elegir música</button><p id="dvAudioName" class="dv-audio-name">Sin música</p><div id="dvMusicFields" class="dv-fields" hidden><label>Empezar desde el archivo (s)<input id="dvAudioOffset" type="number" min="0" step="0.1" value="0"></label><label>Volumen de música<input id="dvAudioVolume" type="range" min="0" max="1" step="0.01" value="0.3"></label><label class="dv-check"><input id="dvAudioLoop" type="checkbox">Repetir música</label><button data-dv="removeAudio">Quitar música</button></div><hr class="dv-divider"><h3>Salida</h3><label>Calidad<select id="dvQuality"><option value="720">HD · 720p</option><option value="1080">Full HD · 1080p</option></select></label><label>Color de fondo<input id="dvBackground" type="color" value="#201424"></label><p class="dv-hint" id="dvExportHint"></p></div></aside></div>
   <div class="dv-timeline" id="dvTimeline"><div class="dv-timeline-head"><h2>Línea de tiempo <span id="dvCount"></span></h2><button class="dv-toggle-timeline" data-dv="toggleTimeline" aria-expanded="true">Capas ▾</button><label class="dv-zoom">Zoom <input id="dvZoom" type="range" min="12" max="100" step="4" value="32" aria-label="Zoom de línea de tiempo"></label><button data-dv="capture">+ Flyer</button><button data-dv="media" class="dv-primary">+ Fotos / clips</button></div><div class="dv-timeline-scroll" id="dvTimelineScroll"><div id="dvRuler" class="dv-ruler"></div><div class="dv-main-track"><span class="dv-track-label">Vídeo base</span><div class="dv-scenes" id="dvScenes" aria-label="Escenas del video"></div></div><div id="dvLayers" aria-label="Capas y pistas independientes"></div><div class="dv-playhead" id="dvPlayhead"></div></div></div>
   <div class="dv-footer"><p id="dvMessage" role="status" aria-live="polite">Guardado automático en este navegador. Usa Respaldo para llevarlo a otro dispositivo.</p><button data-dv="backup">Respaldo</button><button data-dv="restore">Abrir respaldo</button></div>
   <section class="dv-library" id="dvLibrary" aria-label="Mis videos" hidden><div class="dv-library-top"><h2>Mis videos en este dispositivo</h2><button data-dv="new" class="dv-primary">+ Nuevo video</button><button data-dv="restore">Abrir respaldo</button><button data-dv="hideLibrary">Volver</button></div><p class="dv-library-note">Guardados aquí, separados por cuenta. Usa Respaldo para llevarlos a otro equipo.</p><div class="dv-projects" id="dvProjects"></div></section>
   <input type="file" id="dvFiles" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden><input type="file" id="dvOverlayFiles" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden><input type="file" id="dvAudioFile" accept="audio/*" hidden><input type="file" id="dvTrackFile" accept="audio/*" hidden><input type="file" id="dvBackupFile" accept=".divasvideo" hidden>
  </div>`;
  document.body.appendChild(dialog);
  installGestures();
  new ResizeObserver(fitPreview).observe($(id).querySelector('.dv-preview-wrap'));
  dialog.addEventListener('click',e=>{const b=e.target.closest('[data-dv]');if(b){e.stopPropagation();if(V.suppressClick){V.suppressClick=false;return;}perform(b.dataset.dv,b).catch(err=>message(err.message,true));}});
  dialog.addEventListener('keydown',e=>{e.stopPropagation();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!/INPUT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();historyMove(e.shiftKey);return;}if(e.code==='Space'&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();perform('play').catch(err=>message(err.message,true));}});
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(V.exporting){V.cancelled=true;stop();}else close().catch(err=>message(err.message,true));});
  $('dvSeek').addEventListener('input',()=>{if(V.exporting)return;const t=+$('dvSeek').value;stop();V.time=t;seek().catch(err=>message(err.message,true));});
  for(const name of ['Name','Ratio','Quality','Background','Duration','In','Out','Fit','Motion','Transition','Volume','Title','TitlePosition','TitleStyle','TitleColor','TitleSize','TitleAnimate','AudioOffset','AudioVolume','AudioLoop','Start','KeyEnabled','KeyColor','KeyTolerance','KeySoftness','KeySpill','X','Y','Scale','Rotation','Opacity','Animation','TitleFont','TitleMotion','Mask','Brightness','Contrast','Saturation','TrackStart','TrackIn','TrackOut','FadeIn','FadeOut']){
   $('dv'+name).addEventListener(name==='Title'||name==='Name'||$('dv'+name).type==='range'?'input':'change',()=>edit(name));
  }
  $('dvFiles').addEventListener('change',()=>job(()=>addFiles([...$('dvFiles').files])).finally(()=>$('dvFiles').value=''));
  $('dvZoom').addEventListener('input',()=>{V.zoom=+$('dvZoom').value;renderTimeline();transport();});
  $('dvOverlayFiles').addEventListener('change',()=>job(()=>addFiles([...$('dvOverlayFiles').files],'layer')).finally(()=>$('dvOverlayFiles').value=''));
  $('dvTrackFile').addEventListener('change',()=>job(()=>addFiles([...$('dvTrackFile').files],'track')).finally(()=>$('dvTrackFile').value=''));
  $('dvAudioFile').addEventListener('change',()=>job(()=>addFiles([...$('dvAudioFile').files],true)).finally(()=>$('dvAudioFile').value=''));
  $('dvBackupFile').addEventListener('change',()=>job(()=>restore($('dvBackupFile').files[0])).finally(()=>$('dvBackupFile').value=''));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&V.playing){if(V.exporting){V.cancelled=true;message('La exportación se interrumpió al cambiar de pestaña. Vuelve a exportar manteniendo Divas visible.',true);}stop();}});
  window.addEventListener('pagehide',()=>{V.cancelled=true;stop();});
  window.addEventListener('beforeunload',e=>{if(V.dirty||V.exporting){e.preventDefault();e.returnValue='';}});
 }
 async function job(fn){if(V.busy||V.exporting)return;V.busy=true;setBusy();try{await fn();}catch(e){message(e.message||'No se pudo completar. Inténtalo otra vez.',true);}finally{V.busy=false;setBusy();}}
 function setBusy(){if(!$(id))return;const on=V.busy||V.exporting;$('dvBody').inert=on;$('dvTimeline').inert=on;$(id).querySelectorAll('.dv-topbar button,.dv-topbar input,.dv-quickbar button,.dv-footer button,.dv-library button').forEach(b=>b.disabled=on);$('dvProgress').hidden=!V.exporting;exportInfo();historyButtons();}
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
 function discard(){V.history=[];V.future=[];V.lastEdit=null;V.picking=false;V.original=false;V.isolate=false;stop();clearTimeout(V.timer);disposePlayers();V.assets.clear();V.project=null;V.selected=null;V.time=0;V.dirty=false;V.revision=0;V.savedVersion=0;}
 async function open(){
  makeUI();if(!renderer){try{const {Renderer}=await renderModule;renderer=new Renderer(M,$('dvCanvas'));}catch(e){renderModule=import(renderURL);throw Error('No se pudo cargar el motor de video. Recarga la página e inténtalo de nuevo.');}}await V.bridge.ready?.();if(V.bridge.session()?.blocked)throw Error('Termina la ayuda compartida antes de abrir el editor de video.');
  if(V.owner!==owner()){discard();V.owner=owner();V.epoch++;}
  if(!V.project){V.project=M.blank();V.selected=null;}
  $('dvLibrary').hidden=true;refresh();V.bridge.show(id);message('Guardado en este navegador. Usa Respaldo para llevar el video a otro dispositivo.');
 }
 async function close(){if(V.busy||V.exporting)return;stop();try{await save();$(id).close();}catch(e){message(e.message+' Pulsa Respaldo antes de salir.',true);}}
 async function newProject(){stop();await save();discard();V.project=M.blank();refresh();$('dvLibrary').hidden=true;message('Añade fotos, clips o el flyer abierto para comenzar.');}
 async function loadProject(projectId){
  stop();await save();const epoch=V.epoch,record=await getRecord(V.owner+':'+projectId);guard(epoch);if(!record||record.owner!==V.owner)throw Error('No se encontró este video en tu cuenta local.');
  const p=M.normalize(record.project,record.assets);discard();V.project=p;V.savedVersion=record.version;V.assets=new Map(record.assets.map(a=>[a.id,a]));V.selected=p.scenes[0]?.id||p.layers[0]?.id||null;
  await preparePlayers();guard(epoch);$('dvLibrary').hidden=true;refresh();await seek();message('Video abierto desde este dispositivo.');
 }
 function waitFor(el,event,ready){return new Promise((resolve,reject)=>{if(ready?.())return resolve();const timer=setTimeout(()=>finish(Error('El archivo no pudo abrirse a tiempo. Prueba un clip más pequeño.')),20000);const ok=()=>finish(),bad=()=>finish(Error('El navegador no puede reproducir este archivo. Prueba otro MP4, WebM o audio.'));function finish(error){clearTimeout(timer);el.removeEventListener(event,ok);el.removeEventListener('error',bad);error?reject(error):resolve();}el.addEventListener(event,ok,{once:true});el.addEventListener('error',bad,{once:true});});}
 async function player(a,key=a.id){
  if(V.players.has(key))return V.players.get(key);
  const url=URL.createObjectURL(a.blob),el=a.kind==='image'?new Image():document.createElement(a.kind==='video'?'video':'audio');
  if(a.kind!=='image'){el.preload='auto';el.playsInline=true;el.setAttribute('playsinline','');el.muted=false;}
  const p={el,url,kind:a.kind,assetId:a.id};V.players.set(key,p);el.src=url;
  try{if(a.kind==='image')await waitFor(el,'load',()=>el.complete&&el.naturalWidth>0);else{el.load();await waitFor(el,'loadeddata',()=>el.readyState>=2);}}
  catch(e){V.players.delete(key);URL.revokeObjectURL(url);throw e;}return p;
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
 function prune(){
  const collect=()=>new Set([...usedIds(V.project),...V.history.flatMap(p=>[...usedIds(p)]),...V.future.flatMap(p=>[...usedIds(p)])]);let ids=collect();
  while(V.history.length&&[...ids].reduce((n,key)=>n+(V.assets.get(key)?.size||0),0)>M.LIMITS.totalBytes*1.5){V.history.shift();ids=collect();}
  for(const a of V.assets.values())if(!ids.has(a.id))V.assets.delete(a.id);
  const instances=new Set([...ids,...M.rows(V.project).map(r=>r.scene.id),...V.project.audio.map(c=>c.id),...(V.project.music?['music']:[])]);
  for(const [key,p] of V.players)if(!instances.has(key)||!ids.has(p.assetId))dropPlayer(key);
 }
 async function addFiles(files,mode=false){
  if(!files.length)return;stop();const epoch=V.epoch,candidates=[],p=structuredClone(V.project);
  try{for(const f of files){message('Abriendo '+f.name+'…');const a=await inspect(f);candidates.push(a);guard(epoch);if((mode===true||mode==='track')&&a.kind!=='audio')throw Error('Elige un archivo de música o voz.');if(!mode&&a.kind==='audio')throw Error('Añade la música desde Audio.');if(mode===true)p.music={assetId:a.id,offset:0,volume:.3,loop:false};else if(mode==='track')p.audio.push(M.audioLayer(a,V.time));else if(mode==='layer')p.layers.push(M.layer(a,V.time));else p.scenes.push(M.scene(a));}
   const assets=[...assetList(p),...candidates];const normalized=M.normalize(p,assets);checkpoint();for(const a of candidates)V.assets.set(a.id,a);V.project=normalized;V.selected=mode===true?V.selected:mode==='layer'?p.layers.at(-1).id:mode==='track'?p.audio.at(-1).id:p.scenes.at(-1).id;prune();changed();refresh();await seekSelected();if(mode==='track')tool('audio');message(mode===true?'Música añadida.':mode==='layer'?'Capa añadida. Arrástrala para mover y usa las esquinas para cambiar su tamaño.':'Añadido. Elige Quitar fondo, Texto o Mover para personalizarlo.');
  }catch(e){for(const a of candidates)if(!V.assets.has(a.id))dropPlayer(a.id);throw e;}
 }
 async function capture(){
  const epoch=V.epoch;message('Preparando tu flyer…');const result=await V.bridge.capture();guard(epoch);if(!result)throw Error('Abre primero un diseño en Divas y vuelve a pulsar Flyer abierto.');
  const file=new File([result.blob],result.name+'.png',{type:'image/png'});await addFiles([file]);message('Flyer añadido con sus colores, fuentes y logos. El diseño original sigue editable en Divas.');
 }
 async function preparePlayers(){for(const a of assetList())await player(a);for(const r of [...M.rows(V.project),...M.audioRows(V.project)])if(r.scene.assetId)await player(V.assets.get(r.scene.assetId),r.scene.id);if(V.project.music)await player(V.assets.get(V.project.music.assetId),'music');}
 function updateInspector(){
  const c=selected(),a=c&&V.assets.get(c.assetId),visual=c&&c.kind!=='audio';$('dvSceneName').textContent=c?c.name:'Selecciona una escena o capa';
  $(id).querySelectorAll('.dv-scene-fields input,.dv-scene-fields select,.dv-scene-fields textarea,.dv-scene-fields button').forEach(n=>n.disabled=!visual);
  for(const n of ['Volume','FadeIn','FadeOut'])$('dv'+n).disabled=!c||!['video','audio'].includes(c.kind);
  $('dvTrim').hidden=c?.kind!=='video';$('dvDurationLabel').hidden=c?.kind==='video';$('dvStartLabel').hidden=!c||!Object.hasOwn(c,'start');$('dvVolumeLabel').hidden=!c||!['video','audio'].includes(c.kind);$('dvTrackFields').hidden=c?.kind!=='audio';
  $('dvCanvasTools').hidden=!visual||V.cleanPreview||V.picking||V.playing;
  if(visual){for(const [name,key] of [['Duration','duration'],['Start','start'],['In','in'],['Out','out'],['Fit','fit'],['Mask','mask'],['Motion','motion'],['Transition','transition'],['Volume','volume'],['Title','title'],['TitlePosition','titlePosition'],['TitleStyle','titleStyle'],['TitleColor','titleColor'],['TitleSize','titleSize'],['TitleFont','titleFont'],['TitleMotion','titleMotion']])$('dv'+name).value=c[key]??0;
   $('dvTitleAnimate').checked=c.titleMotion!=='none';$('dvIn').max=Math.max(0,(a?.duration||0)-.1);$('dvOut').max=a?.duration||180;
   $('dvKeyEnabled').checked=c.keyer.enabled;for(const [n,k] of [['Color','color'],['Tolerance','tolerance'],['Softness','softness'],['Spill','spill']])$('dvKey'+n).value=c.keyer[k];
   $('dvKeyToleranceValue').value=Math.round(c.keyer.tolerance*100)+'%';$('dvKeySoftnessValue').value=Math.round(c.keyer.softness*100)+'%';
   for(const n of ['Brightness','Contrast','Saturation'])$('dv'+n).value=c.adjust[n.toLowerCase()];
   const pose=V.endPose?c.animation.end:c.transform;for(const [n,k,f] of [['X','x',100],['Y','y',100],['Scale','scale',100],['Rotation','rotation',1],['Opacity','opacity',100]])$('dv'+n).value=Math.round(pose[k]*f);$('dvScaleValue').value=Math.round(pose.scale*100)+'%';$('dvAnimation').checked=c.animation.enabled;
   for(const action of ['pickColor','autoColor','keyColor'])$(id).querySelectorAll('[data-dv='+action+']').forEach(b=>b.disabled=c.kind==='text');
  }
  if(c&&['audio','video'].includes(c.kind)){$('dvVolume').value=c.volume;$('dvFadeIn').value=c.fadeIn;$('dvFadeOut').value=c.fadeOut;}
  if(c?.kind==='audio'){for(const n of ['Start','In','Out'])$('dvTrack'+n).value=c[n.toLowerCase()];}
  $(id).querySelector('[data-dv=lock]').innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/>'+ (c?.locked?'<path d="M8 10V7a4 4 0 0 1 8 0v3"/>':'<path d="M8 10V7a4 4 0 0 1 8 0"/>')+'<path d="M12 14v3"/></svg>'; $(id).querySelector('[data-dv=hideLayer]').setAttribute('aria-pressed',!!c?.hidden);
  const music=V.project.music,ma=music&&V.assets.get(music.assetId);$('dvAudioName').textContent=ma?.name||'Sin música';$('dvMusicFields').hidden=!music;
  if(music){$('dvAudioOffset').value=music.offset;$('dvAudioOffset').max=Math.max(0,ma.duration-.1);$('dvAudioVolume').value=music.volume;$('dvAudioLoop').checked=music.loop;}
 }
 function renderTimeline(){
  const seconds=Math.max(8,total()),width=Math.max(300,seconds*V.zoom),rows=M.timeline(V.project);$('dvCount').textContent='· '+V.project.scenes.length+' escenas';
  $('dvTimelineScroll').style.setProperty('--dv-track-width',width+'px');$('dvRuler').innerHTML=Array.from({length:Math.floor(seconds/ (V.zoom<24?10:5))+1},(_,i)=>{const t=i*(V.zoom<24?10:5);return '<span style="left:'+(88+t*V.zoom)+'px">'+stamp(t).slice(0,-2)+'</span>';}).join('');
  $('dvScenes').innerHTML=rows.length?rows.map(({scene:c,start},i)=>`<button class="dv-scene" data-dv="select" data-id="${esc(c.id)}" aria-pressed="${c.id===V.selected}" aria-label="Escena ${i+1}: ${esc(c.name)}" style="left:${start*V.zoom}px;width:${Math.max(22,M.duration(c)*V.zoom)}px"><img src="${esc(V.assets.get(c.assetId)?.thumb||'')}" alt=""><strong>${esc(c.name)}</strong><small>${M.duration(c).toFixed(1)} s</small></button>`).join(''):'<p class="dv-scene-empty">Añade fotos o clips, o empieza con una capa.</p>';
  $('dvLayers').innerHTML=[...V.project.layers,...V.project.audio].map((c,i)=>`<div class="dv-layer-track"><span class="dv-track-label">${c.kind==='audio'?'♫ Audio':c.kind==='text'?'T Texto':'◈ Capa'} ${i+1}</span><div class="dv-track-lane"><button class="dv-layer-bar ${c.hidden?'dv-hidden-layer':''}" data-dv="select" data-id="${c.id}" aria-label="${esc(c.name)} · ${c.kind==='audio'?'audio':'capa'}" aria-pressed="${V.selected===c.id}" style="left:${c.start*V.zoom}px;width:${Math.max(24,M.duration(c)*V.zoom)}px"><span class="dv-trim-handle" data-edge="start" title="Ajustar inicio"></span><span>${c.locked?'🔒 ':''}${esc(c.kind==='text'?c.title:c.name)}</span><span class="dv-trim-handle" data-edge="end" title="Ajustar final"></span></button></div></div>`).join('');
 }
 function fitPreview(){const c=$('dvCanvas'),wrap=c?.parentElement;if(!wrap||!V.project)return;const f=Math.min((wrap.clientWidth-20)/c.width,(wrap.clientHeight-20)/c.height);if(f>0){c.style.width=Math.floor(c.width*f)+'px';c.style.height=Math.floor(c.height*f)+'px';}}
 function refresh(){
  if(!V.project)return;$('dvName').value=V.project.name;$('dvRatio').value=V.project.ratio;$('dvQuality').value=V.project.quality;$('dvBackground').value=V.project.background;
  const dim=size();if($('dvCanvas').width!==dim.w||$('dvCanvas').height!==dim.h){$('dvCanvas').width=dim.w;$('dvCanvas').height=dim.h;}
  fitPreview();exportInfo();probeExport();$('dvEmpty').hidden=!!M.rows(V.project).length;renderTimeline();V.time=Math.min(V.time,total());$('dvSeek').max=Math.max(.01,total());updateInspector();savedLabel();transport();draw();historyButtons();
 }
 function transport(){if(!V.project)return;$('dvSeek').value=V.time;$('dvTime').textContent=stamp(V.time)+' / '+stamp(total());$('dvPlay').textContent=V.playing?'Ⅱ':'▶';$('dvPlay').setAttribute('aria-label',V.playing?'Pausar':'Reproducir');$('dvPlay').disabled=!total();$('dvPlayhead').style.left=(88+V.time*V.zoom)+'px';}
 function checkpoint(group){const now=performance.now();if(!group||!V.lastEdit||V.lastEdit.group!==group||now-V.lastEdit.time>700){V.history.push(structuredClone(V.project));if(V.history.length>35)V.history.shift();}V.lastEdit=group?{group,time:now}:null;V.future=[];historyButtons();}
 function historyButtons(){if(!$(id))return;$(id).querySelector('[data-dv=undo]').disabled=V.busy||V.exporting||!V.history.length;$(id).querySelector('[data-dv=redo]').disabled=V.busy||V.exporting||!V.future.length;}
 async function historyMove(redo=false){if(V.busy||V.exporting)return;const from=redo?V.future:V.history,to=redo?V.history:V.future;if(!from.length)return;stop();to.push(structuredClone(V.project));const previous=from.pop();previous.id=V.project.id;V.project=previous;V.lastEdit=null;resetViewing();changed();refresh();await seek();message(redo?'Cambio rehecho.':'Cambio deshecho.');}
 function commitChange(fn,group){const old=structuredClone(V.project);try{fn();const next=M.normalize(V.project,assetList());V.project=old;checkpoint(group);V.project=next;changed();refresh();return true;}catch(e){V.project=old;refresh();message(e.message,true);return false;}}
 function edit(name){
  if(V.busy||V.exporting||!V.project)return;stop();const c=selected(),el=$('dv'+name),value=el.value;
  const success=commitChange(()=>{
   if(name==='Name')V.project.name=M.clean(value)||'Mi video Divas';else if(name==='Ratio')V.project.ratio=value;else if(name==='Quality')V.project.quality=+value;else if(name==='Background')V.project.background=value;
   else if(name.startsWith('Audio')&&V.project.music){const k={AudioOffset:'offset',AudioVolume:'volume',AudioLoop:'loop'}[name];V.project.music[k]=name==='AudioLoop'?el.checked:+value;}
   else if(c){
    if(c.locked&& !['Volume','FadeIn','FadeOut'].includes(name))throw Error('Desbloquea la capa con el candado para editarla.');
    const transforms={X:'x',Y:'y',Scale:'scale',Rotation:'rotation',Opacity:'opacity'};
    if(transforms[name]){const pose=V.endPose?c.animation.end:c.transform;pose[transforms[name]]=+value/(name==='Rotation'?1:100);if(V.endPose)c.animation.enabled=true;}
    else if(name==='Animation'){c.animation.enabled=el.checked;if(el.checked&&JSON.stringify(c.animation.end)===JSON.stringify(c.transform))c.animation.end={...c.transform,scale:Math.min(4,c.transform.scale*1.12)};}
    else if(name.startsWith('Key')){const key={KeyEnabled:'enabled',KeyColor:'color',KeyTolerance:'tolerance',KeySoftness:'softness',KeySpill:'spill'}[name];c.keyer[key]=name==='KeyEnabled'?el.checked:name==='KeyColor'?value:+value;if(name==='KeyColor')c.keyer.enabled=true;}
    else if(['Brightness','Contrast','Saturation'].includes(name))c.adjust[name.toLowerCase()]=+value;
    else{const key={Duration:'duration',Start:'start',In:'in',Out:'out',Fit:'fit',Mask:'mask',Motion:'motion',Transition:'transition',Volume:'volume',Title:'title',TitlePosition:'titlePosition',TitleStyle:'titleStyle',TitleColor:'titleColor',TitleSize:'titleSize',TitleAnimate:'titleMotion',TitleFont:'titleFont',TitleMotion:'titleMotion',TrackStart:'start',TrackIn:'in',TrackOut:'out',FadeIn:'fadeIn',FadeOut:'fadeOut'}[name];if(key)c[key]=name==='TitleAnimate'?(el.checked?'fade':'none'):['Duration','Start','In','Out','Volume','TitleSize','TrackStart','TrackIn','TrackOut','FadeIn','FadeOut'].includes(name)?+value:value;}
    if(['video','audio'].includes(c.kind)&&(c.out-c.in<.1||c.in<0||c.out>V.assets.get(c.assetId).duration+.01))throw Error('El final debe estar después del inicio y dentro del archivo.');
   }
  },name+':'+V.selected);if(success)seek().catch(e=>message(e.message,true));
 }
 function fitDraw(x,el,iw,ih,w,h,fit,motion='none',progress=0){
  let scale=fit==='cover'?Math.max(w/iw,h/ih):Math.min(w/iw,h/ih);if(motion==='zoom')scale*=1+progress*.08;if(motion==='pan')scale*=1.06;
  const dw=iw*scale,dh=ih*scale,dx=(w-dw)/2+(motion==='pan'?(progress-.5)*w*.05:0);x.drawImage(el,dx,(h-dh)/2,dw,dh);
 }
 function sourceMap(){const map=new Map();for(const r of M.rows(V.project)){const p=V.players.get(r.scene.id)||V.players.get(r.scene.assetId);if(p&&(p.kind==='image'||p.el.readyState>=2))map.set(r.scene.id,p.el);}return map;}
 function draw(frameOverride=null){if(!V.project||!renderer)return;const frames=frameOverride instanceof Map?new Map([...sourceMap(),...frameOverride]):sourceMap();renderer.render(V.project,Math.min(V.time,Math.max(0,total()-.001)),V.assets,frames,V.exporting?{}:{selectedId:V.cleanPreview||V.playing||V.picking?null:V.selected,isolateId:V.isolate?V.selected:null,originalId:V.original?V.selected:null,picking:V.picking?V.selected:null,poseEnd:V.endPose?V.selected:null});$('dvPickBanner').hidden=!V.picking;$('dvCanvas').classList.toggle('dv-picking',V.picking);}
 async function audioGraph(){
  if(!V.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Tu navegador no permite mezclar audio. Usa una versión reciente de Chrome o Safari.');V.ctx=new AC();V.master=V.ctx.createGain();V.master.gain.value=.8;const limiter=V.ctx.createDynamicsCompressor();V.master.connect(limiter);V.monitor=V.ctx.createGain();limiter.connect(V.monitor);V.monitor.connect(V.ctx.destination);}
  await V.ctx.resume();const items=[...M.rows(V.project),...M.audioRows(V.project)].map(r=>r.scene);if(V.project.music)items.push({...V.project.music,id:'music'});
  for(const c of items){const a=V.assets.get(c.assetId);if(!a||a.kind==='image'||V.sources.has(c.id))continue;const p=await player(a,c.id),source=V.ctx.createMediaElementSource(p.el),gain=V.ctx.createGain();gain.gain.value=0;source.connect(gain);gain.connect(V.master);V.sources.set(c.id,{source,gain});}
 }
 function silence(){for(const p of V.players.values())p.el.pause?.();for(const s of V.sources.values())s.gain.gain.value=0;}
 async function seekMedia(el,t){const value=Math.max(0,Math.min(t,Math.max(0,el.duration-.025)));if(Math.abs(el.currentTime-value)<.025&&el.readyState>=2)return;const done=waitFor(el,'seeked',()=>false);el.currentTime=value;await done;}
 async function seek(){
  const op=++V.operation,t=Math.min(V.time,Math.max(0,total()-.001));for(const row of M.active(V.project,t)){const a=V.assets.get(row.scene.assetId);if(!a)continue;const p=await player(a,row.scene.id);if(op!==V.operation)return;if(a.kind==='video')await seekMedia(p.el,row.scene.in+Math.max(0,t-row.start));}if(op===V.operation){draw();transport();}
 }
 async function ensureSelectedFrame(){const row=M.rows(V.project).find(r=>r.scene.id===V.selected);if(row&&(V.time<row.start||V.time>=row.end))await seekSelected();else draw();}
 async function seekSelected(){const row=[...M.rows(V.project),...M.audioRows(V.project)].find(r=>r.scene.id===V.selected);if(row)V.time=row.start+Math.min(.4,M.duration(row.scene)/2);await seek();}
 const activeMedia=()=>[...M.active(V.project,V.time),...M.audioRows(V.project).filter(r=>V.time>=r.start&&V.time<r.end)].filter(r=>['video','audio'].includes(r.scene.kind));
 const activeSignature=()=>M.active(V.project,V.time).map(r=>r.scene.id).concat(activeMedia().map(r=>r.scene.id)).join('|');
 async function syncStart(){
  silence();V.active=activeSignature();
  for(const row of activeMedia()){const c=row.scene,p=await player(V.assets.get(c.assetId),c.id);await seekMedia(p.el,c.in+V.time-row.start);V.sources.get(c.id).gain.gain.value=c.volume*M.envelope(c,V.time-row.start);await p.el.play();}
  const music=V.project.music;if(music){const a=V.assets.get(music.assetId),mp=await player(a,'music'),available=a.duration-music.offset,position=music.loop?music.offset+(V.time%available):music.offset+V.time;if(position<a.duration-.025){mp.el.loop=false;await seekMedia(mp.el,position);V.sources.get('music').gain.gain.value=music.volume;await mp.el.play();}}
 }
 function stop(){V.playing=false;V.starting=false;V.playback++;cancelAnimationFrame(V.raf);silence();V.operation++;if(V.project&&$(id))transport();}
 async function play(){
  if(V.playing||V.starting){stop();return;}if(!total())return;if(document.hidden)throw Error('Mantén Divas visible para reproducir o exportar.');if(V.time>=total()-.03)V.time=0;
  V.picking=false;V.original=false;V.isolate=false;if(!V.exporting)V.cancelled=false;V.starting=true;const token=++V.playback,epoch=V.epoch;
  try{await preparePlayers();await audioGraph();guard(epoch);if(token!==V.playback)return;await syncStart();guard(epoch);if(token!==V.playback){silence();return;}V.playing=true;V.clock=performance.now();V.start=V.time;transport();updateInspector();tick();}finally{if(token===V.playback)V.starting=false;}
 }
 function tick(){
  if(!V.playing)return;V.time=Math.min(total(),V.start+(performance.now()-V.clock)/1000);
  if(V.time>=total()){draw();stop();updateInspector();return;}
  if(activeSignature()!==V.active){const token=V.playback;V.playing=false;V.starting=true;syncStart().then(()=>{if(token!==V.playback||V.cancelled||!$(id).open){silence();return;}V.starting=false;V.playing=true;V.start=V.time;V.clock=performance.now();tick();}).catch(e=>{message(e.message,true);V.cancelled=true;stop();});return;}
  for(const row of activeMedia()){const source=V.sources.get(row.scene.id);if(source)source.gain.gain.value=row.scene.volume*M.envelope(row.scene,V.time-row.start);}
  const music=V.project.music;if(music){const p=V.players.get('music');if(music.loop&&p?.el.ended){p.el.currentTime=music.offset;p.el.play().catch(e=>{V.cancelled=true;message(e.message,true);stop();});}}
  draw();transport();V.raf=requestAnimationFrame(tick);
 }
 function exportInfo(){
  if(!V.project)return;const dim=size(true),format=V.output?.extension.toUpperCase();$('dvDimensions').textContent=dim.w+' × '+dim.h+' · '+(format||(V.probeDone?'Sin exportación':'Comprobando…'));
  $('dvExportHint').textContent=format?(format==='MP4'?'MP4 disponible en este navegador.':'Este navegador exporta WebM.')+' El archivo se genera a 30 fotogramas por segundo.':V.probeDone?'Este navegador no admite la exportación. Descarga un respaldo para abrirlo en una versión reciente de Chrome, Edge o Safari.':'Comprobando los formatos de exportación…';
  $('dvExport').disabled=V.busy||V.exporting||!V.output||!total();
 }
 async function probeExport(){
  if(!V.project)return;const dim=size(true),key=dim.w+'x'+dim.h;if(V.probeKey===key)return;V.probeKey=key;V.output=null;V.probeDone=false;exportInfo();
  try{exportModule=exportModule||import(exportURL);const engine=await exportModule,config=await engine.probe(dim);if(V.probeKey!==key)return;V.output=config;V.probeDone=true;exportInfo();}
  catch(e){V.probeKey=null;V.probeDone=true;exportModule=null;exportInfo();message('No se pudo cargar la exportación. Comprueba la conexión y vuelve a abrir Video.',true);}
 }
 async function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 const filename=()=>M.clean(V.project.name,60).replace(/[^\p{L}\p{N} _-]/gu,'').trim()||'divas-video';
 async function exportVideo(){
  if(V.busy||V.exporting)return;if(!total())throw Error('Añade una escena o capa.');if(!V.output)throw Error('La exportación todavía no está disponible en este navegador.');
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
  if(!Array.isArray(raw.assets)||raw.assets.length>47)throw Error('La lista de archivos del respaldo no es válida.');let offset=head.length+len;const assets=[];for(const a of raw.assets){M.validateAsset(a);if(offset+a.size>file.size)throw Error('Faltan archivos dentro del respaldo.');assets.push({...a,blob:file.slice(offset,offset+a.size,a.type),thumb:''});offset+=a.size;}if(offset!==file.size)throw Error('El tamaño del respaldo no coincide con su contenido.');
  let project=M.normalize(raw.project,assets);project.id=M.uid();await save();const epoch=V.epoch;const ready=[];
  try{for(const a of assets){const verified=await inspect(new File([a.blob],a.name,{type:a.type}));guard(epoch);if(verified.kind!==a.kind)throw Error('Un recurso del respaldo no coincide con su formato.');ready.push(verified);const prior=a.id;a.id=verified.id;a.width=verified.width;a.height=verified.height;a.duration=verified.duration;a.thumb=verified.thumb;for(const c of [...project.scenes,...project.layers,...project.audio])if(c.assetId===prior)c.assetId=a.id;if(project.music?.assetId===prior)project.music.assetId=a.id;}
   project=M.normalize(project,assets);
  }catch(e){ready.forEach(a=>dropPlayer(a.id));throw e;}
  const keep=new Set(assets.map(a=>a.id));for(const old of [...V.players.keys()])if(!keep.has(old))dropPlayer(old);stop();V.history=[];V.future=[];V.lastEdit=null;V.project=project;V.assets=new Map(assets.map(a=>[a.id,a]));V.selected=project.scenes[0]?.id||project.layers[0]?.id||null;V.savedVersion=0;V.revision=0;V.time=0;changed();await save();$('dvLibrary').hidden=true;refresh();await seek();message('Respaldo recuperado como un video nuevo.');
 }
 function panel(name){$(id).dataset.panel=name;$(id).querySelectorAll('[data-dv=panel]').forEach(b=>b.setAttribute('aria-selected',b.dataset.panel===name));if(name==='audio')tool('audio',false);}
 function tool(name,open=true){$(id).dataset.compact=name==='clip'?'false':'true';$(id).querySelector('[data-dv=toggleTimeline]').setAttribute('aria-expanded',name==='clip');$(id).querySelector('.dv-inspector').dataset.tool=name;$(id).querySelectorAll('[data-dv=tool]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tool===name));if(open)panel(name==='audio'?'audio':'scene');}
 function resetViewing(){V.picking=false;V.original=false;V.isolate=false;V.endPose=false;for(const a of ['original','isolate','poseEnd'])$(id).querySelector('[data-dv='+a+']').setAttribute('aria-pressed',false);$(id).querySelector('[data-dv=poseStart]').setAttribute('aria-pressed',true);}
 function applyKey(color){const c=selected();if(!c||!['image','video'].includes(c.kind))throw Error('Selecciona una imagen o un clip.');if(c.locked)throw Error('Desbloquea primero la capa con el candado.');commitChange(()=>{c.keyer.color=color;c.keyer.enabled=true;});V.picking=false;draw();message('Fondo quitado. Ajusta la intensidad y los bordes; usa Ver antes para comparar.');}
 async function perform(action,b){
  if(action==='cancel'){V.cancelled=true;stop();return;}if(V.busy||V.exporting)return;
  if(action==='undo'||action==='redo')return historyMove(action==='redo');
  if(action==='play')return play();if(action==='close')return close();if(action==='panel'){panel(b.dataset.panel);return;}if(action==='tool'){tool(b.dataset.tool);return;}
  if(action==='media'){$('dvFiles').click();return;}if(action==='overlay'){$('dvOverlayFiles').click();return;}if(action==='audio'){$('dvAudioFile').click();return;}if(action==='audioTrack'){$('dvTrackFile').click();return;}if(action==='restore'){$('dvBackupFile').click();return;}
  if(action==='export')return exportVideo();
  if(action==='library'){stop();try{await save();}catch(e){message(e.message,true);}await listProjects();$('dvLibrary').hidden=false;return;}
  if(action==='hideLibrary'){$('dvLibrary').hidden=true;return;}
  if(action==='new')return job(newProject);if(action==='load')return job(()=>loadProject(b.dataset.id));if(action==='capture')return job(capture);if(action==='backup')return job(backup);
  if(action==='animateFlyer')return job(async()=>{await capture();const c=selected();commitChange(()=>{c.motion='zoom';c.transition='fade';c.duration=7;});await seekSelected();message('Flyer animado. Añade textos o logos en capas para darles su propio movimiento.');});
  if(action==='addText'){stop();const c=M.textLayer(V.time);if(total()>V.time)c.duration=Math.min(5,total()-V.time);if(c.duration<.25)c.duration=5;if(commitChange(()=>V.project.layers.push(c))){V.selected=c.id;resetViewing();refresh();tool('text');await seekSelected();$('dvTitle').focus();$('dvTitle').select();}return;}
  if(action==='save'){try{await save();message('Video guardado en este dispositivo.');}catch(e){message(e.message,true);const copy=document.createElement('button');copy.dataset.dv='saveCopy';copy.textContent='Guardar copia';$('dvMessage').append(' ',copy);}return;}
  if(action==='saveCopy'){V.project.id=M.uid();V.savedVersion=0;changed();await save();message('Copia guardada en este dispositivo.');return;}
  if(action==='delete'){if(!confirm('¿Eliminar este video guardado en este dispositivo?'))return;const epoch=V.epoch,d=await db(),key=V.owner+':'+b.dataset.id;guard(epoch);await new Promise((resolve,reject)=>{const tx=d.transaction(['projects','summaries'],'readwrite');tx.objectStore('projects').delete(key);tx.objectStore('summaries').delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});if(V.project.id===b.dataset.id){discard();V.project=M.blank();refresh();}await listProjects();return;}
  stop();if(action==='rewind'){V.time=0;await seek();return;}if(action==='select'){V.selected=b.dataset.id;resetViewing();refresh();if(selected()?.kind==='audio')tool('audio');await seekSelected();return;}
  if(action==='cutout'){if(!['image','video'].includes(selected()?.kind))V.selected=M.active(V.project,V.time).find(r=>r.scene.kind!=='text')?.scene.id||V.project.scenes[0]?.id;refresh();tool('cutout');if(!selected())message('Añade y selecciona un clip o una imagen para quitar su fondo.');return;}
  if(action==='toggleTimeline'){$(id).dataset.compact=$(id).dataset.compact==='true'?'false':'true';b.setAttribute('aria-expanded',$(id).dataset.compact!=='true');return;}
  if(action==='cleanPreview'){V.cleanPreview=!V.cleanPreview;b.setAttribute('aria-pressed',V.cleanPreview);updateInspector();draw();return;}
  if(action==='cancelPick'){V.picking=false;draw();return;}
  const c=selected();if(action==='removeAudio'){commitChange(()=>V.project.music=null);prune();return;}if(!c)throw Error('Selecciona primero una escena o capa.');
  if(action==='lock'){commitChange(()=>c.locked=!c.locked);message(c.locked?'Capa bloqueada. Pulsa el candado para editarla.':'Capa desbloqueada.');return;}
  if(action==='hideLayer'){commitChange(()=>c.hidden=!c.hidden);return;}
  if(action==='original'||action==='isolate'){V[action]=!V[action];V.picking=false;b.setAttribute('aria-pressed',V[action]);await ensureSelectedFrame();draw();return;}
  if(action==='poseStart'||action==='poseEnd'){V.endPose=action==='poseEnd';const row=M.rows(V.project).find(r=>r.scene.id===c.id);if(row)V.time=V.endPose?row.end-.001:row.start+Math.min(.4,M.duration(c)/2);$(id).querySelector('[data-dv=poseStart]').setAttribute('aria-pressed',!V.endPose);$(id).querySelector('[data-dv=poseEnd]').setAttribute('aria-pressed',V.endPose);updateInspector();await seek();return;}
  if(c.locked)throw Error('Desbloquea la capa con el candado antes de editarla.');
  if(action==='keyColor')return applyKey(b.dataset.color);
  if(action==='pickColor'||action==='autoColor'){if(!['image','video'].includes(c.kind))throw Error('Selecciona un clip o una imagen.');await ensureSelectedFrame();const source=sourceMap().get(c.id);if(!source)throw Error('Espera a que cargue el fotograma.');if(action==='pickColor'){V.picking=true;draw();message('Toca el color del fondo en la imagen original.');}else{const color=renderer.autoColor(source);if(!color)throw Error('El fondo tiene varios colores. Usa Elegir color en el video para señalar el que quieres quitar.');applyKey(color);}return;}
  if(action==='resetKey'){commitChange(()=>c.keyer=M.keyer());return;}if(action==='resetColor'){commitChange(()=>c.adjust={brightness:0,contrast:0,saturation:0});return;}
  if(action==='resetTransform'){commitChange(()=>{c.transform=M.pose();c.animation={enabled:false,end:M.pose(),easing:'smooth'};c.motion='none';});return;}
  const old=structuredClone(V.project);try{const list=V.project.scenes.includes(c)?V.project.scenes:V.project.layers.includes(c)?V.project.layers:V.project.audio,i=list.indexOf(c);
   if(action==='left'&&i>0)[list[i-1],list[i]]=[c,list[i-1]];
   else if(action==='right'&&i<list.length-1)[list[i],list[i+1]]=[list[i+1],c];
   else if(action==='duplicate'){const copy={...structuredClone(c),id:M.uid()};list.splice(i+1,0,copy);V.selected=copy.id;}
   else if(action==='remove'){list.splice(i,1);V.selected=list[Math.min(i,list.length-1)]?.id||null;}
   else if(action==='split')V.selected=M.split(V.project,c.id,V.time);
   const next=M.normalize(V.project,assetList());V.project=old;checkpoint();V.project=next;prune();changed();refresh();await seekSelected();
  }catch(e){V.project=old;V.selected=c.id;refresh();throw e;}
 }
 function installGestures(){
  const canvas=$('dvCanvas'),timeline=$('dvTimelineScroll');let gesture=null;
  const point=e=>{const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)*canvas.width/b.width,y:(e.clientY-b.top)*canvas.height/b.height,ratio:canvas.width/b.width};};
  function finish(cancel=false){if(!gesture)return;const g=gesture;gesture=null;if(!g.moved)return;if(cancel){V.project=g.before;refresh();return;}try{const next=M.normalize(V.project,assetList());V.project=g.before;checkpoint();V.project=next;changed();V.suppressClick=true;setTimeout(()=>V.suppressClick=false,0);refresh();seek().catch(e=>message(e.message,true));}catch(e){V.project=g.before;refresh();message(e.message,true);}}
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0||V.busy||V.exporting||!renderer)return;stop();const p=point(e);if(V.picking){gesture={type:'pick',x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);return;}
   let found=null,resize=false;const bounds=[...renderer.bounds.entries()].reverse();for(const [key,b] of bounds){const dx=p.x-b.x,dy=p.y-b.y,rx=dx*Math.cos(b.angle)+dy*Math.sin(b.angle),ry=-dx*Math.sin(b.angle)+dy*Math.cos(b.angle),margin=12*p.ratio;if(Math.abs(rx)<=b.width/2+margin&&Math.abs(ry)<=b.height/2+margin){found=key;resize=key===V.selected&&Math.abs(Math.abs(rx)-b.width/2)<margin&&Math.abs(Math.abs(ry)-b.height/2)<margin;break;}}
   if(!found){V.selected=null;updateInspector();draw();return;}V.selected=found;updateInspector();draw();const c=selected();if(c.locked){message('Capa bloqueada. Pulsa el candado para moverla.');return;}const pose=V.endPose?c.animation.end:c.transform,b=renderer.bounds.get(found);gesture={type:'canvas',before:structuredClone(V.project),x:e.clientX,y:e.clientY,point:p,pose:{...pose},center:b,resize,element:canvas};canvas.setPointerCapture(e.pointerId);e.preventDefault();
  });
  canvas.addEventListener('pointermove',e=>{const g=gesture;if(!g||g.type!=='canvas')return;if(!g.moved&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<5)return;g.moved=true;const p=point(e),c=selected(),pose=V.endPose?c.animation.end:c.transform;
   if(g.resize){const original=Math.hypot(g.point.x-g.center.x,g.point.y-g.center.y);pose.scale=M.number(g.pose.scale*Math.hypot(p.x-g.center.x,p.y-g.center.y)/original,1,.05,4);}else{pose.x=M.number(g.pose.x+(p.x-g.point.x)/canvas.width,.5,-1,2);pose.y=M.number(g.pose.y+(p.y-g.point.y)/canvas.height,.5,-1,2);}if(V.endPose)c.animation.enabled=true;updateInspector();draw();
  });
  canvas.addEventListener('pointerup',e=>{if(gesture?.type==='pick'){const g=gesture;gesture=null;if(Math.hypot(e.clientX-g.x,e.clientY-g.y)<12){const p=point(e),color=renderer.pickColor(p.x,p.y);if(color){try{applyKey(color);}catch(err){message(err.message,true);}}else message('Toca un punto dentro del video.');}return;}finish();});canvas.addEventListener('pointercancel',()=>finish(true));
  timeline.addEventListener('pointerdown',e=>{if(e.button!==0||V.busy||V.exporting)return;const b=e.target.closest('.dv-layer-bar');if(!b)return;stop();V.selected=b.dataset.id;const c=selected();resetViewing();updateInspector();if(c.locked){message('Desbloquea esta capa antes de moverla.');return;}gesture={type:'timeline',before:structuredClone(V.project),x:e.clientX,y:e.clientY,scroll:timeline.scrollLeft,initial:structuredClone(c),edge:e.target.dataset.edge,element:b};b.setPointerCapture(e.pointerId);});
  timeline.addEventListener('pointermove',e=>{const g=gesture;if(!g||g.type!=='timeline')return;if(!g.moved&&Math.abs(e.clientX-g.x)<6)return;g.moved=true;const c=selected(),base=g.initial,d=M.duration(base);let delta=Math.round((e.clientX-g.x+timeline.scrollLeft-g.scroll)/V.zoom*10)/10;
   if(g.edge==='start'){delta=Math.max(-base.start,Math.min(d-.25,delta));if(['video','audio'].includes(c.kind))delta=Math.max(-base.in,delta);c.start=base.start+delta;if(['video','audio'].includes(c.kind))c.in=base.in+delta;else c.duration=d-delta;}
   else if(g.edge==='end'){if(['video','audio'].includes(c.kind))c.out=Math.max(c.in+.25,Math.min(V.assets.get(c.assetId).duration,base.out+delta));else c.duration=Math.max(.25,d+delta);}
   else c.start=Math.max(0,Math.min(180-d,base.start+delta));
   g.element.style.left=c.start*V.zoom+'px';g.element.style.width=Math.max(24,M.duration(c)*V.zoom)+'px';V.time=c.start+Math.min(.4,M.duration(c)/2);transport();draw();
  });timeline.addEventListener('pointerup',()=>finish());timeline.addEventListener('pointercancel',()=>finish(true));
 }
 function reset(){V.epoch++;V.cancelled=true;stop();discard();V.owner=null;$(id)?.close();}
 window.DivasVideo={init(bridge){V.bridge=bridge;makeUI();document.addEventListener('click',e=>{const b=e.target.closest('[data-dv-open]');if(!b)return;e.preventDefault();e.stopPropagation();open().catch(err=>V.bridge.notify(err.message));});},open,reset};
})();

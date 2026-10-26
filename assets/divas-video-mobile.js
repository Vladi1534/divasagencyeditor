/* Mobile presentation only. The video model, renderer, history and storage stay shared. */
(function(){
 'use strict';
 const query='(max-width:760px), (max-width:1000px) and (max-height:520px) and (pointer:coarse)';
 const paths={add:'M12 4v16 M4 12h16',edit:'M4 20l4-1 12-12-3-3L5 16z M14 7l3 3',cutout:'M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z',layers:'M12 3L2 8l10 5 10-5z M2 12l10 5 10-5 M2 16l10 5 10-5',more:'M5 12h.01 M12 12h.01 M19 12h.01',text:'M4 6V4h16v2 M12 4v16 M8 20h8',audio:'M9 18V5l11-2v13 M9 8l11-2 M9 18c0 4-6 4-6 1s6-4 6-1 M20 16c0 4-6 4-6 1s6-4 6-1',format:'M5 3h14v18H5z M8 7h8 M8 17h8',size:'M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5',back:'M15 5l-7 7 7 7'};
 const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.more}"/></svg>`;
 const button=(label,action,name,shape,extra='')=>`<button data-dv="${action}" ${name?`data-tool="${name}"`:''} ${extra}>${icon(shape)}<span>${label}</span></button>`;
 function mount({dialog,state,selected,total,closeTools}){
  const $=id=>dialog.querySelector('#'+id),q=s=>dialog.querySelector(s),mobile=matchMedia(query),homes=new Map();let toastTimer,dockKey='',syncKey='';
  const inspector=q('.dv-inspector'),header=q('.dv-inspector-head'),scroll=document.createElement('div');scroll.className='dv-inspector-scroll';
  for(const child of [...inspector.children])if(child!==header)scroll.append(child);inspector.append(scroll);
  header.querySelector('button').innerHTML='<span class="dv-desktop-close">×</span><span class="dv-mobile-done">Listo ✓</span>';
  header.insertAdjacentHTML('afterend','<p id="dvMobileToolTarget" class="dv-mobile-tool-target"></p>');
  q('.dv-topbar').insertAdjacentHTML('afterbegin',`<button class="dv-project-menu" data-dv="mTool" data-tool="project" aria-label="Menú del proyecto"><strong>Divas <span>Video</span> ···</strong><small id="dvMobileSave">Guardado aquí</small></button>`);
  const previewbar=document.createElement('div');previewbar.className='dv-mobile-previewbar';previewbar.innerHTML='<div class="dv-mobile-selection"><small id="dvMobileSelectionKind">VISTA PREVIA</small><strong id="dvMobileSelectionName">Tu vídeo</strong></div><button data-dv="deselect" class="dv-deselect" aria-label="Quitar selección">Listo</button><button data-dv="mTool" data-tool="project" id="dvMobileRatio" aria-label="Cambiar formato del vídeo">9:16</button>';
  q('.dv-stage').prepend(previewbar);
  const dock=document.createElement('nav');dock.className='dv-mobile-dock';dock.setAttribute('aria-label','Acciones del vídeo');q('.dv-layout').insertBefore(dock,q('.dv-footer'));
  scroll.insertAdjacentHTML('beforeend',`<section class="dv-fields dv-tool-content dv-project-content" data-content="project"><div id="dvMobileProjectActions" class="dv-project-actions"></div><div id="dvMobileProjectFields" class="dv-fields"></div><p class="dv-hint">El avance se guarda automáticamente en este navegador. Descarga un respaldo editable para abrirlo en otro dispositivo.</p><div id="dvMobileProjectBackups" class="dv-project-actions"></div><small class="dv-version">Divas Video · v45</small></section><section class="dv-tool-content dv-selection-content" data-content="selection"><button data-dv="mTool" data-tool="clip">✂ Tiempo y recorte</button><button data-dv="mTool" data-tool="color">◐ Color y luz</button><button data-dv="mTool" data-tool="audio">♫ Audio y volumen</button><button data-dv="mTool" data-tool="transform">↗ Tamaño y posición</button><button data-dv="mAction" data-action="duplicate">Duplicar</button><button data-dv="mAction" data-action="lock" id="dvMobileLock">Bloquear</button><button data-dv="mAction" data-action="hideLayer" id="dvMobileHide">Ocultar</button><button data-dv="mAction" data-action="remove" class="dv-danger">Eliminar</button></section>`);
  const editing=document.createElement('nav');editing.className='dv-mobile-edit-tabs';editing.setAttribute('aria-label','Ajustes de la selección');editing.innerHTML=[['transform','Tamaño'],['clip','Tiempo'],['color','Color'],['audio','Sonido']].map(([name,label])=>`<button data-dv="mTool" data-tool="${name}" aria-pressed="false">${label}</button>`).join('');header.after(editing);
  // Keep a single copy of each input and its original event handler when changing layout.
  function move(el,to){if(!el)return;if(!homes.has(el)){const marker=document.createComment('desktop position');el.before(marker);homes.set(el,marker);}to.append(el);}
  function restore(el){const marker=homes.get(el);if(marker)marker.after(el);}
  const toggle=q('[data-dv=toggleTimeline]'),clean=q('[data-dv=cleanPreview]'),compare=$('dvCompareBar'),confirm=$('dvKeyConfirm'),projectFields=$('dvMobileProjectFields'),projectActions=$('dvMobileProjectActions'),projectBackups=$('dvMobileProjectBackups');
  const projectInputs=[$('dvName').closest('label'),$('dvRatio').closest('label'),$('dvQuality').closest('label'),$('dvBackground').closest('label')];
  const projectButtons=['library','save','backup','restore'].map(a=>q('[data-dv='+a+']'));
  const frame=$('dvMediaTools'),empty=$('dvEmpty');
  empty.innerHTML='<span class="dv-empty-icon" aria-hidden="true">'+icon('add')+'</span><strong>Tu próximo vídeo empieza aquí</strong><p>Elige un vídeo o una foto.<br>El resto, paso a paso.</p><button class="dv-primary" data-dv="media">＋ Añadir vídeo o foto</button><button class="dv-empty-flyer" data-dv="animateFlyer">Usar mi flyer abierto</button>';
  q('.dv-footer').insertAdjacentHTML('beforeend','<button data-dv="dismissMessage" aria-label="Cerrar aviso">×</button>');
  q('[data-dv=toggleTimeline]').textContent='Ampliar ↗';
  // Essentials first; advanced controls retain their IDs, behavior and desktop availability.
  function details(content,label,elements){const section=q('[data-content='+content+']'),d=document.createElement('details');d.className='dv-advanced';d.innerHTML='<summary>'+label+'</summary><div class="dv-fields"></div>';section.append(d);for(const el of elements.filter(Boolean))d.lastElementChild.append(el);return d;}
  const label=id=>$(id).closest('label'),row=id=>$(id).closest('.dv-row');
  const advanced=[
   details('transform','Posición, opacidad y animación',[row('dvX'),row('dvRotation'),label('dvMotion'),label('dvAnimation'),q('[data-dv=poseStart]').parentElement,q('[data-content=transform]>.dv-hint:last-child')]),
   details('cutout','Bordes y protección del logo',[label('dvKeyScope'),label('dvKeyEnabled'),label('dvKeyColor'),label('dvKeySoftness'),label('dvKeySpill'),q('[data-dv=resetKey]'),q('[data-content=cutout]>.dv-hint:last-child')]),
   details('text','Ubicación y animación',[label('dvTitlePosition'),label('dvTitleMotion'),q('[data-content=text]>.dv-hint')])
  ];
  // Remove redundant explanations and prioritize the actionable controls on a phone.
  q('[data-content=clip]>.dv-hint').classList.add('dv-desktop-hint');
  q('[data-content=transform]>.dv-hint').classList.add('dv-desktop-hint');
  q('[data-content=cutout]>.dv-hint').classList.add('dv-desktop-hint');
  $('dvKeyStatus').classList.add('dv-cutout-status');
  q('[data-content=transform]').insertBefore(label('dvScale'),label('dvMask'));
  function viewport(){if(mobile.matches){const h=Math.round(window.visualViewport?.height||innerHeight);dialog.style.setProperty('--dv-mobile-height',h+'px');dialog.dataset.short=String(h<520);}else dialog.style.removeProperty('--dv-mobile-height');}
  function relocate(){
   if(mobile.matches){
    for(const el of projectInputs)move(el,projectFields);projectButtons.forEach((el,i)=>move(el,i<2?projectActions:projectBackups));
    move(toggle,q('.dv-transport'));move(clean,previewbar);move(compare,inspector);inspector.insertBefore(compare,scroll);move(confirm,inspector);
    move(frame,q('[data-content=transform]'));q('[data-content=transform]').prepend(frame);
    q('.dv-close').innerHTML=icon('back');q('.dv-close').setAttribute('aria-label','Volver al editor de imágenes');
    for(const d of advanced)d.open=false;
    dialog.dataset.timelineExpanded='false';dialog.dataset.inspector=state.keyDraft?'open':'closed';dialog.dataset.panel=state.keyDraft?'scene':'preview';
   }else{
    for(const el of [...projectInputs,...projectButtons,toggle,clean,confirm,compare,frame])restore(el);
    for(const d of advanced)d.open=true;
    q('.dv-close').textContent='×';q('.dv-close').setAttribute('aria-label','Volver al editor');
    if(['project','selection'].includes(inspector.dataset.tool)){inspector.dataset.tool='media';$('dvToolTitle').textContent='Tus medios';}
    if(dialog.open){dialog.dataset.inspector='open';dialog.dataset.panel='scene';}
   }
   viewport();sync(true);
  }
  function sync(force=false){
   if(!state.project)return;
   const c=selected(),kind=c?.kind||'none',name=c?.kind==='text'?c.title||'Texto':c?.name||'Tu vídeo',tool=inspector.dataset.tool,open=dialog.dataset.inspector==='open',empty=!total();
   const signature=[mobile.matches,state.project.id,state.project.ratio,state.selected,kind,name,state.revision,state.dirty,state.busy,state.exporting,state.playing,tool,open,empty,!!state.cleanPreview,!!state.keyDraft,!!c?.locked,!!c?.hidden,dialog.dataset.timelineExpanded].join('|');
   if(!force&&signature===syncKey)return;syncKey=signature;
   dialog.dataset.mobileTool=tool;dialog.dataset.mobileEmpty=String(empty);dialog.dataset.focus=String(!!state.cleanPreview);dialog.dataset.mobileSelected=String(!!c);dialog.dataset.keyPending=String(!!state.keyDraft);
   $('dvMobileSelectionKind').textContent=c?c.locked?'BLOQUEADO':c.hidden?'OCULTO':({image:'IMAGEN',video:'VÍDEO',text:'TEXTO',audio:'AUDIO'}[kind]):'VISTA PREVIA';$('dvMobileSelectionName').textContent=name;
   $('dvMobileRatio').textContent=state.project.ratio;$('dvMobileSave').textContent=state.dirty?'Sin guardar':'Guardado aquí';$('dvMobileSave').classList.toggle('dv-saving',state.dirty);
   $('dvMobileToolTarget').textContent=['project','media'].includes(tool)?'':name;
   const previewLabel=state.cleanPreview?'Volver a editar':'Ampliar vista previa';clean.setAttribute('aria-label',previewLabel);clean.title=previewLabel;clean.innerHTML=mobile.matches?(state.cleanPreview?'Editar ↙':icon('size')):'Vista limpia';
   header.querySelector('button').disabled=!!state.keyDraft;header.querySelector('button').title=state.keyDraft?'Confirma o cancela el recorte para salir':'Volver al vídeo';
   const buttons=c?(kind==='text'?[['Editar texto','mTool','text','text'],['Tamaño','mTool','transform','size']]:kind==='audio'?[['Volumen','mTool','audio','audio'],['Texto','addText','','text']]:[['Editar','mTool','transform','edit'],['Quitar fondo','mAction','','cutout','data-action="cutout" class="dv-dock-feature"']]):[['Añadir','mTool','media','add'],['Texto','addText','','text']];
   buttons.push(c?['Añadir','mTool','media','add']:['Música','mTool','audio','audio'],['Capas','mTool','layers','layers'],c?['Más','mTool','selection','more']:['Formato','mTool','project','format']);
   const key=kind+':'+!!c;
   if(key!==dockKey){dock.innerHTML=buttons.map(args=>button(...args)).join('');dockKey=key;}
   dock.inert=state.busy||state.exporting;projectActions.inert=state.busy||state.exporting;
   for(const b of editing.querySelectorAll('button')){b.setAttribute('aria-pressed',b.dataset.tool===tool);b.hidden=kind==='text'&&b.dataset.tool==='color'||kind==='image'&&b.dataset.tool==='audio';}
   const locked=!!c?.locked;$('dvMobileLock').textContent=locked?'Desbloquear':'Bloquear';$('dvMobileHide').textContent=c?.hidden?'Mostrar':'Ocultar';
   for(const b of q('.dv-selection-content').querySelectorAll('button'))b.disabled=!c||(locked&&['duplicate','remove'].includes(b.dataset.action));
   q('.dv-selection-content [data-tool=transform]').hidden=kind==='audio';q('.dv-selection-content [data-tool=color]').hidden=['audio','text'].includes(kind);q('.dv-selection-content [data-tool=clip]').hidden=kind==='audio';
   const hasLayer=state.project.layers.some(l=>l.id===c?.id)||state.project.audio.some(l=>l.id===c?.id);
   for(const row of q('#dvLayers').children){row.classList.toggle('dv-mobile-current-track',hasLayer?[...row.querySelectorAll('[data-id]')].some(el=>el.dataset.id===c.id):row.classList.contains('dv-main-track'));}
   const expanded=dialog.dataset.timelineExpanded==='true',toggle=q('[data-dv=toggleTimeline]');toggle.textContent=expanded?'Reducir ↙':'Ampliar ↗';toggle.setAttribute('aria-expanded',expanded);toggle.setAttribute('aria-label',expanded?'Reducir línea de tiempo':'Ampliar línea de tiempo');
   if(mobile.matches&&(!c&&['selection','transform','clip','cutout','color'].includes(tool)&&open))closeTools();
  }
  function notify(error=false){clearTimeout(toastTimer);dialog.dataset.toast='true';dialog.dataset.toastError=String(error);if(!error)toastTimer=setTimeout(()=>{dialog.dataset.toast='false';},4200);}
  function home(){if(!mobile.matches)return;closeTools();dialog.dataset.timelineExpanded='false';dialog.dataset.toast='false';state.cleanPreview=false;sync();}
  mobile.addEventListener('change',relocate);window.visualViewport?.addEventListener('resize',viewport);window.addEventListener('resize',viewport);relocate();
  return {sync,home,notify,isMobile:()=>mobile.matches};
 }
 window.DivasVideoMobile={mount,query};
})();

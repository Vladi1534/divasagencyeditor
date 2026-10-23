/* Divas v38 · private document library and a source-aware flyer workbench. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const R = window.DivasDocumentReader, L = window.DivasDocumentLayout;
  const BUCKET = 'divas-documents', PAGE_SIZE = 12;
  const MIME = {pdf:'application/pdf', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt:'text/plain'};
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let host, m = fresh();
  function fresh() { return {epoch:-1,user:null,generation:0,busy:false,view:'library',offset:0,query:'',rows:[],more:false,listRequest:0,
    reader:null,row:null,file:null,unit:1,unitData:null,pageRender:null,drafts:new Map(),backgrounds:[],logo:null,assets:{},
    theme:'oro',format:'9:16',background:'auto',proposal:[],part:0,saved:new Map(),attempt:null,serial:0,installed:true}; }
  const fileSize = n => n >= 1024*1024 ? (n/1024/1024).toFixed(1)+' MB' : Math.max(1,Math.ceil(n/1024))+' KB';
  function session() { return host.session(); }
  function guard() { const s = session(); if (!s.active || s.user !== m.user || s.epoch !== m.epoch) throw new Error('La sesión cambió. Vuelve a abrir la biblioteca.'); }
  function token() { const gen=m.generation, epoch=m.epoch, user=m.user; return () => {guard(); if(gen!==m.generation||epoch!==m.epoch||user!==m.user) throw new Error('Esta operación ya no está activa.');}; }
  function status(text='', error=false) { $('manualStatus').textContent=text; $('manualStatus').dataset.error=String(error); }
  function missing(e) { return ['42P01','PGRST205','PGRST202','42883'].includes(e.code) || /divas_documents.*(schema cache|does not exist)|divas_document_finish.*schema cache/i.test(e.message||''); }
  function showError(e) {
    if (missing(e)) {m.installed=false; $('manualSetup').hidden=false; $('manualSetupText').textContent=session().admin ?
      'La biblioteca necesita activarse una vez. Ejecuta 13-divas-documentos.sql en el SQL Editor del proyecto Supabase del editor y pulsa Actualizar.' :
      'La biblioteca está pendiente de activación por la administración.'; $('manualSQL').hidden=!session().admin;}
    let message=e.message||'No se pudo completar la operación. Vuelve a intentarlo.';
    if(e.code==='42501'||Number(e.status)===403)message='Tu cuenta no tiene permiso para esta acción. Comprueba tu acceso en Mi cuenta.';
    else if(Number(e.status)===404||/object not found/i.test(message))message='El documento ya no está disponible. Vuelve a la biblioteca y pulsa Actualizar.';
    else if(/failed to fetch|networkerror|load failed/i.test(message))message='No se pudo conectar. Revisa tu conexión y vuelve a intentarlo; tu propuesta se conserva.';
    status(missing(e)?'La biblioteca todavía no está activada.':message,true);
  }
  function setBusy(value) {
    m.busy=value; $('manualDialog').setAttribute('aria-busy',String(value));
    $('manualDialog').querySelectorAll('[data-manual]').forEach(b=>{b.disabled=value;});
    $('manualDialog').querySelectorAll('input,textarea,select').forEach(e=>{if(value&&m.previewing&&e.matches('#manualTitleInput,#manualBodyInput,#manualTopicInput'))return;e.disabled=value;});
    if (!value) refreshControls();
  }
  async function job(fn,{preview=false}={}) {
    if(m.busy)return; const check=token();m.previewing=preview;setBusy(true);status();
    try {await fn(check);} catch(e) {try{check();showError(e);}catch{}} finally {try{check();setBusy(false);m.previewing=false;if(m.focusAfter){m.focusAfter=false;$('manualHeading').focus({preventScroll:true});}if(m.needsPreview){m.needsPreview=false;queueGenerate();}}catch{}}
  }
  async function cloud(request,check=token(),ms=45000) {const data=await host.cloud(request,ms);check();return data;}
  function show(view) {
    m.focusAfter=m.view!==view;m.view=view;
    for(const id of ['library','upload','reader','compose','manage'])$('manual-'+id).hidden=id!==view;
    $('manualFooter').hidden=view!=='compose'; $('manualBack').hidden=view==='library';
    const titles={library:'Manuales de la agencia',upload:'Guardar un documento',reader:'Elige tu contenido',compose:'Tu flyer Divas',manage:'Detalles del documento'};
    $('manualHeading').textContent=titles[view];
    $('manualStep').textContent=view==='library'?'BIBLIOTECA PRIVADA':view==='reader'?'01 · PÁGINA O SECCIÓN':view==='compose'?'02 · TU FLYER EDITABLE':'SOLO ADMINISTRACIÓN';
    $('manualScroll').scrollTop=0; refreshControls();
  }
  function refreshControls() {
    if(m.busy)return;
    $('manualUploadEntry').hidden=!session().admin;
    $('manualPrevList').disabled=m.offset===0; $('manualNextList').disabled=!m.more;
    $('manualPrevUnit').disabled=!m.reader||m.unit<=1; $('manualNextUnit').disabled=!m.reader||m.unit>=m.reader.count;
    $('manualDesign').disabled=!$('manualExtract').value.trim();
    $('manualPrevSlide').disabled=m.part<=0; $('manualNextSlide').disabled=m.part>=m.proposal.length-1;
    $('manualApply').disabled=!m.proposal.length; $('manualSaveSeries').hidden=m.proposal.length<2;
    $('manualSaveSeries').textContent='Guardar los '+m.proposal.length+' flyers';
  }
  async function catalog(check) {
    const c=await host.catalog();check();m.backgrounds=c.backgrounds;m.logo=c.logo;
    $('manualBackground').innerHTML='<option value="auto">Recomendado de mi agencia</option><option value="none">Fondo Divas del editor</option>'+m.backgrounds.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join('');
    $('manualBackground').value=m.background;
    $('manualBrandNote').textContent=m.logo?'Se usará el mismo logo oficial de la cabecera.':'No hay un logo oficial disponible. Configúralo en Identidad de agencia para incluirlo.';
    const root=$('manualBackgroundPicks');root.innerHTML=m.backgrounds.slice(0,6).map(a=>'<button data-manual="background" data-id="'+esc(a.id)+'" title="'+esc(a.name)+'" aria-label="Usar fondo '+esc(a.name)+'" aria-pressed="false"><span aria-hidden="true">▧</span></button>').join('');
    for(const a of m.backgrounds.slice(0,6)){
      host.image(a,true).then(src=>{check();const b=[...root.children].find(b=>b.dataset.id===a.id);if(b)b.innerHTML='<img alt="" src="'+esc(src)+'">';}).catch(()=>{});
    }
  }
  async function open(source=null) {
    await host.ready();
    if(!session().active){await host.account();return;}
    if(m.busy)return;
    if(m.user!==session().user||m.epoch!==session().epoch)reset();
    m.user=session().user;m.epoch=session().epoch;host.show('manualDialog');show('library');status();
    await job(async check=>{
      const results=await Promise.allSettled([list(check),catalog(check)]);check();
      for(const r of results)if(r.status==='rejected')showError(r.reason);
      if(source){const row=await cloud(session().client.from('divas_documents').select('*').eq('id',source.documentId).maybeSingle(),check);
        if(!row)throw new Error('Este manual ya no está disponible para tu cuenta. El flyer conserva su texto y se puede seguir editando.');
        await openRow(row,check,source.unit);
      }
    });
  }
  async function list(check=token()) {
    const request=++m.listRequest; let q=session().client.from('divas_documents').select('*').order('created_at',{ascending:false}).order('id');
    const query=m.query.replace(/[%_\\]/g,'').slice(0,100);if(query)q=q.ilike('title','%'+query+'%');
    const rows=await cloud(q.range(m.offset,m.offset+PAGE_SIZE),check);if(request!==m.listRequest)return;
    m.installed=true;$('manualSetup').hidden=true;m.more=rows.length>PAGE_SIZE;m.rows=rows.slice(0,PAGE_SIZE);renderList();
  }
  function renderList() {
    const admin=session().admin;
    $('manualGrid').innerHTML=m.rows.map(r=>'<article class="manual-card"><button class="manual-card-open" data-manual="open" data-id="'+r.id+'"><span class="manual-file-icon">'+r.file_kind.toUpperCase()+'</span><strong>'+esc(r.title)+'</strong><small>'+esc(r.topic||'Documento de la agencia')+'<br>'+r.unit_count+' '+(r.file_kind==='pdf'?'páginas':'secciones')+' · '+fileSize(r.byte_size)+'</small></button><div class="manual-card-foot"><span>'+(r.state!=='ready'?'Subida pendiente':!r.published?'Archivado':'Disponible')+'</span>'+(admin?'<button data-manual="manage" data-id="'+r.id+'">Gestionar</button>':'<span aria-hidden="true">Abrir ↗</span>')+'</div></article>').join('') || '<div class="manual-empty"><strong>'+(m.query?'No encontramos ese documento':'Aquí vivirán tus manuales')+'</strong>'+(m.query?'Prueba con otra parte del título.':admin?'Sube un documento para crear el primer flyer.':'Los documentos aparecerán cuando tu agencia los comparta.')+'</div>';
    $('manualListPage').textContent='Página '+(Math.floor(m.offset/PAGE_SIZE)+1);refreshControls();
  }
  async function releaseReader() {
    m.pageRender?.cancel();m.pageRender=null;
    const reader=m.reader;m.reader=null;m.unitData=null;
    $('manualPDF').width=1;$('manualPDF').height=1;$('manualTextOriginal').textContent='';
    if(reader)await reader.close().catch(()=>{});
  }
  async function chooseFile(file) {
    if(!file)return;
    await job(async check=>{
      if(!session().admin)throw new Error('Solo la administración puede subir manuales.');
      status('Leyendo el documento en tu navegador…');await releaseReader();check();
      const reader=await R.parse(file,host,check);
      try{check();}catch(e){await reader.close();throw e;}
      m.reader=reader;m.file=file;m.row=null;m.attempt=null;m.drafts.clear();
      $('manualUploadTitle').value=file.name.replace(/\.[^.]+$/,'').slice(0,120);
      $('manualUploadTopic').value='';$('manualUploadPublished').checked=true;
      $('manualUploadName').textContent=file.name;$('manualUploadInfo').textContent=reader.count+' '+(reader.kind==='pdf'?'páginas':'secciones')+' · '+fileSize(file.size);
      show('upload');status('Documento leído. Guárdalo para que tu equipo pueda reutilizarlo.');
    });
  }
  async function saveUpload(check) {
    if(!session().admin||!m.file||!m.reader)throw new Error('Vuelve a seleccionar el documento.');
    const title=$('manualUploadTitle').value.trim(),topic=$('manualUploadTopic').value.trim();
    if(!title)throw new Error('Escribe un nombre para el documento.');
    const client=session().client,reader=m.reader,file=m.file;
    status('Comprobando si este documento ya está guardado…');
    let row=await cloud(client.from('divas_documents').select('*').eq('sha256',reader.hash).maybeSingle(),check);
    if(!row){
      const id=crypto.randomUUID(),record={id,title,topic,file_name:file.name.slice(0,200),file_kind:reader.kind,byte_size:file.size,sha256:reader.hash,
        object_path:id+'/original.'+reader.kind,unit_count:reader.count,published:$('manualUploadPublished').checked,created_by:session().user};
      try{row=await cloud(client.from('divas_documents').insert(record).select('*').single(),check);}
      catch(e){check();row=await cloud(client.from('divas_documents').select('*').eq('sha256',reader.hash).maybeSingle(),check);if(!row)throw e;}
    }
    m.attempt=row;
    if(row.state==='ready'){
      m.row=row;m.drafts.clear();await selectUnit(1,check);show('reader');status('Este archivo ya estaba guardado. Abrimos el existente, sin duplicarlo.');return;
    }
    status('Guardando el original privado en la agencia… Mantén esta ventana abierta.');
    let finished=await cloud(client.rpc('divas_document_finish',{p_id:row.id}),check);
    if(!finished?.id){
      let uploadError=null;
      try{await cloud(client.storage.from(BUCKET).upload(row.object_path,new Blob([file],{type:MIME[reader.kind]}),{contentType:MIME[reader.kind],upsert:false}),check,60000);}
      catch(e){uploadError=e;}
      check();
      try{finished=await cloud(client.rpc('divas_document_finish',{p_id:row.id}),check);}
      catch(e){throw new Error('La subida no está confirmada. Pulsa Guardar otra vez para comprobarla y continuar sin duplicados. '+e.message);}
      if(!finished?.id)throw uploadError||new Error('No se pudo confirmar el archivo. Pulsa Guardar otra vez para reintentar.');
    }
    m.row=finished;m.attempt=null;m.drafts.clear();await selectUnit(1,check);show('reader');status('✓ Documento guardado '+(finished.published?'y disponible para tu equipo.':'como archivado. Solo tú puedes verlo.'));
  }
  async function openRow(row,check,unit=1) {
    if(row.state!=='ready'){
      const receipt=await cloud(session().client.rpc('divas_document_finish',{p_id:row.id}),check);
      if(!receipt?.id){m.manage=row;manage(row);status('Esta subida no terminó. Elige otra vez el mismo archivo desde Subir documento para continuar sin duplicarlo.',true);return;}
      row=receipt;
    }
    status('Abriendo el documento privado…');
    const blob=await cloud(session().client.storage.from(BUCKET).download(row.object_path),check,60000);
    if(blob.size!==row.byte_size)throw new Error('El documento descargado está incompleto. Inténtalo de nuevo.');
    await releaseReader();check();
    const file=new File([blob],row.file_name,{type:MIME[row.file_kind]});
    const reader=await R.parse(file,host,check);check();
    if(reader.hash!==row.sha256){await reader.close();throw new Error('El archivo no coincide con el original guardado. Pide a la administración que lo revise.');}
    m.reader=reader;m.row=row;m.file=file;m.drafts.clear();m.proposal=[];m.saved.clear();
    await selectUnit(Math.min(unit,reader.count),check);show('reader');status();
  }
  async function selectUnit(index,check) {
    if(!m.reader)throw new Error('Abre un documento primero.');
    if(!Number.isInteger(index)||index<1||index>m.reader.count){$('manualUnitNumber').value=String(m.unit);throw new Error('Elige una página o sección entre 1 y '+m.reader.count+'.');}
    if(index===m.unit&&m.unitData)return;
    if(m.unitData)m.drafts.set(m.unit,$('manualExtract').value);
    m.pageRender?.cancel();m.pageRender=null;
    status('Leyendo '+(m.reader.kind==='pdf'?'página ':'sección ')+index+'…');
    const data=await m.reader.unit(index);check();m.unit=index;m.unitData=data;
    $('manualDocumentName').textContent=m.row.title;$('manualUnitNumber').value=String(index);$('manualUnitNumber').max=String(m.reader.count);
    $('manualUnitCount').textContent='de '+m.reader.count;
    $('manualUnitLabel').textContent=m.reader.kind==='pdf'?'Página':'Sección';
    $('manualSection').hidden=m.reader.kind==='pdf';$('manualUnitNumber').hidden=m.reader.kind!=='pdf';
    if(m.reader.kind!=='pdf'){
      $('manualSection').innerHTML=m.reader.sections.map((s,i)=>'<option value="'+(i+1)+'">'+(i+1)+'. '+esc(s.label)+'</option>').join('');$('manualSection').value=String(index);
    }
    $('manualExtract').value=m.drafts.has(index)?m.drafts.get(index):data.text;
    $('manualScanHint').hidden=!!data.text.trim();
    $('manualOriginalNote').textContent=m.reader.kind==='pdf'?'Página física '+index+(data.label!==String(index)?' · numeración del documento: '+data.label:'')+' · el original se conserva intacto.':'Word se organiza por títulos y secciones; su paginación depende del programa.';
    $('manualPDF').hidden=!data.page;$('manualTextOriginal').hidden=!!data.page;
    if(data.page){
      const viewport=data.page.getViewport({scale:1});const scale=Math.min(1.5,700/Math.max(viewport.width,viewport.height));
      const vp=data.page.getViewport({scale});const c=$('manualPDF');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
      const task=data.page.render({canvasContext:c.getContext('2d'),viewport:vp});m.pageRender=task;
      try{await task.promise;check();}finally{if(m.pageRender===task)m.pageRender=null;data.page.cleanup();}
    }else $('manualTextOriginal').textContent=data.text||'Este documento no contiene texto extraíble.';
    updateCount();status();
  }
  function updateCount() {$('manualTextCount').textContent=$('manualExtract').value.length.toLocaleString('es-CL')+' caracteres';refreshControls();}
  function beginDesign(check) {
    const text=R.clean($('manualExtract').value);if(!text)throw new Error('Selecciona o pega el texto que quieres usar.');
    if(text.length>12000)throw new Error('Selecciona un fragmento de hasta 12.000 caracteres para esta serie. El manual completo seguirá guardado.');
    const lines=text.split('\n').map(l=>l.trim()).filter(Boolean),hasTitle=lines.length>1&&lines[0].length<=120;
    $('manualTitleInput').value=hasTitle?lines[0]:m.row.title;
    $('manualBodyInput').value=hasTitle?lines.slice(1).join('\n'):text;
    $('manualTopicInput').value=m.row.topic||'';
    m.initialCopy={title:$('manualTitleInput').value,body:$('manualBodyInput').value};
    m.source={version:1,documentId:m.row.id,title:m.row.title,sha256:m.row.sha256,kind:m.reader.kind,unit:m.unit,edited:text!==R.clean(m.unitData.text)};
    m.part=0;return generate(check).then(()=>{show('compose');});
  }
  function currentInput() {return {title:$('manualTitleInput').value.trim(),body:R.clean($('manualBodyInput').value),topic:$('manualTopicInput').value.trim(),
    theme:m.theme,format:m.format,background:m.background,logo:$('manualUseLogo').checked,watermark:$('manualUseWatermark').checked,citation:$('manualCitation').checked,
    source:{...m.source,edited:m.source?.edited||$('manualTitleInput').value.trim()!==m.initialCopy?.title||R.clean($('manualBodyInput').value)!==R.clean(m.initialCopy?.body)}};}
  function recommendBackground(input) {
    if(m.background==='none')return null;
    if(m.background!=='auto')return m.backgrounds.find(a=>a.id===m.background)||null;
    const term=(input.topic+' '+input.title).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/\W+/).filter(w=>w.length>3);
    const score=a=>{const name=a.name.toLowerCase();return term.reduce((s,t)=>s+(name.includes(t)?10:0),0)+(new RegExp(input.theme==='oro'?'oro|dorado|gold|gala':input.theme==='perla'?'pastel|perla|rosa':'neon|glow|rosa').test(name)?4:0);};
    return [...m.backgrounds].sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name))[0]||null;
  }
  async function generate(check) {
    const input=currentInput();
    if(!input.title||!input.body)throw new Error('Completa el título y el texto para diseñar el flyer.');
    if(input.title.length>120||input.body.length>12000)throw new Error('Usa un título de hasta 120 caracteres y un texto de hasta 12.000.');
    const chunks=R.paginate(input.body,{'1:1':300,'9:16':420,'16:9':380,banner:170}[input.format]);
    if(chunks.length>12)throw new Error('Este fragmento necesita más de 12 flyers. Selecciona menos texto para que la serie sea fácil de compartir.');
    status('Preparando tu propuesta editable…');
    const background=recommendBackground(input),asset={logo:null,background:null};
    await host.prepareFonts();check();
    if(background){const src=await host.image(background,false);check();asset.background={...await host.imageInfo(src),src,name:background.name};check();}
    if(m.logo&&(input.logo||input.watermark)){const src=await host.logo();check();if(src)asset.logo={...await host.imageInfo(src),src};check();}
    m.input=input;m.assets=asset;m.proposal=chunks.map((body,i)=>L.build(host,{...input,body},asset,i+1,chunks.length));m.part=Math.min(m.part,m.proposal.length-1);
    m.signature=JSON.stringify([input,background?.id,!!asset.logo]);renderProposal();
    status((chunks.length>1?'El contenido se reparte en '+chunks.length+' flyers para mantener la letra legible. ':'')+(!asset.logo&&(input.logo||input.watermark)?'No se añadió un logo porque no hay uno oficial disponible.':''));
  }
  function renderProposal() {
    const d=m.proposal[m.part];if(!d)return;host.preview($('manualFlyer'),d,1000);
    $('manualSlideCount').textContent=m.proposal.length>1?(m.part+1)+' de '+m.proposal.length:'Vista previa';
    $('manualPrevSlide').hidden=$('manualNextSlide').hidden=m.proposal.length<=1;
    $('manualSeriesNote').textContent=m.proposal.length>1?'Toda la información está distribuida en '+m.proposal.length+' flyers. Puedes editar este o guardar la serie completa.':'Texto, logo, fondo y efectos quedan como capas editables.';
    $('manualSourceLabel').textContent=m.row.title+' · '+(m.source.kind==='pdf'?'pág. ':'sección ')+m.source.unit;
    $('manualBackground').value=m.background;$('manualFormat').value=m.format;
    $('manualDialog').querySelectorAll('[data-manual=theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===m.theme)));
    $('manualBackgroundPicks').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===m.background)));
    refreshControls();
  }
  async function apply(check,series=false) {
    // Flush the last text edit before committing; asynchronous debounces cannot lose it.
    clearTimeout(m.editTimer);await generate(check);
    const selected=m.part,indices=series?m.proposal.map((_,i)=>i):[selected];
    for(const i of indices){
      check();const key=m.signature+'|'+i;let receipt=m.saved.get(key);
      if(!receipt){receipt={};m.saved.set(key,receipt);}
      if(!receipt.saved){status('Guardando flyer '+(i+1)+' de '+m.proposal.length+' en Mis diseños…');await host.create(m.proposal[i],receipt,check);check();}
    }
    const chosen=m.saved.get(m.signature+'|'+selected);await host.edit(chosen.id,check);check();
    $('manualDialog').close();host.notify(series?'Serie guardada en Mis diseños. Estás editando el flyer '+(selected+1)+'.':'Flyer guardado como un proyecto nuevo. Ya puedes darle tu toque.');
  }
  function manage(row) {
    m.manage=row;$('manualManageTitle').value=row.title;$('manualManageTopic').value=row.topic;$('manualManagePublished').checked=row.published;
    $('manualManageFile').textContent=row.file_name+' · '+(row.state==='ready'?'Original guardado':'Subida pendiente');show('manage');
  }
  async function updateDetails(check) {
    if(!session().admin)throw new Error('Solo la administración puede gestionar documentos.');const title=$('manualManageTitle').value.trim();if(!title)throw new Error('Escribe un nombre.');
    const row=await cloud(session().client.from('divas_documents').update({title,topic:$('manualManageTopic').value.trim(),published:$('manualManagePublished').checked}).eq('id',m.manage.id).select('*').single(),check);
    m.manage=row;if(m.row?.id===row.id)m.row=row;await list(check);show('library');status('Cambios guardados. Los flyers ya creados se conservan.');
  }
  async function remove(check) {
    if(!session().admin||!m.manage)return;
    if(!confirm('¿Eliminar «'+m.manage.title+'» y su archivo original de la biblioteca? Los flyers ya creados conservarán su texto e imágenes.'))return;
    const row=m.manage,client=session().client;
    const exists=await cloud(client.from('divas_documents').select('id').eq('id',row.id).maybeSingle(),check);
    if(exists){
      await cloud(client.from('divas_documents').update({published:false}).eq('id',row.id).select('id').maybeSingle(),check);
      await cloud(client.storage.from(BUCKET).remove([row.object_path]),check);
      await cloud(client.from('divas_documents').delete().eq('id',row.id).select('id').maybeSingle(),check);
      if(await cloud(client.from('divas_documents').select('id').eq('id',row.id).maybeSingle(),check))throw new Error('No se pudo confirmar la eliminación. El documento está archivado; vuelve a intentarlo.');
    }
    if(m.row?.id===row.id){await releaseReader();m.row=null;m.file=null;}
    m.manage=null;await list(check);show('library');status('Documento eliminado. Los flyers existentes se conservan.');
  }
  function queueGenerate() {
    clearTimeout(m.editTimer);m.editTimer=setTimeout(()=>{if(m.view!=='compose')return;if(m.busy)m.needsPreview=true;else job(generate,{preview:true});},650);
  }
  async function action(name,b) {
    if(m.busy)return;
    if(name==='close'){if(m.view==='upload'&&!confirm('El archivo todavía no se ha guardado. ¿Cerrar esta ventana?'))return;$('manualDialog').close();return;}
    if(name==='choose'){if(session().admin){$('manualFile').value='';$('manualFile').click();}return;}
    if(name==='expand'){
      const expanded=$('manual-compose').classList.toggle('manual-expanded');
      $('manualExpand').textContent=expanded?'↙ Ver controles':'⤢ Ampliar';$('manualExpand').setAttribute('aria-expanded',String(expanded));return;
    }
    if(name==='back'){
      clearTimeout(m.editTimer);if(m.view==='compose'){show('reader');return;}
      if(m.view==='upload'&&!confirm('El archivo todavía no se ha guardado. ¿Volver a la biblioteca?'))return;
      await job(async check=>{show('library');await list(check);});return;
    }
    if(name==='theme')m.theme=b.dataset.value;
    if(name==='background')m.background=b.dataset.id;
    await job(async check=>{
      if(name==='refresh'){await list(check);await catalog(check);status('Biblioteca actualizada.');}
      if(name==='listPrev'||name==='listNext'){m.offset=Math.max(0,m.offset+(name==='listNext'?PAGE_SIZE:-PAGE_SIZE));await list(check);}
      if(name==='saveUpload')await saveUpload(check);
      if(name==='open'){const row=m.rows.find(r=>r.id===b.dataset.id);if(row)await openRow(row,check);}
      if(name==='manage'){const row=m.rows.find(r=>r.id===b.dataset.id);if(row)manage(row);}
      if(name==='saveDetails')await updateDetails(check);
      if(name==='delete')await remove(check);
      if(name==='unitPrev'||name==='unitNext')await selectUnit(m.unit+(name==='unitNext'?1:-1),check);
      if(name==='resetText'){$('manualExtract').value=m.unitData.text;updateCount();}
      if(name==='design')await beginDesign(check);
      if(name==='theme'||name==='background')await generate(check);
      if(name==='slidePrev'||name==='slideNext'){m.part+=name==='slideNext'?1:-1;renderProposal();}
      if(name==='apply')await apply(check,false);
      if(name==='series')await apply(check,true);
      if(name==='download'){
        if(!m.row)throw new Error('Abre un documento.');
        const file=await cloud(session().client.storage.from(BUCKET).download(m.row.object_path),check,60000);
        host.download(file,m.row.file_name);
      }
    });
  }
  function reset() {
    const old=m;m={...fresh(),generation:old.generation+1};clearTimeout(old.editTimer);clearTimeout(old.searchTimer);old.pageRender?.cancel();old.reader?.close().catch(()=>{});
    if(!$('manualDialog'))return;$('manualDialog').close();
    for(const id of ['manualGrid','manualTextOriginal','manualBackgroundPicks'])$(id).replaceChildren();
    $('manualDialog').querySelectorAll('input,textarea').forEach(e=>{if(e.type!=='checkbox')e.value='';});
    for(const id of ['manualPDF','manualFlyer']){$(id).width=1;$(id).height=1;}
    for(const id of ['manualDocumentName','manualSourceLabel','manualUploadName','manualUploadInfo','manualManageFile'])$(id).textContent='';
    status();setBusy(false);
  }
  function init(adapter) {
    host=adapter;
    document.body.insertAdjacentHTML('beforeend',markup());
    $('manualDialog').addEventListener('click',e=>{const b=e.target.closest('[data-manual]');if(b){e.preventDefault();action(b.dataset.manual,b).catch(showError);}});
    $('manualDialog').addEventListener('cancel',e=>{if(m.busy){e.preventDefault();return;}if(m.view==='upload'&&!confirm('El archivo todavía no se ha guardado. ¿Cerrar?'))e.preventDefault();});
    $('manualDialog').addEventListener('close',()=>{
      if($('manualDialog').open)return;
      clearTimeout(m.editTimer);releaseReader();m.file=null;m.proposal=[];m.saved.clear();
      $('manual-compose').classList.remove('manual-expanded');$('manualExpand').textContent='⤢ Ampliar';$('manualExpand').setAttribute('aria-expanded','false');
    });
    $('manualFile').addEventListener('change',e=>chooseFile(e.target.files?.[0]));
    $('manualSearch').addEventListener('input',e=>{m.query=e.target.value;m.offset=0;clearTimeout(m.searchTimer);m.searchTimer=setTimeout(()=>list().catch(showError),280);});
    $('manualExtract').addEventListener('input',updateCount);
    for(const id of ['manualUnitNumber','manualSection'])$(id).addEventListener('change',e=>{
      const el=e.target;if(m.busy||m.view!=='reader'||el.hidden)return;
      if(!el.value.trim()){el.value=String(m.unit);return;}
      const index=Number(el.value);if(index===m.unit&&m.unitData)return;
      job(check=>selectUnit(index,check));
    });
    for(const [id,key] of [['manualFormat','format'],['manualBackground','background']])$(id).addEventListener('change',e=>{m[key]=e.target.value;job(generate);});
    for(const id of ['manualUseLogo','manualUseWatermark','manualCitation'])$(id).addEventListener('change',()=>job(generate));
    for(const id of ['manualTitleInput','manualBodyInput','manualTopicInput'])$(id).addEventListener('input',queueGenerate);
  }
  function markup() {return `
<dialog id="manualDialog" aria-labelledby="manualHeading">
  <header class="manual-head"><button id="manualBack" data-manual="back" aria-label="Volver" hidden>←</button><div><span id="manualStep" class="manual-step">BIBLIOTECA PRIVADA</span><h2 id="manualHeading" tabindex="-1">Manuales de la agencia</h2></div><button id="manualClose" data-manual="close" aria-label="Cerrar biblioteca">×</button></header>
  <p id="manualStatus" class="manual-status" role="status" aria-live="polite"></p>
  <div id="manualScroll">
    <section id="manual-library" class="manual-library">
      <div class="manual-hero"><div><span class="manual-step">APRENDE · CREA · COMPARTE</span><h3>De tu manual al próximo flyer.</h3><p>Elige una página. Divas pone el estilo.<br>Tu información, siempre editable.</p><button id="manualUploadEntry" class="primary" data-manual="choose">+ Subir documento</button></div><svg viewBox="0 0 160 140" fill="none" aria-hidden="true"><g transform="rotate(-12 80 70)"><rect x="21" y="18" width="82" height="108" rx="10" fill="#5f3e62" stroke="#a5789b"/><path d="M37 42h42M37 53h50M37 64h35M37 86h40M37 97h25" stroke="#be9ab5" stroke-width="3" stroke-linecap="round"/></g><g transform="rotate(10 105 78)"><rect x="65" y="34" width="75" height="95" rx="9" fill="#efd2e2"/><path d="M78 52h27M78 62h43M78 72h34" stroke="#6b375b" stroke-width="4" stroke-linecap="round"/><circle cx="105" cy="100" r="13" fill="#ae7198"/><path d="m105 90 2.7 7.4 7.3 2.6-7.3 2.7-2.7 7.3-2.6-7.3-7.4-2.7 7.4-2.6Z" fill="#ffe8b5"/></g><path d="m130 11 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#ffe8b5"/></svg></div>
      <div id="manualSetup" class="manual-setup" hidden><strong>Activar la biblioteca</strong><p id="manualSetupText"></p><a id="manualSQL" href="supabase/13-divas-documentos.sql" download>Descargar configuración de Supabase</a></div>
      <div class="manual-tools"><input id="manualSearch" type="search" placeholder="Buscar un manual…" aria-label="Buscar por título" maxlength="100"><button data-manual="refresh">Actualizar ↻</button></div>
      <div id="manualGrid" class="manual-grid"><div class="manual-empty">Buscando documentos…</div></div>
      <div class="manual-pagination"><button id="manualPrevList" data-manual="listPrev">← Anterior</button><span id="manualListPage">Página 1</span><button id="manualNextList" data-manual="listNext">Siguiente →</button></div>
      <p class="manual-progress-note">Solo las cuentas aprobadas ven los documentos disponibles. Los originales permanecen privados.</p>
    </section>
    <section id="manual-upload" class="manual-upload" hidden>
      <div class="manual-file-summary"><span class="manual-file-icon">DOC</span><div><strong id="manualUploadName"></strong><p id="manualUploadInfo"></p></div></div>
      <div class="field"><label class="manual-label" for="manualUploadTitle">Nombre para encontrarlo después</label><input id="manualUploadTitle" type="text" maxlength="120" required></div>
      <div class="field"><label class="manual-label" for="manualUploadTopic">Aplicación o tema</label><input id="manualUploadTopic" type="text" maxlength="60" placeholder="Por ejemplo: Salsa"></div>
      <label class="check"><input id="manualUploadPublished" type="checkbox" checked>Disponible para mi equipo</label>
      <p class="manual-progress-note">El original se guarda intacto. Podrás cambiar el nombre, archivarlo o eliminarlo desde Gestionar.</p>
      <button id="manualSaveUpload" class="primary" data-manual="saveUpload">Guardar documento</button>
    </section>
    <section id="manual-reader" class="manual-reader" hidden>
      <div class="manual-original"><div class="manual-page-controls"><button id="manualPrevUnit" data-manual="unitPrev" aria-label="Página o sección anterior">‹</button><label id="manualUnitLabel" for="manualUnitNumber">Página</label><input id="manualUnitNumber" type="number" min="1" value="1" inputmode="numeric"><select id="manualSection" aria-label="Sección de Word o texto" hidden></select><span id="manualUnitCount"></span><button id="manualNextUnit" data-manual="unitNext" aria-label="Página o sección siguiente">›</button></div><div class="manual-page-frame"><canvas id="manualPDF" aria-label="Vista de la página original"></canvas><pre id="manualTextOriginal" hidden></pre></div><p id="manualOriginalNote" class="manual-original-note"></p></div>
      <div class="manual-content"><span class="manual-step">CONTENIDO DEL DOCUMENTO</span><h3 id="manualDocumentName"></h3><p>Deja el texto que quieres convertir en flyer. Revisa el orden si la página tiene columnas o tablas.</p><div id="manualScanHint" class="manual-paste-hint" hidden>Esta página no contiene texto extraíble; puede ser una imagen escaneada. Pega o escribe aquí la información que quieras usar. Esta versión no hace reconocimiento de texto en imágenes.</div><label class="manual-label" for="manualExtract">Texto para tu flyer</label><textarea id="manualExtract" spellcheck="true"></textarea><div class="manual-text-count"><span id="manualTextCount"></span><button class="manual-link" data-manual="resetText">Restaurar texto original</button></div><button id="manualDesign" class="primary manual-primary" data-manual="design">✦ Diseñar con este texto</button><button class="manual-link" data-manual="download">Descargar documento original</button></div>
    </section>
    <section id="manual-compose" class="manual-compose" hidden>
      <div class="manual-artwork"><div class="manual-artwork-stage"><canvas id="manualFlyer" aria-label="Vista previa del flyer editable"></canvas></div><div class="manual-slide-controls"><button id="manualPrevSlide" data-manual="slidePrev" aria-label="Flyer anterior">‹</button><span id="manualSlideCount">1 de 1</span><button id="manualNextSlide" data-manual="slideNext" aria-label="Flyer siguiente">›</button><button id="manualExpand" data-manual="expand" aria-expanded="false">⤢ Ampliar</button></div><span class="manual-edit-badge">✧ Todas las capas son editables</span></div>
      <div class="manual-options"><h3>Un toque, tres estilos.</h3><div class="manual-style-grid">${Object.entries(L.THEMES).map(([id,p])=>'<button data-manual="theme" data-value="'+id+'" aria-pressed="'+(id==='oro')+'"><b class="manual-swatch-'+id+'">Aa</b><span>'+p.name+'</span></button>').join('')}</div>
        <div class="field"><label class="manual-label" for="manualFormat">¿Dónde lo compartirás?</label><select id="manualFormat"><option value="9:16">TikTok / historia · 9:16</option><option value="1:1">Flyer cuadrado · 1:1</option><option value="16:9">Evento horizontal · 16:9</option><option value="banner">Banner · 1428 × 400</option></select></div>
        <div class="field"><label class="manual-label" for="manualTitleInput">Título</label><input id="manualTitleInput" type="text" maxlength="120"></div>
        <details><summary>Fondo y marca de la agencia</summary><div><div class="field"><label class="manual-label" for="manualBackground">Fondo</label><select id="manualBackground"></select><div id="manualBackgroundPicks" class="manual-resource-picks"></div></div><label class="check"><input id="manualUseLogo" type="checkbox" checked>Logo oficial arriba</label><label class="check"><input id="manualUseWatermark" type="checkbox" checked>Marca de agua discreta</label><p id="manualBrandNote" class="manual-progress-note"></p></div></details>
        <details><summary>Revisar texto y procedencia</summary><div><div class="field"><label class="manual-label" for="manualTopicInput">Aplicación o tema</label><input id="manualTopicInput" type="text" maxlength="60"></div><div class="field"><label class="manual-label" for="manualBodyInput">Información del flyer o la serie</label><textarea id="manualBodyInput" maxlength="12000"></textarea></div><label class="check"><input id="manualCitation" type="checkbox" checked>Mostrar la página de referencia</label><p id="manualSourceLabel" class="manual-progress-note"></p><p class="manual-progress-note">Se distribuye tu texto sin inventar ni resumir condiciones, cifras o instrucciones. Revisa los datos antes de compartir.</p></div></details>
      </div>
    </section>
    <section id="manual-manage" class="manual-upload" hidden><p id="manualManageFile" class="manual-progress-note"></p><div class="field"><label class="manual-label" for="manualManageTitle">Nombre</label><input id="manualManageTitle" type="text" maxlength="120"></div><div class="field"><label class="manual-label" for="manualManageTopic">Aplicación o tema</label><input id="manualManageTopic" type="text" maxlength="60"></div><label class="check"><input id="manualManagePublished" type="checkbox">Disponible para mi equipo</label><p class="manual-progress-note">Desmárcalo para archivarlo. Solo la administración podrá verlo. Los flyers creados se conservan.</p><button class="primary" data-manual="saveDetails">Guardar cambios</button><button class="danger wide" data-manual="delete">Eliminar documento y original</button></section>
  </div>
  <footer id="manualFooter" class="manual-foot" hidden><div><p id="manualSeriesNote"></p></div><button id="manualSaveSeries" class="manual-series-action" data-manual="series" hidden></button><button id="manualApply" class="primary" data-manual="apply">Editar este flyer →</button></footer>
</dialog><input id="manualFile" type="file" accept=".pdf,.docx,.txt" hidden>`;}
  window.DivasDocuments={init,open,reset};
})();

'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixtures=process.env.DIVAS_VIDEO_FIXTURES||path.resolve(root,'../qa/fixtures'),out=path.join(root,'test-output/projects-v41');fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
// Test hooks are injected only by this local server; production source has none.
const html=source.replace('boot().catch(error=>notify(error.message));','window.__projectsTest={A,P,PV,S,showProjects,refreshVideoProjects,resetVideoProjects,clearCloudMemory,renderProjects,updateAccountUI};boot().catch(error=>notify(error.message));');
const server=http.createServer((req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',/\.m?js$/.test(file)?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(name==='/'?html:fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:950},acceptDownloads:true});await context.route(/supabase\.(co|in)/,r=>r.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack));
 const card=(kind)=>page.locator('#projectGrid .project-card[data-kind='+kind+']');
 const ready=()=>page.waitForFunction(()=>window.__projectsTest?.P.initialized&&window.__projectsTest.PV.loaded&&!window.__projectsTest.PV.loading);
 const saved=()=>page.waitForFunction(()=>document.getElementById('dvSaveStatus').textContent==='En este dispositivo'&&!document.getElementById('dvBody').inert);
 const home=async()=>{await page.getByRole('button',{name:'Mis proyectos',exact:true}).click();await page.locator('#divasVideoDialog').waitFor({state:'hidden'});await ready();};
 const kind=async name=>{await page.locator('#projectKindFilters [data-value='+name+']').click();};
 async function createVideo(name,file){
  await page.locator('.projects-shortcuts [data-dv-new]').click();await page.waitForFunction(()=>document.getElementById('divasVideoDialog').open&&!document.getElementById('dvBody').inert&&document.querySelectorAll('.dv-scene').length===0);
  await page.locator('#dvFiles').setInputFiles(path.join(fixtures,file));await page.waitForFunction(()=>document.querySelectorAll('.dv-scene').length===1&&!document.getElementById('dvBody').inert);
  await page.locator('#dvName').fill(name);await page.locator('[data-dv=save]').click();await saved();await home();
 }
 try{
  await page.goto(base);await ready();assert.equal(await card('video').count(),0);assert.equal(await page.getByRole('heading',{name:'Mis proyectos',exact:true}).count(),1);
  await page.locator('#startImageInput').setInputFiles(path.join(fixtures,'photo.png'));await page.waitForFunction(()=>!document.getElementById('workspace').hidden);await page.evaluate(()=>__projectsTest.showProjects());await ready();assert.equal(await card('design').count(),1);
  await createVideo('Evento rosa','clip.mp4');await createVideo('Anuncio dorado','photo.png');assert.equal(await card('video').count(),2);assert.equal(await card('design').count(),1);assert.equal(await page.locator('#projectKindAllCount').textContent(),'3');assert.match(await page.locator('#resumeProject').textContent(),/Anuncio dorado/);
  assert.equal(await card('video').filter({hasText:'Evento rosa'}).locator('.project-duration').textContent(),'0:04');
  await kind('video');assert.equal(await card('video').count(),2);assert.equal(await card('design').count(),0);assert.equal(await page.locator('#projectFilter').isDisabled(),true);
  await page.locator('#projectSearch').fill('rosa');assert.equal(await card('video').count(),1);await page.locator('#projectSearch').fill('');await kind('design');assert.equal(await card('design').count(),1);assert.equal(await card('video').count(),0);await kind('todos');
  await page.locator('#projectFilters').evaluate(e=>e.open=true);await page.locator('#projectSort').selectOption('nombre');assert.deepEqual(await page.locator('#projectGrid .project-info strong').allTextContents(),['Anuncio dorado','Evento rosa','photo']);await page.locator('#projectSort').selectOption('recientes');await page.locator('#projectFilters').evaluate(e=>e.open=false);
  console.log('PASS mixed projects, visible type filters, search, sorting, duration and latest project');
  // Open exact saved video and edit it; the home card must update without a new project.
  await card('video').filter({hasText:'Evento rosa'}).locator('.project-open').click();await page.waitForFunction(()=>!document.getElementById('dvBody').inert&&document.getElementById('dvName').value==='Evento rosa');assert.equal(await page.locator('.dv-scene').count(),1);await page.locator('#dvName').fill('Evento rosa editado');await home();assert.equal(await card('video').count(),2);assert.equal(await card('video').filter({hasText:'Evento rosa editado'}).count(),1);
  // Back up directly from home, without opening the video dialog.
  const event=card('video').filter({hasText:'Evento rosa editado'});await event.locator('summary').click();const dl=page.waitForEvent('download');await event.getByRole('button',{name:'Descargar respaldo',exact:true}).click();const download=await dl;await download.saveAs(path.join(out,'evento.divasvideo'));assert.ok(fs.statSync(path.join(out,'evento.divasvideo')).size>1000);assert.equal(await page.locator('#divasVideoDialog').isVisible(),false);
  await page.reload();await ready();assert.equal(await card('video').count(),2);assert.equal(await card('design').count(),1);
  console.log('PASS opening exact video, rename/save refresh, direct portable backup and reload');
  // Legacy summaries lack ratio/created; never require media to list them.
  await page.evaluate(async()=>{const db=await new Promise((r,j)=>{const q=indexedDB.open('divas-video-v1',1);q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});await new Promise(r=>{const tx=db.transaction('summaries','readwrite');tx.objectStore('summaries').put({key:'local:legacy-video',owner:'local',id:'legacy-video',name:'Vídeo anterior v40',modified:1,scenes:1,seconds:12,thumb:''});tx.objectStore('summaries').put({key:'another-account:private',owner:'another-account',id:'private',name:'Privado otra cuenta',modified:2,seconds:8});tx.oncomplete=r;});db.close();await __projectsTest.refreshVideoProjects();});
  assert.equal(await card('video').count(),3);assert.equal(await page.getByText('Privado otra cuenta',{exact:true}).count(),0);assert.match(await card('video').filter({hasText:'Vídeo anterior v40'}).textContent(),/0:12/);
  await page.evaluate(async()=>{const h=__projectsTest;h.A.epoch++;DivasVideo.reset();h.resetVideoProjects();h.A.user={id:'another-account'};h.renderProjects();await h.refreshVideoProjects();});assert.equal(await card('video').count(),1);assert.equal(await card('video').filter({hasText:'Privado otra cuenta'}).count(),1);
  await page.evaluate(async()=>{const h=__projectsTest;h.A.epoch++;DivasVideo.reset();h.resetVideoProjects();h.A.user=null;await h.refreshVideoProjects();});assert.equal(await card('video').count(),3);
  console.log('PASS pre-existing v40 summaries, account isolation and account change');
  // A second tab must refresh the home list through the change notification.
  const second=await context.newPage();await second.goto(base);await second.waitForFunction(()=>window.__projectsTest.PV.loaded);await second.locator('#projectGrid .project-card[data-kind=video]').filter({hasText:'Anuncio dorado'}).locator('.project-open').click();await second.waitForFunction(()=>!document.getElementById('dvBody').inert);await second.locator('#dvName').fill('Anuncio actualizado');await second.locator('[data-dv=save]').click();await page.waitForFunction(()=>document.getElementById('projectGrid').textContent.includes('Anuncio actualizado'));await second.close();
  // Deletion must refresh both stores, stay on home and never resurrect after reload.
  const remove=card('video').filter({hasText:'Anuncio actualizado'});await remove.locator('summary').click();page.once('dialog',d=>d.accept());await remove.getByRole('button',{name:'Eliminar vídeo',exact:true}).click();await page.waitForFunction(()=>!document.getElementById('projectGrid').textContent.includes('Anuncio actualizado'));await page.reload();await ready();assert.equal(await card('video').count(),2);
  console.log('PASS cross-tab refresh and delete without resurrection');
  // Storage errors remain visible and retry recovers the list.
  await page.evaluate(async()=>{window.__realSummaries=DivasVideo.summaries;DivasVideo.summaries=async()=>{throw Error('No se pudo abrir el guardado de este navegador.');};await __projectsTest.refreshVideoProjects();});assert.equal(await page.locator('#videoProjectNotice').isVisible(),true);await page.evaluate(()=>DivasVideo.summaries=window.__realSummaries);await page.getByRole('button',{name:'Volver a intentar',exact:true}).click();await ready();assert.equal(await page.locator('#videoProjectNotice').isVisible(),false);
  for(const width of [1440,390,360]){await page.setViewportSize({width,height:width===1440?950:820});await kind('todos');await page.locator('#projectGrid').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.body.scrollWidth>innerWidth),false);for(const b of await page.locator('#projectKindFilters button').all())assert.ok((await b.boundingBox()).height>=44);await page.screenshot({path:path.join(out,'projects-'+width+'.png')});await kind('video');assert.equal(await card('design').count(),0);await card('video').filter({hasText:'Evento rosa editado'}).locator('.project-open').click();await page.waitForFunction(()=>!document.getElementById('dvBody').inert);assert.equal(await page.locator('#divasVideoDialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);assert.ok(await page.getByRole('button',{name:'Mis proyectos',exact:true}).isVisible());await home();}
  assert.deepEqual(errors,[]);console.log('PASS recoverable storage errors, mobile 360/390 + desktop 1440, no runtime errors');
 }catch(e){await page.screenshot({path:path.join(out,'failure.png')});throw e;}
 finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exit(1);});

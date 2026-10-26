'use strict';
/* Run with Playwright and a local Chromium: CHROMIUM_EXECUTABLE=/path/to/chromium node tests/video-browser.cjs */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),out=process.env.DIVAS_VIDEO_QA_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'divas-video-qa-'));
const fixtures=process.env.DIVAS_VIDEO_FIXTURES||path.resolve(__dirname,'../../qa/fixtures');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',(/\.m?js$/).test(file)?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
async function until(page,fn){return page.waitForFunction(fn,{},{timeout:15000});}
async function change(page,id,value){await page.locator(id).fill(String(value));await page.locator(id).dispatchEvent('change');}
async function stored(page){return page.evaluate(async()=>{const d=await new Promise((r,j)=>{const q=indexedDB.open('divas-video-v1',1);q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});return new Promise((r,j)=>{const q=d.transaction('projects').objectStore('projects').getAll();q.onsuccess=()=>r(q.result.map(v=>({...v,assets:v.assets.map(a=>({...a,blobSize:a.blob.size,blob:undefined}))})));q.onerror=()=>j(q.error);});});}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const options={headless:true};if(process.env.CHROMIUM_EXECUTABLE){options.executablePath=process.env.CHROMIUM_EXECUTABLE;options.args=['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'];}
 const browser=await chromium.launch(options),context=await browser.newContext({viewport:{width:1400,height:900},acceptDownloads:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await context.route(/supabase\.(co|in)/,r=>r.abort());
 try{
  await page.goto(base);await until(page,()=>document.querySelector('[data-dv-open]'));
  await page.locator('[data-dv-open]').filter({hasText:'Crear video'}).click();await until(page,()=>document.getElementById('divasVideoDialog').open);
  await page.locator('#dvFiles').setInputFiles([path.join(fixtures,'photo.png'),path.join(fixtures,'clip.mp4')]);
  await until(page,()=>document.querySelectorAll('.dv-scene').length===2&&!document.getElementById('dvBody').inert);
  assert.equal(await page.locator('#dvIn').inputValue(),'0');await change(page,'#dvIn',.5);await change(page,'#dvOut',3.5);
  await page.locator('[data-dv=tool][data-tool=text]').click();await page.locator('#dvTitle').fill('Bienvenidas a Divas 🌸');await page.locator('#dvTitlePosition').selectOption('center');
  await page.locator('#dvName').fill('Prueba integrada Divas');await page.locator('#dvAudioFile').setInputFiles(path.join(fixtures,'music.wav'));
  await until(page,()=>document.getElementById('dvAudioName').textContent==='music.wav');await page.locator('[data-dv=tool][data-tool=audio]').click();await page.locator('#dvAudioLoop').check();
  await page.locator('.dv-scene').first().click();await page.locator('[data-dv=tool][data-tool=clip]').click();await change(page,'#dvDuration',2);
  await page.locator('#dvSeek').fill('1');await page.locator('#dvSeek').dispatchEvent('input');await page.locator('[data-dv=split]').click();
  await until(page,()=>document.querySelectorAll('.dv-scene').length===3);assert.match(await page.locator('#dvTime').textContent(),/0:05.0$/);
  await page.locator('[data-dv=right]').click();await page.locator('[data-dv=left]').click();await page.locator('.dv-clip-tools [data-dv=duplicate]').click();
  await until(page,()=>document.querySelectorAll('.dv-scene').length===4);await page.locator('.dv-clip-tools [data-dv=remove]').click();await until(page,()=>document.querySelectorAll('.dv-scene').length===3);
  await page.locator('[data-dv=save]').click();await until(page,()=>document.getElementById('dvSaveStatus').textContent==='En este dispositivo');
  const saved=await stored(page);assert.equal(saved.length,1);assert.equal(saved[0].project.scenes.length,3);assert.equal(saved[0].assets.length,3);assert.ok(saved[0].assets.every(a=>a.blobSize===a.size));assert.equal(saved[0].project.music.loop,true);assert.deepEqual(saved[0].project.scenes.slice(0,2).map(c=>c.duration),[1,1]);
  console.log('PASS mixed media, trim, split, reorder, duplicate, remove, music and IndexedDB blobs');
  const flyerBefore=await page.locator('#canvas').evaluate(c=>c.toDataURL());
  await page.locator('[data-dv=tool][data-tool=media]').click();const backupEvent=page.waitForEvent('download');await page.locator('[data-dv=backup]').click();const backup=await backupEvent;const backupPath=path.join(out,'roundtrip.divasvideo');await backup.saveAs(backupPath);
  assert.ok(fs.statSync(backupPath).size>10000);
  await page.locator('[data-dv=library]').click();await page.locator('.projects-shortcuts [data-dv-new]').click();await until(page,()=>document.querySelectorAll('.dv-scene').length===0&&!document.getElementById('dvBody').inert);
  await until(page,()=>!document.getElementById('dvBody').inert);await page.locator('#dvBackupFile').setInputFiles(backupPath);await until(page,()=>document.querySelectorAll('.dv-scene').length===3&&!document.getElementById('dvBody').inert);
  assert.equal(await page.locator('#dvName').inputValue(),'Prueba integrada Divas');assert.equal(await page.locator('#dvAudioLoop').isChecked(),true);
  assert.equal(await page.locator('#canvas').evaluate(c=>c.toDataURL()),flyerBefore);
  console.log('PASS portable backup restores all media and leaves flyer canvas intact');
  await page.locator('[data-dv=close]').click();await page.reload();await until(page,()=>document.querySelectorAll('#projectGrid .project-card[data-kind=video]').length===2);await page.locator('#projectGrid .project-card[data-kind=video] .project-open').first().click();await until(page,()=>document.querySelectorAll('.dv-scene').length===3&&!document.getElementById('dvBody').inert);
  assert.equal(await page.locator('#dvName').inputValue(),'Prueba integrada Divas');console.log('PASS reload and reopen');
  const event=page.waitForEvent('download',{timeout:60000});await page.locator('[data-dv=export]').click();const video=await Promise.race([event,page.waitForFunction(()=>document.getElementById('dvMessage').classList.contains('dv-error'),{},{timeout:60000}).then(async()=>{throw new Error(await page.locator('#dvMessage').textContent());})]);await video.saveAs(path.join(out,video.suggestedFilename()));console.log('PASS video export',video.suggestedFilename()); 
  await until(page,()=>document.getElementById('dvProgress').hidden);assert.equal(await page.locator('#dvExport').isEnabled(),true);
  await page.locator('[data-dv=export]').click();await until(page,()=>!document.getElementById('dvProgress').hidden);await page.locator('[data-dv=cancel]').click();await until(page,()=>document.getElementById('dvProgress').hidden);assert.equal(await page.locator('#dvExport').isEnabled(),true);
  console.log('PASS export cancellation releases controls');
  await page.locator('.dv-scene').last().click();await page.locator('#dvSeek').fill('3.5');await page.locator('#dvSeek').dispatchEvent('input');await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png')});await page.locator('.dv-mobile-dock [data-tool=transform]').click();await page.screenshot({path:path.join(out,'mobile-edit.png')});
  const overflow=await page.locator('#divasVideoDialog').evaluate(e=>e.scrollWidth>e.clientWidth+1);assert.equal(overflow,false);
  for(const width of [360,390]){await page.setViewportSize({width,height:780});assert.equal(await page.locator('#divasVideoDialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);assert.ok(await page.locator('#dvCanvas').boundingBox());}
  console.log('PASS mobile layout 360/390, desktop, no horizontal overflow');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,errors,exportFormat:video.suggestedFilename().split('.').pop(),output:out},null,2));
 }catch(e){console.error('UI:',await page.locator('#dvMessage').textContent());await page.screenshot({path:path.join(out,'failure.png')});throw e;}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exit(1);});

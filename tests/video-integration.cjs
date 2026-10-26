'use strict';
const {chromium}=require('playwright');const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixtures=process.env.DIVAS_VIDEO_FIXTURES||path.resolve(__dirname,'../../qa/fixtures');
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;let file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',/\.m?js$/.test(file)?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:850}});await context.route(/supabase\.(co|in)/,r=>r.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base);await page.locator('#startImageInput').setInputFiles(path.join(fixtures,'photo.png'));await page.waitForFunction(()=>!document.getElementById('workspace').hidden&&!document.getElementById('workspace').inert);
  const original=await page.locator('#canvas').evaluate(c=>c.toDataURL());
  await page.locator('.save-toolbar [data-dv-open]').click();await page.locator('.dv-timeline [data-dv=capture]').click();await page.waitForFunction(()=>document.querySelectorAll('.dv-scene').length===1&&!document.getElementById('dvBody').inert);
  assert.match(await page.locator('#dvMessage').textContent(),/Flyer añadido/);await page.locator('#dvName').fill('Captura de flyer');await page.locator('[data-dv=save]').click();await page.waitForFunction(()=>document.getElementById('dvSaveStatus').textContent==='En este dispositivo');
  await page.locator('[data-dv=close]').click();assert.equal(await page.locator('#canvas').evaluate(c=>c.toDataURL()),original);console.log('PASS actual flyer capture preserves original render and editor');
  await page.locator('.save-toolbar [data-dv-open]').click();const second=await context.newPage();await second.goto(base);await second.locator('#projectGrid .project-card[data-kind=video] .project-open').first().click();await second.waitForFunction(()=>!document.getElementById('dvBody').inert&&document.querySelectorAll('.dv-scene').length===1);
  await second.locator('#dvName').fill('Cambio en otra pestaña');await second.locator('[data-dv=save]').click();await second.waitForFunction(()=>document.getElementById('dvSaveStatus').textContent==='En este dispositivo');
  await page.bringToFront();await page.locator('#dvName').fill('Mis cambios sin sobrescribir');await page.locator('[data-dv=save]').click();await page.waitForFunction(()=>document.getElementById('dvMessage').textContent.includes('otra pestaña'));
  await page.locator('[data-dv=saveCopy]').click();await page.waitForFunction(()=>document.getElementById('dvMessage').textContent.includes('Copia guardada'));console.log('PASS concurrent writes blocked and saved as a new copy');
  await second.close();
  await page.evaluate(async()=>{window.DivasVideo.reset();window.__videoOwner='test-account-a';window.DivasVideo.init({session:()=>({owner:window.__videoOwner}),show:id=>document.getElementById(id).showModal(),notify:()=>{},capture:async()=>null});await window.DivasVideo.open();});
  await page.locator('[data-dv=library]').click();assert.equal(await page.locator('.dv-project').count(),0);
  await page.locator('[data-dv=hideLibrary]').click();await page.locator('#dvFiles').setInputFiles(path.join(fixtures,'photo.png'));await page.waitForFunction(()=>document.querySelectorAll('.dv-scene').length===1&&!document.getElementById('dvBody').inert);await page.locator('[data-dv=save]').click();
  await page.evaluate(async()=>{window.DivasVideo.reset();window.__videoOwner='test-account-b';await window.DivasVideo.open();});await page.locator('[data-dv=library]').click();assert.equal(await page.locator('.dv-project').count(),0);assert.equal(await page.locator('.dv-scene').count(),0);console.log('PASS account namespace separation and reset');
  await page.locator('[data-dv=hideLibrary]').click();await page.locator('#dvBackupFile').setInputFiles({name:'broken.divasvideo',mimeType:'application/octet-stream',buffer:Buffer.from('broken')});await page.waitForFunction(()=>document.getElementById('dvMessage').classList.contains('dv-error'));assert.equal(await page.locator('.dv-scene').count(),0);console.log('PASS invalid backup rejected without replacing the project');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exit(1);});

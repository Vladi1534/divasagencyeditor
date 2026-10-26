'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
const types = { '.html':'text/html', '.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.json':'application/json', '.wasm':'application/wasm', '.png':'image/png' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(output, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(output + path.sep)) throw new Error('Outside build');
    const bytes = await fs.readFile(file);
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    for (const name of ['assets/divas-video-mobile.js','assets/divas-video-mobile.css','assets/divas-flyer-layouts.js','assets/app-logos/salsa.png','assets/app-logos/cafe.png','assets/app-logos/buzzcast.png','assets/divas-documents.js', 'assets/divas-documents.css', 'assets/divas-video.js', 'assets/divas-video.css', 'assets/divas-video-export.mjs', 'assets/divas-video-render.mjs', 'assets/vendor/pdfjs/pdf.min.mjs', 'assets/vendor/pdfjs/pdf.worker.min.mjs', 'assets/vendor/mediabunny/mediabunny.min.mjs', 'assets/vendor/pdfjs/wasm/openjpeg.wasm']) {
      const response = await fetch(base + '/' + name + '?deployment-check=1');
      assert.equal(response.status, 200, name);
      assert.ok(response.headers.get('Content-Type').startsWith(types[path.extname(name)]), name);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), await fs.readFile(path.join(root, name)), name);
    }
    for (const name of ['supabase/13-divas-documentos.sql', 'tests/mock-documents.js', 'wrangler.jsonc', '.git/config']) {
      assert.equal((await fetch(base + '/' + name)).status, 404, name);
    }
    browser = await chromium.launch({ ...(process.env.DIVAS_TEST_BROWSER ? {executablePath:process.env.DIVAS_TEST_BROWSER} : {}), args:['--no-sandbox','--disable-dev-shm-usage'] });
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport:{width, height:900} });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.route(/supabase\.(co|in)/, route => route.abort());
      await page.goto(base);
      await page.getByRole('button', {name:'▷ Crear video', exact:true}).click();
      await page.locator('#divasVideoDialog').waitFor({state:'visible'});
      assert.ok(await page.locator('#dvCanvas').isVisible());
      assert.equal(await page.locator('#divasVideoDialog').evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
      await page.locator('[data-dv=close]').click();
      await page.locator('.manual-home-entry').click();
      await page.locator('#accountDialog').waitFor({state:'visible'});
      assert.equal(await page.getByText('Faltan los archivos de la biblioteca.', {exact:false}).count(), 0);
      assert.deepEqual(errors, []);
      await page.close();
      console.log('PASS delivered folder: Video opens, Manuales reaches account, no script errors at ' + width + 'px');
    }
    console.log('PASS runtime files match sources, query strings work, development files excluded');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });

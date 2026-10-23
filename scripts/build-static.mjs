import { cp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'public');
const html = await readFile(join(root, 'index.html'), 'utf8');
const references = [...html.matchAll(/(?:src|href)=["'](assets\/[^"'?#]+)(?:[^"']*)["']/g)].map(match => match[1]);
const required = [...new Set([
  'index.html', 'plantilla-divas.json', ...references,
  'assets/divas-video-export.mjs',
  'assets/vendor/mediabunny/mediabunny.min.mjs',
  'assets/vendor/pdfjs/pdf.min.mjs',
  'assets/vendor/pdfjs/pdf.worker.min.mjs'
])];
for (const name of required) {
  if (!(await stat(join(root, name))).isFile()) throw new Error(`Falta un archivo del editor: ${name}`);
}

// This directory is generated, ignored by Git, and contains only public runtime files.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'plantilla-divas.json', 'assets']) {
  await cp(join(root, name), join(output, name), { recursive: true });
}
for (const name of required) {
  if (!(await stat(join(output, name))).isFile()) throw new Error(`El paquete quedó incompleto: ${name}`);
}
async function countFiles(dir) {
  let count = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    count += entry.isDirectory() ? await countFiles(join(dir, entry.name)) : 1;
  }
  return count;
}
console.log(`Divas: paquete completo en public/ (${await countFiles(output)} archivos). Manuales, PDF y Video incluidos.`);

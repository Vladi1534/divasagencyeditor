/* Divas v38. Local, text-only extraction; document links and scripts never run. */
(() => {
  'use strict';
  const vendor = new URL('./vendor/pdfjs/', document.currentScript.src).href;
  const MAX = 25 * 1024 * 1024;
  let engine;
  const clean = value => String(value || '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  async function pdfEngine() {
    if (!engine) engine = import(vendor + 'pdf.min.mjs').then(pdf => {
      pdf.GlobalWorkerOptions.workerSrc = vendor + 'pdf.worker.min.mjs';
      return pdf;
    }).catch(error => { engine = null; throw new Error('No se pudo abrir el lector PDF. Comprueba la conexión y vuelve a intentarlo.'); });
    return engine;
  }
  function textFromPDF(items) {
    // Keep the PDF's reading order and explicit end-of-line information.
    // Do not infer missing amounts, dates, conditions or table relationships.
    let lines = [], line = '', previous = null;
    for (const item of items) {
      if (typeof item.str !== 'string') continue;
      if (previous && Math.abs(item.transform[5] - previous.transform[5]) > Math.max(3, (item.height || 10) * .6) && line) {
        lines.push(line.trim()); line = '';
      }
      const gap = previous ? item.transform[4] - (previous.transform[4] + previous.width) : 0;
      if (line && !/\s$/.test(line) && !/^\s/.test(item.str) && gap > .3) line += ' ';
      line += item.str;
      if (item.hasEOL) { lines.push(line.trim()); line = ''; previous = null; }
      else previous = item;
    }
    if (line.trim()) lines.push(line.trim());
    return clean(lines.join('\n'));
  }
  function xml(bytes) {
    const raw = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(raw)) throw new Error('Este Word contiene una estructura XML no admitida. Guárdalo como un DOCX nuevo.');
    const doc = new DOMParser().parseFromString(raw, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('No se pudo leer el contenido de Word. Vuelve a guardar el DOCX.');
    return doc;
  }
  const NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const attr = (el, name) => el?.getAttributeNS(NS, name) || '';
  function wordSections(doc, styles) {
    if (doc.documentElement.namespaceURI !== NS || doc.documentElement.localName !== 'document') throw new Error('El archivo no contiene un documento Word compatible.');
    const headingStyles = new Set();
    for (const s of styles?.getElementsByTagNameNS(NS, 'style') || []) {
      const name = attr(s.getElementsByTagNameNS(NS, 'name')[0], 'val');
      if (/heading|título|titulo|title/i.test(name) || s.getElementsByTagNameNS(NS, 'outlineLvl').length) headingStyles.add(attr(s, 'styleId'));
    }
    const paragraphs = [...doc.getElementsByTagNameNS(NS, 'p')];
    if (paragraphs.length > 15000) throw new Error('Este Word tiene demasiados párrafos. Divide el documento por capítulos.');
    const sections = []; let current = {label: 'Inicio', text: ''};
    for (const p of paragraphs) {
      if (p.closest('del')) continue;
      let text = '';
      for (const node of p.getElementsByTagName('*')) {
        if (node.namespaceURI !== NS || node.closest('del')) continue;
        if (node.localName === 't') text += node.textContent;
        if (node.localName === 'tab') text += ' · ';
        if (node.localName === 'br') text += '\n';
      }
      text = clean(text); if (!text) continue;
      const style = attr(p.getElementsByTagNameNS(NS, 'pStyle')[0], 'val');
      const heading = headingStyles.has(style) || /^(Heading|Titulo|Título|Title)[1-6]?$/i.test(style) || p.getElementsByTagNameNS(NS, 'outlineLvl').length;
      if ((heading || current.text.length + text.length > 10000) && current.text) {
        sections.push(current); current = {label: heading ? text.slice(0, 90) : 'Continuación', text: ''};
      } else if (heading) current.label = text.slice(0, 90);
      current.text += (current.text ? '\n\n' : '') + text;
    }
    if (current.text) sections.push(current);
    if (!sections.length) sections.push({label: 'Sin texto', text: ''});
    if (sections.length > 1000) throw new Error('El Word supera las 1000 secciones. Divide el archivo por capítulos.');
    return sections;
  }
  function textSections(text) {
    const parts = text.split(/\n\s*\n/), sections = []; let buffer = '';
    for (const part of parts) {
      if (buffer && buffer.length + part.length > 10000) { sections.push({label: 'Sección ' + (sections.length + 1), text: buffer}); buffer = ''; }
      buffer += (buffer ? '\n\n' : '') + part;
    }
    if (buffer || !sections.length) sections.push({label: 'Sección ' + (sections.length + 1), text: buffer});
    return sections;
  }
  async function parse(file, host, alive = () => {}) {
    const kind = String(file.name || '').split('.').pop().toLowerCase();
    if (kind === 'doc') throw new Error('Ese es un Word antiguo (.doc). Ábrelo en Word y guárdalo como .docx o PDF.');
    if (!['pdf', 'docx', 'txt'].includes(kind)) throw new Error('Elige un PDF, Word (.docx) o texto (.txt).');
    if (!file.size || file.size > MAX) throw new Error('Cada documento puede pesar hasta 25 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer()); alive();
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join(''); alive();
    let pdf = null, task = null, sections = null, labels = null;
    if (kind === 'pdf') {
      if (!new TextDecoder().decode(bytes.subarray(0, 1024)).includes('%PDF-')) throw new Error('El archivo no parece ser un PDF válido.');
      const lib = await pdfEngine(); alive();
      task = lib.getDocument({data: bytes, isEvalSupported: false, enableXfa: false, stopAtErrors: true,
        cMapUrl: vendor + 'cmaps/', cMapPacked: true, standardFontDataUrl: vendor + 'standard_fonts/',
        wasmUrl: vendor + 'wasm/', iccUrl: vendor + 'iccs/', maxImageSize: 24000000});
      try { pdf = await task.promise; alive(); }
      catch (e) {
        await task.destroy();
        if (e.name === 'PasswordException') throw new Error('Este PDF está protegido con contraseña. Guarda una copia sin contraseña para usarla en el editor.');
        throw e;
      }
      if (pdf.numPages > 1000) { await task.destroy(); throw new Error('El PDF supera las 1000 páginas. Divídelo por capítulos.'); }
      try { labels = await pdf.getPageLabels(); } catch {}
    } else if (kind === 'docx') {
      const zip = await host.archive(file, {manifest: false}); alive();
      if (!zip.has('[Content_Types].xml') || !zip.has('word/document.xml') || zip.has('word/vbaProject.bin')) throw new Error('Elige un Word .docx sin macros.');
      const doc = xml(await zip.read('word/document.xml', 8 * 1024 * 1024));
      const styles = zip.has('word/styles.xml') ? xml(await zip.read('word/styles.xml', 1024 * 1024)) : null;
      sections = wordSections(doc, styles); alive();
    } else {
      if (file.size > 1024 * 1024) throw new Error('El texto puede pesar hasta 1 MB. Divide el contenido en varios archivos.');
      let text;
      try { text = new TextDecoder(bytes[0] === 255 && bytes[1] === 254 ? 'utf-16le' : bytes[0] === 254 && bytes[1] === 255 ? 'utf-16be' : 'utf-8', {fatal: true}).decode(bytes); }
      catch { throw new Error('Guarda el archivo de texto con codificación UTF-8 e inténtalo de nuevo.'); }
      if (text.includes('\0')) throw new Error('Este archivo no contiene texto legible.');
      sections = textSections(clean(text));
    }
    let destroyed = false;
    return {kind, hash, count: pdf ? pdf.numPages : sections.length, labels, sections,
      async unit(index) {
        if (destroyed) throw new Error('Vuelve a abrir el documento.');
        if (!Number.isInteger(index) || index < 1 || index > (pdf ? pdf.numPages : sections.length)) throw new Error('Elige una página o sección válida.');
        if (!pdf) return {text: sections[index - 1].text, label: sections[index - 1].label};
        const page = await pdf.getPage(index), content = await page.getTextContent(); alive();
        return {text: textFromPDF(content.items), label: labels?.[index - 1] || String(index), page};
      },
      async close() { destroyed = true; if (task) await task.destroy(); }
    };
  }
  function paginate(text, limit) {
    // A continuous series retains every word. No generative summary or silent truncation.
    const words = clean(text).match(/\S+\s*/g) || [], pages = []; let page = '';
    for (const word of words) {
      if (page && (page.length + word.trimEnd().length > limit)) { pages.push(page.trim()); page = ''; }
      page += word;
    }
    if (page) pages.push(page.trim());
    return pages.length ? pages : [''];
  }
  window.DivasDocumentReader = {parse, paginate, clean, textFromPDF, wordSections, MAX};
})();

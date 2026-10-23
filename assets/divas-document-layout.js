/* Editable, bounded educational compositions. All copy comes from the chosen document. */
(() => {
  'use strict';
  const THEMES = {
    oro: {name: 'Oro nocturno', a: '#180e22', b: '#462342', ink: '#fff4fa', accent: '#eccb8b', light: '#ed80bb', dark: true},
    perla: {name: 'Rosa perla', a: '#fff4f9', b: '#eccfdf', ink: '#492139', accent: '#9b4270', light: '#ed94be', dark: false},
    glow: {name: 'Rosa glow', a: '#210d30', b: '#551b55', ink: '#fff3fc', accent: '#ffa8d9', light: '#ff4bab', dark: true}
  };
  function sourceMeta(value) {
    if (!value || value.version !== 1 || !/^[0-9a-f-]{36}$/i.test(value.documentId || '')) return null;
    return {version: 1, documentId: value.documentId,
      title: String(value.title || '').slice(0, 120), sha256: /^[a-f0-9]{64}$/.test(value.sha256 || '') ? value.sha256 : '',
      kind: ['pdf', 'docx', 'txt'].includes(value.kind) ? value.kind : 'pdf',
      unit: Math.min(1000, Math.max(1, Math.floor(Number(value.unit) || 1))),
      part: Math.min(12, Math.max(1, Math.floor(Number(value.part) || 1))),
      parts: Math.min(12, Math.max(1, Math.floor(Number(value.parts) || 1))),
      excerpt: String(value.excerpt || '').slice(0, 12000),
      edited: value.edited === true};
  }
  function build(host, input, asset, part, total) {
    const pal = THEMES[input.theme] || THEMES.oro, d = host.empty();
    d.lienzo = {...host.formats[input.format]}; d.asistente = {objetivo: 'libre', estilo: 'rosa'};
    const W = d.lienzo.ancho, H = d.lienzo.alto, u = Math.min(W, H) / 1080, wide = W > H * 1.2, banner = W / H > 3;
    const titleFont = host.fonts[input.theme === 'glow' ? 'Anton' : 'DM Serif Display'], bodyFont = host.fonts['TikTok Sans'];
    d.fuentes = [titleFont, bodyFont].map(f => ({...f}));
    d.proyecto = {nombre: (input.title + (total > 1 ? ' · ' + part + ' de ' + total : '')).slice(0, 80)};
    d.fuenteManual = sourceMeta({...input.source, part, parts: total, excerpt: input.body});
    d.fondo = {tipo: asset.background ? 'imagen' : 'degradado', color1: pal.a, color2: pal.b, angulo: 125, transparente: false};
    const add = (type, options) => { const p = host.layer(type, options); d.capas.push(p); return p; };
    const image = (source, name, role, box, extra = {}) => {
      const f = Math.min(box.w / source.w, box.h / source.h);
      return add('imagen', {nombre: name, rol: role, src: source.src, original: source.src,
        x: box.x, y: box.y, w: source.w * f, h: source.h * f, ...extra});
    };
    if (asset.background) {
      const bg = add('imagen', {nombre: asset.background.name, rol: 'fondo', src: asset.background.src, original: asset.background.src,
        w: asset.background.w, h: asset.background.h, decorativa: true, bloqueado: true, ajusteFondo: 'cubrir'});
      host.cover(bg, d.lienzo, 'cubrir');
      add('rectangulo', {nombre: 'Velo suave del fondo', decorativa: true, x: W/2, y: H/2, w: W, h: H, color: pal.a, radio: 0, opacidad: .25});
      add('rectangulo', {nombre: 'Base de lectura', decorativa: true, x: W/2, y: H*.51, w: W*.89, h: H*.76, color: pal.a, radio: 3, opacidad: .97});
    }
    add('luz', {nombre: 'Luz rosa ambiental', decorativa: true, x: W*.95, y: H*.2, w: W*.9, h: H*.85, color: pal.light, opacidad: pal.dark ? .27 : .18});
    add('luz', {nombre: 'Reflejo de oro', decorativa: true, x: W*.05, y: H*.98, w: W*.8, h: H*.55, color: pal.accent, opacidad: .14});
    add('marco', {nombre: 'Borde editorial', decorativa: true, x: W*.5, y: H*.5, w: W*.94, h: H*.94, radio: 2, color: pal.accent, grosor: 1.2*u, opacidad: .4});
    const type = (name, role, text, box, size, extra = {}) => {
      if (!text) return null;
      const p = host.layer('texto', {nombre: name, rol: role, texto: text, fuente: bodyFont.nombre, peso: '500', color: pal.ink, ...extra});
      host.fit(p, box, size*u, {align: extra.alineacion || 'left'}); d.capas.push(p); return p;
    };
    const logoBox = banner ? {x: W*.88, y: H*.17, w: W*.16, h: H*.20} : {x: W*.80, y: H*.09, w: W*.25, h: H*.095};
    if (input.logo && asset.logo) image(asset.logo, 'Logo oficial de la agencia', 'logo', logoBox);
    if (input.watermark && asset.logo) image(asset.logo, 'Marca de agua · logo oficial', 'manual_marca_agua',
      {x: W*.77, y: H*.86, w: W*.30, h: H*.16}, {opacidad: .075, decorativa: true, bloqueado: true});
    type('Tema de la capacitación', 'manual_tema', input.topic || 'CAPACITACIÓN',
      {x: W*.30, y: H*(banner ? .14 : .09), w: W*.44, h: H*(banner ? .10 : .04)}, banner ? 36 : 25,
      {color: pal.accent, peso: '700', espaciado: 2.2*u});
    let titleBox, bodyBox;
    if (wide) {
      titleBox = {x: W*.27, y: H*.46, w: W*.39, h: H*(banner ? .45 : .49)};
      bodyBox = {x: W*.73, y: H*.52, w: W*.39, h: H*(banner ? .44 : .53)};
      add('rectangulo', {nombre: 'Divisor editorial', decorativa: true, x: W*.5, y: H*.51, w: Math.max(1.5, 2*u), h: H*.57, radio: 0, color: pal.accent, opacidad: .48});
    } else {
      titleBox = {x: W*.5, y: H*.285, w: W*.83, h: H*.235};
      bodyBox = {x: W*.5, y: H*.655, w: W*.79, h: H*(H>W*1.2 ? .35 : .34)};
      add('rectangulo', {nombre: 'Acento bajo el título', decorativa: true, x: W*.19, y: H*.435, w: W*.20, h: 3*u, color: pal.accent, radio: 0});
      add('estrella', {nombre: 'Destello de acento', decorativa: true, x: W*.88, y: H*.435, w: 25*u, h: 25*u, color: pal.accent});
    }
    const title = type('Título de la capacitación', 'titulo', input.title, titleBox, banner ? 145 : 123,
      {fuente: titleFont.nombre, peso: '400', color: pal.dark ? pal.accent : pal.ink});
    if (input.theme === 'oro') { host.look(title, 'oroGlow'); title.glow = 12; title.glowRadio = 10*u; title.profundidadTexto = 20; title.contornoTexto = 0; }
    else if (input.theme === 'glow') { title.glow = 24; title.glowRadio = 18*u; title.glowColor = pal.light; title.color = '#fff1fb'; }
    host.fit(title, titleBox, (banner ? 145 : 123)*u, {align: 'left'});
    const body = type('Información del manual', 'descripcion', input.body, bodyBox, banner ? 70 : H > W*1.2 ? 48 : 40);
    if (body) {
      body.interlineado = 1.26;host.fit(body, bodyBox, (banner ? 70 : H > W*1.2 ? 48 : 40)*u, {align: 'left'});
      const metrics=host.measure(body);body.y=bodyBox.y-bodyBox.h/2+metrics.height/2;body.h=metrics.height+metrics.pad*2;
    }
    const source = input.source;
    const label = input.citation ? (source.kind === 'pdf' ? 'Manual · pág. ' : 'Manual · sección ') + source.unit : '';
    type('Referencia del manual', 'manual_referencia', label, {x: W*.31, y: H*.925, w: W*.46, h: H*.035}, banner ? 30 : 22, {color: pal.dark ? '#dbc6d7' : '#755568'});
    type('Número del flyer', 'manual_numero', total > 1 ? String(part).padStart(2,'0')+' / '+String(total).padStart(2,'0') : '',
      {x: W*.80, y: H*.925, w: W*.24, h: H*.035}, banner ? 30 : 20, {color: pal.accent, alineacion: 'right', espaciado: 1.2*u});
    return host.normalize(d);
  }
  window.DivasDocumentLayout = {THEMES, sourceMeta, build};
})();

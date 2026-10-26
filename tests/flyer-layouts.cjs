const assert=require('node:assert/strict'),L=require('../assets/divas-flyer-layouts.js');
const formats=[{ancho:1080,alto:1080},{ancho:1080,alto:1920},{ancho:1920,alto:1080},{ancho:1428,alto:400}];let checks=0;
function overlap(a,b){return Math.min(a.x+a.w/2,b.x+b.w/2)-Math.max(a.x-a.w/2,b.x-b.w/2)>.01&&Math.min(a.y+a.h/2,b.y+b.h/2)-Math.max(a.y-a.h/2,b.y-b.h/2)>.01;}
for(const size of formats)for(const key of Object.keys(L.families)){
 const p=L.plan(size,key,3),main=['logo','titulo','idea_fecha','descripcion','accion','contacto',...L.apps.map(a=>a.role)];
 for(const role of main){const b=p[role];assert.ok(b.w>0&&b.h>0,role);assert.ok(b.x-b.w/2>=0&&b.x+b.w/2<=size.ancho+.01&&b.y-b.h/2>=0&&b.y+b.h/2<=size.alto+.01,`${key}/${role} inside`);}
 for(let i=0;i<main.length;i++)for(let j=i+1;j<main.length;j++)assert.ok(!overlap(p[main[i]],p[main[j]]),`${key} ${size.ancho}/${size.alto}: ${main[i]} overlaps ${main[j]}`);
 assert.equal(p.images.length,3);checks++;
}
assert.equal(new Set(Object.keys(L.families).map(k=>JSON.stringify(L.plan(formats[0],k)))).size,6);
console.log('PASS',checks,'responsive plans, three separate app logos, safe bounds, non-overlapping reading areas and six distinct layouts');

import assert from 'node:assert/strict';
import {processPixels} from '../assets/divas-video-render.mjs';
import M from '../assets/divas-video-model.js';
const w=120,h=100,source=new Uint8ClampedArray(w*h*4).fill(255);
// Solid gold enclosure with a white highlight inside: identical RGB to the outside.
for(let y=20;y<80;y++)for(let x=30;x<90;x++){const i=(y*w+x)*4;source[i]=195;source[i+1]=132;source[i+2]=27;}
for(let y=40;y<60;y++)for(let x=50;x<70;x++){const i=(y*w+x)*4;source[i]=source[i+1]=source[i+2]=255;}
const key={enabled:true,color:'#ffffff',tolerance:.08,softness:.035,spill:.65,scope:'exterior'};
const outside=source.slice();processPixels(outside,key,{}, {width:w,height:h});
assert.equal(outside[3],0);assert.equal(outside[(50*w+60)*4+3],255);assert.deepEqual([...outside.slice((50*w+60)*4,(50*w+60)*4+4)],[255,255,255,255]);
assert.deepEqual([...outside.slice((25*w+35)*4,(25*w+35)*4+4)],[195,132,27,255]);
const global=source.slice();processPixels(global,{...key,scope:'all'}, {},{width:w,height:h});assert.equal(global[(50*w+60)*4+3],0);
const disabled=source.slice();processPixels(disabled,{...key,enabled:false},{},{width:w,height:h});assert.deepEqual(disabled,source);
// A gap really connected to the outside remains removable; no per-frame history leaks.
const open=source.slice();for(let y=0;y<50;y++){const n=(y*w+60)*4;open[n]=open[n+1]=open[n+2]=255;}processPixels(open,key,{},{width:w,height:h});assert.equal(open[(50*w+60)*4+3],0);
const a={id:'a',kind:'image',type:'image/png',size:100,width:w,height:h,name:'Logo'},p=M.blank();p.scenes=[M.scene(a)];p.scenes[0].keyer=key;assert.deepEqual(M.normalize(p,[a]).scenes[0].keyer,key);delete p.scenes[0].keyer.scope;assert.equal(M.normalize(p,[a]).scenes[0].keyer.scope,'all');
console.log('PASS exterior removal preserves enclosed white/gold, chroma removes all matching pixels, open connectivity, original alpha, saved scope and legacy compatibility');

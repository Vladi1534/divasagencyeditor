import assert from 'node:assert/strict';
import {processPixels,detectColor} from '../assets/divas-video-render.mjs';
const effect={enabled:true,color:'#00ff00',tolerance:.18,softness:.08,spill:.5};
const green=new Uint8ClampedArray([0,255,0,255,240,0,0,255,0,0,255,123]);processPixels(green,effect);assert.equal(green[3],0);assert.equal(green[7],255);assert.equal(green[11],123);
const white=new Uint8ClampedArray([255,255,255,255,0,0,0,255,200,0,0,255]);processPixels(white,{...effect,color:'#ffffff'});assert.equal(white[3],0);assert.equal(white[7],255);assert.equal(white[11],255);
const original=new Uint8ClampedArray([25,45,240,70]);const disabled=original.slice();processPixels(disabled,{...effect,enabled:false},{brightness:0,contrast:0,saturation:0});assert.deepEqual(disabled,original);
const data=new Uint8ClampedArray(40*40*4);for(let i=0;i<data.length;i+=4){data[i+1]=250;data[i+3]=255;}for(let y=10;y<30;y++)for(let x=10;x<30;x++){const i=(y*40+x)*4;data[i]=255;data[i+1]=0;}
assert.equal(detectColor(data,40,40),'#00fa00');assert.equal(detectColor(new Uint8ClampedArray(40*40*4),40,40),null);
const edges=new Uint8ClampedArray([0,255,0,255,16,235,16,255,70,185,70,255,180,60,180,255]);processPixels(edges,effect);assert.ok(edges[3]<=edges[7]&&edges[7]<=edges[11]&&edges[11]<=edges[15]);
console.log('PASS green/white removal, subject and original alpha preservation, neutral effects, border detection and feathering');

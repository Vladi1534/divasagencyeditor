'use strict';
const assert=require('node:assert/strict');
const M=require('../assets/divas-video-model.js');
const image={id:'image-1',kind:'image',type:'image/png',size:2048,width:1080,height:1080,name:'Flyer'};
const video={id:'video-1',kind:'video',type:'video/mp4',size:4096,width:1080,height:1920,duration:10,name:'Clip'};
const audio={id:'audio-1',kind:'audio',type:'audio/wav',size:4096,duration:20,name:'Música'};
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS',name);}
test('Splitting a trimmed video preserves source range and timeline duration',()=>{
 const p=M.blank(),c=M.scene(video);c.in=2;c.out=8;p.scenes=[c];const newId=M.split(p,c.id,2.5);
 assert.equal(M.total(p),6);assert.deepEqual(p.scenes.map(s=>[s.in,s.out]),[[2,4.5],[4.5,8]]);assert.equal(p.scenes[1].id,newId);
 assert.equal(M.at(p,2.499).scene.id,c.id);assert.equal(M.at(p,2.5).scene.id,newId);
});
test('Image splits preserve time and cannot be made at an edge',()=>{
 const p=M.blank();p.scenes=[M.scene(image)];assert.throws(()=>M.split(p,p.scenes[0].id,.1));M.split(p,p.scenes[0].id,2);assert.deepEqual(p.scenes.map(M.duration),[2,3]);
});
test('Backups with missing, duplicate, unsupported or oversized assets are rejected',()=>{
 const p=M.blank();p.scenes=[M.scene(video)];assert.throws(()=>M.normalize(p,[]));assert.throws(()=>M.normalize(p,[video,video]));assert.throws(()=>M.normalize(p,[{...video,type:'text/html'}]));assert.throws(()=>M.normalize(p,[{...video,size:81*1024*1024}]));
});
test('Three-minute and 30-scene limits apply when loading and duplicating',()=>{
 const p=M.blank(),s=M.scene(image);s.duration=60;p.scenes=[s,{...s,id:'b'},{...s,id:'c'}];assert.equal(M.total(M.normalize(p,[image])),180);p.scenes.push({...s,id:'d'});assert.throws(()=>M.normalize(p,[image]));p.scenes=Array.from({length:31},()=>M.scene(image));assert.throws(()=>M.normalize(p,[image]));
});
test('Project round trip retains visual, trim, title and music settings',()=>{
 const p=M.blank();p.name='Evento Divas';p.ratio='16:9';p.quality=1080;const c=M.scene(video);Object.assign(c,{in:1.25,out:4.75,title:'¡Bienvenidas! 🌸',fit:'cover',motion:'zoom',volume:.4,titleColor:'#ed86b8'});p.scenes=[c];p.music={assetId:audio.id,offset:3,volume:.2,loop:true};const r=M.normalize(JSON.parse(JSON.stringify(p)),[video,audio]);assert.deepEqual(r,p);
});
test('Image normalization keeps finite trim numbers and clamps presentation settings',()=>{
 const p=M.blank(),c=M.scene(image);c.titleSize=900;c.titleColor='url(javascript:alert(1))';p.scenes=[c];const r=M.normalize(p,[image]);assert.equal(r.scenes[0].titleSize,12);assert.equal(r.scenes[0].titleColor,'#ffffff');assert.ok(Number.isFinite(r.scenes[0].in));
});
console.log(`${checks} behavior checks passed.`);

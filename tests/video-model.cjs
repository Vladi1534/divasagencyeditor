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
 const p=M.blank(),c=M.scene(image);c.titleSize=900;c.titleColor='url(javascript:alert(1))';p.scenes=[c];const r=M.normalize(p,[image]);assert.equal(r.scenes[0].titleSize,30);assert.equal(r.scenes[0].titleColor,'#ffffff');assert.ok(Number.isFinite(r.scenes[0].in));
});


test('Legacy projects migrate with safe effect defaults and unchanged timing',()=>{
 const raw={format:'divas-video-1',id:'legacy',name:'Anterior',ratio:'1:1',scenes:[{...M.scene(video),in:2,out:6}],music:null,quality:720};
 delete raw.scenes[0].keyer;delete raw.scenes[0].transform;delete raw.scenes[0].animation;
 const p=M.normalize(raw,[video]);assert.equal(p.format,'divas-video-2');assert.equal(M.total(p),4);assert.equal(p.scenes[0].keyer.enabled,false);assert.equal(p.scenes[0].transform.opacity,1);assert.deepEqual(p.layers,[]);
});
test('Independent layers extend duration and can reuse a source at different times',()=>{
 const p=M.blank();p.scenes=[M.scene(image)];const a=M.layer(video,2),b=M.layer(video,7);a.in=3;a.out=5;b.in=0;b.out=2;p.layers=[a,b];const r=M.normalize(p,[image,video]);assert.equal(M.total(r),9);assert.equal(M.active(r,2.5).length,2);assert.equal(M.active(r,6).length,0);assert.equal(M.active(r,8)[0].scene.in,0);
});
test('Layer backups retain keying, independent text, poses and audio envelopes',()=>{
 const p=M.blank(),c=M.layer(video,1);c.keyer={enabled:true,color:'#00ff00',tolerance:.2,softness:.05,spill:.7,scope:'exterior'};c.animation.enabled=true;c.animation.end.x=.8;c.transform.opacity=.65;p.layers=[c,M.textLayer(2)];p.audio=[M.audioLayer(audio,3)];p.visualOrder=M.stackOrder(p);const r=M.normalize(p,[video,audio]);assert.deepEqual(r,p);assert.equal(M.animatedPose(c,0).x,.5);assert.equal(M.animatedPose(c,1).x,.8);assert.equal(M.envelope(p.audio[0],0),0);
});
test('Limits apply to overlays and concurrent video decoders',()=>{
 const p=M.blank();p.layers=Array.from({length:5},()=>M.layer(video));assert.throws(()=>M.normalize(p,[video]),/4 clips/);p.layers=Array.from({length:13},()=>M.textLayer());assert.throws(()=>M.normalize(p,[]),/12 capas/);p.layers=[M.layer(video,179)];assert.throws(()=>M.normalize(p,[video]),/3 minutos/);
});
test('Splitting animated overlays preserves times and creates independent settings',()=>{
 const p=M.blank(),c=M.layer(video,2);c.in=1;c.out=5;c.animation.enabled=true;c.animation.end.x=.8;c.keyer.enabled=true;p.layers=[c];M.split(p,c.id,4);assert.deepEqual(p.layers.map(c=>[c.start,c.in,c.out]),[[2,1,3],[4,3,5]]);assert.equal(p.layers[0].animation.end.x,p.layers[1].transform.x);p.layers[0].keyer.tolerance=.6;assert.notEqual(p.layers[1].keyer.tolerance,.6);
});
test('Visual order places overlays behind base without changing their times',()=>{
 const p=M.blank(),base=M.scene(video),a=M.layer(image,1),b=M.textLayer(2);p.scenes=[base];p.layers=[a,b];const legacy=M.normalize(p,[video,image]);assert.deepEqual(M.active(legacy,3).map(r=>r.scene.id),[base.id,a.id,b.id]);
 p.visualOrder=[a.id,'base',b.id];const r=M.normalize(p,[video,image]);assert.deepEqual(M.active(r,3).map(x=>x.scene.id),[a.id,base.id,b.id]);assert.deepEqual(r.layers.map(c=>c.start),[1,2]);assert.deepEqual(M.normalize(JSON.parse(JSON.stringify(r)),[video,image]),r);
 r.visualOrder=['invalid',a.id,a.id,'base'];assert.deepEqual(M.stackOrder(r),[a.id,'base',b.id]);
});
test('Splitting a layer behind base preserves its stacking position',()=>{
 const p=M.blank(),a=M.layer(video,1);a.out=4;p.scenes=[M.scene(image)];p.layers=[a];p.visualOrder=[a.id,'base'];const right=M.split(p,a.id,3);assert.deepEqual(M.stackOrder(p),[a.id,right,'base']);
});
test('A sequential photo becomes a simultaneous layer without replacing its media or edits',()=>{
 const p=M.blank(),v=M.scene(video),c=M.scene(image);c.keyer.enabled=true;c.transform.x=.7;c.title='Gala';p.scenes=[v,c];
 M.toLayer(p,c.id,{start:1,before:'base'});assert.deepEqual(p.scenes,[v]);assert.equal(p.layers[0],c);assert.equal(c.assetId,image.id);assert.equal(c.start,1);assert.equal(c.transform.x,.7);assert.equal(c.keyer.enabled,true);assert.deepEqual(M.stackOrder(p),['base',c.id]);
 M.toSequence(p,c.id,0);assert.deepEqual(p.scenes,[c,v]);assert.deepEqual(p.layers,[]);assert.ok(!Object.hasOwn(c,'start'));assert.deepEqual(M.stackOrder(p),['base']);
});
test('A photo used as background spans other tracks, including long projects',()=>{
 const p=M.blank(),v=M.scene(video),c=M.scene(image);p.scenes=[v,c];const t=M.textLayer(80);t.duration=5;p.layers=[t];
 M.asBackground(p,c.id);assert.equal(c.start,0);assert.equal(c.duration,85);assert.equal(c.fit,'adaptive');assert.equal(c.transition,'cut');assert.deepEqual(M.stackOrder(p),[c.id,'base',t.id]);assert.equal(M.normalize(p,[video,image]).layers.find(x=>x.id===c.id).duration,85);
 const alone=M.blank(),one=M.scene(image);one.duration=12;alone.scenes=[one];M.asBackground(alone,one.id);assert.equal(M.total(alone),12);
});
test('Conversions reject locked clips and track limits before removing anything',()=>{
 const p=M.blank(),c=M.scene(image);p.scenes=[c];c.locked=true;assert.throws(()=>M.toLayer(p,c.id));assert.equal(p.scenes.length,1);c.locked=false;p.layers=Array.from({length:12},()=>M.textLayer());assert.throws(()=>M.toLayer(p,c.id));assert.equal(p.scenes.length,1);
 p.layers=[M.layer(image)];p.scenes=Array.from({length:30},()=>M.scene(image));assert.throws(()=>M.toSequence(p,p.layers[0].id));assert.equal(p.layers.length,1);assert.throws(()=>M.toSequence(p,M.textLayer().id));
});
test('Automatic ratio adaptation preserves manual placement and transparent logos',()=>{
 const opaque={...image,hasAlpha:false},logo={...image,id:'logo',hasAlpha:true},p=M.blank();const untouched=M.scene(opaque),manual=M.scene(opaque),transparent=M.scene(logo);manual.transform.x=.7;p.scenes=[untouched,manual,transparent];
 M.changeRatio(p,'16:9',[opaque,logo]);assert.equal(p.ratio,'16:9');assert.deepEqual(p.scenes.map(c=>c.fit),['adaptive','contain','contain']);assert.equal(manual.transform.x,.7);
 manual.transform.opacity=.5;manual.animation.enabled=true;M.frame(manual,'adaptive');assert.equal(manual.transform.x,.5);assert.equal(manual.transform.opacity,.5);assert.equal(manual.animation.enabled,false);const round=M.normalize(p,[opaque,logo]);assert.equal(round.scenes[0].fit,'adaptive');
});
test('Timeline moves snap to neighboring starts and ends without snapping to themselves',()=>{
 const p=M.blank(),base=M.scene(video),c=M.layer(image,2);p.scenes=[base];p.layers=[c];assert.equal(M.snapTime(p,c.id,9.92),10);assert.equal(M.snapTime(p,c.id,.1),0);assert.equal(M.snapTime(p,c.id,2.07),2.07);assert.equal(M.snapTime(p,c.id,-4),0);
});
console.log(`${checks} behavior checks passed.`);

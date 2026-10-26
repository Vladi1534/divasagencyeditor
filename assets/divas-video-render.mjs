/* One renderer for preview and export. Effects never overwrite the source media. */
export const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export function keyDistance(r,g,b,key){
 const y=r*.299+g*.587+b*.114,ky=key[0]*.299+key[1]*.587+key[2]*.114;
 if(Math.max(...key)-Math.min(...key)<.12)return Math.hypot(r-key[0],g-key[1],b-key[2])/Math.sqrt(3);
 return Math.sqrt(((b-y-key[2]+ky)**2+(r-y-key[0]+ky)**2)*2+(y-ky)**2*.08);
}
export function processPixels(data,keyer,adjust={}){
 const key=rgb(keyer.color),dominant=key.indexOf(Math.max(...key)),colored=Math.max(...key)-Math.min(...key)>.12;
 for(let i=0;i<data.length;i+=4){let c=[data[i]/255,data[i+1]/255,data[i+2]/255];
  if(keyer.enabled){const distance=keyDistance(...c,key),alpha=smooth(keyer.tolerance,keyer.tolerance+keyer.softness,distance);data[i+3]*=alpha;
   if(colored){const other=(c[(dominant+1)%3]+c[(dominant+2)%3])/2,weight=(1-smooth(keyer.tolerance,keyer.tolerance+keyer.softness*3,distance))*keyer.spill;c[dominant]-=Math.max(0,c[dominant]-other)*weight;}}
  const gray=c[0]*.2126+c[1]*.7152+c[2]*.0722;
  c=c.map(v=>((gray+(v-gray)*(1+(adjust.saturation||0))-.5)*(1+(adjust.contrast||0))+.5)+(adjust.brightness||0));
  for(let j=0;j<3;j++)data[i+j]=Math.round(clamp(c[j])*255);
 }
 return data;
}
export function detectColor(data,w,h){
 const samples=[];for(let i=1;i<20;i++){const x=Math.floor(w*i/20),y=Math.floor(h*i/20);for(const [px,py] of [[x,Math.max(0,Math.floor(h*.02))],[x,Math.min(h-1,Math.floor(h*.98))],[Math.floor(w*.02),y],[Math.min(w-1,Math.floor(w*.98)),y]]){const n=(py*w+px)*4;if(data[n+3]>200)samples.push([data[n],data[n+1],data[n+2]]);}}
 if(samples.length<20)return null;
 let best=[];for(const s of samples){const near=samples.filter(c=>Math.hypot(...c.map((v,j)=>v-s[j]))<45);if(near.length>best.length)best=near;}
 if(best.length/samples.length<.55)return null;
 return '#'+[0,1,2].map(j=>Math.round(best.reduce((n,c)=>n+c[j],0)/best.length).toString(16).padStart(2,'0')).join('');
}
class Effects {
 constructor(){this.canvas=document.createElement('canvas');this.fallback=document.createElement('canvas');this.gl=null;try{this.init();}catch{this.gl=null;}}
 init(){
  const gl=this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false});if(!gl)return;
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const vs=shader(gl.VERTEX_SHADER,'attribute vec2 p; varying vec2 uv; void main(){uv=(p+1.0)/2.0; gl_Position=vec4(p,0.0,1.0);}');
  const fs=shader(gl.FRAGMENT_SHADER,`precision mediump float; varying vec2 uv; uniform sampler2D tex; uniform vec3 key; uniform vec4 cut; uniform vec3 adj;
   void main(){vec4 c=texture2D(tex,uv); if(cut.x>0.0){float y=dot(c.rgb,vec3(.299,.587,.114));float ky=dot(key,vec3(.299,.587,.114));float sat=max(max(key.r,key.g),key.b)-min(min(key.r,key.g),key.b);float d;
    if(sat<.12){d=length(c.rgb-key)/1.7320508;}else{vec2 delta=vec2(c.b-y-key.b+ky,c.r-y-key.r+ky);d=sqrt(dot(delta,delta)*2.0+(y-ky)*(y-ky)*.08);}
    c.a*=smoothstep(cut.y,cut.y+cut.z,d);float spill=(1.0-smoothstep(cut.y,cut.y+cut.z*3.0,d))*cut.w;
    if(sat>=.12){if(key.g>=key.r&&key.g>=key.b)c.g-=max(0.0,c.g-(c.r+c.b)*.5)*spill;else if(key.r>=key.b)c.r-=max(0.0,c.r-(c.g+c.b)*.5)*spill;else c.b-=max(0.0,c.b-(c.r+c.g)*.5)*spill;}}
    float gray=dot(c.rgb,vec3(.2126,.7152,.0722));c.rgb=mix(vec3(gray),c.rgb,1.0+adj.z);c.rgb=(c.rgb-.5)*(1.0+adj.y)+.5+adj.x;gl_FragColor=vec4(clamp(c.rgb,0.0,1.0),c.a);}`);
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('No WebGL effects');gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
  this.locations=Object.fromEntries(['key','cut','adj'].map(n=>[n,gl.getUniformLocation(program,n)]));this.gl=gl;
 }
 apply(source,c,w,h){
  const k=c.keyer,f=c.adjust;if(!k.enabled&&!f.brightness&&!f.contrast&&!f.saturation)return source;
  const sw=source.videoWidth||source.naturalWidth||source.width,sh=source.videoHeight||source.naturalHeight||source.height;
  const factor=Math.min(1,Math.max(w/sw,h/sh));w=Math.max(1,Math.round(sw*factor));h=Math.max(1,Math.round(sh*factor));
  if(this.gl&&!this.gl.isContextLost()){
   const gl=this.gl;if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}gl.viewport(0,0,w,h);gl.uniform3fv(this.locations.key,rgb(k.color));gl.uniform4f(this.locations.cut,k.enabled?1:0,k.tolerance,k.softness,k.spill);gl.uniform3f(this.locations.adj,f.brightness,f.contrast,f.saturation);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return this.canvas;
  }
  const canvas=this.fallback;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const x=canvas.getContext('2d',{willReadFrequently:true});x.clearRect(0,0,w,h);x.drawImage(source,0,0,w,h);const image=x.getImageData(0,0,w,h);processPixels(image.data,k,f);x.putImageData(image,0,0);return canvas;
 }
}
export function lines(ctx,text,width){const out=[];for(const para of text.split('\n')){let line='';for(const word of para.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width<=width){line=next;continue;}if(line)out.push(line);line='';for(const ch of word){if(ctx.measureText(line+ch).width>width&&line){out.push(line);line='';}line+=ch;}}out.push(line);}return out;}
export class Renderer {
 constructor(model,canvas){this.M=model;this.canvas=canvas;this.effects=new Effects();this.bounds=new Map();this.raw=document.createElement('canvas');}
 sourceCanvas(source,max=320){const w=source.videoWidth||source.naturalWidth||source.width,h=source.videoHeight||source.naturalHeight||source.height,f=Math.min(1,max/Math.max(w,h));this.raw.width=Math.max(1,Math.round(w*f));this.raw.height=Math.max(1,Math.round(h*f));this.raw.getContext('2d',{willReadFrequently:true}).drawImage(source,0,0,this.raw.width,this.raw.height);return this.raw;}
 geometry(c,a,t){const {width:w,height:h}=this.canvas,pose=this.M.animatedPose(c,t);let scale=c.fit==='cover'?Math.max(w/a.width,h/a.height):Math.min(w/a.width,h/a.height);scale*=pose.scale;if(c.motion==='zoom')scale*=1+t*.08;if(c.motion==='pan')scale*=1.06;return {x:pose.x*w+(c.motion==='pan'?(t-.5)*w*.05:0),y:pose.y*h,width:a.width*scale,height:a.height*scale,angle:pose.rotation*Math.PI/180,opacity:pose.opacity,scale:pose.scale,...(c.fit==='adaptive'?{width:w*pose.scale*(c.motion==='zoom'?1+t*.08:c.motion==='pan'?1.06:1),height:h*pose.scale*(c.motion==='zoom'?1+t*.08:c.motion==='pan'?1.06:1)}:{})};}
 adaptive(x,image,c,g,original=false){
  const iw=image.videoWidth||image.naturalWidth||image.width,ih=image.videoHeight||image.naturalHeight||image.height;
  const sw=240,sh=Math.max(1,Math.round(sw*g.height/g.width));
  const cache=this.softCache||(this.softCache=new Map()),key=c.id+':'+sw+':'+sh+':'+JSON.stringify([c.keyer,c.adjust,original]);
  let soft=c.kind==='image'?cache.get(key):null;
  if(!soft){soft=document.createElement('canvas');soft.width=sw;soft.height=sh;const bx=soft.getContext('2d'),scale=Math.max(sw/iw,sh/ih)*1.2;
   bx.filter='blur(9px)';bx.drawImage(image,(sw-iw*scale)/2,(sh-ih*scale)/2,iw*scale,ih*scale);bx.filter='none';
   if(c.kind==='image'){if(cache.size>=24)cache.delete(cache.keys().next().value);cache.set(key,soft);}
  }
  const frame=this.framed||(this.framed=document.createElement('canvas'));frame.width=this.canvas.width;frame.height=this.canvas.height;const fx=frame.getContext('2d');fx.drawImage(soft,0,0,frame.width,frame.height);
  const scale=Math.min(frame.width/iw,frame.height/ih);fx.drawImage(image,(frame.width-iw*scale)/2,(frame.height-ih*scale)/2,iw*scale,ih*scale);
  x.drawImage(frame,-g.width/2,-g.height/2,g.width,g.height);
 }
 text(x,c,w,h,local,alpha){
  let font=w*c.titleSize/100;x.font='800 '+font+'px "'+c.titleFont+'",sans-serif';let textLines=lines(x,c.title,w*.86);
  while(textLines.length*font*1.2>h*.7&&font>w*.015){font*=.92;x.font='800 '+font+'px "'+c.titleFont+'",sans-serif';textLines=lines(x,c.title,w*.86);}
  const lh=font*1.2,block=textLines.length*lh;let cy=c.titlePosition==='top'?-h*.35+block/2:c.titlePosition==='bottom'?h*.35-block/2:0;
  const intro=c.titleMotion==='none'?1:clamp(local/.5),ease=1-(1-intro)**3;x.save();x.globalAlpha*=alpha*(c.titleMotion==='none'?1:intro);
  if(c.titleMotion==='rise'||c.titleMotion==='fade')cy+=(1-ease)*font;
  if(c.titleMotion==='pop'){x.translate(0,cy);x.scale(.7+.3*ease,.7+.3*ease);cy=0;}
  x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';x.lineWidth=Math.max(1,font*.065);x.strokeStyle='#35152c';
  if(c.titleStyle==='plate'){x.fillStyle='#160d20dd';x.fillRect(-w*.46,cy-block/2-font*.3,w*.92,block+font*.6);}
  let fill=c.titleColor;
  if(c.titleStyle==='gold'){fill=x.createLinearGradient(0,cy-block/2,0,cy+block/2);for(const [s,color] of [[0,'#fff1b3'],[.3,'#b98123'],[.48,'#fffbe4'],[.58,'#dcac45'],[1,'#8e5313']])fill.addColorStop(s,color);}
  const glow=['glow','neon','gold'].includes(c.titleStyle);
  textLines.forEach((line,i)=>{const y=cy+(i-(textLines.length-1)/2)*lh;if(glow){x.shadowColor=c.titleStyle==='gold'?'#efb743':c.titleColor;x.shadowBlur=font*(c.titleStyle==='neon'?.7:.35);x.fillStyle=fill;x.fillText(line,0,y);x.shadowBlur=0;x.strokeText(line,0,y);}x.fillStyle=fill;x.fillText(line,0,y);});x.restore();return {width:w*.9,height:block+font*.6,cy};
 }
 render(p,time,assets,sources,options={}){
  const M=this.M,x=this.canvas.getContext('2d'),w=this.canvas.width,h=this.canvas.height;this.bounds.clear();x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.clearRect(0,0,w,h);
  if(options.compareId){
   const before=this.before||(this.before=document.createElement('canvas'));before.width=w;before.height=h;
   this.render(p,time,assets,sources,{...options,compareId:null,originalId:options.compareId,selectedId:null});before.getContext('2d').drawImage(this.canvas,0,0);
   this.render(p,time,assets,sources,{...options,compareId:null,originalId:null,selectedId:null});
   const split=w*clamp(options.compareSplit??.5,.02,.98);x.save();x.beginPath();x.rect(0,0,split,h);x.clip();x.drawImage(before,0,0);x.restore();x.fillStyle='#ffffff';x.fillRect(split-1,0,2,h);return;
  }
  if(options.isolateId){for(let y=0;y<h;y+=18)for(let a=0;a<w;a+=18){x.fillStyle=((a/18+y/18)%2)?'#ddd2dc':'#f4edf3';x.fillRect(a,y,18,18);}}else{x.fillStyle=p.background;x.fillRect(0,0,w,h);}
  if(options.picking){const c=M.rows(p).find(r=>r.scene.id===options.picking)?.scene,source=c&&sources.get(c.id),a=c&&assets.get(c.assetId);if(source&&a){const scale=Math.min(w/a.width,h/a.height),dw=a.width*scale,dh=a.height*scale;this.pickBounds={x:(w-dw)/2,y:(h-dh)/2,w:dw,h:dh,source};x.drawImage(source,this.pickBounds.x,this.pickBounds.y,dw,dh);}return;}
  for(const row of M.active(p,time)){
   const c=row.scene;if(options.isolateId&&c.id!==options.isolateId)continue;const local=time-row.start,d=M.duration(c),t=clamp(local/d),fade=Math.min(.35,d/4),alpha=c.transition==='fade'?clamp(Math.min(local/fade,(d-local)/fade)):1;
   const a=c.kind==='text'?{width:w,height:h}:assets.get(c.assetId),source=sources.get(c.id);if(!a)continue;
   const g=this.geometry(c,a,options.poseEnd===c.id?1:t);x.save();x.translate(g.x,g.y);x.rotate(g.angle);x.globalAlpha=(options.poseEnd===c.id?1:alpha)*g.opacity;
   if(c.kind!=='text'&&source){x.save();if(c.mask==='circle'){x.beginPath();x.arc(0,0,Math.min(g.width,g.height)/2,0,Math.PI*2);x.clip();}else if(c.mask==='rounded'){x.beginPath();if(x.roundRect)x.roundRect(-g.width/2,-g.height/2,g.width,g.height,Math.min(g.width,g.height)*.12);else x.rect(-g.width/2,-g.height/2,g.width,g.height);x.clip();}const effective=options.keyerId===c.id?{...c,keyer:options.keyer}:c;const image=options.originalId===c.id?source:this.effects.apply(source,effective,w,h);if(c.fit==='adaptive')this.adaptive(x,image,effective,g,options.originalId===c.id);else x.drawImage(image,-g.width/2,-g.height/2,g.width,g.height);x.restore();}
   if(c.title){x.save();x.scale(g.scale,g.scale);const box=this.text(x,c,w,h,local,1);x.restore();if(c.kind==='text'){g.width=box.width*g.scale;g.height=box.height*g.scale;g.y+=box.cy*g.scale;}}
   x.restore();this.bounds.set(c.id,g);
  }
  const c=M.rows(p).find(r=>r.scene.id===options.selectedId)?.scene,g=this.bounds.get(options.selectedId);if(g&&c&&!c.locked){x.save();x.translate(g.x,g.y);x.rotate(g.angle);x.strokeStyle='#ff8ccc';x.lineWidth=Math.max(1.5,w/250);x.setLineDash([6,4]);x.strokeRect(-g.width/2,-g.height/2,g.width,g.height);x.setLineDash([]);for(const [px,py] of [[-1,-1],[1,-1],[-1,1],[1,1]]){x.fillStyle='#fff';x.strokeStyle='#ab2f78';const s=w/60;x.fillRect(px*g.width/2-s/2,py*g.height/2-s/2,s,s);x.strokeRect(px*g.width/2-s/2,py*g.height/2-s/2,s,s);}x.restore();}
 }
 pickColor(x,y){const b=this.pickBounds;if(!b||x<b.x||x>b.x+b.w||y<b.y||y>b.y+b.h)return null;const c=this.sourceCanvas(b.source,600),px=Math.min(c.width-1,Math.floor((x-b.x)/b.w*c.width)),py=Math.min(c.height-1,Math.floor((y-b.y)/b.h*c.height));const d=c.getContext('2d').getImageData(px,py,1,1).data;return '#'+[...d.slice(0,3)].map(v=>v.toString(16).padStart(2,'0')).join('');}
 measureKeyer(source,keyer){
  const c=this.sourceCanvas(source,160),x=c.getContext('2d'),original=x.getImageData(0,0,c.width,c.height).data,after=new Uint8ClampedArray(original);processPixels(after,keyer);let input=0,removed=0;
  for(let i=3;i<original.length;i+=4){input+=original[i];removed+=Math.max(0,original[i]-after[i]);}return {removed:input?removed/input:0,empty:input===0};
 }
 autoColor(source){const c=this.sourceCanvas(source),d=c.getContext('2d').getImageData(0,0,c.width,c.height);return detectColor(d.data,c.width,c.height);}
}

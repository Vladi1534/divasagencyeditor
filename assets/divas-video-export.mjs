/* Fixed timestamps keep export independent of preview FPS and device speed. */
import {Input,ALL_FORMATS,BlobSource,CanvasSink,AudioBufferSink,Output,Mp4OutputFormat,WebMOutputFormat,BufferTarget,CanvasSource,AudioBufferSource,Quality,canEncodeVideo,canEncodeAudio} from './vendor/mediabunny/mediabunny.min.mjs';

export async function probe({w,h}){
 if(!globalThis.VideoEncoder||!globalThis.AudioEncoder||!globalThis.OfflineAudioContext)return null;
 const video={width:w,height:h},audio={numberOfChannels:2,sampleRate:48000};
 if(await canEncodeVideo('avc',video)&&await canEncodeAudio('aac',audio))return {video:'avc',audio:'aac',extension:'mp4',mime:'video/mp4'};
 if(await canEncodeVideo('vp8',video)&&await canEncodeAudio('opus',audio))return {video:'vp8',audio:'opus',extension:'webm',mime:'video/webm'};
 return null;
}

export async function encode({project,assets,canvas,render,progress,cancelled,config}){
 const M=window.DivasVideoModel,rows=M.timeline(project),seconds=M.total(project),fps=30,frames=Math.ceil(seconds*fps),inputs=new Map(),sinks=new Map();
 const check=()=>{if(cancelled())throw Error('Exportación cancelada. El proyecto sigue guardado.');};
 const yieldUI=()=>new Promise(r=>setTimeout(r,0));
 let output,iterator;
 try{
  check();progress(0,'Preparando clips y audio…');
  for(const a of assets){if(a.kind==='image')continue;check();const input=new Input({formats:ALL_FORMATS,source:new BlobSource(a.blob)});inputs.set(a.id,input);
   if(a.kind==='video'){const track=await input.getPrimaryVideoTrack();if(!track||!await track.canDecode())throw Error('No se puede exportar «'+a.name+'» en este navegador. Usa otro MP4 o WebM.');sinks.set(a.id,new CanvasSink(track,{width:Math.min(a.width,1920),poolSize:2}));}}
  const offline=new OfflineAudioContext(2,Math.ceil(seconds*48000),48000),master=offline.createGain(),limiter=offline.createDynamicsCompressor();master.gain.value=.8;master.connect(limiter);limiter.connect(offline.destination);
  let audioPresent=false;
  async function schedule(assetId,from,to,when,volume){
   if(volume<=0||to<=from)return;check();const track=await inputs.get(assetId).getPrimaryAudioTrack();if(!track)return;if(!await track.canDecode())throw Error('El audio de un clip no se puede leer. Silencia ese clip o usa otro archivo.');audioPresent=true;
   const gain=offline.createGain();gain.gain.value=volume;gain.connect(master);const sink=new AudioBufferSink(track);
   for await(const chunk of sink.buffers(from,to)){check();const start=Math.max(from,chunk.timestamp),end=Math.min(to,chunk.timestamp+chunk.buffer.duration);if(end<=start)continue;const node=offline.createBufferSource();node.buffer=chunk.buffer;node.connect(gain);node.start(when+start-from,start-chunk.timestamp,end-start);}
  }
  for(const row of rows)if(row.scene.kind==='video')await schedule(row.scene.assetId,row.scene.in,row.scene.out,row.start,row.scene.volume);
  if(project.music){const music=project.music,a=assets.find(a=>a.id===music.assetId),available=a.duration-music.offset;let start=0;while(start<seconds){const length=Math.min(available,seconds-start);await schedule(a.id,music.offset,music.offset+length,start,music.volume);start+=length;if(!music.loop)break;}}
  check();progress(5,'Preparando la mezcla de audio…');const mixed=audioPresent?await offline.startRendering():null;
  output=new Output({format:config.extension==='mp4'?new Mp4OutputFormat({fastStart:'in-memory'}):new WebMOutputFormat(),target:new BufferTarget()});
  const video=new CanvasSource(canvas,{codec:config.video,quality:new Quality({bitrate:project.quality===1080?8000000:4000000}),keyFrameInterval:2});output.addVideoTrack(video,{frameRate:fps});
  let audio;if(mixed){audio=new AudioBufferSource({codec:config.audio,quality:new Quality({bitrate:160000})});output.addAudioTrack(audio);}
  output.setMetadataTags({title:project.name,artist:'Divas Agency'});await output.start();
  if(audio){await audio.add(mixed);audio.close();}
  let current=null;
  for(let frame=0;frame<frames;frame++){
   check();const time=frame/fps,row=M.at(project,time);let image=null;
   if(row.scene.id!==current){if(iterator)await iterator.return();iterator=null;current=row.scene.id;
    if(row.scene.kind==='video'){const end=Math.min(frames,Math.ceil((row.end-1e-8)*fps)),timestamps=Array.from({length:end-frame},(_,i)=>row.scene.in+(frame+i)/fps-row.start);iterator=sinks.get(row.scene.assetId).canvasesAtTimestamps(timestamps);}}
   if(iterator){const sample=await iterator.next();if(sample.done||!sample.value)throw Error('No se pudo leer un fotograma del clip. Prueba otro archivo.');image=sample.value.canvas;}
   render(time,image);await video.add(time,Math.min(1/fps,seconds-time));
   if(frame%5===0){progress(8+frame/frames*89,'Exportando '+Math.round(frame/frames*100)+'% · '+(config.extension==='mp4'?'MP4':'WebM'));await yieldUI();}
  }
  video.close();check();progress(98,'Terminando el archivo…');await output.finalize();check();return new Blob([output.target.buffer],{type:config.mime});
 }catch(error){try{await output?.cancel();}catch{}throw error;}
 finally{try{await iterator?.return();}catch{}for(const input of inputs.values())input.dispose();}
}

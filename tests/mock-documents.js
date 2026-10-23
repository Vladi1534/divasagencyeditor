function installMock({logo,background}) {
const q=window.q={tables:{divas_documents:[],divas_projects:[],divas_user_settings:[]},files:new Map(),uploadLost:false,saveFail:false,missing:false,slow:0};
function from(name){let op='select',data,filters=[],single=false,range=null,search=null;const b={select(){return b},order(){return b},eq(k,v){filters.push(r=>r[k]===v);return b},ilike(k,v){search=[k,v.slice(1,-1).toLowerCase()];return b},range(a,z){range=[a,z];return b},maybeSingle(){single=true;return b},single(){single=true;return b},insert(d){op='insert';data=d;return b},update(d){op='update';data=d;return b},delete(){op='delete';return b},abortSignal(){return b},then(resolve,reject){return Promise.resolve().then(async()=>{
 if(q.slow)await new Promise(r=>setTimeout(r,q.slow));if(q.missing&&name==='divas_documents')return {error:{code:'PGRST205',message:'public.divas_documents not in schema cache'}};
 const rows=q.tables[name]||(q.tables[name]=[]);let result=rows.filter(r=>filters.every(f=>f(r))&&(!search||String(r[search[0]]).toLowerCase().includes(search[1])));
 if(op==='insert'){if(rows.some(r=>r.id===data.id||data.sha256&&r.sha256===data.sha256))return {error:{code:'23505',message:'duplicate'}};const r={...data,state:data.state||'uploading',created_at:new Date().toISOString()};rows.unshift(r);result=[r];}
 if(op==='update')result.forEach(r=>Object.assign(r,data));if(op==='delete')q.tables[name]=rows.filter(r=>!result.includes(r));
 if(range)result=result.slice(range[0],range[1]+1);return {data:single?result[0]||null:result};
 }).then(resolve,reject)}};return b;}
e.A.user={id:'11111111-1111-4111-8111-111111111111',email:'prueba@example.invalid'};e.A.member={active:true,role:'admin',display_name:'Prueba local'};e.A.ownAuth=true;e.A.error='';
e.A.client={from,rpc:async(name,p)=>{
 if(name==='divas_document_finish'){const r=q.tables.divas_documents.find(r=>r.id===p.p_id);if(!r||!q.files.has(r.object_path))return {data:null};r.state='ready';return {data:r};}
 if(name==='divas_save_project_v2'){if(q.saveFail){q.saveFail=false;return {error:{message:'Prueba: conexión interrumpida'}};}const old=q.tables.divas_projects.find(r=>r.id===p.p_meta.id);const row={...p.p_meta,owner_id:e.A.user.id,contenido:p.p_content,miniatura:p.p_preview,version:(old?.version||0)+1,last_write_id:p.p_write_id};if(old)Object.assign(old,row);else q.tables.divas_projects.push(row);return {data:{id:row.id,version:row.version}};}
 return {data:[]};
},storage:{from(){return {upload:async(path,file)=>{q.files.set(path,file);if(q.uploadLost){q.uploadLost=false;return {error:{message:'Prueba: recibo perdido'}};}return {data:{path}};},download:async path=>q.files.has(path)?{data:q.files.get(path)}:{error:{message:'Archivo no encontrado'}},remove:async paths=>{paths.forEach(x=>q.files.delete(x));return {data:paths.map(name=>({name}))}}};}}};
e.P.brandLogo=logo;e.C.collections=[{id:'22222222-2222-4222-8222-222222222222',name:'Agencia',published:true}];
e.C.items=[{id:'33333333-3333-4333-8333-333333333333',name:'Rosa de la agencia',category:'fondos',collection_id:e.C.collections[0].id,kind:'image',published:true,object_path:'bg',thumb_path:'bg-thumb'}];
e.C.cache.set('bg',background);e.C.cache.set('bg-thumb',background);e.H.enabled=false;e.updateBrandLogo();e.updateAccountUI();
}

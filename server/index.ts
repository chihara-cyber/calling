import express from 'express';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {Server} from 'socket.io';
import path from 'node:path';
const app=express(), http=createServer(app);
const io=new Server(http,{cors:{origin:['http://localhost:5173','http://127.0.0.1:5173']},maxHttpBufferSize:65536});
app.use(express.static(path.resolve('dist')));
const waiting=new Set<string>();
const pairs=new Map<string,{peer:string,room:string}>();
const blocked=new Map<string,Set<string>>();
function match(id:string){
 if(pairs.has(id)||!io.sockets.sockets.has(id))return;
 waiting.delete(id);
 const peer=[...waiting].find(p=>p!==id&&io.sockets.sockets.has(p)&&!blocked.get(id)?.has(p)&&!blocked.get(p)?.has(id));
 if(!peer){waiting.add(id);io.to(id).emit('waiting');return;}
 waiting.delete(peer);
 const room=randomUUID();
 pairs.set(id,{peer,room});pairs.set(peer,{peer:id,room});
 io.to(id).emit('matched',{room,initiator:true});io.to(peer).emit('matched',{room,initiator:false});
}
function end(id:string){
 waiting.delete(id);const p=pairs.get(id);if(!p)return;
 pairs.delete(id);pairs.delete(p.peer);io.to(p.peer).emit('peer-left',{room:p.room});
}
io.on('connection',s=>{
 blocked.set(s.id,new Set());
 s.on('join-queue',()=>match(s.id));
 s.on('leave-queue',()=>end(s.id));
 s.on('end-call',()=>end(s.id));
 s.on('skip',()=>{end(s.id);match(s.id)});
 s.on('signal',(data)=>{const p=pairs.get(s.id);if(p&&data?.room===p.room&&data.signal&&typeof data.signal==='object')io.to(p.peer).emit('signal',data)});
 s.on('report',(reason)=>{const p=pairs.get(s.id);if(p&&typeof reason==='string')console.info(JSON.stringify({event:'report',reporter:s.id,peer:p.peer,reason:reason.slice(0,300)}))});
 s.on('block',()=>{const p=pairs.get(s.id);if(p)blocked.get(s.id)?.add(p.peer);end(s.id)});
 s.on('disconnect',()=>{end(s.id);blocked.delete(s.id);for(const b of blocked.values())b.delete(s.id)});
});
http.listen(Number(process.env.PORT||3001),()=>console.log('Calling server ready'));

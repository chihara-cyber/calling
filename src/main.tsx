import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {io} from 'socket.io-client';
import type {Match,Signal} from '../shared/events';
import './style.css';
const socket=io(import.meta.env.VITE_SIGNAL_URL || (import.meta.env.DEV ? location.protocol+'//'+location.hostname+':3001' : location.origin),{autoConnect:false});
function App(){
 const [status,setStatus]=useState('待機中'),[active,setActive]=useState(false),[muted,setMuted]=useState(false),[matched,setMatched]=useState(false);
 const audio=useRef<HTMLAudioElement>(null), stream=useRef<MediaStream|null>(null), pc=useRef<RTCPeerConnection|null>(null), room=useRef(''), pending=useRef<RTCIceCandidateInit[]>([]), busy=useRef(false), generation=useRef(0);
 function closePeer(){room.current='';pc.current?.close();pc.current=null;pending.current=[];if(audio.current)audio.current.srcObject=null;setMatched(false)}
 function reset(){generation.current++;closePeer();stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;busy.current=false;setActive(false);setMuted(false)}
 function stop(){socket.emit('end-call');reset();setStatus('待機中')}
 function fail(){socket.emit('end-call');reset();setStatus('接続できませんでした。再試行してください')}
 useEffect(()=>{
 socket.connect();
 socket.on('waiting',()=>setStatus('相手を探しています…'));
 socket.on('matched',async(m:Match)=>{
 if(!stream.current){socket.emit('end-call');return;}
 closePeer();room.current=m.room;setMatched(true);setStatus('接続中…');
 const iceServers:RTCIceServer[]=[{urls:'stun:stun.l.google.com:19302'}];
 if(import.meta.env.VITE_TURN_URL)iceServers.push({urls:import.meta.env.VITE_TURN_URL,username:import.meta.env.VITE_TURN_USERNAME,credential:import.meta.env.VITE_TURN_CREDENTIAL});
 const p=new RTCPeerConnection({iceServers});pc.current=p;
 const send=(signal:Signal)=>{if(pc.current===p)socket.emit('signal',{room:m.room,signal})};
 stream.current.getTracks().forEach(t=>p.addTrack(t,stream.current!));
 p.onicecandidate=e=>{if(e.candidate)send({candidate:e.candidate.toJSON()})};
 p.ontrack=e=>{if(audio.current&&pc.current===p){audio.current.srcObject=e.streams[0]||new MediaStream([e.track]);audio.current.play().catch(()=>setStatus('音声再生ボタンを押してください'))}};
 p.onconnectionstatechange=()=>{if(pc.current!==p)return;if(p.connectionState==='connected')setStatus('通話中');if(p.connectionState==='failed')fail()};
 try{if(m.initiator){await p.setLocalDescription(await p.createOffer());send({description:p.localDescription!.toJSON()})}}catch{if(pc.current===p)fail()}
 });
 let chain=Promise.resolve();
 socket.on('signal',(data:{room:string,signal:Signal})=>{
 chain=chain.then(async()=>{const p=pc.current;if(!p||room.current!==data.room)return;
 try{const {description,candidate}=data.signal;
 if(description){await p.setRemoteDescription(description);if(pc.current!==p)return;for(const c of pending.current.splice(0))await p.addIceCandidate(c);if(description.type==='offer'){await p.setLocalDescription(await p.createAnswer());if(pc.current===p)socket.emit('signal',{room:data.room,signal:{description:p.localDescription!.toJSON()}})}}
 if(candidate){if(p.remoteDescription)await p.addIceCandidate(candidate);else pending.current.push(candidate)}
 }catch{if(pc.current===p)fail()}});
 });
 socket.on('peer-left',(data:{room:string})=>{if(room.current===data.room){reset();setStatus('相手が通話を終了しました')}});
 socket.on('disconnect',()=>{reset();setStatus('サーバーとの接続が切れました')});
 socket.on('connect_error',()=>{reset();setStatus('サーバーに接続できません')});
 return()=>{socket.removeAllListeners();socket.disconnect();reset()};
 },[]);
 async function start(){if(busy.current||!socket.connected){if(!socket.connected)setStatus('サーバー接続待ち');return;}busy.current=true;const g=++generation.current;setActive(true);setStatus('マイクを準備中…');
 try{const s=await navigator.mediaDevices.getUserMedia({audio:true});if(g!==generation.current){s.getTracks().forEach(t=>t.stop());return;}stream.current=s;socket.emit('join-queue');setStatus('相手を探しています…')}catch{if(g===generation.current){reset();setStatus('マイクの許可が必要です')}}}
 function mute(){const next=!muted;stream.current?.getAudioTracks().forEach(t=>t.enabled=!next);setMuted(next)}
 function skip(){closePeer();socket.emit('skip');setStatus('相手を探しています…')}
 function report(){const reason=window.prompt('通報理由を入力してください');if(reason?.trim()){socket.emit('report',reason);socket.emit('block');reset();setStatus('通報を送信しました')}}
 return <main><header>calling<span>VOICE ONLY</span></header><section><div className="orb">☎</div><h1>誰かと、話そう。</h1><p aria-live="polite">{status}</p><audio ref={audio} autoPlay playsInline/><button className="primary" onClick={active?stop:start}>{active?'終了する':'相手を探す'}</button>{matched&&<><div className="actions"><button onClick={mute}>{muted?'マイクON':'ミュート'}</button><button onClick={skip}>次の相手</button></div><button onClick={()=>audio.current?.play().catch(()=>{})}>音声を再生</button><div className="actions"><button onClick={report}>通報</button><button onClick={()=>{socket.emit('block');reset();setStatus('ブロックしました')}}>ブロック</button></div></>}<small>音声のみ・録音なし・個人情報を共有しないでください</small></section></main>
}
createRoot(document.getElementById('root')!).render(<App/>);

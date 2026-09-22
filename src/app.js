import {Universe} from './particles.js';
import {GestureInterpreter,cameraErrorMessage} from './gestures.js';
const $=id=>document.getElementById(id);
const universe=new Universe($('universe'),n=>{$('quality-label').textContent=`${n} 顆星塵 · 輕量模式`;});
const interpreter=new GestureInterpreter();
const video=$('camera');
let mode='idle',stream=null,worker=null,generation=0,frameTimer=null,busy=false,lastFrameAt=0,lastVideoTime=-1;
let previewVisible=true,mouseDown=false,mouseInside=false,lastBurstAt=-Infinity,modelDelegate=null,inferenceMs=0,watchdog=null;
let cancelInitialization=null;
let point={x:.55,y:.46},rawLandmarks=null;
function status(message,live=false){if($('status').textContent!==message)$('status').textContent=message;$('status-dot').classList.toggle('live',live);}
function notice(message=''){$('notice').textContent=message;$('notice').hidden=!message;}
function updatePhase(input){
  universe.setInput(input);if(input.burst)lastBurstAt=performance.now();
  const visualPhase=performance.now()-lastBurstAt<850?'burst':input.phase;
  document.body.dataset.phase=visualPhase;document.body.classList.toggle('engaged',input.visible);
  for(const el of document.querySelectorAll('[data-step]'))el.classList.toggle('active',el.dataset.step===visualPhase);
  if(mode==='camera')status(!input.visible?'將手放入畫面':visualPhase==='pinch'?'星光正在你手中聚合':visualPhase==='burst'?'放手，讓星塵自由散開':'慢慢移動手掌，帶著星光走',input.visible);
}
function drawSkeleton(landmarks){
  const c=$('skeleton'),ctx=c.getContext('2d');c.width=320;c.height=240;
  if(!landmarks || !previewVisible)return;
  const chains=[[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]];
  const xy=p=>[(1-p.x)*c.width,p.y*c.height];ctx.strokeStyle='#addcff99';ctx.lineWidth=1.3;
  for(const chain of chains){ctx.beginPath();chain.forEach((j,i)=>{const [x,y]=xy(landmarks[j]);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}
  ctx.fillStyle='#d6efff';for(const p of landmarks){const [x,y]=xy(p);ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();}
}
function stopResources(){
  generation++;clearTimeout(frameTimer);clearTimeout(watchdog);frameTimer=null;watchdog=null;
  cancelInitialization?.();cancelInitialization=null;
  worker?.terminate();worker=null;busy=false;
  if(stream){for(const track of stream.getTracks()){track.onended=null;track.stop();}stream=null;}
  video.pause();video.srcObject=null;$('camera-placeholder').hidden=false;drawSkeleton(null);
  rawLandmarks=null;interpreter.reset();modelDelegate=null;lastVideoTime=-1;
  $('camera-button').disabled=false;$('camera-button').querySelector('span').textContent='開始鏡頭';
}
function idle(){stopResources();mode='idle';mouseDown=false;mouseInside=false;$('mouse-button').setAttribute('aria-pressed','false');updatePhase({x:point.x,y:point.y,phase:'idle',visible:false});status('星空已就緒，選擇你的玩法');}
function failCamera(error){console.warn('鏡頭／模型錯誤',error?.name,error?.message);idle();notice(cameraErrorMessage(error));status('可以先用滑鼠探索星空');}
function initializeWorker(token){
  return new Promise((resolve,reject)=>{
    const instance=new Worker(new URL('./hand-worker.js',import.meta.url),{type:'module'});worker=instance;
    const timeout=setTimeout(()=>{reject(Object.assign(new Error('Model load timeout'),{name:'ModelError'}));},30000);
    cancelInitialization=()=>{clearTimeout(timeout);reject(Object.assign(new Error('Initialization cancelled'),{name:'AbortError'}));};
    instance.onerror=event=>{clearTimeout(timeout);const err=Object.assign(new Error(event.message||'Worker failed'),{name:'ModelError'});if(mode==='loading')reject(err);else if(token===generation)failCamera(err);};
    instance.onmessage=({data})=>{
      if(token!==generation)return;
      if(data.type==='ready'){clearTimeout(timeout);cancelInitialization=null;modelDelegate=data.delegate;resolve();}
      if(data.type==='error'){clearTimeout(timeout);const err=Object.assign(new Error(data.message),{name:'ModelError'});if(mode==='loading')reject(err);else failCamera(err);}
      if(data.type==='result'){
        busy=false;clearTimeout(watchdog);rawLandmarks=data.landmarks;inferenceMs=data.duration;
        updatePhase(interpreter.update(rawLandmarks,performance.now()));drawSkeleton(rawLandmarks);
      }
    };
    instance.postMessage({type:'init'});
  });
}
async function requestCamera(){
  if(mode==='camera'||mode==='loading'){idle();return;}
  idle();notice();mode='loading';const token=generation;
  $('camera-button').querySelector('span').textContent='取消啟動';status('請允許鏡頭，星塵正在準備中');
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera unavailable');
    const captured=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640,max:640},height:{ideal:480,max:480},frameRate:{ideal:24,max:30},facingMode:'user'},audio:false});
    if(token!==generation){captured.getTracks().forEach(t=>t.stop());return;}
    stream=captured;video.srcObject=stream;
    stream.getVideoTracks()[0].onended=()=>{if(token===generation)failCamera(Object.assign(new Error('Camera disconnected'),{name:'NotReadableError'}));};
    await video.play();if(token!==generation)return;
    $('camera-placeholder').hidden=true;status('正在載入本機手勢模型…');
    await initializeWorker(token);if(token!==generation)return;
    mode='camera';lastFrameAt=0;$('camera-button').querySelector('span').textContent='停止鏡頭';status('將手放入畫面');
    scheduleFrame(token);
  }catch(error){if(token===generation)failCamera(error);}
}
function scheduleFrame(token){
  if(token!==generation || mode!=='camera')return;
  frameTimer=setTimeout(()=>scheduleFrame(token),20);
  if(document.hidden||busy||video.readyState<2||video.currentTime===lastVideoTime)return;
  const now=performance.now();if(now-lastFrameAt<1000/15)return;
  lastFrameAt=now;lastVideoTime=video.currentTime;busy=true;
  createImageBitmap(video).then(bitmap=>{
    if(token!==generation || !worker){bitmap.close();return;}
    worker.postMessage({type:'frame',bitmap,timestamp:now},[bitmap]);
    watchdog=setTimeout(()=>{if(token===generation)failCamera(Object.assign(new Error('Inference timeout'),{name:'ModelError'}));},8000);
  }).catch(error=>{if(token===generation)failCamera(error);});
}
function mouseInput(burst=false){updatePhase({...point,phase:mouseDown?'pinch':'follow',visible:mouseInside,burst});status(mouseDown?'握住星光，放開就會散開':'移動滑鼠帶走星光 · 按住聚合，放開散開',true);}
function selectMouse(){
  if(mode==='mouse'){idle();return;}
  stopResources();notice();mode='mouse';mouseDown=false;mouseInside=true;
  $('mouse-button').setAttribute('aria-pressed','true');mouseInput();
}
$('camera-button').addEventListener('click',requestCamera);
$('mouse-button').addEventListener('click',selectMouse);
const canvas=$('universe');
canvas.addEventListener('pointermove',e=>{if(mode!=='mouse')return;point={x:e.clientX/innerWidth,y:e.clientY/innerHeight};mouseInside=true;mouseInput();});
canvas.addEventListener('pointerdown',e=>{if(mode!=='mouse')return;e.preventDefault();canvas.setPointerCapture(e.pointerId);point={x:e.clientX/innerWidth,y:e.clientY/innerHeight};mouseInside=true;mouseDown=true;mouseInput();});
canvas.addEventListener('pointerup',()=>{if(mode!=='mouse')return;const burst=mouseDown;mouseDown=false;mouseInput(burst);});
canvas.addEventListener('pointercancel',()=>{if(mode!=='mouse')return;mouseDown=false;mouseInside=false;updatePhase({...point,phase:'idle',visible:false});});
canvas.addEventListener('pointerleave',()=>{if(mode!=='mouse'||mouseDown)return;mouseInside=false;updatePhase({...point,phase:'idle',visible:false});status('將滑鼠移回星空');});
function preview(show){previewVisible=show;$('camera-panel').hidden=!show;$('preview-button').setAttribute('aria-pressed',String(show));$('preview-button').querySelector('span').textContent=show?'隱藏小窗':'顯示小窗';$('preview-button').title=show?'隱藏鏡頭小窗':'顯示鏡頭小窗';}
$('preview-button').addEventListener('click',()=>preview(!previewVisible));$('preview-close').addEventListener('click',()=>preview(false));
$('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notice('這個視窗暫時未能切換全螢幕。你仍可使用目前畫面。');}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen-button').querySelector('span').textContent=document.fullscreenElement?'退出全螢幕':'全螢幕';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){mouseDown=false;interpreter.reset();updatePhase({...point,phase:'idle',visible:false});if(mode==='camera')status('已暫停辨識，返回畫面後恢復');}});
window.addEventListener('blur',()=>{if(mode==='mouse'&&mouseDown){mouseDown=false;mouseInput();}});
// The optional shutdown channel belongs to the local launcher, not static hosts.
let localEvents=null,pageDisposed=false;
async function watchLocalServer(){
  if(!['127.0.0.1','localhost','[::1]'].includes(location.hostname))return;
  try{
    const response=await fetch(new URL('./__health',location.href),{signal:AbortSignal.timeout(2000)});
    if(!response.ok)return;
    const health=await response.json();
    if(pageDisposed||health.app!=='stardust-local-v1')return;
    localEvents=new EventSource('./__events');
    localEvents.addEventListener('stop',()=>{idle();localEvents.close();notice('宇宙星塵已停止。再次雙擊啟動檔，即可重新開始。');status('鏡頭與手勢辨識已關閉');});
    localEvents.onerror=()=>{if(mode==='camera'||mode==='loading'){idle();notice('本機服務連線中斷，鏡頭已關閉。請重新啟動宇宙星塵。');}};
  }catch{/* Ordinary static servers do not need a shutdown channel. */}
}
watchLocalServer();
window.addEventListener('pagehide',()=>{pageDisposed=true;localEvents?.close();stopResources();universe.dispose();});
// Read-only diagnostics: no camera pixels, recording, or external transport.
Object.defineProperty(window,'stardust',{value:Object.freeze({get state(){return {mode,phase:universe.input.phase,position:{x:universe.input.x,y:universe.input.y},burstCount:universe.burstCount,particles:universe.count,fps:Math.round(universe.fps),workerActive:!!worker,cameraActive:!!stream,tracks:stream?.getTracks().map(t=>({kind:t.kind,state:t.readyState}))||[],delegate:modelDelegate,inferenceMs:Math.round(inferenceMs),handDetected:!!rawLandmarks,previewVisible};}})});

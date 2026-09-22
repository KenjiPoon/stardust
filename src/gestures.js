// The camera is 4:3; correct normalized x distances before measuring geometry.
const distance = (a,b) => Math.hypot((a.x-b.x)*4/3,a.y-b.y);
const clamp = v => Math.min(1,Math.max(0,v));

// Ratios use palm width, making pinch detection independent of camera distance.
export class GestureInterpreter {
  constructor(){ this.reset(); }
  reset(){this.lastSeen=-Infinity;this.lastTime=0;this.x=.53;this.y=.47;this.pinched=false;this.charged=false;this.candidate='';this.candidateAt=0;this.phase='idle';this.bursts=0;}
  update(landmarks,time){
    if(!landmarks || landmarks.length!==21){
      if(time-this.lastSeen>250){this.phase='idle';this.pinched=false;this.charged=false;this.candidate='';}
      return this.result(false);
    }
    const reacquired=time-this.lastSeen>250;
    this.lastSeen=time;
    const palm=[0,5,9,13,17].map(i=>landmarks[i]);
    const px=clamp(1-palm.reduce((a,p)=>a+p.x,0)/palm.length);
    const py=clamp(palm.reduce((a,p)=>a+p.y,0)/palm.length);
    const dt=Math.max(1,Math.min(150,time-this.lastTime));this.lastTime=time;
    const alpha=1-Math.exp(-dt/85);
    if(reacquired){this.x=px;this.y=py;}else{this.x+=(px-this.x)*alpha;this.y+=(py-this.y)*alpha;}
    const width=Math.max(.025,distance(landmarks[5],landmarks[17]));
    const ratio=distance(landmarks[4],landmarks[8])/width;
    const extended=[8,12,16,20].filter(t=>distance(landmarks[t],landmarks[0])>distance(landmarks[t-2],landmarks[0])*1.15).length;
    const kind=ratio<(this.pinched?.55:.34)?'pinch':extended===4?'open':'follow';
    if(kind!==this.candidate){this.candidate=kind;this.candidateAt=time;}
    let burst=false;
    if(time-this.candidateAt>=100){
      if(kind==='pinch'){this.pinched=true;this.charged=true;this.phase='pinch';}
      else{this.pinched=false;if(kind==='open' && this.charged){this.charged=false;burst=true;this.bursts++;}this.phase=burst?'burst':'follow';}
    }
    if(reacquired && this.phase==='idle')this.phase='follow';
    return {...this.result(burst),pinchRatio:ratio,extended};
  }
  result(burst){return {x:this.x,y:this.y,phase:this.phase,visible:this.phase!=='idle',burst};}
}

export function cameraErrorMessage(error){
  switch(error?.name){
    case 'NotAllowedError':case 'PermissionDeniedError':return '鏡頭權限未獲允許。可在網址列的網站設定允許鏡頭，或先用「滑鼠試玩」。';
    case 'NotFoundError':case 'DevicesNotFoundError':return '未找到攝影機。連接鏡頭後再試，或先用「滑鼠試玩」。';
    case 'NotReadableError':case 'TrackStartError':return '鏡頭可能正被其他程式使用。釋放鏡頭後再試，或先用「滑鼠試玩」。';
    case 'OverconstrainedError':return '鏡頭未能使用目前設定。可轉用另一個鏡頭，或先用「滑鼠試玩」。';
    case 'ModelError':return '手勢模型未能載入。請確認模型與程式檔案完整，再重新啟動；你仍可用「滑鼠試玩」。';
    default:return '鏡頭未能啟動。請用 Chrome 從啟動檔開啟，或先用「滑鼠試玩」。';
  }
}

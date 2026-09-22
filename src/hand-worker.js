import {FilesetResolver,HandLandmarker} from '../vendor/mediapipe/vision_bundle.mjs';
let detector=null;
self.onmessage=async ({data})=>{
  if(data.type==='init'){
    try{
      const files=await FilesetResolver.forVisionTasks(new URL('../vendor/mediapipe/wasm/',import.meta.url).href,true);
      const options={baseOptions:{modelAssetPath:new URL('../models/hand_landmarker.task',import.meta.url).href,delegate:'GPU'},canvas:new OffscreenCanvas(640,480),runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.5};
      let delegate='GPU';
      try{detector=await HandLandmarker.createFromOptions(files,options);}catch{
        delegate='CPU';options.baseOptions.delegate='CPU';options.canvas=new OffscreenCanvas(640,480);detector=await HandLandmarker.createFromOptions(files,options);
      }
      self.postMessage({type:'ready',delegate});
    }catch(error){self.postMessage({type:'error',stage:'model',message:String(error.message||error)});}
  }
  if(data.type==='frame'){
    try{
      const started=performance.now();
      const result=detector.detectForVideo(data.bitmap,data.timestamp);
      self.postMessage({type:'result',landmarks:result.landmarks[0]||null,duration:performance.now()-started});
    }catch(error){self.postMessage({type:'error',stage:'inference',message:String(error.message||error)});}
    finally{data.bitmap?.close();}
  }
  if(data.type==='close'){detector?.close();detector=null;self.close();}
};

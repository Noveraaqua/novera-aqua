/* One photo per short-lived worker. Only static GET downloads; no image/text upload or storage. */
'use strict';
importScripts('./horiba-network.js');
importScripts('./horiba-core.js','./horiba-reconcile.js','./horiba-pipeline.js','./vendor/sha256-0.11.1.js');
const CDN='https://cdn.jsdelivr.net/npm/';
const sessions=[];
const send=(type,data={})=>postMessage({type,...data});
async function load(){
 send('progress',{message:'Loading screen preparation…',progress:.02});
 importScripts(CDN+'@techstark/opencv-js@4.11.0-release.1/dist/opencv.js');
 self.cv=await self.cv;
 importScripts(CDN+'onnxruntime-web@1.23.2/dist/ort.wasm.min.js','./vendor/esearch-ocr-8.5.0.js');
 ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths=CDN+'onnxruntime-web@1.23.2/dist/';
 send('progress',{message:'Loading PaddleOCR model on this device…',progress:.12});
 const fetchBytes=async path=>{const response=await fetch(new URL(path,self.location.href),{credentials:'omit'});if(!response.ok)throw new Error('OCR model unavailable. Retry or enter readings manually.');return response.arrayBuffer();};
 const bytes=await fetchBytes('./models/en-rec.onnx');
 const hash=self.sha256(bytes);
 if(hash!=='ef7abd8bd3629ae57ea2c28b425c1bd258a871b93fd2fe7c433946ade9b5d9ea')throw new Error('OCR model integrity check failed. Use manual entry.');
 const dictionary=new TextDecoder().decode(await fetchBytes('./models/en-dict.txt'));
 const adapter={...ort,InferenceSession:{create:async(...args)=>{const s=await ort.InferenceSession.create(...args);sessions.push(s);return s;}}};
 const engine=self['esearch-ocr'];engine.setOCREnv({canvas:(w,h)=>new OffscreenCanvas(w,h),imageData:(...args)=>new ImageData(...args)});
 const rec=await engine.initRec({ort:adapter,input:bytes,decodeDic:dictionary,imgh:48,optimize:{space:false},ortOption:{executionProviders:['wasm']}});
 return async image=>{const result=await rec.rec(engine.warpDet(image));return {text:result.map(r=>r.text).join(' '),score:result[0]?.mean??0};};
}
self.onmessage=async({data})=>{
 if(data.type!=='scan')return;
 let image=data.image,screen=null;const start=performance.now();
 try{
 if(typeof OffscreenCanvas==='undefined')throw new Error('This browser cannot run the photo scanner. Enter readings manually.');
 const read=await load();
 const output=await HoribaPipeline(cv,image,read,data.manual,p=>send('progress',p),data.experimental===true);
 const result=output.result;screen=output.screen;
 // Only small result metadata and the temporary rectified photo cross back to UI memory.
 send('result',{result,screen,metrics:{elapsedMs:Math.round(performance.now()-start),layoutVerified:true,assetRequests:HoribaNetwork.requests}});
 }catch(e){send('error',{message:e.message||'Photo recognition failed. Enter readings manually.'});}
 finally{image=screen=null;for(const s of sessions)try{await s.release();}catch{}sessions.length=0;self.close();}
};

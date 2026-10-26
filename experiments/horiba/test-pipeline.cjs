// Runs the actual browser pipeline functions on original photos; no browser automation.
const fs=require('fs'),path=require('path');const cvReady=require('@techstark/opencv-js'),ort=require('onnxruntime-web'),ocr=require('esearch-ocr');
const {createCanvas,loadImage,ImageData}=require('@napi-rs/canvas');global.ImageData=ImageData;global.HoribaCore=require('../../assets/horiba-core.js');const run=require('../../assets/horiba-pipeline.js');
(async()=>{const cv=await cvReady;ort.env.wasm.numThreads=1;const sessions=[];ocr.setOCREnv({canvas:createCanvas,imageData:(...a)=>new ImageData(...a)});
const adapter={...ort,InferenceSession:{create:async(...a)=>{const s=await ort.InferenceSession.create(...a);sessions.push(s);return s;}}};
const rec=await ocr.initRec({ort:adapter,input:fs.readFileSync('ocr-qa/models/en/en_PP-OCRv3_rec_infer.onnx'),decodeDic:fs.readFileSync('ocr-qa/models/en/en_dict.txt','utf8'),imgh:48,optimize:{space:false},ortOption:{executionProviders:['wasm']}});
const rows=[];try{for(const file of process.argv.slice(2)){const im=await loadImage(file),scale=Math.min(1,1600/Math.max(im.width,im.height)),c=createCanvas(Math.round(im.width*scale),Math.round(im.height*scale)),ctx=c.getContext('2d');ctx.drawImage(im,0,0,c.width,c.height);let labels=[];let start=performance.now();
const read=async data=>{const out=await rec.rec(ocr.warpDet(data));const x={text:out.map(r=>r.text).join(' '),score:out[0]?.mean??0};labels.push(x);return x;};
try{const r=await run(cv,ctx.getImageData(0,0,c.width,c.height),read);rows.push({file:path.basename(file),ms:performance.now()-start,values:Object.fromEntries(r.result.readings.map(x=>[x.key,x.value]))});}
catch(e){rows.push({file:path.basename(file),ms:performance.now()-start,error:e.message,labels});}
console.log(JSON.stringify(rows.at(-1)));c.width=c.height=1;
}fs.writeFileSync('ocr-qa/pipeline-results.json',JSON.stringify(rows,null,2));}finally{for(const s of sessions)await s.release();}})().catch(e=>{console.error(e);process.exitCode=1});

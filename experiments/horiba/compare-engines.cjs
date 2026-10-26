// Local benchmark: identical frozen crops for both engines. No app state or uploads.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ort=require('onnxruntime-web'),ocr=require('esearch-ocr');
const {createCanvas,loadImage,ImageData}=require('@napi-rs/canvas');
const {createWorker}=require('tesseract.js');
const root=path.resolve(process.argv[2]),modelDir=path.resolve(process.argv[3]),lang=path.resolve(process.argv[4]);
const keys=['temp','ph','phmv','orp','ec','do','saturation','tds','salinity'];
function consensus(passes){const texts=passes.map(x=>x.text.trim());const valid=texts.every(t=>/^-?\d+(?:\.\d+)?$/.test(t));return valid&&texts[0]===texts[1]?Number(texts[0]):null;}
(async()=>{
 ort.env.wasm.numThreads=1;
 ocr.setOCREnv({canvas:createCanvas,imageData:(...args)=>new ImageData(...args)});
 const sessions=[];const ortAdapter={...ort,InferenceSession:{create:async(...args)=>{const s=await ort.InferenceSession.create(...args);sessions.push(s);return s;}}};
 let worker;const records=[];const start=performance.now();
 try{
 const rec=await ocr.initRec({ort:ortAdapter,input:fs.readFileSync(path.join(modelDir,'en_PP-OCRv3_rec_infer.onnx')),decodeDic:fs.readFileSync(path.join(modelDir,'en_dict.txt'),'utf8'),imgh:48,optimize:{space:false},ortOption:{executionProviders:['wasm']}});
 const paddleLoadMs=performance.now()-start;
 const t0=performance.now();worker=await createWorker('eng',1,{langPath:lang,cacheMethod:'none'});await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789.-'});const tesseractLoadMs=performance.now()-t0;
 for(const item of JSON.parse(fs.readFileSync(path.join(root,'preparation.json')))){
 // Only the original nine-reading layout is in scope; exclude seven/ten-reading files.
 if(/100035629[67]|100036594[01]/.test(item.file))continue;
 if(item.status!=='prepared'){records.push({file:item.file,status:'screen-not-found'});continue;}
 const readings={};
 for(const key of keys){const paddle=[],tesseract=[];
 for(const variant of ['gray','binary']){
 const file=path.join(root,path.parse(item.file).name,`${key}-${variant}.png`);
 const bytes=fs.readFileSync(file),image=await loadImage(bytes),canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
 const input=ctx.getImageData(0,0,image.width,image.height);
 let t=performance.now();const p=await rec.rec(ocr.warpDet(input));paddle.push({text:p.map(x=>x.text).join(' '),score:p[0]?.mean??null,ms:performance.now()-t});
 t=performance.now();const {data}=await worker.recognize(bytes);tesseract.push({text:data.text.trim(),score:data.confidence,ms:performance.now()-t});
 canvas.width=canvas.height=1;
 }
 readings[key]={paddle,tesseract,paddleConsensus:consensus(paddle),tesseractConsensus:consensus(tesseract)};
 }
 records.push({file:item.file,status:'read',readings});console.log(item.file,'finished');
 }
 const model=fs.readFileSync(path.join(modelDir,'en_PP-OCRv3_rec_infer.onnx'));
 const result={versions:{esearch:'8.5.0',ort:'1.23.2',tesseract:'6.0.1',model:'en_PP-OCRv3_rec_infer'},runtime:'Node, ONNX Runtime Web WASM, single thread; native canvas adapter (not mobile benchmark)',paddleLoadMs,tesseractLoadMs,modelBytes:model.length,modelSHA256:crypto.createHash('sha256').update(model).digest('hex'),rssBytes:process.memoryUsage().rss,records};
 fs.writeFileSync(path.join(root,'engine-comparison.json'),JSON.stringify(result,null,2));
 }finally{if(worker)await worker.terminate();for(const s of sessions)await s.release();}
})().catch(e=>{console.error(e);process.exitCode=1;});

// Offline evaluation only; expected values are never supplied to recognition.
const fs=require('fs'),path=require('path');const {createWorker}=require('tesseract.js');
const root=path.resolve(process.argv[2]);
(async()=>{const worker=await createWorker('eng',1,{langPath:path.resolve(process.argv[3]),cacheMethod:'none'});const report=[];
try{await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789.-',preserve_interword_spaces:'1'});
for(const item of JSON.parse(fs.readFileSync(path.join(root,'preparation.json')))){
 if(item.status!=='prepared'){report.push(item);continue;}const dir=path.join(root,path.parse(item.file).name),readings={};
 for(const key of ['temp','ph','phmv','orp','ec','do','saturation','tds','salinity']){const passes=[];
 for(const variant of ['gray','binary','line']){await worker.setParameters({tessedit_pageseg_mode:variant==='line'?'13':'7'});const {data}=await worker.recognize(path.join(dir,`${key}-${variant==='line'?'gray':variant}.png`));const raw=data.text.trim();passes.push({raw,confidence:data.confidence});}
 const precision={temp:2,ph:2,phmv:0,orp:0,ec:3,do:2,saturation:1,tds:3,salinity:2}[key];
 const syntax=new RegExp('^'+(['phmv','orp'].includes(key)?'-?':'')+'\\d+'+(precision?'\\.\\d{'+precision+'}':'')+'$');
 const valid=passes.filter(p=>syntax.test(p.raw));const values=[...new Set(valid.map(p=>p.raw))];
 const accepted=valid.length>=2&&values.length===1&&valid.some(p=>p.confidence>=80)&&passes.every(p=>!p.raw||syntax.test(p.raw));
 readings[key]={passes,value:accepted?Number(values[0]):null,review:!accepted};

 }report.push({file:item.file,readings});console.log(item.file,JSON.stringify(Object.fromEntries(Object.entries(readings).map(([k,v])=>[k,v.value]))));
}fs.writeFileSync(path.join(root,'recognition.json'),JSON.stringify(report,null,2));}finally{await worker.terminate();}})().catch(e=>{console.error(e);process.exitCode=1;});

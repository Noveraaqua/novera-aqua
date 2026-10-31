/* Shared real recognition pipeline: browser worker and local regression harness. */
(function(root){'use strict';
async function run(cv,image,read,manual=false,progress=()=>{},experimental=false){let screen=null;
 const core=HoribaCore;
 progress({message:'Finding and straightening the HORIBA screen…',progress:.2});
 const candidates=manual?[{q:[[0,0],[image.width-1,0],[image.width-1,image.height-1],[0,image.height-1]],score:0,manual:true}]:core.detect(cv,image);
 if(!candidates.length)throw new Error('Screen not found. Use Adjust photo to crop tightly around the LCD, rotate upright, and retry.');
 let labels,layout,spare,best=null,labelAttempts={};
 for(let attempt=0;attempt<candidates.length;attempt++){
 const trial=core.warp(cv,image,candidates[attempt].q);labels={};spare=[];labelAttempts={};
 for(const f of core.FIELDS){
 // This specific HORIBA meter is configured to display TDS only in g/L.
 // Never OCR the TDS unit label or count it as a verified screen label.
 if(f.key==='tds'){
  labels.tds='';labelAttempts.tds=[];continue;
 }
 const top=.300+f.row*.097,rect=[f.col?.735:.285,top,f.col?.97:.49,top+.095];
 labels[f.key]='';labelAttempts[f.key]=[];
 const readLabel=async(box,binary,direct=false)=>{
  const output=await read((direct?core.cropDirect:core.crop)(cv,trial,box,binary));
  labelAttempts[f.key].push({text:String(output.text||'').slice(0,40),score:output.score,region:box,preprocess:direct?'direct':binary?'threshold':'clean'});
  if(output.score>=.50&&core.checkLayout({[f.key]:output.text},[]).matched[f.key])labels[f.key]=output.text;
 };
 for(const [box,binary] of [[rect,false],[rect,true],[[f.col?.485:.02,top,f.col?.97:.49,top+.095],false]]){
  await readLabel(box,binary);if(labels[f.key])break;
 }
 // Re-scan only the tiny labels that repeatedly went missing in the seven-photo
 // benchmark; do not guess units from neighbouring readings or expected values.
 if(experimental&&!labels[f.key]&&['temp','ph'].includes(f.key)){
  const x=f.key==='temp'?[.302,.485]:[.286,.49];
  const boxes=[[x[0],top+.010,x[1],top+.088],[x[0]+.018,top+.021,x[1],top+.080]];
  for(const box of boxes){await readLabel(box,false,true);if(labels[f.key])break;await readLabel(box,true);if(labels[f.key])break;}
 }
 }
 // Additional right-column reading would identify an unsupported ten-reading screen.
 for(let row=3;row<=5;row++)spare.push((await read(core.crop(cv,trial,[.49,.300+row*.097,.97,.395+row*.097]))).text);
 layout=core.checkLayout(labels,spare);
 const quality=(layout.ok?100:0)+layout.matchedCount*3+layout.anchorsVerified+Math.max(-2,candidates[attempt].score||0);
 if(!best||quality>best.quality)best={screen:trial,labels:{...labels},spare:spare.slice(),layout,labelAttempts:{...labelAttempts},quality,detectorScore:candidates[attempt].score||0,manual:!!candidates[attempt].manual};
 if(layout.ok)break;
 progress({message:'Checking another screen boundary…',progress:.35});
 }
 if(!best)throw new Error('No usable screen geometry. Crop the LCD and retry, or enter readings manually.');
 ({screen,labels,spare,layout}=best);
 const readings={},decisions={};let done=0;
 for(const f of core.FIELDS){
 const rect=HoribaReconcile.visualRegions[f.key];
 readings[f.key]=[];
 for(const binary of [false,true])readings[f.key].push(await read(core.cropDirect(cv,screen,rect,binary)));
 if(experimental){const visual=core.crop(cv,screen,HoribaReconcile.visualRegions[f.key]);decisions[f.key]=HoribaReconcile.decide(f.key,readings[f.key],visual);}
 progress({message:'Reading '+f.label+'…',progress:.4+(++done/9)*.55});
 }
 const result=core.parse(readings,labels,spare,experimental?decisions:null,{allowUnverified:true,fixedTdsUnit:'g/L'});
 result.diagnostics={mode:best.manual?'user_crop':'automatic',detectorScore:best.detectorScore,layout:result.layout,unitLabels:labels,unitLabelAttempts:best.labelAttempts,tdsUnitMode:'assumed_configured_g/L',spareOcr:spare,fields:core.FIELDS.map(f=>({key:f.key,passes:readings[f.key],decision:experimental?decisions[f.key]:null}))};

return {result,screen};
}
if(typeof module!=='undefined'&&module.exports)module.exports=run;else root.HoribaPipeline=run;
})(typeof self!=='undefined'?self:globalThis);

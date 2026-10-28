/* Shared real recognition pipeline: browser worker and local regression harness. */
(function(root){'use strict';
async function run(cv,image,read,manual=false,progress=()=>{},experimental=false){let screen=null;
 const core=HoribaCore;
 progress({message:'Finding and straightening the HORIBA screen…',progress:.2});
 const candidates=manual?[{q:[[0,0],[image.width-1,0],[image.width-1,image.height-1],[0,image.height-1]]}]:core.detect(cv,image);
 if(!candidates.length)throw new Error('Screen not found. Use Adjust photo to crop tightly around the LCD, rotate upright, and retry.');
 let labels,layout,spare;
 for(let attempt=0;attempt<candidates.length;attempt++){
 screen=core.warp(cv,image,candidates[attempt].q);labels={};spare=[];
 for(const f of core.FIELDS){
 const top=.300+f.row*.097,rect=[f.col?.735:.285,top,f.col?.97:.49,top+.095];
 labels[f.key]='';
 for(const [box,binary] of [[rect,false],[rect,true],[[f.col?.485:.02,top,f.col?.97:.49,top+.095],false]]){
 const result=await read(core.crop(cv,screen,box,binary));
 const one=core.checkLayout({[f.key]:result.text},[]).matched[f.key];
 if(result.score>=.50&&one){labels[f.key]=result.text;break;}
 }
 }
 // Additional right-column reading would identify an unsupported ten-reading screen.
 for(let row=3;row<=5;row++)spare.push((await read(core.crop(cv,screen,[.49,.300+row*.097,.97,.395+row*.097]))).text);
 layout=core.checkLayout(labels,spare);if(layout.ok)break;
 progress({message:'Checking another screen boundary…',progress:.35});
 }
 if(!layout.ok)throw new Error('The nine-reading HORIBA layout could not be verified. Use the nine-reading display, adjust the crop, or enter manually.');
 const readings={},decisions={};let done=0;
 for(const f of core.FIELDS){
 const left=f.col?(f.key==='salinity'?.525:.485):.02,right=f.col?.735:.285,top=.300+f.row*.097;
 readings[f.key]=[];
 for(const binary of [false,true])readings[f.key].push(await read(core.crop(cv,screen,[left,top,right,top+.092],binary)));
 if(experimental){const visual=core.crop(cv,screen,HoribaReconcile.visualRegions[f.key]);decisions[f.key]=HoribaReconcile.decide(f.key,readings[f.key],visual);}
 progress({message:'Reading '+f.label+'…',progress:.4+(++done/9)*.55});
 }
 const result=core.parse(readings,labels,spare,experimental?decisions:null);

return {result,screen};
}
if(typeof module!=='undefined'&&module.exports)module.exports=run;else root.HoribaPipeline=run;
})(typeof self!=='undefined'?self:globalThis);

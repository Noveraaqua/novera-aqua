/* HORIBA nine-reading geometry and validation. No network/storage; shared by worker/tests. */
(function(root){'use strict';
const FIELDS=[
 ['temp','Temperature','°C',0,0,/^C$/i],['ph','pH','pH',0,1,/pH$/i],
 ['phmv','pH electrode potential','mV',0,2,/pHm[VY]$/i],['orp','ORP','mV',0,3,/ORPm[VY]$/i],
 ['ec','Conductivity','mS/cm',0,4,/mS\/cm$/i],['do','Dissolved oxygen','mg/L',0,5,/mg\/LD[O0]$/i],
 ['saturation','Oxygen saturation','%',1,0,/%D[O0]$/i],['tds','TDS','ppm',1,1,/^(?:mg|g)\/LTDS$/i],['salinity','Salinity','ppt',1,2,/ppt$/i]
].map(([key,label,unit,col,row,unitPattern])=>({key,label,unit,col,row,unitPattern}));
function normalizeLabel(s){return s.replace(/\s|[°º]/g,'').replace(/[|I\[\]]+$/g,'');}
// A single, strict source-unit classifier is shared by layout verification and
// conversion. Never infer units from a TDS suffix with unknown OCR prefix.
function verifiedTdsUnit(raw){
 const label=typeof raw==='string'?raw.replace(/\s/g,''):'';
 if(/^g\/LTDS$/i.test(label))return 'g/L';
 if(/^mg\/LTDS$/i.test(label))return 'mg/L';
 return null;
}
function checkLayout(labels,spare){
 const matched=Object.fromEntries(FIELDS.map(f=>[f.key,f.key==='tds'?verifiedTdsUnit(labels[f.key])!==null:f.unitPattern.test(normalizeLabel(labels[f.key]||''))]));
 // These anchors distinguish the seven-reading display; empty lower-right space distinguishes ten-reading display.
 const anchors=['orp','ec','do','saturation','salinity'];
 const ok=anchors.every(k=>matched[k])&&Object.values(matched).filter(Boolean).length>=7&&!spare.some(t=>/[0-9σ]/.test(t));
 return {ok,matched,matchedCount:Object.values(matched).filter(Boolean).length,anchorsVerified:anchors.filter(k=>matched[k]).length,spareOcr:spare.slice()};
}
function consensus(key,passes){
 const strings=passes.map(x=>x.text.trim().replace(/[−–]/g,'-'));
 const syntax=['orp','phmv'].includes(key)?/^-?\d+$/:key==='ph'?/^\d{1,2}\.\d{2}$/:/^-?\d+\.\d{1,3}$/;
 if(strings.length<2||!strings.every(t=>syntax.test(t))||!strings.every(t=>t===strings[0]))return null;
 if(passes.some(p=>!Number.isFinite(p.score)||p.score<.80))return null;
 const value=Number(strings[0]);
 if(!Number.isFinite(value)||(!['temp','orp','phmv'].includes(key)&&value<0)||key==='ph'&&value>14)return null;
 return value;
}
function parse(readings,labels,spare,decisions=null,options={}){
 const layout=checkLayout(labels,spare);
 if(!layout.ok&&!options.allowUnverified)
  throw new Error('The nine-reading HORIBA layout could not be verified. Adjust the crop, confirm the exact screen layout, or enter readings manually.');
 const rows=FIELDS.map(f=>{
  const passes=readings[f.key]||[],decision=decisions?.[f.key]||null;
  const proposed=decision?decision.value:consensus(f.key,passes);
  // A TDS unit is verified ONLY when the same strict classifier has established
  // a source unit. Unknown OCR prefixes must not satisfy layout verification.
  // Opt-in configured HORIBA meter always displays TDS in g/L; never claim
  // this is OCR unit verification.
  const assumedTds=f.key==='tds'&&options.fixedTdsUnit==='g/L';
  const sourceUnit=f.key==='tds'?(assumedTds?'g/L':verifiedTdsUnit(labels[f.key])):f.unit;
  const matched=!!layout.matched[f.key];
  const g=f.key==='tds'&&sourceUnit==='g/L';
  const unitStatus=assumedTds?'assumed':matched?'verified':layout.ok&&f.key!=='tds'?'inferred':'missing';
  const sourceDisplay=proposed==null?null:(decision?.display??String(proposed));
  const canUseNumber=matched||assumedTds||options.allowUnverified;
  const ready=canUseNumber&&(f.key!=='tds'||sourceUnit!==null)?proposed:null;
  const factor=f.key==='tds'&&g?1000:1;
  const value=ready==null?null:+(ready*factor).toPrecision(10);
  const display=ready==null?null:(f.key==='tds'&&g?String(ready*1000):sourceDisplay);
  const messages=[];
  if(unitStatus==='assumed')messages.push('Unit assumed from configured HORIBA meter: g/L. This unit was NOT verified by OCR. Confirm the photo uses this configured meter before applying TDS.');
  if(unitStatus==='inferred')messages.push('INFERRED UNIT: '+f.unit+' is suggested from the verified nine-reading screen position, but OCR did not read its unit label. Check the actual unit on the photo before applying.');
  if(unitStatus==='missing')messages.push(f.key==='tds'?
   'TDS UNIT COULD NOT BE VERIFIED (MISSING / AMBIGUOUS): g/L and mg/L are not interchangeable. No conversion was made. Select the unit actually visible in the photo to use the OCR candidate.':
   'MISSING UNIT LABEL / UNVERIFIED SCREEN POSITION: verify the displayed unit and the nine-reading layout before applying.');
  if(!layout.ok)messages.push('SCREEN LAYOUT NOT FULLY VERIFIED: confirm the exact nine-reading display.');
  if(proposed==null)messages.push('NUMERIC READING UNRESOLVED: leave blank or type the value after checking the photo.');
  else if(decision&&decision.reason!=='exact_agreement')messages.push('Experimental numeric suggestion ('+decision.reason.replace(/_/g,' ')+'): verify the digits and sign.');
  return {key:f.key,label:f.label,unit:f.unit,value,display,sourceValue:proposed,sourceDisplay,sourceUnit,unitStatus,
   reason:decision?.reason||null,raw:passes.map(p=>p.text).join(' / ')+' '+(labels[f.key]||''),
   uncertain:ready==null||unitStatus!=='verified'||!layout.ok,
   freshwater:f.key==='tds',
   conversion:f.key==='tds'&&ready!=null?String(ready)+' '+sourceUnit+' → '+String(value)+' mg/L':'',
   message:messages.join(' ')};
 });
 const missing=rows.filter(r=>r.unitStatus==='missing'||r.unitStatus==='inferred').map(r=>r.key);
 const assumed=rows.filter(r=>r.unitStatus==='assumed').map(r=>r.key);
 const warnings=[
  layout.ok?'HORIBA nine-reading screen verified using the layout anchors. Individual unit labels may still be missing; review all units and numbers.':
   'HORIBA NINE-READING LAYOUT NOT AUTOMATICALLY VERIFIED. Confirm the exact screen structure and every reading against the photo before using them.',
  missing.length?'OCR did not verify the unit label for: '+missing.join(', ')+'. All affected values require manual verification.':'No missing or inferred unit labels for the other parameters; review their readings anyway.',
  assumed.length?'TDS source unit is assumed from this configured HORIBA meter (g/L), not recognized by OCR. Confirm the configured meter before applying.':null,
  'The meter clock has NOT been applied. Confirm the actual measurement date and time.'
 ].filter(Boolean);
 return {readings:rows,layout:{verified:layout.ok,matched:layout.matched,matchedCount:layout.matchedCount,anchorsVerified:layout.anchorsVerified,manualConfirmationRequired:!layout.ok},warnings};
}
function detect(cv,image){
 const mats=[];const keep=m=>(mats.push(m),m);const out=[];
 try{
 const src=keep(cv.matFromImageData(image)),small=keep(new cv.Mat()),gray=keep(new cv.Mat()),hsv=keep(new cv.Mat()),rgb=keep(new cv.Mat());
 const scale=Math.min(1,900/Math.max(image.width,image.height));cv.resize(src,small,new cv.Size(Math.round(image.width*scale),Math.round(image.height*scale)));
 cv.cvtColor(small,gray,cv.COLOR_RGBA2GRAY);cv.cvtColor(small,rgb,cv.COLOR_RGBA2RGB);cv.cvtColor(rgb,hsv,cv.COLOR_RGB2HSV);
 const w=small.cols,h=small.rows;
 for(const level of [75,95,115,135,155,175,195,215,235])for(const size of [1,5,11,21]){
 const mask=new cv.Mat(),kernel=cv.Mat.ones(size,size,cv.CV_8U),contours=new cv.MatVector(),hierarchy=new cv.Mat();
 try{cv.threshold(gray,mask,level,255,cv.THRESH_BINARY);if(size>1)cv.morphologyEx(mask,mask,cv.MORPH_CLOSE,kernel);cv.findContours(mask,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
 for(let n=0;n<contours.size();n++){const contour=contours.get(n),poly=new cv.Mat();try{
 const area=cv.contourArea(contour);if(area<w*h*.035||area>w*h*.65)continue;
 cv.approxPolyDP(contour,poly,.025*cv.arcLength(contour,true),true);if(poly.rows!==4||!cv.isContourConvex(poly))continue;
 let q=Array.from({length:4},(_,i)=>[poly.data32S[i*2],poly.data32S[i*2+1]]),center=[q.reduce((s,p)=>s+p[0],0)/4,q.reduce((s,p)=>s+p[1],0)/4];q.sort((a,b)=>Math.atan2(a[1]-center[1],a[0]-center[0])-Math.atan2(b[1]-center[1],b[0]-center[0]));
 const lengths=q.map((a,i)=>Math.hypot(a[0]-q[(i+1)%4][0],a[1]-q[(i+1)%4][1]));if(Math.max(...lengths)/Math.min(...lengths)>2.4)continue;
 const scores=q.map((a,i)=>{const b=q[(i+1)%4],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],len=Math.hypot(mid[0]-center[0],mid[1]-center[1]);let yes=0,total=0;
 for(let u=0;u<12;u++)for(let d=0;d<12;d++){const t=.15+u*.7/11,dist=8+d*(Math.min(...lengths)*.24-8)/11,x=Math.round(a[0]*(1-t)+b[0]*t+(mid[0]-center[0])/len*dist),y=Math.round(a[1]*(1-t)+b[1]*t+(mid[1]-center[1])/len*dist);if(x<0||y<0||x>=w||y>=h)continue;total++;const j=(y*w+x)*3;if(hsv.data[j]>=90&&hsv.data[j]<=130&&hsv.data[j+1]>=90&&hsv.data[j+2]>=45)yes++;}return total?yes/total:0;});
 const top=scores.indexOf(Math.max(...scores)),ratio=(lengths[top]+lengths[(top+2)%4])/(lengths[(top+1)%4]+lengths[(top+3)%4]);if(ratio<1.05||ratio>1.65||scores[top]<.35)continue;
 q=q.slice(top).concat(q.slice(0,top)).map(p=>p.map(v=>v/scale));const score=scores[top]-Math.abs(ratio-1.32)*.6;
 if(!out.some(c=>c.q.every((p,i)=>Math.hypot(p[0]-q[i][0],p[1]-q[i][1])<18)))out.push({q,score});
 }finally{poly.delete();contour.delete();}}
 }finally{mask.delete();kernel.delete();contours.delete();hierarchy.delete();}
 }
 return out.sort((a,b)=>b.score-a.score).slice(0,6);
 }finally{mats.forEach(m=>m.delete());}
}
function warp(cv,image,q){const src=cv.matFromImageData(image),a=cv.matFromArray(4,1,cv.CV_32FC2,q.flat()),b=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,899,0,899,674,0,674]),matrix=cv.getPerspectiveTransform(a,b),out=new cv.Mat();try{cv.warpPerspective(src,out,matrix,new cv.Size(900,675));return new ImageData(new Uint8ClampedArray(out.data),900,675);}finally{[src,a,b,matrix,out].forEach(x=>x.delete());}}
function crop(cv,image,rect,binary=false){const src=cv.matFromImageData(image),r=src.roi(new cv.Rect(Math.round(rect[0]*image.width),Math.round(rect[1]*image.height),Math.round((rect[2]-rect[0])*image.width),Math.round((rect[3]-rect[1])*image.height))),gray=new cv.Mat(),scaled=new cv.Mat(),border=new cv.Mat(),rgba=new cv.Mat();try{cv.cvtColor(r,gray,cv.COLOR_RGBA2GRAY);
const ink=new cv.Mat(),lines=new cv.Mat(),lineKernel=cv.Mat.ones(1,Math.max(20,Math.round(gray.cols*.60)),cv.CV_8U),dilateKernel=cv.Mat.ones(3,1,cv.CV_8U);
try{cv.threshold(gray,ink,0,255,cv.THRESH_BINARY_INV+cv.THRESH_OTSU);cv.morphologyEx(ink,lines,cv.MORPH_OPEN,lineKernel);cv.dilate(lines,lines,dilateKernel);gray.setTo(new cv.Scalar(255),lines);}finally{[ink,lines,lineKernel,dilateKernel].forEach(m=>m.delete());}
cv.GaussianBlur(gray,gray,new cv.Size(3,3),.65);cv.resize(gray,scaled,new cv.Size(gray.cols*2,gray.rows*2),0,0,cv.INTER_CUBIC);if(binary)cv.threshold(scaled,scaled,0,255,cv.THRESH_BINARY+cv.THRESH_OTSU);cv.copyMakeBorder(scaled,border,20,20,20,20,cv.BORDER_CONSTANT,new cv.Scalar(255));cv.cvtColor(border,rgba,cv.COLOR_GRAY2RGBA);return new ImageData(new Uint8ClampedArray(rgba.data),rgba.cols,rgba.rows);}finally{[src,r,gray,scaled,border,rgba].forEach(m=>m.delete());}}
function cropDirect(cv,image,rect,binary=false){
 // Matches experiments/horiba/prepare.py: numeric digits are not erased by
 // horizontal-line morphology. No ground truth or expected range is used.
 const src=cv.matFromImageData(image);
 const x0=Math.floor(rect[0]*image.width),y0=Math.floor(rect[1]*image.height);
 const x1=Math.floor(rect[2]*image.width),y1=Math.floor(rect[3]*image.height);
 if(x1<=x0||y1<=y0){src.delete();throw new Error('Invalid numeric crop.');}
 const roi=src.roi(new cv.Rect(x0,y0,x1-x0,y1-y0));
 const gray=new cv.Mat(),scaled=new cv.Mat(),border=new cv.Mat(),rgba=new cv.Mat();
 try{cv.cvtColor(roi,gray,cv.COLOR_RGBA2GRAY);cv.GaussianBlur(gray,gray,new cv.Size(3,3),.65);
  cv.resize(gray,scaled,new cv.Size(gray.cols*2,gray.rows*2),0,0,cv.INTER_CUBIC);
  if(binary)cv.threshold(scaled,scaled,0,255,cv.THRESH_BINARY+cv.THRESH_OTSU);
  cv.copyMakeBorder(scaled,border,20,20,20,20,cv.BORDER_CONSTANT,new cv.Scalar(255));
  cv.cvtColor(border,rgba,cv.COLOR_GRAY2RGBA);
  return new ImageData(new Uint8ClampedArray(rgba.data),rgba.cols,rgba.rows);
 }finally{[src,roi,gray,scaled,border,rgba].forEach(m=>m.delete());}
}
const api={FIELDS,verifiedTdsUnit,checkLayout,consensus,parse,detect,warp,crop,cropDirect};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HoribaCore=api;
})(typeof self!=='undefined'?self:globalThis);

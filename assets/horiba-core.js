/* HORIBA nine-reading geometry and validation. No network/storage; shared by worker/tests. */
(function(root){'use strict';
const FIELDS=[
 ['temp','Temperature','°C',0,0,/C$/i],['ph','pH','pH',0,1,/pH$/i],
 ['phmv','pH electrode potential','mV',0,2,/pHm[VY]$/i],['orp','ORP','mV',0,3,/ORPm[VY]$/i],
 ['ec','Conductivity','mS/cm',0,4,/mS\/cm$/i],['do','Dissolved oxygen','mg/L',0,5,/mg\/LD[O0]$/i],
 ['saturation','Oxygen saturation','%',1,0,/%D[O0]$/i],['tds','TDS','ppm',1,1,/(?:mg|g)\/LTDS$/i],['salinity','Salinity','ppt',1,2,/ppt$/i]
].map(([key,label,unit,col,row,unitPattern])=>({key,label,unit,col,row,unitPattern}));
function normalizeLabel(s){return s.replace(/\s|[°º]/g,'').replace(/[|I\[\]]+$/g,'');}
function checkLayout(labels,spare){
 const matched=Object.fromEntries(FIELDS.map(f=>[f.key,f.unitPattern.test(normalizeLabel(labels[f.key]||''))]));
 // These anchors distinguish the seven-reading display; empty lower-right space distinguishes ten-reading display.
 const anchors=['orp','ec','do','saturation','salinity'];
 const ok=anchors.every(k=>matched[k])&&Object.values(matched).filter(Boolean).length>=7&&!spare.some(t=>/[0-9σ]/.test(t));
 return {ok,matched};
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
function parse(readings,labels,spare){
 const layout=checkLayout(labels,spare);if(!layout.ok)throw new Error('The nine-reading HORIBA layout could not be verified. Use the nine-reading display, adjust the screen crop, or enter readings manually.');
 return {readings:FIELDS.map(f=>{const passes=readings[f.key]||[],value=layout.matched[f.key]?consensus(f.key,passes):null;
 const g=f.key==='tds'&&!/mg\/L/i.test(normalizeLabel(labels.tds||'')),factor=g?1000:1;
 return {key:f.key,label:f.label,unit:f.unit,value:value==null?null:+(value*factor).toPrecision(10),raw:passes.map(p=>p.text).join(' / ')+' '+(labels[f.key]||''),uncertain:value==null,freshwater:f.key==='tds',conversion:f.key==='tds'&&value!=null?`${value} ${g?'g/L':'mg/L'} → ${value*factor} mg/L`:'',message:value==null?'Check this reading: recognition or its label was uncertain.':''};}),warnings:['HORIBA nine-reading layout checked. Confirm every reading against the photo.','The meter clock has NOT been applied. Confirm the actual measurement date and time.']};
}
function detect(cv,image){
 const mats=[];const keep=m=>(mats.push(m),m);const out=[];
 try{
 const src=keep(cv.matFromImageData(image)),small=keep(new cv.Mat()),gray=keep(new cv.Mat()),hsv=keep(new cv.Mat()),rgb=keep(new cv.Mat());
 const scale=Math.min(1,900/Math.max(image.width,image.height));cv.resize(src,small,new cv.Size(Math.round(image.width*scale),Math.round(image.height*scale)));
 cv.cvtColor(small,gray,cv.COLOR_RGBA2GRAY);cv.cvtColor(small,rgb,cv.COLOR_RGBA2RGB);cv.cvtColor(rgb,hsv,cv.COLOR_RGB2HSV);
 const w=small.cols,h=small.rows;
 for(const level of [75,95,115,135,155,175,195,215,235])for(const size of [1,3,7,13]){
 const mask=new cv.Mat(),kernel=cv.Mat.ones(size,size,cv.CV_8U),contours=new cv.MatVector(),hierarchy=new cv.Mat();
 try{cv.threshold(gray,mask,level,255,cv.THRESH_BINARY);if(size>1)cv.morphologyEx(mask,mask,cv.MORPH_CLOSE,kernel);cv.findContours(mask,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
 for(let n=0;n<contours.size();n++){const contour=contours.get(n),poly=new cv.Mat();try{
 const area=cv.contourArea(contour);if(area<w*h*.035||area>w*h*.65)continue;
 cv.approxPolyDP(contour,poly,.025*cv.arcLength(contour,true),true);if(poly.rows!==4||!cv.isContourConvex(poly))continue;
 let q=Array.from({length:4},(_,i)=>[poly.data32S[i*2],poly.data32S[i*2+1]]),center=[q.reduce((s,p)=>s+p[0],0)/4,q.reduce((s,p)=>s+p[1],0)/4];q.sort((a,b)=>Math.atan2(a[1]-center[1],a[0]-center[0])-Math.atan2(b[1]-center[1],b[0]-center[0]));
 const lengths=q.map((a,i)=>Math.hypot(a[0]-q[(i+1)%4][0],a[1]-q[(i+1)%4][1]));if(Math.max(...lengths)/Math.min(...lengths)>2.4)continue;
 const scores=q.map((a,i)=>{const b=q[(i+1)%4],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],len=Math.hypot(mid[0]-center[0],mid[1]-center[1]);let yes=0,total=0;
 for(let u=0;u<12;u++)for(let d=0;d<12;d++){const t=.15+u*.7/11,dist=4+d*(Math.min(...lengths)*.24-4)/11,x=Math.round(a[0]*(1-t)+b[0]*t+(mid[0]-center[0])/len*dist),y=Math.round(a[1]*(1-t)+b[1]*t+(mid[1]-center[1])/len*dist);if(x<0||y<0||x>=w||y>=h)continue;total++;const j=(y*w+x)*3;if(hsv.data[j]>=90&&hsv.data[j]<=130&&hsv.data[j+1]>=90&&hsv.data[j+2]>=45)yes++;}return total?yes/total:0;});
 const top=scores.indexOf(Math.max(...scores)),ratio=(lengths[top]+lengths[(top+2)%4])/(lengths[(top+1)%4]+lengths[(top+3)%4]);if(ratio<1.05||ratio>1.65||scores[top]<.35)continue;
 q=q.slice(top).concat(q.slice(0,top)).map(p=>p.map(v=>v/scale));const score=scores[top]-Math.abs(ratio-1.32)*.6;
 if(!out.some(c=>c.q.every((p,i)=>Math.hypot(p[0]-q[i][0],p[1]-q[i][1])<18)))out.push({q,score});
 }finally{poly.delete();contour.delete();}}
 }finally{mask.delete();kernel.delete();contours.delete();hierarchy.delete();}
 }
 return out.sort((a,b)=>b.score-a.score).slice(0,3);
 }finally{mats.forEach(m=>m.delete());}
}
function warp(cv,image,q){const src=cv.matFromImageData(image),a=cv.matFromArray(4,1,cv.CV_32FC2,q.flat()),b=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,899,0,899,674,0,674]),matrix=cv.getPerspectiveTransform(a,b),out=new cv.Mat();try{cv.warpPerspective(src,out,matrix,new cv.Size(900,675));return new ImageData(new Uint8ClampedArray(out.data),900,675);}finally{[src,a,b,matrix,out].forEach(x=>x.delete());}}
function crop(cv,image,rect,binary=false){const src=cv.matFromImageData(image),r=src.roi(new cv.Rect(Math.round(rect[0]*image.width),Math.round(rect[1]*image.height),Math.round((rect[2]-rect[0])*image.width),Math.round((rect[3]-rect[1])*image.height))),gray=new cv.Mat(),scaled=new cv.Mat(),border=new cv.Mat(),rgba=new cv.Mat();try{cv.cvtColor(r,gray,cv.COLOR_RGBA2GRAY);
const ink=new cv.Mat(),lines=new cv.Mat(),lineKernel=cv.Mat.ones(1,Math.max(20,Math.round(gray.cols*.60)),cv.CV_8U),dilateKernel=cv.Mat.ones(3,1,cv.CV_8U);
try{cv.threshold(gray,ink,0,255,cv.THRESH_BINARY_INV+cv.THRESH_OTSU);cv.morphologyEx(ink,lines,cv.MORPH_OPEN,lineKernel);cv.dilate(lines,lines,dilateKernel);gray.setTo(new cv.Scalar(255),lines);}finally{[ink,lines,lineKernel,dilateKernel].forEach(m=>m.delete());}
cv.GaussianBlur(gray,gray,new cv.Size(3,3),.65);cv.resize(gray,scaled,new cv.Size(gray.cols*2,gray.rows*2),0,0,cv.INTER_CUBIC);if(binary)cv.threshold(scaled,scaled,0,255,cv.THRESH_BINARY+cv.THRESH_OTSU);cv.copyMakeBorder(scaled,border,20,20,20,20,cv.BORDER_CONSTANT,new cv.Scalar(255));cv.cvtColor(border,rgba,cv.COLOR_GRAY2RGBA);return new ImageData(new Uint8ClampedArray(rgba.data),rgba.cols,rgba.rows);}finally{[src,r,gray,scaled,border,rgba].forEach(m=>m.delete());}}
const api={FIELDS,checkLayout,consensus,parse,detect,warp,crop};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HoribaCore=api;
})(typeof self!=='undefined'?self:globalThis);

/* Browser-only OCR controller. Images and recognition text never enter application state. */
(function(){
'use strict';
const VERSION='PaddleOCR-en-v3/esearch-8.5.0',EXPERIMENTAL_VERSION=VERSION+'+visual-reconcile-v2';
const WORKER_URL=new URL('./horiba-worker.js',document.currentScript.src).href;
function attach(form,options){
 const host=form.querySelector('[data-photo-host]');if(!host)return;
 let disposed=false,generation=0,worker=null,activeInput=null,canvas=null,bitmap=null,applied=false,used=false,owned={},metadata=[],busy=false,cancelScan=null,activeTimer=null,lastOcrVersion=VERSION;
 const field=k=>form.elements.namedItem(k);
 const el=(tag,props={},text)=>{const n=document.createElement(tag);Object.assign(n,props);if(text!=null)n.textContent=text;return n;};
 const launch=el('button',{type:'button',className:'btn ghost'},'Read from photo');host.append(launch);
 const panel=el('section',{className:'photo-panel',hidden:true});host.append(panel);
 panel.innerHTML='<h3>Read from photo</h3><p class="sub">Your photo is processed on this device. Only confirmed readings are saved.</p><p class="sub">Choose a sharp photo. Avoid glare and include the parameter labels and units. HORIBA nine-reading display only. Screen alignment is automatic; use Adjust photo if it cannot find the screen.</p><div class="photo-actions"><label>Choose image <input data-file type="file" accept="image/jpeg,image/png,image/webp"></label><label>Take photo <input data-camera type="file" accept="image/*" capture="environment"></label></div><div class="photo-preview" hidden><canvas aria-label="Temporary meter photo"></canvas><div class="photo-box"></div></div><div data-image-controls hidden><label class="photo-review-confirm"><input type="checkbox" data-experimental> Try experimental visual reconciliation (manual review required)</label><details data-adjust><summary>Adjust photo</summary><label class="photo-review-confirm"><input type="checkbox" data-manual> My crop contains only the LCD, upright (skip automatic screen detection)</label><div class="photo-sliders"></div><div class="photo-actions"><button type="button" data-rotate class="btn ghost sm">Rotate 90°</button><button type="button" data-full class="btn ghost sm">Whole image</button></div></details><button type="button" data-run class="btn">Scan HORIBA screen</button></div><progress max="1" value="0" hidden></progress><p data-status role="status" aria-live="polite"></p><div data-results></div><div class="photo-actions"><button type="button" data-stop class="btn ghost" hidden>Stop recognition</button><button type="button" data-cancel class="btn ghost">Cancel photo entry</button></div>';
 const q=s=>panel.querySelector(s),status=q('[data-status]'),preview=q('.photo-preview'),box=q('.photo-box'),controls=q('[data-image-controls]'),results=q('[data-results]'),progress=q('progress');
 const workspace=el('div',{className:'photo-workspace'});panel.insertBefore(workspace,controls);workspace.append(preview,results);
 canvas=q('canvas');let crop={left:0,top:0,right:100,bottom:100},rows=[];
 const sliders={};for(const [key,label] of [['left','Crop left'],['right','Crop right'],['top','Crop top'],['bottom','Crop bottom']]){const l=el('label',{},label),i=el('input',{type:'range',min:'0',max:'100',step:'1',value:crop[key]});i.setAttribute('aria-label',label);l.append(i);q('.photo-sliders').append(l);sliders[key]=i;i.oninput=()=>{crop[key]=+i.value;invalidate();drawBox();};}
 function drawBox(){for(const k in sliders)sliders[k].value=crop[k];box.style.left=crop.left+'%';box.style.top=crop.top+'%';box.style.width=(crop.right-crop.left)+'%';box.style.height=(crop.bottom-crop.top)+'%';}
 function restoreOwned(){for(const k in owned){const f=field(k),v=owned[k];if(f&&f.value===v.after)f.value=v.before;}owned={};metadata=[];applied=false;}
 function invalidate(){restoreOwned();results.replaceChildren();workspace.classList.remove('has-results');rows=[];}
 function destroyWorker(){if(activeTimer){clearTimeout(activeTimer);activeTimer=null;}if(cancelScan){const reject=cancelScan;cancelScan=null;reject(new Error('Recognition cancelled.'));}if(activeInput){activeInput.width=activeInput.height=1;activeInput=null;}if(worker){worker.terminate();worker=null;}busy=false;for(const c of controls.querySelectorAll('input,button'))c.disabled=false;q('[data-stop]').hidden=true;progress.hidden=true;q('[data-run]').disabled=false;}
 function clearImage(){if(bitmap){bitmap.close?.();bitmap=null;}if(canvas){canvas.width=1;canvas.height=1;}preview.hidden=true;controls.hidden=true;}
 function reset(){generation++;destroyWorker();invalidate();clearImage();lastOcrVersion=VERSION;q('[data-experimental]').checked=false;for(const input of panel.querySelectorAll('input[type=file]'))input.value='';used=false;status.textContent='';panel.hidden=true;launch.hidden=false;}
 async function choose(file){
  if(!file)return;q('[data-manual]').checked=false;generation++;const token=generation;destroyWorker();invalidate();clearImage();used=true;
  if(file.size>15*1024*1024){status.textContent='Choose a photo smaller than 15 MB.';return;}
  if(!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)){status.textContent='Choose a JPEG, PNG or WebP image. Convert HEIC to JPEG if your browser cannot open it.';return;}
  status.textContent='Opening photo…';
  try{
   const b=await createImageBitmap(file,{imageOrientation:'from-image'});
   if(disposed||token!==generation){b.close();return;}
   const scale=Math.min(1,1600/Math.max(b.width,b.height));canvas.width=Math.round(b.width*scale);canvas.height=Math.round(b.height*scale);canvas.getContext('2d').drawImage(b,0,0,canvas.width,canvas.height);b.close();
   // CSS sizing keeps the crop overlay aligned with the actual rendered canvas.
   canvas.style.maxHeight='none';preview.style.maxWidth=Math.min(520,440*canvas.width/canvas.height)+'px';
   crop={left:0,top:0,right:100,bottom:100};preview.hidden=false;controls.hidden=false;drawBox();status.textContent='Ready to scan. The screen will be aligned automatically.';
  }catch(e){if(disposed||token!==generation)return;status.textContent='This photo could not be opened. Try JPEG or PNG, or enter readings manually.';}
 }
 q('[data-file]').onchange=e=>choose(e.target.files[0]);q('[data-camera]').onchange=e=>choose(e.target.files[0]);
 launch.onclick=()=>{panel.hidden=false;launch.hidden=true;};q('[data-cancel]').onclick=reset;
 q('[data-full]').onclick=()=>{invalidate();crop={left:0,top:0,right:100,bottom:100};drawBox();};
 q('[data-rotate]').onclick=()=>{
  generation++;destroyWorker();invalidate();const tmp=document.createElement('canvas');tmp.width=canvas.height;tmp.height=canvas.width;const c=tmp.getContext('2d');c.translate(tmp.width,0);c.rotate(Math.PI/2);c.drawImage(canvas,0,0);canvas.width=tmp.width;canvas.height=tmp.height;canvas.getContext('2d').drawImage(tmp,0,0);tmp.width=tmp.height=1;
  preview.style.maxWidth=Math.min(520,440*canvas.width/canvas.height)+'px';crop={left:0,top:0,right:100,bottom:100};drawBox();
 };
 let start=null;
 const point=e=>{const r=preview.getBoundingClientRect();return {x:Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)),y:Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100))};};
 preview.onpointerdown=e=>{if(busy)return;start=point(e);preview.setPointerCapture(e.pointerId);};
 preview.onpointermove=e=>{if(!start)return;const p=point(e);crop={left:Math.min(start.x,p.x),right:Math.max(start.x,p.x),top:Math.min(start.y,p.y),bottom:Math.max(start.y,p.y)};drawBox();};
 preview.onpointerup=()=>{if(start){invalidate();start=null;}};preview.onpointercancel=()=>{start=null;};
 q('[data-stop]').onclick=()=>{generation++;destroyWorker();status.textContent='Recognition stopped. Retry or enter readings manually.';};
 q('[data-run]').onclick=async()=>{
  if(busy)return;
  if(crop.right-crop.left<3||crop.bottom-crop.top<3){status.textContent='Select a larger crop using the sliders or drag across the screen.';return;}
  invalidate();const token=++generation;busy=true;used=true;for(const c of controls.querySelectorAll('input,button'))c.disabled=true;progress.hidden=false;q('[data-stop]').hidden=false;q('[data-run]').disabled=true;status.textContent='Loading OCR on this device…';
  let input=null,timer;
  try{
   const timeout=new Promise((_,reject)=>{activeTimer=timer=setTimeout(()=>reject(new Error('Recognition timed out. Retry with a clear close-up, or enter manually.')),120000);});
   const x=Math.round(canvas.width*crop.left/100),y=Math.round(canvas.height*crop.top/100),width=Math.round(canvas.width*(crop.right-crop.left)/100),height=Math.round(canvas.height*(crop.bottom-crop.top)/100);
   input=document.createElement('canvas');activeInput=input;input.width=width;input.height=height;const c=input.getContext('2d');c.drawImage(canvas,x,y,width,height,0,0,width,height);
   const image=c.getImageData(0,0,width,height);
   const job=new Promise((resolve,reject)=>{
    cancelScan=reject;
    const w=new Worker(WORKER_URL);worker=w;
    w.onerror=()=>reject(new Error('OCR assets could not load. Retry or enter readings manually.'));
    w.onmessage=({data})=>{if(disposed||token!==generation)return;
     if(data.type==='progress'){status.textContent=data.message;progress.value=data.progress;}
     if(data.type==='error')reject(new Error(data.message));
     if(data.type==='result'){cancelScan=null;resolve(data);}
    };
    w.postMessage({type:'scan',image,manual:q('[data-manual]').checked,experimental:q('[data-experimental]').checked},[image.data.buffer]);
   });
   const data=await Promise.race([job,timeout]);if(disposed||token!==generation)return;
   canvas.width=data.screen.width;canvas.height=data.screen.height;canvas.getContext('2d').putImageData(data.screen,0,0);
   preview.style.maxWidth='520px';crop={left:0,top:0,right:100,bottom:100};drawBox();q('[data-manual]').checked=true;
   lastOcrVersion=q('[data-experimental]').checked?EXPERIMENTAL_VERSION:VERSION;const parsed=data.result;showResults(parsed);status.textContent='Review every value against the photo. OCR can misread digits, signs and units.';
  }catch(e){if(!disposed&&token===generation){generation++;destroyWorker();status.textContent=e.message||'Recognition failed. Retry or enter readings manually.';}}
  finally{clearTimeout(timer);if(input)input.width=input.height=1;if(token===generation)destroyWorker();}
 };
 function inputValue(i){return i.value===''?null:Number(i.value);}
 function showResults(parsed){
  results.replaceChildren();workspace.classList.add('has-results');for(const text of parsed.warnings)results.append(el('p',{className:'photo-warning'},text));
  results.append(el('h3',{},'Review readings'));
  const layoutConfirm=parsed.layout&&!parsed.layout.verified?el('label',{className:'photo-review-confirm'}):null;
 const layoutCheck=layoutConfirm?el('input',{type:'checkbox'}):null;
 if(layoutConfirm){layoutCheck.setAttribute('aria-label','Confirm HORIBA nine reading layout');
 layoutConfirm.append(layoutCheck,document.createTextNode('I confirm this photo shows the HORIBA nine-reading display: temperature, pH, pH mV, ORP, EC and DO (left), with %DO, TDS and salinity (right).'));
 results.append(layoutConfirm);}
 const primary=el('div',{className:'photo-review'}),extra=el('div',{className:'photo-review'});results.append(primary,el('h3',{},'Additional readings'),extra);
  const diagnosticsBtn=el('button',{type:'button',className:'btn ghost sm'},'Download OCR diagnostics (text only)');results.append(diagnosticsBtn);
  diagnosticsBtn.onclick=()=>{const log={version:lastOcrVersion,time:new Date().toISOString(),diagnostics:parsed.diagnostics||null,readings:parsed.readings.map(r=>({key:r.key,display:r.display,uncertain:r.uncertain,reason:r.reason,raw:r.raw}))};
   const url=URL.createObjectURL(new Blob([JSON.stringify(log,null,2)],{type:'application/json'}));
   const a=el('a',{href:url,download:'novera-horiba-ocr-diagnostics.json'});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);};
  rows=parsed.readings.map(r=>{
   const card=el('div',{className:'photo-reading'}),label=el('label',{},r.label+' ('+r.unit+')'),i=el('input',{type:'number',step:'any',value:r.value==null?'':String(r.display??r.value)});i.setAttribute('aria-label','Photo '+r.label);label.append(i);card.append(label,el('small',{},'OCR: '+(r.raw||'No reliable candidate')));
   if(r.uncertain)card.append(el('small',{className:'photo-warning'},'Uncertain: verify this measurement manually.'));if(r.conversion)card.append(el('small',{},r.conversion));if(r.message)card.append(el('small',{className:'photo-warning'},r.message));
   if(r.key==='tds')card.append(el('small',{},'For dilute freshwater only: mg/L ≈ ppm. Do not use this assumption for saline samples.'));
   const target=field(r.key);if(target){card.append(el('small',{},'Destination: '+r.label+' · '+options.range(r.key)));const warning=el('small',{className:'photo-warning'});card.append(warning);const warn=()=>{const judged=inputValue(i)==null?null:options.judge?.(r.key,inputValue(i));warning.textContent=judged&&judged.lvl?'Outside the configured target — verify this value against the photo.':'';};i.addEventListener('input',warn);warn();}
   (target?primary:extra).append(card);return {r,input:i,target};
  });
  const check=(label)=>{const l=el('label',{className:'photo-review-confirm'}),i=el('input',{type:'checkbox'});l.append(i,document.createTextNode(label));results.append(l);return i;};
  const freshwater=check('This is dilute freshwater; use the displayed TDS conversion to ppm.');
  const notes=check('Include additional readings in the notes.');
  const overwrite=check('Replace populated fields with the reviewed values (including notes if selected).');
  const reviewed=check('I checked all chosen values and units against the photo.');
  const apply=el('button',{type:'button',className:'btn'},'Use reviewed readings');results.append(apply);
  results.oninput=e=>{applied=false;if(e.target!==reviewed)reviewed.checked=false;};
  apply.onclick=()=>{
   if(layoutCheck&&!layoutCheck.checked){status.textContent='The instrument layout could not be verified by OCR. Confirm the nine-reading layout above, or cancel photo entry.';return;}
   if(!reviewed.checked){status.textContent='Review the readings and tick the confirmation first.';return;}
   const values=[],additional=[];
   for(const row of rows){const {r,input,target}=row;if(input.value==='')continue;const n=Number(input.value);if(!Number.isFinite(n)||(n<0&&!['temp','orp','phmv'].includes(r.key))||(r.key==='ph'&&(n<0||n>14))){status.textContent='Check '+r.label+'.';return;}
    if(r.key==='tds'&&r.freshwater&&!freshwater.checked){status.textContent='Confirm dilute freshwater before converting TDS to ppm, or leave TDS blank and enter it manually.';return;}
    if(target)values.push({r,n,target});else additional.push(r.label+': '+n+' '+r.unit);
   }
   if(!values.length){status.textContent='Enter at least one supported reading to use, or cancel photo entry and log manually.';return;}
   if(!overwrite.checked&&values.some(v=>v.target.value!==''&&Number(v.target.value)!==v.n)){status.textContent='Some fields already contain values. Tick Replace populated fields to overwrite them, or keep those photo fields blank.';return;}
   if(notes.checked&&additional.length&&field('note').value&&!overwrite.checked){status.textContent='The notes field already contains text. Confirm replacement to append the additional readings.';return;}
   restoreOwned();
   for(const {r,n,target} of values){const entered=rows.find(row=>row.r===r).input.value;owned[r.key]={before:target.value,after:entered};target.value=entered;metadata.push({parameter:r.key,unit:r.unit,conversion:r.freshwater?'mg/L approximately ppm; dilute freshwater confirmed':'none'});}
   if(notes.checked&&additional.length){const target=field('note');owned.note={before:target.value,after:[target.value,'Photo additional readings: '+additional.join('; ')].filter(Boolean).join('\n')};target.value=owned.note.after;}
   applied=true;status.textContent='Readings placed in the form. Confirm the actual measurement date, time and officer below, then Save test.';
   const dateCheck=form.querySelector('[data-measurement-confirm]');if(dateCheck)dateCheck.checked=false;
  };
 }
 const controller={
  validate:()=>{if(used&&!applied)return 'Review and apply the photo readings, or cancel photo entry before saving.';if(used&&(!field('time').value||!form.querySelector('[data-measurement-confirm]').checked))return 'Confirm the actual measurement date and time before saving photo readings.';return null;},
  metadata:()=>used&&applied?{entryMethod:'photo-ocr',ocrVersion:lastOcrVersion,confirmed:true,conversions:metadata.map(x=>({...x}))}:null,
  dispose:()=>{disposed=true;generation++;destroyWorker();clearImage();owned={};metadata=[];rows=[];panel.replaceChildren();controller.validate=()=>null;}
 };
 const dateChanged=e=>{if(['date','time','tank'].includes(e.target.name)){const c=form.querySelector('[data-measurement-confirm]');if(c)c.checked=false;}};
 form.addEventListener('input',dateChanged);
 return controller;
}
window.NoveraHoribaPhoto={attach};
})();

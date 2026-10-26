// Test-only dependency: jsdom 26.1.0. Production remains buildless.
const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict'),path=require('path');
const root=path.join(__dirname,'..');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.test/novera-aqua/'}),w=dom.window;
w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){},translate(){},rotate(){},getImageData:()=>({data:new Uint8ClampedArray(4)}),putImageData(){}});
w.createImageBitmap=async()=>({width:1152,height:1536,close(){}});
let terminated=0,mode='ok',calls=0;const workers=[];
const text='2007/02/15 06:32:32\n29.21 °C 170.7 % DO\n7.58 pH 0.177 g/L TDS\n-61 pHmV 0.13 ppt\n152 ORPmV\n0.273 mS/cm\n13.07 mg/L DO';
Object.defineProperty(w.document,'currentScript',{value:{src:'https://example.test/novera-aqua/assets/ocr.js'},configurable:true});
w.Worker=class {constructor(){this.dead=false;workers.push(this);}terminate(){this.dead=true;terminated++;}postMessage(){calls++;if(mode==='hold')return;queueMicrotask(()=>{if(this.dead)return;if(mode==='error'){this.onmessage({data:{type:'error',message:'Simulated OCR failure'}});return;}const result=w.NoveraOCRParser.parse({text,blocks:[{paragraphs:[{lines:text.split('\n').map(text=>({text,confidence:99}))}]}]});this.onmessage({data:{type:'result',result,screen:{width:900,height:675}}});});}};
for(const f of ['ocr-parser.js','ocr.js'])w.eval(fs.readFileSync(path.join(root,'assets',f),'utf8'));
const app=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];w.eval(app);
const $=s=>w.document.querySelector(s),click=s=>$(s).click(),change=(s,value)=>{$(s).value=value;$(s).dispatchEvent(new w.Event('input',{bubbles:true}));};
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name)};
const state=()=>JSON.parse(w.localStorage.getItem('noveraAqua.v2'));
async function photo(){const input=$('[data-file]');Object.defineProperty(input,'files',{configurable:true,value:[new w.File(['test'],'meter.jpg',{type:'image/jpeg'})]});await input.onchange({target:input});await $('[data-run]').onclick();}
function checkbox(label){return [...w.document.querySelectorAll('label')].find(x=>x.textContent.includes(label)).querySelector('input');}
(async()=>{
 // Register one isolated QA officer through existing UI.
 click('[data-act="tab"][data-tab="schedule"]');click('[data-act="officer-register"]');change('input[name="name"]','OCR QA');$('#sheetForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));click('[data-act="tab"][data-tab="overview"]');
 click('[data-act="water-add"]');change('#f_temp','26');click('[data-photo-host] > button');const before=state().water.length;await photo();
 test('OCR cannot auto-save',()=>assert.equal(state().water.length,before));
 test('Worker released after recognition',()=>assert(terminated>0));
 test('Meter date not applied',()=>assert.notEqual($('#f_date').value,'2007-02-15'));
 test('TDS review converts to 177',()=>assert.equal($('[aria-label="Photo TDS"]').value,'177'));
 checkbox('I checked all').checked=true;click('[data-results] > button');
 test('TDS cannot apply without freshwater confirmation',()=>assert($('[data-status]').textContent.includes('dilute freshwater')));
 checkbox('This is dilute freshwater').checked=true;click('[data-results] > button');
 test('Existing manual field protected',()=>assert.equal($('#f_temp').value,'26'));
 checkbox('Replace populated').checked=true;checkbox('Include additional').checked=true;click('[data-results] > button');
 test('Confirmed readings map into form',()=>{assert.equal($('#f_temp').value,'29.21');assert.equal($('#f_ph').value,'7.58');assert.equal($('#f_do').value,'13.07');assert.equal($('#f_tds').value,'177');assert.equal($('#f_gh').value,'')});
 test('Additional readings go to notes only',()=>assert($('#f_note').value.includes('Oxygen saturation: 170.7 %')));
 click('[data-cancel]');test('Cancel restores overwritten manual value',()=>{assert.equal($('#f_temp').value,'26');assert.equal($('#f_ph').value,'');assert.equal(state().water.length,before)});
 click('[data-photo-host] > button');await photo();checkbox('This is dilute freshwater').checked=true;checkbox('Replace populated').checked=true;checkbox('I checked all').checked=true;click('[data-results] > button');
 $('#sheetForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));test('Date confirmation required',()=>assert.equal(state().water.length,before));
 $('[data-measurement-confirm]').checked=true;$('#f_officer').value='OCR QA';const oldForm=$('#sheetForm');oldForm.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));oldForm.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 test('Single confirmed record saved',()=>assert.equal(state().water.length,before+1));const saved=state().water.at(-1);
 test('Source and separate timestamps saved',()=>{assert.equal(saved.entryMethod,'photo-ocr');assert.equal(saved.officer,'OCR QA');assert(saved.time);assert(saved.recordedAt);assert.equal(saved.source,'manual')});
 test('No image or raw OCR stored',()=>{const s=JSON.stringify(saved);assert(!/base64|blob:|data:image|2007\/02|meter.jpg/.test(s));assert.equal(saved.gh,undefined)});
 test('Photo resources released on save',()=>assert.equal(w.document.querySelectorAll('.photo-preview canvas').length,0));
 click('[data-act="water-add"]');click('[data-photo-host] > button');mode='error';await photo();click('[data-cancel]');change('#f_ph','7.2');$('#f_officer').value='OCR QA';$('#sheetForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));test('Manual save works after OCR failure',()=>assert.equal(state().water.length,before+2));

 mode='hold';click('[data-act="water-add"]');change('#f_ph','7.1');click('[data-photo-host] > button');const initial=state().water.length;
 let pending=photo();await new Promise(resolve=>setImmediate(resolve));click('[data-stop]');await pending;
 test('Cancel pending worker immediately',()=>assert(workers.every(x=>x.dead)));
 test('Cancel preserves manual input and logs',()=>{assert.equal($('#f_ph').value,'7.1');assert.equal(state().water.length,initial)});
 pending=photo();await new Promise(resolve=>setImmediate(resolve));const stale=workers.at(-1);click('[data-act="sheet-close"]');await pending;
 test('Closing terminates pending worker',()=>assert(stale.dead));
 stale.onmessage({data:{type:'result',result:{readings:[],warnings:[]},screen:{width:1,height:1}}});
 test('Late worker response cannot reopen form or save',()=>{assert($('#sheet').hidden);assert.equal(state().water.length,initial)});
 click('[data-act="water-add"]');click('[data-photo-host] > button');pending=photo();await new Promise(resolve=>setImmediate(resolve));const previous=workers.at(-1);const replacement=photo();await new Promise(resolve=>setImmediate(resolve));await pending;
 test('Replacing image terminates old worker',()=>assert(previous.dead));click('[data-cancel]');await replacement;
 test('Replacement cancellation leaves no active worker',()=>assert(workers.every(x=>x.dead)));
 const backup=w.localStorage.getItem('noveraAqua.v2');w.eval(app);test('Photo record survives reload',()=>assert.equal(state().water.find(x=>x.id===saved.id).tds,177));test('Backup retains readings without images',()=>assert.equal(JSON.parse(backup).water.find(x=>x.id===saved.id).entryMethod,'photo-ocr'));
 console.log(count+' flow checks passed');dom.window.close();
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});

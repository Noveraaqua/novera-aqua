/* Test parsed unit provenance and conservative TDS handling; no stored photos. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../assets/horiba-core.js');
let passed=0;
const test=(name,run)=>{run();passed++;console.log('PASS '+name)};
const p=t=>[{text:t,score:.99},{text:t,score:.99}];
const labels={temp:'C',ph:'pH',phmv:'pHmV',orp:'ORPmV',ec:'mS/cm',do:'mg/L DO',saturation:'% DO',tds:'g/L TDS',salinity:'ppt'};
const find=(r,key)=>r.readings.find(x=>x.key===key);
test('Verified temperature retains °C provenance',()=>{
 const r=core.parse({temp:p('28.12')},labels,[],null,{allowUnverified:true});
 assert.equal(find(r,'temp').value,28.12);
 assert.equal(find(r,'temp').unitStatus,'verified');
});
test('Missing temperature label is inferred, warned, and user-reviewed',()=>{
 const r=core.parse({temp:p('28.12')},{...labels,temp:''},[],null,{allowUnverified:true});
 const x=find(r,'temp');
 assert.equal(x.value,28.12);
 assert.equal(x.unitStatus,'inferred');
 assert.equal(x.uncertain,true);
 assert.match(x.message,/INFERRED UNIT/);
 assert.equal(x.sourceDisplay,'28.12');
});
test('Numeric characters plus C cannot masquerade as a verified unit',()=>{
 const r=core.parse({temp:p('27.99')},{...labels,temp:'27.99c'},[],null,{allowUnverified:true});
 assert.notEqual(find(r,'temp').unitStatus,'verified');
});
test('No verified TDS unit means no automatic conversion',()=>{
 const r=core.parse({tds:p('0.177')},{...labels,tds:''},[],null,{allowUnverified:true});
 const x=find(r,'tds');
 assert.equal(x.value,null);
 assert.equal(x.display,null);
 assert.equal(x.sourceValue,0.177);
 assert.equal(x.sourceDisplay,'0.177');
 assert.equal(x.unitStatus,'missing');
 assert.equal(x.sourceUnit,null);
 assert.match(x.message,/UNIT COULD NOT BE VERIFIED/);
});
test('TDS g/L converts once when label verified',()=>{
 const r=core.parse({tds:p('0.177')},labels,[],null,{allowUnverified:true});
 const x=find(r,'tds');assert.equal(x.value,177);
 assert.equal(x.sourceUnit,'g/L');assert.equal(x.unitStatus,'verified');
});
test('TDS mg/L does not multiply by 1000',()=>{
 const r=core.parse({tds:p('177.0')},{...labels,tds:'mg/L TDS'},[],null,{allowUnverified:true});
 const x=find(r,'tds');assert.equal(x.value,177);
 assert.equal(x.sourceUnit,'mg/L');
});
test('Original strict parse still refuses missing temperature label',()=>{
 const r=core.parse({temp:p('28.12')},{...labels,temp:''},[]);
 assert.equal(find(r,'temp').value,null);
});
test('No numerical inference from absent OCR passes',()=>{
 const r=core.parse({},labels,[],null,{allowUnverified:true});
 assert.equal(find(r,'temp').value,null);
 assert.equal(find(r,'tds').sourceValue,null);
});
test('Unit labels can remain missing while nine-reading layout is verified',()=>{
 const r=core.parse({temp:p('27.71'),tds:p('0.193')},{...labels,temp:'',tds:''},[],null,{allowUnverified:true});
 assert.equal(r.layout.verified,true);
 assert.equal(find(r,'temp').unitStatus,'inferred');
 assert.equal(find(r,'tds').unitStatus,'missing');
});
test('Manual confirmation controls exist on experimental review UI',()=>{
 const src=fs.readFileSync(require.resolve('../assets/horiba-photo-ui.js'),'utf8');
 assert.match(src,/unitCheck&&!unitCheck.checked/);
 assert.match(src,/unitPicker&&!unitPicker.value/);
 assert.match(src,/I checked all chosen values and units against the photo/);
 assert.match(src,/data-measurement-confirm/);
 assert.match(src,/userVerifiedUnit:true/);
});

test('TDS classifier rejects unknown prefixes and partial units',()=>{
 for(const bad of ['Y g/L TDS','} g/L TDS','S/L TDS','L TDS','g/L TDS extra','', '0.223 g/L TDS','(g/L TDS','g/L TDSI']){
  assert.equal(core.verifiedTdsUnit(bad),null,'Should reject: '+bad);
 }
 assert.equal(core.verifiedTdsUnit('g/L TDS'),'g/L');
 assert.equal(core.verifiedTdsUnit('mg/L TDS'),'mg/L');
 assert.equal(core.verifiedTdsUnit(' MG / L  tDs '),'mg/L');
});
test('Ambiguous TDS label cannot be marked verified or converted',()=>{
 for(const [label,candidate] of [['Y g/L TDS','0.199'],['} g/L TDS','0.223'],['S/L TDS','0.194']]){
  const l={...labels,tds:label},layout=core.checkLayout(l,[]);
  assert.equal(layout.ok,true); // Other labels verify nine-reading screen.
  assert.equal(layout.matched.tds,false,'Layout wrongly trusted '+label);
  const r=core.parse({tds:p(candidate)},l,[],null,{allowUnverified:true});
  const x=find(r,'tds');
  assert.equal(x.unitStatus,'missing');assert.equal(x.sourceUnit,null);
  assert.equal(x.value,null);assert.equal(x.display,null);
  assert.equal(x.sourceValue,Number(candidate));assert.equal(x.sourceDisplay,candidate);
  assert.equal(x.uncertain,true);assert.equal(x.conversion,'');
  assert.match(x.message,/UNIT COULD NOT BE VERIFIED/);
 }
});
test('TDS valid units agree across detection, conversion and display',()=>{
 for(const [label,reading,expected,source] of [['g/L TDS','0.223',223,'g/L'],['mg/L TDS','223.0',223,'mg/L']]){
  const l={...labels,tds:label},r=core.parse({tds:p(reading)},l,[],null,{allowUnverified:true});
  const x=find(r,'tds');
  assert.equal(r.layout.matched.tds,true);assert.equal(x.unitStatus,'verified');
  assert.equal(x.sourceUnit,source);assert.equal(x.value,expected);
  assert.equal(x.uncertain,false);
 }
});
test('TDS review UI has defensive picker, disabled input and save gate',()=>{
 const src=fs.readFileSync(require.resolve('../assets/horiba-photo-ui.js'),'utf8');
 assert.match(src,/tdsUnitRequiresReview=r\.key==='tds'&&!configuredTds&&/);
 assert.match(src,/if\(tdsUnitRequiresReview\)/);
 assert.match(src,/i\.value='';i\.disabled=true/);
 assert.match(src,/i\.value='';i\.disabled=!unitPicker\.value/);
 assert(src.includes("r.key==='tds'&&!['g/L','mg/L'].includes(unitPicker?.value||r.sourceUnit)"));
 assert.match(src,/I checked all chosen values and units against the photo/);
});


test('Configured HORIBA assumes g/L for unreadable TDS label without claiming OCR verification',()=>{
 for(const [label,n,converted] of [
  ['', '0.223',223],['Y g/L TDS','0.199',199],['} g/L TDS','0.223',223],
  ['S/L TDS','0.194',194],['mg/L TDS','0.207',207]
 ]){
  const l={...labels,tds:label};
  const r=core.parse({tds:p(n)},l,[],null,{allowUnverified:true,fixedTdsUnit:'g/L'});
  const x=find(r,'tds');
  assert.equal(x.value,converted);
  assert.equal(x.display,String(converted));
  assert.equal(x.sourceValue,Number(n));
  assert.equal(x.sourceUnit,'g/L');
  assert.equal(x.unitStatus,'assumed');
  assert.equal(x.uncertain,true);
  assert.match(x.message,/Unit assumed from configured HORIBA meter: g\/L/);
  assert.match(r.warnings.join(' '),/not recognized by OCR/);
 }
});
test('Absent or conflicting TDS digits stay blank even with fixed g/L',()=>{
 const l={...labels,tds:''};
 const conflict=[{text:'0.223',score:.99},{text:'0.224',score:.99}];
 const lowScore=[{text:'0.223',score:.1},{text:'0.223',score:.99}];
 for(const passes of [[],p('0.223').slice(0,1),conflict,lowScore,p('0.223x')]){
  const r=core.parse({tds:passes},l,[],null,{allowUnverified:true,fixedTdsUnit:'g/L'});
  const x=find(r,'tds');
  assert.equal(x.value,null);assert.equal(x.display,null);
  assert.equal(x.sourceUnit,'g/L');assert.equal(x.sourceValue,null);
  assert.equal(x.unitStatus,'assumed');
 }
 const unresolved=core.parse({tds:p('0.223')},l,[],{tds:{value:null,display:null,reason:'uncorroborated_candidate'}},{allowUnverified:true,fixedTdsUnit:'g/L'});
 assert.equal(find(unresolved,'tds').value,null);
 assert.equal(find(unresolved,'tds').sourceValue,null);
});
test('Fixed TDS unit is opt-in; standard mode keeps strict unit verification',()=>{
 const l={...labels,tds:'Y g/L TDS'};
 const r=core.parse({tds:p('0.223')},l,[],null,{allowUnverified:true});
 assert.equal(find(r,'tds').value,null);
 assert.equal(find(r,'tds').unitStatus,'missing');
 assert.equal(find(r,'tds').sourceUnit,null);
});
test('Both standard and experimental HORIBA scans skip TDS unit OCR and assume g/L',()=>{
 const src=fs.readFileSync(require.resolve('../assets/horiba-pipeline.js'),'utf8');
 assert(src.includes("if(f.key==='tds')"));
 assert(!src.includes("if(experimental&&f.key==='tds')"));
 assert(src.includes("labels.tds='';labelAttempts.tds=[];continue;"));
 assert(src.includes("experimental?decisions:null,{allowUnverified:true,fixedTdsUnit:'g/L'}"));
 assert(src.includes("tdsUnitMode:'assumed_configured_g/L'"));
});
test('Review UI shows assumed TDS provenance and requires explicit confirmation',()=>{
 const src=fs.readFileSync(require.resolve('../assets/horiba-photo-ui.js'),'utf8');
 assert(src.includes("r.unitStatus==='assumed'&&r.sourceUnit==='g/L'"));
 assert(src.includes('I confirm this photo is from the configured HORIBA meter, which displays TDS in g/L.'));
 assert(src.includes("if(unitCheck&&!unitCheck.checked)"));
 assert(src.includes('I checked all chosen values and units against the photo.'));
 assert(src.includes("r.key==='tds'&&r.freshwater&&!freshwater.checked"));
});

test('Configured source unit never fills unresolved standard or experimental TDS number',()=>{
 const l={...labels,tds:''};
 for(const decision of [null,{tds:{value:null,display:null,reason:'conflicting_digits'}}]){
  const r=core.parse({tds:[{text:'0.223',score:.99},{text:'0.224',score:.99}]},l,[],decision,{allowUnverified:true,fixedTdsUnit:'g/L'});
  const x=find(r,'tds');assert.equal(x.value,null);assert.equal(x.display,null);
 }
});
console.log(passed+' unit-review checks passed');
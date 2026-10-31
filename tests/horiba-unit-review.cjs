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
 assert.match(x.message,/MISSING \/ AMBIGUOUS TDS UNIT/);
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
console.log(passed+' unit-review checks passed');
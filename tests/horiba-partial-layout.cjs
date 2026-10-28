const assert=require('node:assert/strict');
const core=require('../assets/horiba-core.js'),reconcile=require('../assets/horiba-reconcile.js');
const p=t=>[{text:t,score:.99},{text:t,score:.99}];
const labels={temp:'C',ph:'pH',phmv:'pHmV',orp:'ORPmV',ec:'mS/cm',do:'mg/L DO',saturation:'% DO',tds:'g/L TDS',salinity:'ppt'};
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
const find=(r,k)=>r.readings.find(x=>x.key===k);
test('Missing temperature unit does not blank recognized temperature',()=>{
 const r=core.parse({temp:p('28.12')},{...labels,temp:''},[],null,{allowUnverified:true});
 assert.equal(find(r,'temp').value,28.12);assert.equal(find(r,'temp').uncertain,true);
});
test('Bad label OCR does not abort nine-reading user review',()=>{
 const l={...labels,temp:'',orp:'',ec:'',do:''};
 const r=core.parse({temp:p('28.12'),ph:p('7.46'),saturation:p('135.2')},l,[],null,{allowUnverified:true});
 assert.equal(r.layout.verified,false);assert.equal(r.layout.manualConfirmationRequired,true);
 assert.equal(find(r,'temp').value,28.12);
});
test('No matched labels still requires layout confirmation',()=>{
 const r=core.parse({temp:p('27.85')},{},[],null,{allowUnverified:true});
 assert.equal(r.layout.verified,false);assert.equal(find(r,'temp').value,27.85);
});
test('Unverified TDS g/L versus mg/L cannot be converted',()=>{
 const r=core.parse({tds:p('0.207')},{...labels,tds:''},[],null,{allowUnverified:true});
 assert.equal(find(r,'tds').value,null);assert.match(find(r,'tds').message,/UNIT COULD NOT BE VERIFIED/);
});
test('Explicit g/L label converts freshwater TDS once',()=>{
 const r=core.parse({tds:p('0.207')},labels,[]);
 assert.equal(find(r,'tds').value,207);
});
test('mg/L TDS not multiplied',()=>{
 const r=core.parse({tds:p('207.0')},{...labels,tds:'mg/L TDS'},[]);
 assert.equal(find(r,'tds').value,207);
});
test('Trailing punctuation can be resolved from independent pass',()=>{
 assert.equal(reconcile.compare('temp',[{text:'28.12',score:.99},{text:'28.12 :',score:.99}]).value,28.12);
});
test('Unproven sign disagreement remains unresolved',()=>{
 assert.equal(reconcile.decide('phmv',[{text:'55',score:.99},{text:'-55',score:.99}],null).value,null);
});
test('Legacy strict callers still blank readings with unmatched unit',()=>{
 const r=core.parse({temp:p('28.12')},{...labels,temp:''},[]);
 assert.equal(find(r,'temp').value,null);
});
test('Seven-field layout cannot be marked automatically verified',()=>{
 const l={...labels,phmv:'mS/cm',orp:'mg/L DO',ec:'%DO',do:'g/L TDS',saturation:'ppt',tds:'',salinity:''};
 const r=core.parse({temp:p('27.71')},l,[],null,{allowUnverified:true});
 assert.equal(r.layout.verified,false);
});
console.log(passed+' layout fallback safety checks passed');

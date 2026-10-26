const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const parser=require('../assets/ocr-parser.js');let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
function data(text,confidence=95){return {text,blocks:[{paragraphs:[{lines:text.split('\n').map(text=>({text,confidence}))}]}]};}
function get(text,key,confidence){return parser.parse(data(text,confidence)).readings.find(r=>r.key===key)}
test('Two-column units map independently',()=>{const d=data('29.21 °C 170.7 % DO\n7.58 pH 0.177 g/L TDS\n-61 pHmV 0.13 ppt\n152 ORPmV\n0.273 mS/cm\n13.07 mg/L DO');const p=parser.parse(d);for(const [k,v] of Object.entries({temp:29.21,ph:7.58,tds:177,do:13.07,saturation:170.7,ec:.273,salinity:.13,orp:152,phmv:-61}))assert.equal(p.readings.find(r=>r.key===k).value,v,k)});
test('DO saturation cannot populate concentration',()=>assert.equal(get('170.7 % DO','do').value,null));
test('pHmV cannot populate pH or ORP',()=>{assert.equal(get('-61 pHmV','ph').value,null);assert.equal(get('-61 pHmV','orp').value,null)});
test('TDS mg/L and ppm recognised',()=>{assert.equal(get('177 mg/L TDS','tds').value,177);assert.equal(get('177 ppm TDS','tds').value,177)});
test('Freshwater equivalence must be confirmed',()=>assert.equal(get('0.177 g/L TDS','tds').freshwater,true));
test('Missing label stays blank',()=>assert.equal(get('29.21','temp').value,null));
test('Duplicate candidates stay blank',()=>assert.equal(get('7.58 pH\n7.85 pH','ph').value,null));
test('Low confidence stays blank',()=>assert.equal(get('7.58 pH','ph',30).value,null));
test('Comma separator needs review',()=>assert.equal(get('7,58 pH','ph').value,null));
test('Split number is not salvaged',()=>assert.equal(get('29 21 C','temp').value,null));
test('Malformed decimals are not salvaged',()=>assert.equal(get('1.2.7 mg/L DO','do').value,null));
test('Dropped decimal cannot populate pH',()=>assert.equal(get('758 pH','ph').value,null));
test('Missing outputs are null, not zero',()=>assert(parser.parse(data('')).readings.every(r=>r.value===null)));
test('Meter clock produces warning only',()=>{const p=parser.parse(data('2007/02/15 06:32:32\n7.58 pH'));assert(p.warnings[0].includes('2007'));assert(!p.date)});
test('Positioned words sorted before parsing',()=>{const p=parser.parse({text:'',blocks:[{paragraphs:[{lines:[{confidence:99,words:[{text:'pH',confidence:99,bbox:{x0:100}},{text:'7.58',confidence:99,bbox:{x0:10}}]}]}]}]});assert.equal(p.readings.find(r=>r.key==='ph').value,7.58)});
test('Parser does not mutate recognition data',()=>{const d=data('7.58 pH');const old=JSON.stringify(d);parser.parse(d);assert.equal(JSON.stringify(d),old)});
console.log(passed+' parser checks passed');

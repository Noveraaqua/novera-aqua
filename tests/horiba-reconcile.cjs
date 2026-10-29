const assert=require('node:assert/strict');
const R=require('../assets/horiba-reconcile.js');
const p=(text,score=.99)=>({text,score});
let n=0;function check(label,test){test();console.log('PASS',label);n++}
check('Exact agreement and precision',()=>{const a=R.compare('ph',[p('7.50'),p('7.50')]);assert.equal(a.display,'7.50');assert.equal(a.review,true)});
check('Trailing artifact',()=>assert.equal(R.compare('temp',[p('29.21'),p('29.21 :')]).display,'29.21'));
check('Decimal omission with independent pass',()=>assert.equal(R.compare('saturation',[p('1707'),p('170.7')]).display,'170.7'));
check('Nonnumeric leading glyph',()=>assert.equal(R.compare('tds',[p('D.193'),p('0.193')]).display,'0.193'));
check('Sign dispute is unresolved without visual evidence',()=>assert.equal(R.compare('orp',[p('166'),p('-166')]).value,null));
check('Positive pH mV not assumed negative',()=>assert.equal(R.compare('phmv',[p('55'),p('-55')]).value,null));
check('Leading digit disagreement abstains',()=>assert.equal(R.compare('saturation',[p('50.4'),p('150.4')]).value,null));
check('Low-score candidate rejected',()=>assert.equal(R.decide('ph',[p('7.58',.2),p('7.58')],null).value,null));
check('Missing reading never coerced to zero',()=>assert.equal(R.compare('ec',[p(''),p('')]).value,null));
check('Unsafe sign for dissolved oxygen rejected',()=>assert.equal(R.strict('-1.20','do'),null));
check('Unusable visual crop cannot force acceptance',()=>assert.equal(R.decide('orp',[p('166'),p('-166')],null).value,null));
check('Correct negative when both agree',()=>assert.equal(R.compare('phmv',[p('-54'),p('-54')]).value,-54));

function syntheticDigits(count,negative=false){
 const width=340,height=180,data=new Uint8ClampedArray(width*height*4);data.fill(255);
 function block(x,y,w,h){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(yy*width+xx)*4;data[i]=data[i+1]=data[i+2]=0;}}
 for(let k=0;k<count;k++)block(90+k*48,40,30,85);
 if(negative)block(37,78,34,15);
 return {width,height,data};
}
check('Temperature isolated prefix requires visual digit count',()=>{
 const r=R.decide('temp',[p('27.85'),p('1 27.85',.88)],syntheticDigits(4));
 assert.equal(r.display,'27.85');assert.equal(r.reason,'visual_discard_isolated_prefix');assert.equal(r.review,true);
});
check('ORP malformed sign rejected when image has no minus',()=>{
 const r=R.decide('orp',[p('176'),p('-..176',.85)],syntheticDigits(3));
 assert.equal(r.display,'176');assert.equal(r.reason,'visual_reject_malformed_sign');
});
check('DO spurious negative rejected when image has no minus',()=>{
 const r=R.decide('do',[p('11.90'),p('-11.90')],syntheticDigits(4));
 assert.equal(r.display,'11.90');assert.equal(r.review,true);
});
check('ORP sign ambiguity must abstain when actual minus is visible',()=>{
 assert.equal(R.decide('orp',[p('176'),p('-..176')],syntheticDigits(3,true)).value,null);
});
check('DO sign ambiguity must abstain when actual minus is visible',()=>{
 assert.equal(R.decide('do',[p('11.90'),p('-11.90')],syntheticDigits(4,true)).value,null);
});
check('Temperature prefix must abstain on mismatched digit count',()=>{
 assert.equal(R.decide('temp',[p('27.85'),p('1 27.85')],syntheticDigits(5)).value,null);
});

console.log(n+' reconciler checks passed');

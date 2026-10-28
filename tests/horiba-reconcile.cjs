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
console.log(n+' reconciler checks passed');

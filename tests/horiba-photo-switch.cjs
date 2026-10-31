const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element{constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.hidden=false;this.textContent='';this.className='';this.onclick=null;}append(...args){this.children.push(...args)}click(){this.onclick?.()}replaceChildren(){this.children=[]}remove(){this.removed=true}}
let standard=0,experimental=0;const host=new Element('div'),form={querySelector:q=>q==='[data-photo-host]'?host:null};
const attach=kind=>()=>{if(kind==='standard')standard++;else experimental++;const launch=new Element('button');host.append(launch);return {validate:()=>null,metadata:()=>({ocrVersion:kind}),dispose:()=>{}}};
const env={window:{NoveraPhoto:{attach:attach('standard')},NoveraHoribaPhoto:{attach:attach('horiba')}},document:{createElement:t=>new Element(t)}};
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/horiba-photo-switch.js'),'utf8'),env);
const ctl=env.window.NoveraPhoto.attach(form,{});
assert.equal(standard,0);assert.equal(experimental,0);assert.equal(ctl.metadata(),null);
const chooser=host.children[0];assert.equal(chooser.children[2].textContent,'HORIBA PaddleOCR (experimental)');
chooser.children[2].click();assert.equal(experimental,1);assert.equal(standard,0);
chooser.children[1].click();assert.equal(standard,0);
ctl.dispose();assert(chooser.removed);
console.log('PASS Opt-in scanner chooser and cleanup');

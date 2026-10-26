/* Pure, conservative parsing of positioned OCR lines. No storage or networking. */
(function(root){
'use strict';
const fields=[
 {key:'temp',label:'Temperature',unit:'°C',pattern:/[°º]?\s*C\b/i},
 {key:'ph',label:'pH',unit:'pH',pattern:/\bpH\b(?!\s*m\s*[VY])/i},
 {key:'tds',label:'TDS',unit:'ppm',pattern:/(?:m?g\s*\/\s*[lL]|ppm)\s*TDS\b/i},
 {key:'do',label:'Dissolved oxygen',unit:'mg/L',pattern:/mg\s*\/\s*[lL]\s*DO\b/i},
 {key:'saturation',label:'Oxygen saturation',unit:'%',pattern:/%\s*DO\b/i},
 {key:'ec',label:'Conductivity',unit:'mS/cm',pattern:/[mµu]S\s*\/\s*cm\b/i},
 {key:'salinity',label:'Salinity',unit:'ppt',pattern:/\bppt\b/i},
 {key:'orp',label:'ORP',unit:'mV',pattern:/\bORP\s*m\s*V\b/i},
 {key:'phmv',label:'pH electrode potential',unit:'mV',pattern:/\bpH\s*m\s*V\b/i}
];
function linesFrom(data){
 const out=[];
 (data.blocks||[]).forEach(b=>(b.paragraphs||[]).forEach(p=>(p.lines||[]).forEach(l=>out.push(l))));
 return out;
}
function parse(data){
 const candidates={},warnings=[],lines=linesFrom(data);
 // Words sorted within each OCR row retain two-column order. Each value must directly precede its unit/label.
 lines.forEach(line=>{
  const words=(line.words||[]).slice().sort((a,b)=>a.bbox.x0-b.bbox.x0);
  const text=(words.length?words.map(w=>w.text).join(' '):line.text||'').replace(/[−–]/g,'-');
  fields.forEach(f=>{
   const re=new RegExp('([+-]?\\d+(?:[.,]\\d+)?)\\s*('+f.pattern.source+')','gi');
   let match;
   while((match=re.exec(text))){
    const prefix=text.slice(0,match.index);
    // Do not salvage the tail of a malformed number, date, or partly recognised token.
    if(/[\w.,+\/-]$/.test(prefix)||/[0-9.,+-]\s+$/.test(prefix))continue;
    let raw=match[1],number=Number(raw.replace(',','.')),unit=match[2],factor=1;
    let uncertain=(line.confidence==null||line.confidence<75)||raw.includes(',');
    if(f.key==='tds'&&/^g/i.test(unit.trim()))factor=1000;
    if(f.key==='ec'&&/^[µu]/i.test(unit.trim()))factor=.001;
    if(f.key==='temp'&&(number<0||number>50)||f.key==='ph'&&(number<0||number>14)||f.key==='do'&&(number<0||number>30))uncertain=true;
    // Most water measurements require decimal review, even if OCR dropped a point.
    if(['temp','ph','do','ec'].includes(f.key)&&!/[.,]/.test(raw))uncertain=true;
    if(words.some(w=>/[0-9]/.test(w.text)&&(w.confidence==null||w.confidence<60)))uncertain=true;
    const c={key:f.key,label:f.label,unit:f.unit,raw:raw+' '+unit,value:+(number*factor).toPrecision(10),uncertain,conversion:factor!==1?raw+' '+unit+' → '+(number*factor)+' '+(f.key==='tds'?'mg/L':f.unit):'',freshwater:f.key==='tds'&&!/ppm/i.test(unit)};
    (candidates[f.key]||(candidates[f.key]=[])).push(c);
   }
  });
 });
 const readings=fields.map(f=>{
  const cs=candidates[f.key]||[];
  if(cs.length!==1)return {...f,pattern:undefined,value:null,raw:cs.map(c=>c.raw).join(' / '),uncertain:true,message:cs.length?'Multiple candidates — enter the verified value.':'Not reliably recognised — leave blank or enter from the photo.'};
  const c=cs[0];if(c.uncertain){c.suggested=c.value;c.value=null;c.message='Uncertain OCR — check the photo and enter the value.';}return c;
 });
 const dates=(data.text||'').match(/\b\d{4}[\/-]\d{1,2}[\/-]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/g)||[];
 warnings.push(dates.length?'Meter clock reads '+dates.join(', ')+'. Verify it; this date has NOT been applied.':'The meter clock was not reliably recognised. Set the actual measurement date and time.');
 return {readings,warnings};
}
const api={parse,linesFrom};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NoveraOCRParser=api;
})(typeof window!=='undefined'?window:globalThis);

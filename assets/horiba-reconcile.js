/* Experimental, review-only HORIBA OCR reconciliation. No ground truth, storage or network. */
(function(root){'use strict';
const decimals={temp:2,ph:2,phmv:0,orp:0,ec:3,do:2,saturation:1,tds:3,salinity:2};
const signed=new Set(['temp','phmv','orp']);
const visualRegions={temp:[.025,.302,.285,.390],ph:[.055,.400,.285,.488],phmv:[.08,.497,.285,.585],orp:[.06,.594,.285,.682],ec:[.02,.691,.285,.779],do:[.02,.788,.285,.880],saturation:[.485,.302,.735,.390],tds:[.485,.400,.735,.488],salinity:[.525,.497,.735,.585]};
function strict(text,key){if(typeof text!=='string'||!Object.hasOwn(decimals,key))return null;
 const s=text.trim(),p=decimals[key]?key==='ph'?/^-?\d+\.\d{2}$/:/^-?\d+\.\d{1,3}$/:/^-?\d+$/;
 return p.test(s)&&(!s.startsWith('-')||signed.has(key))&&(key!=='ph'||Number(s)<=14)?s:null;}
function canonical(item,key){const raw=typeof item?.text==='string'?item.text.trim():'';
 let text=raw.replace(/[−–]/g,'-').replace(/["' :;]+$/g,'');
 if(/^[DO]\./.test(text))text='0'+text.slice(1);
 return {display:strict(text,key),kind:text===raw?'exact':'normalized'};}
function compare(key,passes){const no=reason=>({value:null,display:null,reason,review:true});
 if(!Object.hasOwn(decimals,key)||!Array.isArray(passes)||passes.length!==2)return no('missing_passes');
 if(passes.some(p=>!Number.isFinite(p.score)||p.score<.80))return no('low_recognition_score');
 const a=canonical(passes[0],key),b=canonical(passes[1],key);
 const ok=(s,reason)=>({value:Number(s),display:s,reason,review:true});
 if(a.display!==null&&a.display===b.display)return ok(a.display,a.kind==='exact'&&b.kind==='exact'?'exact_agreement':'artifact_or_glyph_corroborated');
 if(a.display!==null&&b.display!==null)return no(a.display.replace(/^-/, '')===b.display.replace(/^-/,'')?'conflicting_sign':'conflicting_numeric_digits');
 const good=a.display??b.display,other=a.display===null?passes[0].text:passes[1].text;
 if(good!==null&&typeof other==='string'&&other.trim()===good.replace('.','')&&good.includes('.'))return ok(good,'decimal_omission_corroborated');
 return no(good===null?'no_unique_well_formed_value':'uncorroborated_candidate');}
function visualEvidence(im){if(!im||!im.data||!Number.isInteger(im.width)||!Number.isInteger(im.height))return {status:'unavailable'};
 const {width:w,height:h,data}=im;if(w<80||h<80||data.length<w*h*4)return {status:'unavailable'};
 const pixels=new Uint8Array(w*h),hist=new Uint32Array(256);let sum=0;
 for(let i=0;i<pixels.length;i++){const j=i*4,v=Math.round((299*data[j]+587*data[j+1]+114*data[j+2])/1000);pixels[i]=v;hist[v]++;sum+=v;}
 let count=0,part=0,best=-1,cut=0;const n=w*h;
 for(let k=0;k<256;k++){count+=hist[k];part+=k*hist[k];if(!count||count===n)continue;
  const score=part*part/count+(sum-part)*(sum-part)/(n-count);if(score>best){best=score;cut=k;}}
 const mark=new Uint8Array(n),queue=new Int32Array(n),components=[];
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const seed=y*w+x;if(mark[seed]||pixels[seed]>cut)continue;
  mark[seed]=1;let read=0,size=1,x0=x,x1=x,y0=y,y1=y;queue[0]=seed;
  while(read<size){const pos=queue[read++],cy=Math.floor(pos/w),cx=pos-cy*w;
   x0=Math.min(x0,cx);x1=Math.max(x1,cx);y0=Math.min(y0,cy);y1=Math.max(y1,cy);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
    const ni=ny*w+nx;if(mark[ni]||pixels[ni]>cut)continue;mark[ni]=1;queue[size++]=ni;
   }
  }
  const cw=x1-x0+1,ch=y1-y0+1;
  if(size>=25&&x0>20&&x1<w-20&&cw<=w*.65&&ch<=h*.68)components.push({x:x0,y:y0,w:cw,h:ch});
 }
 const digits=components.filter(c=>c.h>=65&&c.w>=25).sort((a,b)=>a.x-b.x);
 let minus=false;if(digits.length){const d=digits[0];minus=components.some(c=>c.x+c.w<=d.x-5&&c.h>=12&&c.h<=27&&c.w>=25&&c.w<=65&&c.w/c.h>=1.5&&c.w/c.h<=4.5&&c.y+c.h/2>=d.y+d.h*.32&&c.y+c.h/2<=d.y+d.h*.68);}
 return {status:'evaluated',minusShape:minus,digitComponents:digits.length,componentCount:components.length};
}
function decide(key,passes,im){const base=compare(key,passes);
 if(base.value!==null||base.reason==='low_recognition_score')return {...base,visual:null};
 if(!['temp','ph','phmv','orp','do','saturation'].includes(key))return {...base,visual:null};
 const ev=visualEvidence(im);if(ev.status!=='evaluated')return {...base,visual:ev};
 const cs=passes.map(p=>canonical(p,key).display),accept=(s,reason)=>({value:Number(s),display:s,reason,review:true,visual:ev});
 const count=s=>[...s].filter(c=>/\d/.test(c)).length;
 if(base.reason==='conflicting_sign'&&['phmv','orp'].includes(key)&&cs.every(c=>c!==null)&&cs[0].replace(/^-/, '')===cs[1].replace(/^-/,'')){
  const digits=cs[0].replace(/^-/, '');if(ev.digitComponents===count(digits))return accept((ev.minusShape?'-':'')+digits,'visual_sign_evidence');
 }
 if(base.reason==='conflicting_numeric_digits'&&cs.every(c=>c!==null)){
  const [longer,shorter]=cs[0].length>=cs[1].length?cs:[cs[1],cs[0]];
  if(['saturation','ph'].includes(key)&&longer.length===shorter.length+1&&longer.slice(1)===shorter&&ev.digitComponents===count(longer))return accept(longer,'visual_leading_glyph_corroborated');
 }
 if(cs.filter(c=>c!==null).length===1){
  const i=cs[0]!==null?0:1,candidate=cs[i],other=String(passes[1-i].text||'').trim().replace(/[−–]/g,'-').replace(/["' :;]+$/,'');
  if(ev.digitComponents!==count(candidate))return {...base,visual:ev};
  if(['ph','saturation'].includes(key)&&other&&(candidate.endsWith(other)||candidate.replace('.','').endsWith(other.replace('.',''))))return accept(candidate,'visual_digit_count_corroborated');
  if(key==='temp'&&other===('1 '+candidate)&&!ev.minusShape)return accept(candidate,'visual_discard_isolated_prefix');
  if(key==='do'&&other===('-'+candidate)&&!ev.minusShape)return accept(candidate,'visual_spurious_minus');
  if(key==='orp'&&/^-[.\s]+/.test(other)&&other.replace(/^-[.\s]+/,'')===candidate&&!ev.minusShape)return accept(candidate,'visual_reject_malformed_sign');
 }
 return {...base,visual:ev};
}
const api={visualRegions,strict,canonical,compare,visualEvidence,decide};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HoribaReconcile=api;
})(typeof self!=='undefined'?self:globalThis);

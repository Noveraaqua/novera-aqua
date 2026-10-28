/* Preserves the existing scanner as an opt-in choice; no OCR starts automatically. */
(function(){'use strict';
const Standard=window.NoveraPhoto,Experimental=window.NoveraHoribaPhoto;
if(!Experimental||typeof Experimental.attach!=='function')return;
window.NoveraPhoto={attach(form,options){
 const host=form.querySelector('[data-photo-host]');if(!host)return Standard?.attach(form,options)||null;
 const chooser=document.createElement('div');chooser.className='photo-engine-chooser';
 const text=document.createElement('p');text.textContent='Choose a photo scanner. HORIBA PaddleOCR is experimental and requires manual review.';
 const old=document.createElement('button'),next=document.createElement('button');
 old.type=next.type='button';old.className=next.className='btn ghost';
 old.textContent='Standard photo scanner';next.textContent='HORIBA PaddleOCR (experimental)';
 const hint=document.createElement('small');hint.textContent='To change scanner, close and reopen this water log. Manual entry remains available.';
 chooser.append(text,old,next,hint);host.append(chooser);
 let active=null,closed=false;
 function start(engine){if(closed||active||typeof engine?.attach!=='function')return;
  active=engine.attach(form,options);chooser.hidden=true;
  const opener=[...host.children].find(c=>c!==chooser&&c.tagName==='BUTTON');if(opener)opener.click();
 }
 old.onclick=()=>start(Standard||Experimental);next.onclick=()=>start(Experimental);
 return {validate:()=>active?.validate?.()||null,metadata:()=>active?.metadata?.()||null,
  dispose:()=>{closed=true;active?.dispose?.();active=null;chooser.replaceChildren();chooser.remove()}};
}};
})();

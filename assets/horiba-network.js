/* Worker-side asset-only network policy. Never records image bytes, text or filenames. */
(function(root){'use strict';
const requests=[];
function allowed(url){const u=new URL(url,root.location.href),base=new URL('.',root.location.href);return !u.search&&!u.hash&&((u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&/\/(?:models\/(?:en-rec\.onnx|en-dict\.txt)|vendor\/(?:esearch-ocr-8\.5\.0|sha256-0\.11\.1)\.js|horiba-(?:core|pipeline|reconcile)\.js)$/.test(u.pathname))||(u.origin==='https://cdn.jsdelivr.net'&&/^\/npm\/(?:@techstark\/opencv-js@4\.11\.0-release\.1\/dist\/opencv\.js|onnxruntime-web@1\.23\.2\/dist\/[a-zA-Z0-9_.-]+\.(?:js|mjs|wasm))$/.test(u.pathname)));}
function verify(url,method='GET',body){if(method.toUpperCase()!=='GET'||body!=null||!allowed(url))throw new Error('The photo scanner blocked a non-asset network request.');requests.push({url:new URL(url,root.location.href).href,method:'GET'});}
const originalFetch=root.fetch.bind(root);root.fetch=(input,options={})=>{const url=typeof input==='string'||input instanceof URL?String(input):input.url;verify(url,options.method||input.method||'GET',options.body??input.body);return originalFetch(input,{...options,credentials:'omit',referrerPolicy:'no-referrer'});};
const originalImport=root.importScripts.bind(root);root.importScripts=(...urls)=>{urls.forEach(u=>verify(u));return originalImport(...urls);};
if(root.XMLHttpRequest){const X=root.XMLHttpRequest;root.XMLHttpRequest=class extends X{open(method,url,...rest){verify(String(url),method);super.open(method,url,...rest);}send(body){if(body!=null)throw new Error('Image uploads are disabled.');super.send();}};}
for(const key of ['WebSocket','EventSource','WebTransport'])root[key]=class{constructor(){throw new Error('Connections are disabled in the photo scanner.');}};
root.HoribaNetwork={requests,allowed,verify};
})(self);

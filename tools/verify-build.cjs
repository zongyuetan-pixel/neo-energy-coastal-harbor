const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
assert(refs.some(ref=>/\/assets\/.*\.js$/.test(ref)),'Missing bundled JavaScript');
assert(refs.some(ref=>/\/assets\/.*\.css$/.test(ref)),'Missing bundled styles');
for(const ref of refs){
  assert(ref.startsWith('/assets/')||ref==='/models/CREDITS.txt',`Unexpected external or source asset: ${ref}`);
  assert(fs.statSync(path.join(root,ref)).isFile(),`Missing build asset: ${ref}`);
}
function verify(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory()){verify(file);continue;}
    if(!/\.(html|js|css)$/.test(file))continue;
    const text=fs.readFileSync(file,'utf8');
    assert(!/https?:\/\/(?:localhost|127\.0\.0\.1|[^/\s"']*chatgpt\.site|cdn\.jsdelivr\.net)/i.test(text),`Preview/CDN dependency found in ${entry.name}`);
    assert(!/file:\/\/\/|C:[/\\]Users[/\\]/i.test(text),`Local path found in ${entry.name}`);
    assert(!/from\s*["']three(?:\/[^"']*)?["']/.test(text),`Unbundled dependency in ${entry.name}`);
  }
}
verify(root);
for(const asset of ['models/electric-sedan.glb','models/CREDITS.txt','draco/draco_wasm_wrapper.js','draco/draco_decoder.wasm']){
  assert(fs.statSync(path.join(root,asset)).size>0,`Missing local vehicle dependency: ${asset}`);
}
const glb=fs.readFileSync(path.join(root,'models/electric-sedan.glb'));
assert.equal(glb.readUInt32LE(0),0x46546c67,'Invalid vehicle GLB');
const gltf=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
assert((gltf.buffers||[]).every(b=>!b.uri),'Vehicle buffer must be embedded');
assert((gltf.images||[]).every(i=>i.bufferView!==undefined),'Vehicle textures must be embedded');
console.log('Production assets verified: local bundles; no preview/CDN dependencies.');

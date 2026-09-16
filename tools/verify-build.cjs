const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]);
assert(refs.some(ref=>/\/assets\/.*\.js$/.test(ref)),'Missing bundled JavaScript');
assert(refs.some(ref=>/\/assets\/.*\.css$/.test(ref)),'Missing bundled styles');
for(const ref of refs){
  assert(ref.startsWith('/assets/'),`Unexpected external or source asset: ${ref}`);
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
console.log('Production assets verified: local bundles; no preview/CDN dependencies.');

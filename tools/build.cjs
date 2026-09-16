const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'dist');
fs.mkdirSync(output,{recursive:true});
fs.copyFileSync(path.join(root,'index.html'),path.join(output,'index.html'));
fs.cpSync(path.join(root,'src'),path.join(output,'src'),{recursive:true});
console.log('Static site ready.');

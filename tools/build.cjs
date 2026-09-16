// Compatibility for callers of the former copy-only build.
import('vite').then(({build})=>build()).then(()=>require('./verify-build.cjs')).catch(error=>{
  console.error(error);process.exitCode=1;
});

const fs=require('fs');const dir='renderer/';const files=fs.readdirSync(dir).filter(f=>/\.(js|html)$/.test(f));
let all='';for(const f of files)all+=fs.readFileSync(dir+f,'utf8')+'\n';
const defs=new Set();for(const m of all.matchAll(/(?:function\*?|async function)\s+([A-Za-z_$][\w$]*)/g))defs.add(m[1]);
for(const m of all.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g))defs.add(m[1]);
for(const m of all.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g))defs.add(m[1]);
for(const m of all.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function/gm))defs.add(m[1]);
const builtin=new Set(['if','return','event','this','confirm','alert','window','document','Number','String','parseInt','parseFloat','setTimeout','api','JSON','Math','Date','event','toggle','stopPropagation','preventDefault','closest','getElementById','querySelector','click','remove','focus','select','classList','value','fn','fv','$','esc','n2','uid','iso','today','history','location','navigator','encodeURIComponent','Array','Object','isNaN','void','typeof','new','await','async','function','else','for','while','try','catch','S','DB']);
const called=new Map();
for(const m of all.matchAll(/\bon(?:click|change|input|keydown|keyup|submit|blur|focus)\s*=\s*\\?["']([^"']*)/g)){for(const c of m[1].matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)){const n=c[1];if(!defs.has(n)&&!builtin.has(n))called.set(n,(called.get(n)||0)+1);}}
console.log(called.size?'UNDEFINED: '+[...called].map(([k,v])=>k+'×'+v).join(', '):'no undefined handlers');
// also data-act style: window[name]

/* ==================== اللغة: عربي / English (طبقة ترجمة حيّة للواجهة) ==================== */
let LANG='ar';try{LANG=localStorage.getItem('lang')==='en'?'en':'ar';}catch(e){}
const LOCALE=()=>LANG==='en'?'en-GB':'ar-AE';
const I18N_AR=/[؀-ۿ]/;
const I18N_ORIG=new WeakMap(),I18N_SET=new WeakMap();
const I18N_NUM=/[0-9][0-9.,:%]*/g;
const I18N_SEP=/( · | — | – | - |: |\(|\)| \/ |\/|\||•|\n|\.\.\.|…| \+ | = | ≈ )/;
const I18N_SEP_MAP={};
const I18N_SKIP='.letter-preview,[contenteditable],textarea,.print,.doc-body';
function i18nNorm(s){return String(s).replace(/\s+/g,' ').trim();}
function i18nLookup(n){const d=window.I18N_DICT||{};if(d[n]!==undefined)return d[n];
  const nums=n.match(I18N_NUM);if(nums){const key=n.replace(I18N_NUM,'#');const v=d[key];if(v!==undefined){let i=0;return v.replace(/#/g,()=>nums[i++]??'');}}
  return undefined;}
function tr(s){if(LANG!=='en'||s==null)return s;const raw=String(s);if(!I18N_AR.test(raw))return raw;
  const lead=raw.match(/^\s*/)[0],trail=raw.match(/\s*$/)[0];const n=i18nNorm(raw);if(!n)return raw;
  let v=i18nLookup(n);if(v!==undefined)return lead+v+trail;
  const pm=n.match(/^([^\p{L}\p{N}#]+\s*)([\s\S]*)$/u);if(pm&&pm[2]){const v2=i18nLookup(pm[2].trim());if(v2!==undefined)return lead+pm[1]+v2+trail;const v3=tr(pm[2]);if(v3!==pm[2])return lead+pm[1]+v3+trail;}
  const MON={'يناير':'January','فبراير':'February','مارس':'March','أبريل':'April','مايو':'May','يونيو':'June','يوليو':'July','أغسطس':'August','سبتمبر':'September','أكتوبر':'October','نوفمبر':'November','ديسمبر':'December'};
  if(/(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)/.test(n)){const n2=n.replace(/يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر/g,m=>MON[m]);if(!I18N_AR.test(n2))return lead+n2+trail;const v4=i18nLookup(n2.replace(/January|February|March|April|May|June|July|August|September|October|November|December/g,'#'));if(v4!==undefined){const mo=n2.match(/January|February|March|April|May|June|July|August|September|October|November|December/g);let i=0;return lead+v4.replace(/#/g,()=>mo[i++]??'')+trail;}}
  const parts=n.split(I18N_SEP);if(parts.length>1){let any=false;const out=parts.map((p,i)=>{if(i%2===1){if(I18N_SEP_MAP[p]){any=true;return I18N_SEP_MAP[p];}return p;}const t=i18nLookup(i18nNorm(p));if(t!==undefined){any=true;const l=p.match(/^\s*/)[0],r=p.match(/\s*$/)[0];return l+t+r;}return p;});if(any)return lead+out.join('')+trail;}
  return raw;}
const I18N_ATTRS=['placeholder','title','aria-label'];
function i18nText(node){if(LANG!=='en')return;if(node.parentElement&&node.parentElement.closest(I18N_SKIP))return;const cur=node.nodeValue;if(I18N_SET.get(node)===cur)return;if(!I18N_AR.test(cur))return;I18N_ORIG.set(node,cur);const t=tr(cur);if(t!==cur){node.nodeValue=t;I18N_SET.set(node,t);}}
function i18nEl(el){if(LANG!=='en')return;if(el.closest&&el.closest(I18N_SKIP))return;for(const a of I18N_ATTRS){const v=el.getAttribute(a);if(v&&I18N_AR.test(v)){const key='__i18n_'+a;if(el[key]===v)continue;el.dataset['i18n'+a.replace(/-/g,'')]=v;const t=tr(v);el.setAttribute(a,t);el[key]=t;}}
  if(el.tagName==='INPUT'&&(el.type==='button'||el.type==='submit')&&I18N_AR.test(el.value)){el.dataset.i18nvalue=el.value;el.value=tr(el.value);}}
function i18nWalk(root){if(LANG!=='en')return;if(root.nodeType===3){i18nText(root);return;}if(root.nodeType!==1)return;if(['SCRIPT','STYLE'].includes(root.tagName))return;i18nEl(root);const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);let n;while(n=w.nextNode()){if(n.nodeType===3){if(n.parentNode&&['SCRIPT','STYLE'].includes(n.parentNode.tagName))continue;i18nText(n);}else i18nEl(n);}}
function i18nRestore(root){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);let n;const els=[root];while(n=w.nextNode()){if(n.nodeType===3){const o=I18N_ORIG.get(n);if(o!==undefined&&I18N_SET.get(n)===n.nodeValue){n.nodeValue=o;I18N_SET.delete(n);}}else els.push(n);}
  for(const el of els){if(el.nodeType!==1)continue;for(const a of I18N_ATTRS){const k='i18n'+a.replace(/-/g,'');if(el.dataset&&el.dataset[k]!==undefined){el.setAttribute(a,el.dataset[k]);delete el.dataset[k];delete el['__i18n_'+a];}}if(el.dataset&&el.dataset.i18nvalue!==undefined){el.value=el.dataset.i18nvalue;delete el.dataset.i18nvalue;}}}
const i18nObs=new MutationObserver(ms=>{if(LANG!=='en')return;for(const m of ms){if(m.type==='characterData')i18nText(m.target);else if(m.type==='attributes')i18nEl(m.target);else for(const n of m.addedNodes)i18nWalk(n);}});
function i18nApply(){document.documentElement.lang=LANG;document.documentElement.dir=LANG==='en'?'ltr':'rtl';document.body.classList.toggle('en',LANG==='en');
  if(LANG==='en'){document.title='SEVENGATES · HR Platform';i18nWalk(document.body);i18nObs.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:I18N_ATTRS});}
  else{i18nObs.disconnect();document.title='منصة شؤون الموظفين';i18nRestore(document.body);}
  document.querySelectorAll('.langBtn').forEach(b=>b.textContent=LANG==='en'?'عربي':'English');}
function setLang(l){LANG=l==='en'?'en':'ar';try{localStorage.setItem('lang',LANG);}catch(e){}i18nApply();
  try{if(typeof isLocked==='function'&&!isLocked()){if(typeof charts!=='undefined')charts.splice(0).forEach(c=>c.destroy());if(typeof current!=='undefined'&&current.page){const t=document.getElementById('pageTitle');if(t)t.textContent=TITLES[current.page]||'';}render();const tl=document.getElementById('todayLine');if(tl){const t=today();tl.textContent=t.toLocaleDateString(LOCALE(),{weekday:'long',day:'numeric',month:'long',year:'numeric'})+(hijri(t)?'  ·  '+hijri(t):'');}}else if(typeof showLock==='function')showLock();}catch(e){}}
function toggleLang(){setLang(LANG==='en'?'ar':'en');}
/* Chart.js: ترجمة التسميات */
if(window.Chart){const _C=window.Chart;window.Chart=new Proxy(_C,{construct(t,args){const cfg=args[1];if(LANG==='en'&&cfg&&cfg.data){if(Array.isArray(cfg.data.labels))cfg.data.labels=cfg.data.labels.map(x=>typeof x==='string'?tr(x):x);(cfg.data.datasets||[]).forEach(d=>{if(typeof d.label==='string')d.label=tr(d.label);});if(cfg.options&&cfg.options.plugins&&cfg.options.plugins.title&&typeof cfg.options.plugins.title.text==='string')cfg.options.plugins.title.text=tr(cfg.options.plugins.title.text);}return new t(...args);}});}
document.addEventListener('DOMContentLoaded',()=>{if(LANG==='en')i18nApply();});

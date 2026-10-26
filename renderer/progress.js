/* ==== زر الطوارئ + حفظ التقدم (مسودات مشفّرة على الجهاز) ====
   - كل نافذة فيها خانات: زر 💾 حفظ التقدم + حفظ تلقائي + استرجاع عند إعادة فتحها
   - كل صفحة فيها خانات: زر عائم 💾 + حفظ تلقائي + استرجاع عند الرجوع للصفحة
   - 🚨 طوارئ: يحفظ تقدّمك ثم يسحب نسخة احتياطية كاملة فوراً */
(function(){
  const SKIP_ID=/^(gsearch|pw|pw1|pw2|pw_|un|pbIn|sp1|sp2|sp_|pin_|re_|fa_|rc_)/i;
  const okField=(el,inModal)=>{const t=(el.type||'').toLowerCase();if(!el.id||el.disabled)return false;if(['password','file','button','submit','hidden','range','color'].includes(t))return false;if(SKIP_ID.test(el.id)||/pass|secret|token|pin/i.test(el.id))return false;if(el.closest('.gsearch,#gresults,.toasts'))return false;if(!inModal&&(el.classList.contains('search')||el.hasAttribute('oninput')||el.hasAttribute('onchange')))return false;return true;};
  const collect=(root,inModal)=>{const o={};if(!root)return o;root.querySelectorAll('input,select,textarea').forEach(el=>{if(!okField(el,inModal))return;const t=(el.type||'').toLowerCase();o[el.id]=(t==='checkbox'||t==='radio')?{c:!!el.checked}:{v:String(el.value).slice(0,5000)};});return o;};
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const modalOpen=()=>{const o=document.getElementById('overlay');return !!(o&&o.classList.contains('open'));};
  const pageParam=()=>{const p=window.current&&current.param;return String(p&&typeof p==='object'?JSON.stringify(p):(p||'')).slice(0,80);};
  const ctx=()=>{if(modalOpen()){const h=document.querySelector('#modal .modal-head h2');const title=h?h.textContent.trim():'';return{kind:'m',key:PROG.mkey||('m:'+title),title,root:document.getElementById('modal')};}const t=document.getElementById('pageTitle');return{kind:'p',key:PROG.pkey||('p:'+((window.current&&current.page)||'')+':'+pageParam()),title:t?t.textContent.trim():'',root:document.getElementById('page')};};
  const PROG={base:{},silent:false,lastClose:null,pageKey:null,t:null,mkey:null,pkey:null};
  /* بصمة الحالة الابتدائية: المسودة تخص هذا النموذج بهذه البيانات بالذات (تمنع إسقاط مسودة سجل على سجل آخر) */
  const stamp=(root,inModal)=>{let h=5381;if(root)root.querySelectorAll('input,select,textarea').forEach(el=>{const t=(el.type||'').toLowerCase();if(!okField(el,inModal)||['date','month','time','datetime-local','week'].includes(t))return;const s=el.id+'='+((t==='checkbox'||t==='radio')?(el.checked?1:0):String(el.value).slice(0,200))+';';for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;});return (h>>>0).toString(36);};
  const hasFields=c=>Object.keys(collect(c.root,c.kind==='m')).length>0;
  async function saveNow(manual){const c=ctx();if(!c.root)return false;const f=collect(c.root,c.kind==='m');if(!Object.keys(f).length)return false;const base=PROG.base[c.key]||{};if(!manual&&same(f,base))return false;
    try{await api.draft.set(c.key,f,c.title);}catch(e){return false;}
    if(manual){PROG.silent=true;toast('💾 تم حفظ تقدّمك — ستجده كما هو حين ترجع','ok');PROG.silent=false;}return true;}
  PROG.saveNow=saveNow;
  async function restore(c){let d=null;try{d=await api.draft.get(c.key);}catch(e){}if(!d||!d.fields)return false;const inModal=c.kind==='m';const cur=collect(c.root,inModal);let n=0;
    for(const [id,spec] of Object.entries(d.fields)){const el=c.root.querySelector('#'+CSS.escape(id));if(!el||!okField(el,inModal))continue;const t=(el.type||'').toLowerCase();
      if(t==='checkbox'||t==='radio'){if(spec.c!==undefined&&el.checked!==spec.c){el.checked=spec.c;n++;}}
      else if(spec.v!==undefined&&String(el.value)!==spec.v){if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===spec.v))continue;el.value=spec.v;n++;if(inModal&&(el.hasAttribute('onchange')||el.hasAttribute('oninput'))){try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}}}}
    if(!n)return false;PROG.silent=true;toast('🕘 رجّعنا لك آخر ما كتبته (محفوظ '+ago(d.at)+')','ok');PROG.silent=false;
    if(inModal){const foot=c.root.querySelector('.modal-foot');if(foot&&!foot.querySelector('.prog-discard')){const b=document.createElement('button');b.className='btn ghost sm prog-discard';b.textContent='↩ تجاهل المسودة';b.onclick=async()=>{try{await api.draft.del(c.key);}catch(e){}const base=PROG.base[c.key]||{};for(const [id,spec] of Object.entries(base)){const el=c.root.querySelector('#'+CSS.escape(id));if(!el)continue;if(spec.c!==undefined)el.checked=spec.c;else el.value=spec.v;}b.remove();toast('تم تجاهل المسودة');};foot.appendChild(b);}}
    return true;}
  const ago=ts=>{const m=Math.max(0,Math.round((Date.now()-ts)/60000));if(m<1)return 'الآن';if(m<60)return 'منذ '+m+' دقيقة';const h=Math.round(m/60);if(h<24)return 'منذ '+h+' ساعة';return 'منذ '+Math.round(h/24)+' يوم';};
  /* ---- النوافذ ---- */
  const _om=window.openModal;
  window.openModal=function(){PROG.mkey=null;const r=_om.apply(this,arguments);setTimeout(async()=>{const h=document.querySelector('#modal .modal-head h2');const ttl=h?h.textContent.trim():'';const mr=document.getElementById('modal');if(!mr||!hasFields({kind:'m',root:mr}))return;PROG.mkey='m:'+ttl+':'+stamp(mr,true);const c=ctx();if(c.kind!=='m')return;PROG.base[c.key]=collect(c.root,true);let foot=c.root.querySelector('.modal-foot');if(!foot){foot=document.createElement('div');foot.className='modal-foot';c.root.appendChild(foot);}
      if(!foot.querySelector('.prog-save')){const b=document.createElement('button');b.className='btn ghost sm prog-save';b.type='button';b.textContent='💾 حفظ التقدم';b.onclick=()=>saveNow(true);foot.appendChild(b);}
      await restore(c);},0);return r;};
  const _cm=window.closeModal;
  window.closeModal=function(){const c=ctx();if(c.kind==='m'&&PROG.mkey)PROG.lastClose={key:c.key,at:Date.now()};PROG.mkey=null;return _cm.apply(this,arguments);};
  /* ---- نجاح العملية = لا حاجة للمسودة ---- */
  const _t=window.toast;
  window.toast=function(msg,type){const r=_t.apply(this,arguments);if(type==='ok'&&!PROG.silent){try{if(PROG.lastClose&&Date.now()-PROG.lastClose.at<2500){api.draft.del(PROG.lastClose.key).catch(()=>{});PROG.lastClose=null;}const c=ctx();if(c.kind==='p')api.draft.del(c.key).catch(()=>{});}catch(e){}}return r;};
  /* ---- الصفحات ---- */
  const fab=document.createElement('button');fab.id='progFab';fab.className='btn primary hidden';fab.type='button';fab.textContent='💾 حفظ التقدم';fab.style.cssText='position:fixed;bottom:20px;inset-inline-end:20px;z-index:60;box-shadow:var(--shadow);border-radius:999px;padding:12px 18px';fab.onclick=()=>saveNow(true);
  document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(fab));if(document.body)document.body.appendChild(fab);
  function updFab(){const c=ctx();const show=c.kind==='p'&&c.root&&!document.getElementById('app').classList.contains('hidden')&&hasFields(c);fab.classList.toggle('hidden',!show);}
  const _ar=window.afterRenderHooks;
  window.afterRenderHooks=function(){if(_ar)_ar.apply(this,arguments);setTimeout(async()=>{if(modalOpen())return;const pr=document.getElementById('page');PROG.pkey='p:'+((window.current&&current.page)||'')+':'+pageParam()+':'+stamp(pr,false);const c=ctx();if(c.kind!=='p')return;PROG.base[c.key]=collect(c.root,false);if(PROG.pageKey!==c.key){PROG.pageKey=c.key;if(hasFields(c))await restore(c);}updFab();},0);};
  /* ---- حفظ تلقائي ---- */
  const onEdit=e=>{const el=e.target;if(!el||!el.closest)return;const inM=!!el.closest('#modal');if(!inM&&!el.closest('#page'))return;if(!okField(el,inM))return;updFab();clearTimeout(PROG.t);PROG.t=setTimeout(()=>{saveNow(false);},1200);};
  document.addEventListener('input',onEdit,true);document.addEventListener('change',onEdit,true);
  /* ---- القفل: احفظ قبل القفل ---- */
  document.addEventListener('DOMContentLoaded',()=>{const bl=document.getElementById('btnLock');if(bl)bl.addEventListener('click',()=>{saveNow(false);},true);});
  /* ---- زر الطوارئ ---- */
  window.emergencyBackup=async function(){const b=document.getElementById('btnEmergency');if(b)b.disabled=true;const t0=Date.now();try{await saveNow(true).catch(()=>{});PROG.silent=true;const r=await api.backup.emergency();if(r&&r.ok){const d=new Date();toast('🚨 تم حفظ نسخة طوارئ + تقدّمك على الجهاز ✅ '+d.toLocaleTimeString('en-GB').slice(0,5)+' ('+((Date.now()-t0)/1000).toFixed(1)+' ث)','ok');}else toast('تعذر حفظ نسخة الطوارئ'+((r&&r.errors&&r.errors[0])?': '+r.errors[0]:''),'err');}catch(e){toast('تعذر حفظ نسخة الطوارئ: '+(e&&e.message||e),'err');}finally{PROG.silent=false;if(b)b.disabled=false;}};
  window.PROG=PROG;
})();

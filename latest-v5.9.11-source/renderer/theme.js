/* ===== المظهر: الثيمات + شكل القائمة (تفضيل لكل جهاز/مستخدم) ===== */
const THEMES=[
  {k:'dark', nm:'🌙 ليلي',        dots:['#08141A','#12B5A6','#0C2138']},
  {k:'light',nm:'☀️ نهاري',       dots:['#EEF2F5','#0FA596','#FFFFFF']},
  {k:'blue', nm:'🌊 أزرق احترافي', dots:['#081626','#19C3B3','#143055']},
  {k:'pink', nm:'🌸 PINK وردي',    dots:['#FDF1F6','#E0508B','#FFFFFF']},
  {k:'lavender',nm:'💜 Lavender لافندر', dots:['#F4F1FC','#7B5CD6','#FFFFFF']},
  {k:'mauve',nm:'🍇 Mauve موف',     dots:['#1D1323','#D08AC4','#30213B']},
];
const NAVMODES=[
  {k:'side',   big:'▤', nm:'قائمة جانبية', ds:'القائمة الكاملة على الجانب'},
  {k:'compact',big:'▥', nm:'مصغّرة',      ds:'أيقونات فقط — مساحة أوسع'},
  {k:'grid',   big:'▦', nm:'شبكة',        ds:'زر يفتح لوحة الأقسام'},
  {k:'top',    big:'▣', nm:'مركز القيادة', ds:'كل الأقسام في شريط علوي — شاشة واحدة'},
  {k:'app',    big:'◰', nm:'تطبيق (بطاقات)', ds:'شاشة رئيسية فيها كل الأقسام كبطاقات — بدون قوائم'},
];
function getTheme(){try{const t=localStorage.getItem('theme');return THEMES.some(x=>x.k===t)?t:'dark';}catch(e){return 'dark';}}
function getNav(){try{const n=localStorage.getItem('navmode');return NAVMODES.some(x=>x.k===n)?n:'app';}catch(e){return 'app';}}
const LIGHT_THEMES=['light','pink','lavender'];
function applyTheme(k){try{const r=document.documentElement;r.setAttribute('data-theme',k);r.setAttribute('data-tone',LIGHT_THEMES.includes(k)?'light':'dark');}catch(e){}}

/* 5.9.1 — تخطيط مركز القيادة: صف واحد للعلامة والأدوات + صف تبويبات لكل الأقسام */
const NAV_SHORT={dashboard:'مركز القيادة',alerts:'التنبيهات',employees:'الموظفون',finance:'المالية',projects:'المشروعات',field:'الميدان',taxes:'الضرائب',letters:'الخطابات',leaves:'الإجازات',payroll:'الرواتب',reports:'التقارير',print:'الطباعة',me:'بياناتي',offers:'العروض',documents:'المستندات',guide:'الدليل',userhelp:'التعليمات',sites:'مواقعنا',devices:'الأجهزة',review:'المراجعة',settings:'الإعدادات'};

const AB_ICONS={btnLock:'lock',abHome:'home',abSet:'gear',abLook:'palette',btnEmergency:'bell',btnSound:'bell',btnQuickBackup:'download',btnUpdate:'arrowIn'};
const AB_BYCALL=[['btnLock','lock'],['lockNow','lock'],['openAppearance','palette'],['openSectionControl','layers'],['openSupport','life'],['toggleLang','globe'],['goBack','arrowOut'],['emergencyBackup','life'],['toggleSound','bell'],['updateNow','arrowIn']];
const AB_TITLES={abHome:'الشاشة الرئيسية',abSet:'الإعدادات',abLook:'المظهر وشكل الواجهة',btnEmergency:'نسخة طوارئ فورية',btnSound:'الأصوات والتنبيهات',btnQuickBackup:'نسخة احتياطية',btnUpdate:'تحديث البرنامج',btnBack:'رجوع'};
const AB_TITLE_BYCALL=[['openAppearance','المظهر والألوان'],['openSectionControl','تخصيص الأقسام الظاهرة'],['openSupport','الدعم والمساعدة'],['toggleLang','تغيير اللغة'],['goBack','رجوع'],['emergencyBackup','نسخة طوارئ فورية'],['toggleSound','الأصوات'],['updateNow','تحديث البرنامج'],['openSectionGrid','كل الأقسام']];
function appIconize(){
  try{ if(typeof ic!=='function')return;
    const put=(b,n)=>{ if(!b||b.dataset.iconed)return; const txt=(b.textContent||'').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu,'').trim();
      b.innerHTML=ic(n)+(txt?'<span>'+txt+'</span>':''); b.dataset.iconed='1'; };
    Object.entries(AB_ICONS).forEach(([id,n])=>put(document.getElementById(id),n));
    document.querySelectorAll('.actions .btn, #topTools .btn, .topbar .btn, #appbar .btn, .side .foot .btn').forEach(b=>{const oc=(b.getAttribute('onclick')||'')+' '+(b.id||'');const m=AB_BYCALL.find(x=>oc.includes(x[0]));if(m){put(b,m[1]);return;}if(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(b.textContent||''))put(b,'help');});
    /* اسم واضح لكل زر عند الوقوف عليه */
    document.querySelectorAll('.actions .btn, #topTools .btn, .topbar .btn, #appbar .btn, .side .foot .btn').forEach(b=>{
      if(b.getAttribute('title'))return;
      const t=AB_TITLES[b.id]||(AB_TITLE_BYCALL.find(x=>((b.getAttribute('onclick')||'')+' '+(b.id||'')).includes(x[0]))||[])[1]||(b.textContent||'').trim();
      if(t)b.setAttribute('title',typeof tr==='function'?tr(t):t);});
  }catch(e){}
}
function applyAppLayout(){
  try{
    const on=getNav()==='app',main=document.querySelector('.main'),bar=document.querySelector('.topbar');
    if(!main||!bar)return;
    let ab=document.getElementById('appbar');
    if(on){
      if(!ab){
        ab=document.createElement('div');ab.id='appbar';ab.className='appbar';
        ab.innerHTML='<div class="abrand"><img src="logo.png" alt=""><span id="abName">'+(typeof tr==='function'?tr('شؤون الموظفين'):'شؤون الموظفين')+'</span></div><div class="abslot"></div>';
        ab.querySelector('.abrand').onclick=()=>go('dashboard');
        main.insertBefore(ab,main.firstChild);
      }
      const slot=ab.querySelector('.abslot');
      /* الأدوات الأصلية (البحث وأزرار الخدمات) مهما كان مكانها الحالي */
      const acts=document.querySelector('.actions');if(acts&&acts.parentNode!==slot)slot.appendChild(acts);
      /* أزرار ثابتة لا تعتمد على أي شيء: الرئيسية + الإعدادات + المظهر */
      const host=ab.querySelector('.actions')||slot;
      const mk=(id,title,call,cls)=>{if(document.getElementById(id))return;const b=document.createElement('button');b.id=id;b.className='btn '+(cls||'icon');b.title=title;b.setAttribute('onclick',call);host.appendChild(b);};
      mk('abHome',typeof tr==='function'?tr('الشاشة الرئيسية'):'الشاشة الرئيسية',"go('dashboard')");
      mk('abSet',typeof tr==='function'?tr('الإعدادات'):'الإعدادات',"go('settings')");
      mk('abLook',typeof tr==='function'?tr('المظهر وشكل الواجهة'):'المظهر وشكل الواجهة',"openAppearance()");
      const nm=document.getElementById('brandName');if(nm)document.getElementById('abName').textContent=nm.textContent;
      appIconize();
    }else if(ab){
      ['abHome','abSet','abLook'].forEach(id=>{const b=document.getElementById(id);if(b)b.remove();});
      const acts=ab.querySelector('.actions');if(acts)bar.appendChild(acts);
      ab.remove();
    }
  }catch(e){}
}
function appFab(){
  try{
    let f=document.getElementById('apFab');
    if(!f){
      f=document.createElement('button');f.id='apFab';f.className='apfab';f.title=(typeof tr==='function'?tr('الرجوع للشاشة الرئيسية'):'الرجوع للشاشة الرئيسية');
      f.onclick=()=>go('dashboard');
      document.body.appendChild(f);
    }
    const home=(typeof current!=='undefined'&&current.page==='dashboard');
    f.innerHTML=(typeof ic==='function'?ic('home'):'')+'<span>'+(typeof tr==='function'?tr('الرئيسية'):'الرئيسية')+'</span>';
    f.classList.toggle('hidden',!!home);
  }catch(e){}
}
function applyTopLayout(){
  try{
    const top=getNav()==='top',side=document.querySelector('.side'),bar=document.querySelector('.topbar');
    if(!side||!bar)return;
    let host=document.getElementById('topTools');
    if(top){
      if(!host){host=document.createElement('div');host.id='topTools';host.className='toptools';side.insertBefore(host,side.querySelector('.navlist'));}
      const acts=bar.querySelector('.actions');if(acts&&acts.parentNode!==host)host.appendChild(acts);
      const back=document.getElementById('btnBack');if(back&&back.parentNode!==host)host.insertBefore(back,host.firstChild);
      document.querySelectorAll('.side .nav').forEach(b=>{const s=NAV_SHORT[b.dataset.page];const l=b.querySelector('.lbl');if(s&&l){if(!l.dataset.full)l.dataset.full=l.textContent;l.textContent=typeof tr==='function'?tr(s):s;}});
    }else if(host){
      const acts=host.querySelector('.actions');if(acts)bar.appendChild(acts);
      const back=host.querySelector('#btnBack');if(back)bar.querySelector('div').insertBefore(back,bar.querySelector('div').firstChild);
      host.remove();
      document.querySelectorAll('.side .nav .lbl').forEach(l=>{if(l.dataset.full)l.textContent=l.dataset.full;});
    }
    applyAppLayout();
    appIconize();
    appFab();
  }catch(e){}
}

function applyNav(k){try{if(document.body)document.body.setAttribute('data-nav',k);}catch(e){}setTimeout(applyTopLayout,0);}
function setTheme(k){if(!THEMES.some(x=>x.k===k))k='dark';try{localStorage.setItem('theme',k);}catch(e){}applyTheme(k);if(typeof current!=='undefined'&&typeof render==='function')try{render();}catch(e){}}
function setNav(k){if(!NAVMODES.some(x=>x.k===k))k='app';try{localStorage.setItem('navmode',k);}catch(e){}applyNav(k);if(typeof render==='function')try{render();}catch(e){}}

/* لفّ نص كل زر قسم في <span class="lbl"> + تلميح data-tip (مرة واحدة) */
function wrapNavLabels(){
  document.querySelectorAll('.side .nav').forEach(b=>{
    if(b.querySelector('.lbl'))return;
    let tip='';const moved=[];
    b.childNodes.forEach(n=>{
      if(n.nodeType===3&&n.nodeValue.trim()){tip+=n.nodeValue.trim();moved.push(n);}
      else if(n.nodeType===1&&!n.classList.contains('ic')&&!n.classList.contains('cnt')){tip+=n.textContent.trim();moved.push(n);}
    });
    if(moved.length){const lbl=document.createElement('span');lbl.className='lbl';moved.forEach(n=>lbl.appendChild(n));
      const cnt=b.querySelector('.cnt');if(cnt)b.insertBefore(lbl,cnt);else b.appendChild(lbl);}
    if(tip)b.setAttribute('data-tip',tip);
  });
}

/* لوحة الأقسام (وضع الشبكة) */
function openSectionGrid(){
  const navs=[...document.querySelectorAll('.side .nav')].filter(b=>!b.classList.contains('hidden'));
  const tiles=navs.map(b=>{
    const page=b.dataset.page;const ic=(b.querySelector('.ic')||{}).textContent||'•';
    const lbl=(b.querySelector('.lbl')||{}).textContent||b.textContent.trim();
    const cntEl=b.querySelector('.cnt');const cnt=(cntEl&&!cntEl.classList.contains('hidden')&&cntEl.textContent)?`<span class="cnt">${cntEl.textContent}</span>`:'';
    const act=(typeof current!=='undefined'&&current.page===page)?' active':'';
    return `<div class="sectile${act}" onclick="go('${page}');closeModal()"><span class="ic">${ic}</span><span class="lbl">${lbl}</span>${cnt}</div>`;
  }).join('');
  const foot=`<button class="btn" onclick="closeModal();updateNow&&updateNow()">🔄 ${typeof tr==='function'?tr('تحديث البرنامج'):'تحديث البرنامج'}</button>`+
    `<button class="btn ghost" onclick="closeModal();var l=document.getElementById('btnLock');l&&l.click()">🔒 ${typeof tr==='function'?tr('قفل المنصة'):'قفل المنصة'}</button>`+
    `<button class="btn ghost" onclick="toggleLang&&toggleLang()">English / عربي</button>`;
  openModal(typeof tr==='function'?tr('📋 لوحة الأقسام'):'📋 لوحة الأقسام',`<div class="seclaunch">${tiles}</div>`,foot);
}

/* بطاقات اختيار المظهر (تُعرض في الإعدادات) */
function appearanceSettingsHTML(){
  const t=getTheme(),n=getNav();
  const themeCards=THEMES.map(x=>`<div class="themecard${x.k===t?' active':''}" onclick="setTheme('${x.k}')"><div class="swatch" style="background:${x.dots[0]}">${x.dots.map(d=>`<span class="dot" style="background:${d}"></span>`).join('')}</div><div class="nm">${x.nm}</div></div>`).join('');
  const _t=typeof tr==='function'?tr:s=>s;
  const navCards=NAVMODES.map(x=>`<div class="navcard${x.k===n?' active':''}" onclick="setNav('${x.k}')"><div class="big">${x.big}</div><div class="nm">${_t(x.nm)}</div><div class="ds">${_t(x.ds)}</div></div>`).join('');
  return `<h3>🎨 ${_t('سمة الألوان')}</h3><p class="muted mini">${_t('اختيارك محفوظ على هذا الجهاز لك وحدك — لا يؤثر على بقية المستخدمين ولا على بياناتك.')}</p><div class="themegrid">${themeCards}</div>`+
    `<h3 style="margin-top:18px">🧭 ${_t('شكل القائمة')}</h3><p class="muted mini">${_t('اختر طريقة عرض الأقسام التي تريحك.')}</p><div class="navopt">${navCards}</div>`+(window.MASCOT?MASCOT.settingsHTML():'');
}

/* نافذة المظهر السريعة (متاحة للجميع من القائمة الجانبية) */
function openAppearance(){const _t=typeof tr==='function'?tr:s=>s;openModal(_t('🎨 المظهر'),appearanceSettingsHTML(),`<button class="btn" onclick="closeModal()">${_t('تم')}</button>`);}

/* ===== تخصيص الأقسام الظاهرة (لكل مستخدم على جهازه) ===== */
const ALWAYS_SHOW=['dashboard']; // لوحة التحكم ثابتة دائماً
function getHidden(){try{const a=JSON.parse(localStorage.getItem('hiddenSections')||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function setHidden(arr){try{localStorage.setItem('hiddenSections',JSON.stringify(arr));}catch(e){}}
function isSectionHidden(page){return getHidden().includes(page)&&!ALWAYS_SHOW.includes(page);}
/* يُستدعى من applySession بعد تطبيق الصلاحيات */
function applySectionVisibility(){const hidden=getHidden();document.querySelectorAll('.side .nav').forEach(b=>{const p=b.dataset.page;if(ALWAYS_SHOW.includes(p))return;if(hidden.includes(p))b.classList.add('hidden');});}
function toggleSection(page,on){let h=getHidden();if(on){h=h.filter(x=>x!==page);}else if(!h.includes(page)){h.push(page);}setHidden(h);
  if(typeof applySession==='function')applySession();
  // لو المستخدم أخفى القسم المفتوح حالياً، ارجع للوحة التحكم
  if(!on&&typeof current!=='undefined'&&current.page===page&&typeof go==='function')go('dashboard');
  // حدّث اللوحة المفتوحة
  const box=document.getElementById('secCtrlBox');if(box)box.innerHTML=sectionControlInner();
}
function sectionControlInner(){
  const hidden=getHidden();
  const navs=[...document.querySelectorAll('.side .nav')].filter(b=>{const p=b.dataset.page;
    // اعرض فقط الأقسام المسموح بها لحساب المستخدم
    return typeof pageAllowed!=='function'||pageAllowed(p)||!b.classList.contains('hidden')||hidden.includes(p);});
  return navs.map(b=>{const p=b.dataset.page;const ic=(b.querySelector('.ic')||{}).textContent||'•';
    const lbl=(b.querySelector('.lbl')||{}).textContent||b.textContent.trim();
    const always=ALWAYS_SHOW.includes(p);const on=always|| !hidden.includes(p);
    return `<label class="secrow${always?' locked':''}"><span class="secname"><span class="ic">${ic}</span>${lbl}</span>${always?'<span class="badge b-muted mini">دائم</span>':`<input type="checkbox" class="secToggle" ${on?'checked':''} onchange="toggleSection('${p}',this.checked)">`}</label>`;
  }).join('');
}
function openSectionControl(){
  const _t=typeof tr==='function'?tr:s=>s;
  openModal(_t('🧩 تخصيص الأقسام الظاهرة'),
    `<p class="muted mini">${_t('شغّل الأقسام اللي محتاجها فقط عشان الشاشة تبقى مرتبة. اختيارك محفوظ على جهازك لك وحدك — لا يغيّر صلاحياتك ولا بياناتك. تقدر ترجّع أي قسم في أي وقت من هنا.')}</p><div id="secCtrlBox" class="seccontrol">${sectionControlInner()}</div>`,
    `<button class="btn ghost" onclick="setHidden([]);(typeof applySession==='function')&&applySession();document.getElementById('secCtrlBox').innerHTML=sectionControlInner()">${_t('إظهار الكل')}</button><button class="btn" onclick="closeModal()">${_t('تم')}</button>`);
}

/* ===== الدعم الفني ===== */
const SUPPORT={phoneEG:'+201062101213',waEG:'201062101213',waAE:''};
function openSupport(){
  const _t=typeof tr==='function'?tr:s=>s;
  const msg=encodeURIComponent('السلام عليكم، أحتاج مساعدة في منصة شؤون الموظفين SEVENGATES.');
  const waAE=SUPPORT.waAE?`<button class="btn ok" onclick="api.openUrl('https://wa.me/${SUPPORT.waAE}?text=${msg}')">📲 ${_t('واتساب (الإمارات)')}</button>`:'';
  openModal(_t('🆘 تواصل مع الدعم الفني'),
    `<div style="text-align:center;line-height:2.1"><div style="font-size:2.4rem">🛠️</div><p>${_t('فريق دعم')} <b>SEVENGATES</b> ${_t('جاهز لمساعدتك.')}</p>
     <div class="kv" style="justify-content:center;margin:10px 0"><div><small>${_t('الهاتف / واتساب')}</small><b dir="ltr">${SUPPORT.phoneEG}</b></div></div></div>`,
    `<button class="btn ok" onclick="api.openUrl('https://wa.me/${SUPPORT.waEG}?text=${msg}')">📲 ${_t('واتساب')}</button>${waAE}<button class="btn" onclick="api.openUrl('tel:${SUPPORT.phoneEG}')">📞 ${_t('اتصال')}</button><button class="btn ghost" onclick="navigator.clipboard&&navigator.clipboard.writeText('${SUPPORT.phoneEG}').then(()=>toast('${_t('تم نسخ الرقم')}','ok'))">📋 ${_t('نسخ الرقم')}</button><button class="btn" onclick="closeModal()">${_t('إغلاق')}</button>`);
}

/* التطبيق المبكر لتفادي الوميض */
applyTheme(getTheme());
document.addEventListener('DOMContentLoaded',()=>{applyNav(getNav());wrapNavLabels();applyTopLayout();});

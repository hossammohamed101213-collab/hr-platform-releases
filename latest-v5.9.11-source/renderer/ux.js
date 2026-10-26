/* ===== لمسات الاستخدام: أصوات + شاشة ترحيب + تلميحات + اهتزاز الحقول + ترحيب مخصّص ===== */

/* ---------- الأصوات (مولّدة برمجياً — بدون ملفات) ---------- */
const UX = (function(){
  let ctx=null;
  function muted(){try{return localStorage.getItem('uxMute')==='1';}catch(e){return false;}}
  function setMuted(m){try{localStorage.setItem('uxMute',m?'1':'0');}catch(e){}}
  function ensure(){if(muted())return null;try{if(!ctx)ctx=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();}catch(e){ctx=null;}return ctx;}
  function tone(freq,start,dur,type,gain){const c=ensure();if(!c)return;const o=c.createOscillator();const g=c.createGain();o.type=type||'sine';o.frequency.value=freq;const t0=c.currentTime+start;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(gain||0.14,t0+0.015);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+dur+0.02);}
  function startup(){if(muted())return;ensure();[ [523.25,0,0.18],[659.25,0.1,0.18],[783.99,0.2,0.22],[1046.5,0.32,0.4] ].forEach(([f,s,d])=>tone(f,s,d,'triangle',0.16));}
  function notify(){if(muted())return;tone(880,0,0.14,'sine',0.13);tone(1174.7,0.09,0.2,'sine',0.12);}
  function error(){if(muted())return;tone(220,0,0.14,'square',0.10);tone(165,0.1,0.18,'square',0.09);}
  return {startup,notify,error,muted,setMuted,ensure};
})();
function toggleSound(){UX.setMuted(!UX.muted());const b=document.getElementById('btnSound');if(b)b.textContent=UX.muted()?'🔕':'🔔';if(!UX.muted()){UX.ensure();UX.notify();}toast(UX.muted()?'تم كتم الأصوات':'تم تفعيل الأصوات','ok');}

/* ---------- شاشة الترحيب المتحركة + صوت البداية ---------- */
function showSplash(done){
  try{
    const co=(window.S&&S.settings&&S.settings.company)||'';
    const d=document.createElement('div');d.id='splash';
    d.innerHTML=`<div class="splash-inner"><img src="${(window.S&&S.settings&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(S.settings.logo||''))?S.settings.logo:'logo.png'}" alt="" class="splash-logo"><div class="splash-name">${esc(co)}</div></div>`;
    document.body.appendChild(d);
    UX.startup();
    setTimeout(()=>{d.classList.add('out');},1050);
    setTimeout(()=>{d.remove();if(done)done();},1500);
  }catch(e){if(done)done();}
}

/* ---------- التلميحات في كل مكان (title + data-tip) ---------- */
const SECTION_DESC={print:'طباعة أي ورقة وختم وتوقيع وأوراق خارجية',dashboard:'نظرة عامة وأهم المؤشرات',me:'راتبك وإجازاتك وسلفك',alerts:'تنبيهات المستندات والمواعيد',employees:'ملفات الموظفين وبياناتهم',probation:'موظفون تحت التجربة',offers:'عروض عمل للمرشحين',documents:'مستندات الموظفين ومواعيد انتهائها',payroll:'صرف الرواتب والكشوف',finance:'الخزينة والسندات والشيكات والبنوك',projects:'مشروعات الشركة وكل ما صُرف عليها',field:'الحضور والغياب والمواقع',taxes:'القيمة المضافة وضريبة الشركات',leaves:'تسجيل ورصيد الإجازات',letters:'خطابات ونماذج جاهزة',guide:'شرح إجراءات الموارد البشرية',reports:'تقارير وتحليلات شاملة',sites:'مواقع وروابط الشركة',settings:'إعدادات المنصة والأمان'};
function applySectionTips(){document.querySelectorAll('.side .nav').forEach(b=>{const p=b.dataset.page;if(SECTION_DESC[p])b.setAttribute('data-tip',SECTION_DESC[p]);});}
let _tipEl=null,_tipHideT=null;
function _tipShow(text,x,y){if(!_tipEl){_tipEl=document.createElement('div');_tipEl.className='uxtip';document.body.appendChild(_tipEl);}_tipEl.textContent=text;_tipEl.style.display='block';
  const pad=14;let tx=x+14,ty=y+18;const w=_tipEl.offsetWidth,h=_tipEl.offsetHeight;
  if(tx+w+pad>window.innerWidth)tx=x-w-14;if(ty+h+pad>window.innerHeight)ty=y-h-14;
  _tipEl.style.left=Math.max(pad,tx)+'px';_tipEl.style.top=Math.max(pad,ty)+'px';}
function _tipHide(){if(_tipEl)_tipEl.style.display='none';}
document.addEventListener('mouseover',e=>{const el=e.target.closest('[data-tip],[title]');if(!el)return;
  // انقل title إلى data-tip لمنع التلميح الأصلي المزدوج
  if(el.hasAttribute('title')&&!el.getAttribute('data-tip')){const t=el.getAttribute('title');if(t){el.setAttribute('data-tip',t);}el.removeAttribute('title');}
  const tip=el.getAttribute('data-tip');if(tip){clearTimeout(_tipHideT);_tipShow(tip,e.clientX,e.clientY);}
});
document.addEventListener('mousemove',e=>{if(_tipEl&&_tipEl.style.display==='block'){const el=e.target.closest('[data-tip]');if(el){_tipShow(el.getAttribute('data-tip'),e.clientX,e.clientY);}else{_tipHideT=setTimeout(_tipHide,40);}}});
document.addEventListener('mouseout',e=>{const el=e.target.closest('[data-tip]');if(el){_tipHideT=setTimeout(_tipHide,60);}});

/* ---------- اهتزاز الحقل الناقص + بيب ---------- */
function shakeField(id){const el=typeof id==='string'?document.getElementById(id):id;if(!el)return;UX.error();
  const box=el.closest('.field')||el;box.classList.remove('shake');void box.offsetWidth;box.classList.add('shake');
  try{el.focus();}catch(e){}setTimeout(()=>box.classList.remove('shake'),600);}
function shakeOpenModal(){const m=document.getElementById('modal');const ov=document.getElementById('overlay');if(ov&&!ov.classList.contains('hidden')&&m&&m.innerHTML.length>10){m.classList.remove('shake');void m.offsetWidth;m.classList.add('shake');setTimeout(()=>m.classList.remove('shake'),500);}}

/* ---------- رسالة ترحيب مخصّصة لكل مستخدم ---------- */
function userGreeting(){try{const u=(S.session&&(S.session.username||''))||'';const g=(S.settings&&S.settings.greetings)||{};return (g[u]||g[u.toLowerCase()]||'').trim();}catch(e){return '';}}
function showWelcome(){const msg=userGreeting();if(!msg)return;
  const d=document.createElement('div');d.className='welcomepop';d.innerHTML=`<div class="wp-in"><div class="wp-tag">رسالة ترحيب</div><div class="wp-msg">💛 ${esc(msg)}</div></div>`;document.body.appendChild(d);
  /* تظهر من وسط الشاشة ببطء (ثانيتان) وتبقى 8 ثوانٍ ثم تختفي ببطء — ليلاحظها المستخدم */
  requestAnimationFrame(()=>requestAnimationFrame(()=>d.classList.add('show')));
  setTimeout(()=>{d.classList.remove('show');setTimeout(()=>d.remove(),2200);},9000);}
async function setGreeting(username,msg){const g={...((S.settings&&S.settings.greetings)||{})};const u=String(username||'').trim();if(!u)return;if(msg&&msg.trim())g[u]=msg.trim();else delete g[u];await DB.setSetting('greetings',g);}
function openGreetings(){const g=(S.settings&&S.settings.greetings)||{};const users=(S.users||[]).filter(u=>u.username);
  const rows=users.length?users.map(u=>`<div class="field"><label>${esc(u.name||u.username)} <span class="muted mini" dir="ltr">(${esc(u.username)})</span></label><input id="gr_${esc(u.username)}" value="${esc(g[u.username]||'')}" placeholder="رسالة ترحيب تظهر له عند الدخول (اختياري)"></div>`).join(''):'<p class="muted">لا توجد حسابات موظفين بعد. أنشئ حساباً للموظف من ملفه ← تبويب «الحساب».</p>';
  openModal('💬 رسائل الترحيب المخصّصة',`<p class="muted mini">اكتب رسالة ترحيب خاصة لكل موظف — تظهر له وحده عند تسجيل الدخول. اتركها فارغة لإزالتها.</p>${rows}`,
    `<button class="btn primary" onclick="saveGreetings()">حفظ</button><button class="btn" onclick="closeModal()">إلغاء</button>`);}
async function saveGreetings(){const users=(S.users||[]).filter(u=>u.username);const g={};for(const u of users){const el=document.getElementById('gr_'+u.username);if(el&&el.value.trim())g[u.username]=el.value.trim();}await DB.setSetting('greetings',g);closeModal();toast('تم حفظ رسائل الترحيب','ok');}

/* ---------- ربط التحسينات بالدوال القائمة ---------- */
(function hookToast(){if(typeof toast!=='function')return;const _t=toast;toast=function(msg,type){if(type==='err'){try{UX.error();shakeOpenModal();}catch(e){}}return _t(msg,type);};})();
(function hookBadge(){if(typeof updateNavBadge!=='function')return;const _u=updateNavBadge;let last=-1;updateNavBadge=function(){_u();try{const b=document.getElementById('navAlertCount');const n=b?(+b.textContent||0):0;if(last>=0&&n>last)UX.notify();last=n;}catch(e){}};})();
(function hookTipsAfterRender(){if(typeof afterRenderHooks==='function'){const _a=afterRenderHooks;window.afterRenderHooks=function(){_a();applySectionTips();};}else{window.afterRenderHooks=function(){applySectionTips();};}})();

/* ---------- شرح كل قسم (زر ؟ في الهيدر) ---------- */
const SECTION_HELP={
 dashboard:{t:'لوحة التحكم',d:'نظرة سريعة على أهم أرقام شركتك ومؤشراتها.',s:['بطاقات بأهم الأرقام: الرواتب المستحقة، المستندات المنتهية، رصيد الخزنة.','اضغط أي بطاقة لتنتقل لتفاصيلها.','أهم التنبيهات تظهر أسفل الصفحة.']},
 me:{t:'بياناتي',d:'يرى الموظف راتبه وإجازاته وسلفه، ويسجّل خروجه.',s:['راتبك الشهري وتفاصيله.','رصيد إجازاتك والسلف المتبقية عليك.','زر تسجيل الخروج من الدوام.']},
 alerts:{t:'مركز التنبيهات',d:'كل ما يحتاج انتباهك في مكان واحد.',s:['مستندات قاربت على الانتهاء أو انتهت.','مصروفات وسلف تنتظر اعتمادك.','اضغط التنبيه لتفتح مكانه مباشرة.']},
 employees:{t:'الموظفون',d:'إضافة وإدارة ملفات الموظفين بالكامل.',s:['«＋ موظف جديد» لإضافة موظف.','اضغط اسم أي موظف لفتح ملفه الكامل (راتب، مستندات، سلف، خطابات، حساب دخول).','ابحث بالاسم أو الرقم أو الوظيفة.']},
 print:{t:'الطباعة العامة',d:'اطبع أي ورقة من خارج البرنامج، وأضف ختم الشركة وتوقيع المدير العام، واحفظ الفواتير والشيكات الخارجية ووزّعها على الأقسام.',s:['«ورقة من الجهاز»: ارفع سكان أو صورة أو PDF ثم اطبعها كما هي أو اكتب نصاً فوقها كليتر هيد.','اسحب الختم والتوقيع بالماوس لمكانهما ثم «طباعة».','«الختم والتوقيع»: ارفع أي عدد من الأختام والتواقيع وسمِّ كلاً منها (تُزال الخلفية تلقائياً)، وعند الاستخدام تختار بالاسم، ويمكن إضافة واحد منها تلقائياً على كل خطاب.','«الأوراق الخارجية»: أرشيف للفواتير والشيكات والكشوف بعيداً عن قيد الخزينة.','«توزيع تلقائي»: اكتب «حط المبلغ 500 في الخزنة صرف إيجار» فيُسجَّل القيد والورقة مرفقة.']},
 probation:{t:'تحت التجربة',d:'موظفون قيد التجربة قبل التعيين الرسمي.',s:['لهم ملف كامل مثل أي موظف (راتب وسلف وإجازات).','اضغط «✅ تعيين» لنقله لقائمة الموظفين المثبّتين.']},
 offers:{t:'عروض العمل',d:'إعداد عروض عمل للمرشحين الجدد وطباعتها.',s:['أنشئ عرضاً بالراتب والمسمى.','اطبعه أو أرسله للمرشح.','عند القبول يتحوّل لملف موظف تلقائياً.']},
 documents:{t:'المستندات',d:'متابعة مستندات الموظفين ومواعيد انتهائها.',s:['سجّل الإقامة والتأشيرة والجواز وبطاقة العمل.','البرنامج ينبّهك قبل الانتهاء.','ارفق صورة كل مستند.']},
 payroll:{t:'الرواتب',d:'صرف الرواتب الشهرية وطباعة الكشوف.',s:['اضغط «صرف» أمام الموظف — يُخصم القسط وأيام الإجازة بدون راتب تلقائياً.','«🧾» لطباعة كشف راتب الموظف.','«صرف الكل» لصرف رواتب الشهر دفعة واحدة.']},
 finance:{t:'المالية والخزنة',d:'الخزنة والمصروفات والسلف والعُهد والإقفال اليومي.',s:['سجّل الإيداع والصرف من الخزنة.','اعتمد المصروفات الكبيرة بكود المدير.','أقفل الخزنة يومياً لمطابقة النقدية.']},
 field:{t:'الميدان والحضور',d:'تسجيل الحضور والغياب وتوزيع العمال على المواقع.',s:['سجّل حالة كل موظف اليوم (حاضر/غائب/ميدان).','«تسجيل الكل حاضر» لتسريع العمل.','تابع العمال حسب التخصص والموقع.']},
 taxes:{t:'الضرائب',d:'ضريبة القيمة المضافة وضريبة الشركات.',s:['سجّل فواتير المبيعات والمشتريات.','البرنامج يحسب الإقرار وينبّهك بالمواعيد.','اطبع الإقرار جاهزاً.']},
 leaves:{t:'الإجازات',d:'تسجيل إجازات الموظفين ومتابعة الأرصدة.',s:['«تسجيل إجازة» واختر النوع والمدة.','النوع «بدون راتب» يُخصم من الراتب تلقائياً.','تابع رصيد كل موظف السنوي.']},
 letters:{t:'الخطابات والنماذج',d:'خطابات رسمية جاهزة بترويسة الشركة.',s:['اختر نوع الخطاب (شهادة راتب، عدم ممانعة، خبرة…).','يُملأ ببيانات الموظف تلقائياً.','اطبعه أو احفظه PDF.']},
 guide:{t:'دليل الإجراءات',d:'شرح إجراءات الموارد البشرية في الإمارات.',s:['خطوات التأشيرات والإقامات.','حساب مكافأة نهاية الخدمة.','مواعيد وغرامات مهمة.']},
 reports:{t:'التقارير والتحليلات',d:'تقارير شاملة ورسوم بيانية عن شركتك.',s:['تكاليف الرواتب شهرياً.','توزيع الموظفين والجنسيات.','صدّر أي تقرير Excel.']},
 sites:{t:'مواقعنا',d:'روابط ومواقع الشركة المرتبطة.',s:['افتح مواقع الشركة بسرعة.']},
 settings:{t:'الإعدادات',d:'بيانات المنشأة والأمان والمستخدمين والنسخ الاحتياطي.',s:['بيانات الشركة والترويسة.','المستخدمون والصلاحيات.','النسخ الاحتياطي والأمان وكود المدير.']},
};
function openSectionHelp(page){page=page||(typeof current!=='undefined'?current.page:'dashboard');const h=SECTION_HELP[page]||SECTION_HELP.dashboard;
  openModal('❓ شرح: '+h.t,`<div style="line-height:1.9"><p style="font-size:1.05rem">${esc(h.d)}</p><h4 style="margin:12px 0 6px;color:var(--accent-strong)">طريقة الاستخدام:</h4><ol style="padding-inline-start:22px;margin:0">${h.s.map(x=>`<li style="margin-bottom:6px">${esc(x)}</li>`).join('')}</ol><p class="muted mini" style="margin-top:14px">💡 وقوفك على أي زر أو عنصر يُظهر لك شرحاً سريعاً له.</p></div>`,`<button class="btn" onclick="closeModal()">تمام</button>`);}

/* ---------- قسم «تعليمات المستخدم» المصوّر ---------- */
const GUIDE_IMG={dashboard:'guide/dashboard.jpg',employees:'guide/employees.jpg',payroll:'guide/payroll.jpg',leaves:'guide/leaves.jpg',finance:'guide/finance.jpg',documents:'guide/documents.jpg'};
function guideCard(page){const h=SECTION_HELP[page];if(!h)return '';const img=GUIDE_IMG[page];
  return `<div class="gcard"><div class="gcard-head"><span class="gc-ic">${(SECTION_DESC[page]&&'')||''}${guideIcon(page)}</span><div><h3 style="margin:0">${esc(h.t)}</h3><div class="muted mini">${esc(h.d)}</div></div></div>${img?`<img class="gshot" src="${img}" alt="${esc(h.t)}" loading="lazy">`:''}<ol class="gsteps">${h.s.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></div>`;}
function guideIcon(page){const m={dashboard:'▦',employees:'👤',payroll:'💵',leaves:'🏖️',finance:'🏦',documents:'📄'};return m[page]||'•';}
function renderUserGuide(){
  const order=['dashboard','employees','payroll','leaves','finance','documents'];
  return `<div class="card" style="background:linear-gradient(135deg,var(--accent-strong),var(--accent));color:#fff;border:0">
    <h2 style="margin:0 0 6px;color:#fff">${LANG==='en'?'📖 Platform User Guide':'📖 تعليمات استخدام المنصة'}</h2>
    <p style="margin:0;opacity:.95">${LANG==='en'?'Quick illustrated guide for every section. Hovering over any button shows a quick explanation, and the <b>?</b> button at the top of each section opens its guide. Enjoy! 💛':'دليل سريع ومصوّر لكل قسم. وقوفك على أي زر في البرنامج يُظهر لك شرحاً سريعاً، وزر <b>؟</b> أعلى كل قسم يفتح شرحه. استمتع بالاستخدام 💛'}</p></div>
  <div class="card"><h3 style="margin-top:0">${LANG==='en'?'🔑 License & Auto-Update':'🔑 الترخيص والتحديث التلقائي'}</h3>
    <div class="grid g2" style="align-items:center"><div style="line-height:1.9">
      <p><b>${LANG==='en'?'License:':'الترخيص:'}</b> ${LANG==='en'?'The app works as a trial then requires an activation code. From <b>Settings → Security → Manage License</b> enter the activation code or serial, and you\'ll see the license status and remaining days.':'النسخة تعمل تجريبياً ثم تحتاج كود تفعيل. من <b>الإعدادات ← الأمان ← إدارة الترخيص</b> تُدخل كود التفعيل أو السيريال، ويظهر لك حالة الترخيص والأيام المتبقية.'}</p>
      <p><b>${LANG==='en'?'Auto-Update:':'التحديث التلقائي:'}</b> ${LANG==='en'?'🔄 The app updates itself automatically and silently — any new update reaches your device without any installation. Find the "Update" button at the bottom of the menu and update status in Settings → Security.':'🔄 البرنامج يحدّث نفسه تلقائياً وبصمت — أي تحديث جديد يصل لجهازك دون أي تثبيت. تجد زر «تحديث البرنامج» أسفل القائمة وحالة التحديث في الإعدادات ← الأمان.'}</p>
      <p><b>${LANG==='en'?'Backup:':'النسخ الاحتياطي:'}</b> ${LANG==='en'?'💾 An automatic backup is taken on every launch, and you can choose an extra folder (USB/cloud) from Settings → Backup.':'💾 تُؤخذ نسخة تلقائية عند كل تشغيل، ويمكنك اختيار مجلد إضافي (فلاشة/سحابة) من الإعدادات ← النسخ الاحتياطي.'}</p>
    </div><img class="gshot" src="guide/license.jpg" alt="${LANG==='en'?'License & Update':'الترخيص والتحديث'}" loading="lazy"></div></div>
  <div class="gguide-grid">${order.map(guideCard).join('')}</div>
  <div class="card" style="text-align:center"><h3 style="margin-top:0">${LANG==='en'?'🆘 Need help?':'🆘 تحتاج مساعدة؟'}</h3><p class="muted">${LANG==='en'?'SEVENGATES support team is ready to help you anytime.':'فريق دعم SEVENGATES جاهز لمساعدتك في أي وقت.'}</p><button class="btn primary" onclick="openSupport()">${LANG==='en'?'📲 Contact Support':'📲 تواصل مع الدعم'}</button></div>`;
}

/* يُستدعى من enter() بعد كشف التطبيق */
function uxOnEnter(){applySectionTips();showSplash(()=>{showWelcome();});}

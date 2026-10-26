/* ==================== 5.3.0: أكواد المسح + «الممسوح مؤخراً» + بوابة الإعدادات ==================== */
const TBL_LBL={extdocs:'ورقة/ختم/توقيع (طباعة عامة)',employees:'موظف',documents:'مستند',payments:'راتب/دفعة',leaves:'إجازة',notes:'ملاحظة',treasury:'حركة خزينة',advances:'سلفة/عهدة',expenses:'مصروف',attendance:'حضور',closings:'إقفال',offers:'عرض عمل',taxdocs:'فاتورة',assets:'عهدة عينية',jobs:'وظيفة',promotions:'ترقية',handovers:'تسليم',clearances:'تصفية',cheques:'شيك',projects:'مشروع'};
const TR_ST={pending:{l:'بانتظار قرارك',cls:'b-warn'},confirmed:{l:'مؤكَّد المسح',cls:'b-muted'},restored:{l:'مُسترجَع',cls:'b-ok'}};
let trashFilter='pending',trashOpen=null,trashRows=[];

/* رقم الأمان السري للمدير (يُطلب مرة كل 10 دقائق) */
async function ensureSecPin(why){
  const st=await api.secpin.status().catch(()=>({set:false,open:true}));
  if(!st.set||st.open)return true;
  return await askSecPin(why||'🔐 رقمك السري');}

/* كود المسح: كل حذف في البرنامج يحتاجه (الموظف: كوده الخماسي — المدير: رقمه السري) */
async function askDelAuth(){
  const st=await api.del.status();if(st.open)return true;
  if(st.restricted){toast('🔒 هذه العملية عند المدير فقط — اطلبها منه','err');throw new Error('delete-cancelled');}
  const adm=st.admin;
  for(let i=0;i<3;i++){
    const v=await promptBox('🔐 كود المدير',adm?'أدخل رقمك السري لتأكيد الحذف':'أدخل كود المدير الخاص بك (5 أرقام) — كل عملية تُسجَّل باسمك','password');
    if(v===null)throw new Error('delete-cancelled');
    const r=await api.del.auth(String(v).trim());
    if(r.ok)return true;
    if(r.why==='locked'){toast('محاولات كثيرة — انتظر '+r.wait+' ثانية','err');throw new Error('delete-cancelled');}
    if(r.why==='no-code'){toast('لم يُصدر لك المدير كود مسح بعد — اطلبه منه','err');throw new Error('delete-cancelled');}
    toast('الكود غير صحيح — المحاولة مسجَّلة','err');}
  throw new Error('delete-cancelled');}
async function confirmDel(msg,label){if(!await confirmBox(msg,label))return false;try{await askDelAuth();return true}catch(e){return false}}
const _dbRemove=DB.remove.bind(DB);
DB.remove=async function(t,id){await askDelAuth();return _dbRemove(t,id);};

/* ---------- سلة «الممسوح مؤخراً» (للمدير فقط) ---------- */
const _unb=updateNavBadge;
updateNavBadge=function(){_unb();try{refreshTrashBadge()}catch(e){}};
let _trCnt=0;
async function refreshTrashBadge(){if(!isAdminUI())return;try{const c=await api.review.count();_trCnt=c;const b=document.getElementById('navTrashCount');if(b){b.textContent=c;b.classList.toggle('hidden',!c);}}catch(e){}}
async function loadTrash(){try{trashRows=await api.trash.list();}catch(e){trashRows=[];}render();}
function renderTrash(){
  if(!isAdminUI())return '<div class="empty">هذا القسم للمدير فقط.</div>';
  setTimeout(()=>{if(!window.__trashLoaded){window.__trashLoaded=true;loadTrash();}},0);
  const rows=trashRows.filter(r=>trashFilter==='all'||r.status===trashFilter);const cnt=k=>trashRows.filter(r=>k==='all'||r.status===k).length;
  return `<div class="card tight"><div class="card-head"><div class="toolbar">${[['pending','بانتظار قرارك'],['confirmed','مؤكَّدة'],['restored','مُسترجَعة'],['all','الكل']].map(([k,l])=>`<span class="chip ${trashFilter===k?'on':''}" onclick="trashFilter='${k}';render()">${l} <b>${cnt(k)}</b></span>`).join('')}</div><div class="toolbar"><button class="btn" onclick="window.__trashLoaded=false;go('trash')">🔄 تحديث</button>${cnt('pending')?`<button class="btn primary" onclick="confirmTrash(null)">✔️ تأكيد كل المعلّق (${cnt('pending')})</button>`:''}</div></div>
  <p class="muted mini" style="margin:0 14px 10px">كل ما يُمسح من أي حساب يتنفّذ فوراً لكنه يظهر هنا باسم من مسحه. <b>تأكيد المسح</b> يُنهيه نهائياً، و<b>الاسترجاع</b> يرجّع السجل (وكل ما يتبعه) لقاعدة البيانات. الاثنان برقمك السري.</p>
  <div class="table-wrap">${rows.length?`<table><thead><tr><th>وقت المسح</th><th>النوع</th><th>السجل</th><th>مَن مسحه</th><th>الحالة</th><th></th></tr></thead><tbody>${rows.map(r=>{const st=TR_ST[r.status]||TR_ST.pending;const open=trashOpen===r.id;
    return `<tr><td class="mini">${new Date(r.created_at).toLocaleString(LOCALE())}</td><td><span class="badge b-info">${esc(TBL_LBL[r.tbl]||r.tbl)}</span></td><td><b>${esc(r.label||'—')}</b>${r.count>1?`<div class="muted mini">+ ${r.count-1} سجل تابع</div>`:''}</td><td><b>${esc(r.by_name||r.by_user||'?')}</b><div class="muted mini" dir="ltr">${esc(r.by_user||'')}${r.by_role==='admin'?' · مدير':''}</div></td><td><span class="badge ${st.cls}">${st.l}</span>${r.resolved_at?`<div class="muted mini">${new Date(r.resolved_at).toLocaleDateString(LOCALE())} — ${esc(r.resolved_by||'')}</div>`:''}</td><td style="white-space:nowrap"><button class="btn sm" onclick="trashOpen=${open?'null':`'${r.id}'`};render()">${open?'إخفاء':'تفاصيل'}</button>${r.status!=='restored'?` <button class="btn sm ok" onclick="restoreTrash('${r.id}')">↩️ استرجاع</button>`:''}${r.status==='pending'?` <button class="btn sm danger" onclick="confirmTrash(['${r.id}'])">✔️ تأكيد المسح</button>`:''}</td></tr>${open?`<tr><td colspan="6" style="background:var(--card2,rgba(255,255,255,.03))"><div class="kv">${Object.entries(r.detail||{}).map(([k,v])=>`<div><small>${esc(k)}</small><b>${esc(String(v))}</b></div>`).join('')||'—'}</div></td></tr>`:''}`;}).join('')}</tbody></table>`:'<div class="empty">لا يوجد شيء هنا. أي حذف في البرنامج سيظهر في هذه القائمة.</div>'}</div></div>`;}
async function confirmTrash(ids){
  const list=ids||trashRows.filter(r=>r.status==='pending').map(r=>r.id);if(!list.length)return;
  if(!await confirmBox(`تأكيد مسح ${list.length} سجل نهائياً؟ لن يمكن استرجاعها بعد ذلك.`,'تأكيد المسح'))return;
  if(!await ensureSecPin('تأكيد المسح النهائي: أدخل رقمك السري'))return;
  await withBusy(async()=>{try{const n=await api.trash.confirm(list);toast(`تم تأكيد مسح ${n} سجل`,'ok');}catch(err){toast(errText(err,{'secpin-required':'أدخل رقمك السري أولاً'}),'err');}await loadTrash();refreshTrashBadge();});}
async function restoreTrash(id){
  if(!await ensureSecPin('استرجاع من الممسوح: أدخل رقمك السري'))return;
  await withBusy(async()=>{try{await api.trash.restore(id);await DB.load();toast('تم الاسترجاع ✅ وعاد السجل لمكانه','ok');}catch(err){toast(errText(err,{'parent-missing':'لازم تسترجع الموظف أو السجل الأصلي أولاً','already-restored':'تم استرجاعه من قبل','secpin-required':'أدخل رقمك السري أولاً'}),'err');}await loadTrash();refreshTrashBadge();});}

/* ---------- كود الصلاحيات والمسح للموظف (يصدره المدير فقط) ---------- */
async function regenUserCode(id){if(!await confirmBox('إصدار كود جديد؟ الكود القديم يتوقف فوراً (والموظف لا يكتبه أبداً — يشتغل تلقائياً بكود حسابه).','إصدار كود جديد'))return;if(!await ensureSecPin('إصدار كود: أدخل رقمك السري'))return;await withBusy(async()=>{try{const u=await api.usercode.set(id);replaceUser(u);toast('تم إصدار كود جديد ✅','ok');ucAfter(id);}catch(err){toast(errText(err,{'secpin-required':'أدخل رقمك السري أولاً'}),'err');}});}
async function setUserCodeManual(id){if(!await ensureSecPin('تعيين كود: أدخل رقمك السري'))return;const v=await promptBox('✏️ تعيين كود مسح','اكتب كوداً من 5 أرقام (مختلف عن كل الموظفين)','text');if(v===null)return;await withBusy(async()=>{try{const u=await api.usercode.set(id,String(v).trim());replaceUser(u);toast('تم تعيين الكود ✅','ok');ucAfter(id);}catch(err){toast(errText(err,{'bad-code':'الكود لازم 5 أرقام بالظبط','code-taken':'الكود مستخدم لموظف آخر','secpin-required':'أدخل رقمك السري أولاً'}),'err');}});}
/* 5.6.3: موظف موثوق — بلا كود مسح ولا كود مدير (الإعدادات تبقى مقفولة بالرقم السري) */
async function setUserTrusted(id,on){const u=(S.users||[]).find(x=>x.id===id);if(!u)return;if(on&&!await confirmBox('الموظف الموثوق يحذف ويصرف من غير أي كود (كل عملية تبقى مسجَّلة باسمه، والمحذوف يبقى في «الممسوح مؤخراً» لقرارك). الإعدادات تبقى مقفولة. تأكيد؟','موظف موثوق'))return;if(!await ensureSecPin((on?'تفعيل':'إلغاء')+' موظف موثوق: أدخل رقمك السري'))return;await withBusy(async()=>{try{const r=await api.user.update(id,{trusted:on?1:0});replaceUser(r);toast(on?'تم تفعيل «موظف موثوق» ✅ — يصل لجهازه مع المزامنة':'تم إلغاء «موظف موثوق»','ok');render();}catch(err){toast(errText(err,{'secpin-required':'أدخل رقمك السري أولاً','bad-role':'متاح لحسابات الموظفين فقط'}),'err');}});}
function trustedBox(u){if(u.role==='viewer')return '';const on=!!u.trusted;return `<div style="margin:10px 0;padding:12px;border:1px solid ${on?'var(--ok)':'var(--line)'};border-radius:12px"><div class="toolbar" style="gap:10px;align-items:center"><b>${on?'✅':'🔓'} موظف موثوق — بلا أكواد</b><span class="badge ${on?'b-ok':'b-muted'}">${on?'مفعّل':'غير مفعّل'}</span><button class="btn sm ${on?'':'primary'}" onclick="setUserTrusted('${u.id}',${on?'false':'true'})">${on?'إلغاء':'تفعيل'}</button></div><p class="muted mini" style="margin:6px 0 0">لما يكون مفعّلاً: الموظف يحذف ويصرف من غير كود مسح ولا كود مدير. الإعدادات تبقى للمدير فقط، وكل عملية تُسجَّل باسمه، والمحذوف يروح لـ«الممسوح مؤخراً» لقرارك.</p></div>`;}
/* 5.8.3: كود المدير لكل موظف — إيقاف/تفعيل/تغيير من الإعدادات ← المستخدمين (الافتراضي: متوقف = بلا كود) */
let ucOpen=null;
function ucAfter(id){render();if(ucOpen===id)openUserCode(id);}
const ucAuth=u=>!!u&&!!u.code_on;
async function setUserCodeOn(id,on){const u=(S.users||[]).find(x=>x.id===id);if(!u)return;
  await withBusy(async()=>{try{const r=await api.user.update(id,{code_on:on?1:0});replaceUser(r);toast(on?(r.code===''?'تم التفعيل — لكن لا يوجد كود، اعمل «كود جديد» ليقدر يشتغل':'تم التفعيل ✅ — الموظف لا يصرف ولا يحذف إلا بكوده (يصل لجهازه مع المزامنة)'):'تم الإيقاف ✅ — الكود واقف ولا يُطلب من الموظف أي شيء (يصل لجهازه مع المزامنة)','ok');ucAfter(id);}catch(err){toast(errText(err,{'bad-role':'متاح لحسابات الموظفين فقط'}),'err');}});}
async function clearUserCode(id){if(!await confirmBox('مسح كود هذا الموظف؟ لو الكود مفعّل هيتمنع من الصرف والحذف لحد ما تعمل له كود جديد.','مسح الكود'))return;if(!await ensureSecPin('مسح الكود: أدخل رقمك السري'))return;await withBusy(async()=>{try{const u=await api.usercode.clear(id);replaceUser(u);toast('تم مسح الكود ✅ — اعمل «كود جديد» عند الحاجة','ok');ucAfter(id);}catch(err){toast(errText(err,{'secpin-required':'أدخل رقمك السري أولاً'}),'err');}});}
function userCodeBox(u){if(!u||u.role==='viewer')return '';const auth=ucAuth(u),noCode=u.code==='';
  return `<div id="uc_box_${u.id}" style="margin:10px 0;padding:12px;border:1px solid ${auth?'var(--ok)':'var(--warn,#F2A93C)'};border-radius:12px"><div class="toolbar" style="gap:10px;align-items:center;flex-wrap:wrap"><b>${auth?'🔐':'🔒'} كود المدير لهذا الموظف</b><span class="badge ${auth?'b-ok':'b-warn'}">${auth?(noCode?'مفعّل — لا يوجد كود':'مفعّل — لا يعمل إلا بكوده'):'موقوف — حرّ بدون كود'}</span><button class="btn sm ${auth?'':'primary'}" onclick="setUserCodeOn('${u.id}',${auth?'false':'true'})" ${noCode&&!auth?'':''}>${auth?'⏸️ إيقاف':'▶️ تفعيل'}</button></div>
  <div style="font-family:monospace;font-size:1.6rem;letter-spacing:5px;margin:8px 0;${auth?'':'opacity:.5'}" dir="ltr">${noCode?'— — — — —':esc(u.code||'— —')}</div>
  <div class="toolbar" style="gap:6px;flex-wrap:wrap"><button class="btn sm" onclick="regenUserCode('${u.id}')">🔄 كود جديد</button><button class="btn sm" onclick="setUserCodeManual('${u.id}')">✏️ تعديل الكود</button><button class="btn sm danger" onclick="clearUserCode('${u.id}')" ${noCode?'disabled':''}>🗑️ مسح الكود</button>${noCode?'':`<button class="btn sm" onclick="navigator.clipboard.writeText('${esc(u.code||'')}').then(()=>toast('تم النسخ','ok'))">📋 نسخ</button>`}</div>
  <p class="muted mini" style="margin:6px 0 0">${auth?'مفعّل: الموظف لا يصرف من الخزينة ولا يحذف ولا ينفّذ العمليات الحساسة إلا بكوده الخماسي (تديهوله أنت)، وكل عملية تُسجَّل باسمه. 5 محاولات غلط تقفله 5 دقائق. تقدر تغيّر الكود أو تعدّله أو تمسحه وتعمل غيره.':'موقوف: الكود واقف تماماً ولا يُطلب من الموظف أي كود في أي عملية. فعّله متى شئت فيرجع يطلب منه الكود.'}</p></div>`;}
function openUserCode(id){const u=(S.users||[]).find(x=>x.id===id);if(!u)return;ucOpen=id;openModal('🔐 كود المدير — '+esc(u.name),userCodeBox(u),`<button class="btn" onclick="ucOpen=null;closeModal()">إغلاق</button>`);}
function _userCodeBoxOld(u){return trustedBox(u)+`<div style="margin:10px 0;padding:12px;border:1px dashed var(--line);border-radius:12px"><small class="muted">🔑 كود الصلاحيات والمسح (خاص بهذا الموظف)</small><div style="font-family:monospace;font-size:1.6rem;letter-spacing:5px;margin:6px 0" dir="ltr">${esc(u.code||'— —')}</div><div class="toolbar" style="gap:6px"><button class="btn sm" onclick="regenUserCode('${u.id}')">🔄 كود جديد</button><button class="btn sm" onclick="setUserCodeManual('${u.id}')">✏️ تعيين كود</button><button class="btn sm" onclick="navigator.clipboard.writeText('${esc(u.code||'')}').then(()=>toast('تم النسخ','ok'))">📋 نسخ</button></div><p class="muted mini" style="margin:6px 0 0">بدون هذا الكود لا يستطيع الموظف حذف أي شيء، وأي حذف يتم يُسجَّل باسمه.</p></div>`;}

/* ---------- بوابة الإعدادات: القسم ظاهر للجميع لكن الدخول برقم المدير السري ---------- */
let setGate={open:false,until:0,user:null};
const gateOpen=()=>isAdminUI()||(setGate.open&&Date.now()<setGate.until&&setGate.user===(S.session&&S.session.username));
const _renderSettings=renderSettings;
renderSettings=function(){
  if(gateOpen()){if(!isAdminUI()&&!['company','appearance','alerts'].includes(setTab))setTab='company';return _renderSettings();}
  return `<div class="card" style="text-align:center;padding:48px 20px"><div style="font-size:3rem">🔐</div><h2>الإعدادات محمية</h2><p class="muted">القسم ظاهر لك لكن الدخول إليه برقم المدير السري فقط.</p><button class="btn primary" onclick="unlockSettings()">🔓 إدخال رقم المدير</button></div>`;};
async function unlockSettings(){
  const st=await api.setgate.status();if(!st.secSet){toast('لم يضبط المدير رقمه السري بعد — اطلب منه ضبطه من الإعدادات ← الأمان','err');return}
  const v=await promptBox('🔐 الإعدادات','أدخل رقم المدير السري');if(v===null)return;
  const r=await api.setgate.unlock(String(v).trim()).catch(()=>({ok:false}));
  if(!r.ok){toast(r.why==='locked'?'محاولات كثيرة — انتظر '+r.wait+' ثانية':'الرقم غير صحيح — المحاولة مسجَّلة باسمك','err');return}
  setGate={open:true,until:Date.now()+10*60000,user:S.session&&S.session.username};toast('تم فتح الإعدادات لمدة 10 دقائق','ok');render();}

/* ==================== بوابة الموظف «بياناتي» + تسجيل الخروج + جدول أقساط السلف (v5.0.2) ==================== */

/* جدول أقساط سلفة عبر الشهور: يعرض شهر كل قسط وقيمته وهل خُصم أم مجدول */
function loanSchedule(a){
  if(!a||a.kind!=='loan')return [];
  const amount=+a.amount||0;const n=Math.max(1,Math.round(+a.installments||1));
  let inst=+a.installment_amount||+(amount/n);if(!(inst>0))inst=amount/n;
  const base=a.first_month||(()=>{const b=a.disbursed_at||a.request_date||iso(today());const d=new Date(b);d.setMonth(d.getMonth()+1);return monthKey(d);})();
  const [by,bm]=base.split('-').map(Number);
  const rem=advRemaining(a);const paidCount=inst>0?Math.max(0,Math.round((amount-rem)/inst)):0;
  const rows=[];
  for(let i=0;i<n;i++){
    const mk=monthKey(new Date(by,bm-1+i,1));
    const val=(i===n-1)?+(amount-inst*(n-1)).toFixed(2):+inst.toFixed(2);
    rows.push({month:mk,amount:val<0?0:val,paid:i<paidCount,method:a.repay_method||'salary'});
  }
  return rows;
}
/* HTML لجدول أقساط كل السلف القائمة (يُستخدم في كشف الحساب وبوابة الموظف) */
function loanScheduleHTML(e,forStatement){
  const loans=S.advances.filter(a=>a.emp_id===e.id&&a.kind==='loan'&&['disbursed','settled'].includes(a.status));
  if(!loans.length)return forStatement?'':'<div class="empty">لا توجد سلف مسجّلة</div>';
  return loans.map(a=>{
    const sch=loanSchedule(a);const rem=advRemaining(a);
    const methodTxt=(a.repay_method==='cash')?'سداد نقدي منفصل':'خصم شهري من الراتب';
    return `<div class="card tight" style="margin:10px 0;padding:12px">
      <div class="toolbar" style="justify-content:space-between;flex-wrap:wrap"><b>سلفة ${money(a.amount,a.currency)}</b><span class="badge ${rem<=0.005?'b-ok':'b-info'}">${rem<=0.005?'مسددة بالكامل':'المتبقي '+money(rem,a.currency)}</span></div>
      <div class="muted mini" style="margin:4px 0">${esc(a.reason||'')} · ${methodTxt} · ${a.installments} قسط × ${n2(a.installment_amount)} ${cur(a.currency)}${a.disbursed_at?' · صُرفت '+fmtDate(a.disbursed_at):''}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="background:var(--sunken,#eee)"><th style="text-align:start">الشهر</th><th class="num">قيمة القسط</th><th>الحالة</th></tr>
      ${sch.map(r=>`<tr><td>${monthName(r.month)}</td><td class="num">${money(r.amount,a.currency)}</td><td>${r.paid?'<span class="badge b-ok">مخصوم</span>':'<span class="badge b-warn">مجدول</span>'}</td></tr>`).join('')}
      </table></div>`;
  }).join('');
}

/* ==================== بوابة الموظف «بياناتي» ==================== */
function renderMe(param){
  const preview=isAdminUI()&&param;const sid=preview?param:(S.session&&S.session.emp_id);const e=sid?empById(sid):null;
  if(!e)return '<div class="card empty" style="text-align:center;padding:50px 20px"><div style="font-size:2.4rem">🙋</div><h2>صفحة «بياناتي»</h2><p class="muted">هذه الصفحة تعرض راتبك وإجازاتك وسلفك. تظهر عند دخولك بحساب موظف مرتبط بملفك.</p></div>';
  const lb=leaveBalance(e);const pos=empPosition(e);const s=salaryDue(e);const eos=eosCalc(e);
  const daily=(+e.basic||0)/30;const leaveCash=daily*Math.max(0,lb.balance);
  const pays=S.payments.filter(p=>p.emp_id===e.id).sort((a,b)=>b.month.localeCompare(a.month));
  const leaves=S.leaves.filter(l=>l.emp_id===e.id).sort((a,b)=>(b.start_date||'').localeCompare(a.start_date||''));
  const att=S.attendance.find(x=>x.emp_id===e.id&&x.date===iso(today()));
  const co=S.settings.company||'SEVENGATES';
  return `
  ${preview?`<button class="btn sm" onclick="go('employee','${e.id}')" style="margin-bottom:12px">← رجوع لملف الموظف</button><div class="banner info" style="margin-bottom:12px"><span>👁️ معاينة «بياناتي» كما يراها الموظف — أنت تشاهدها كمدير.</span></div>`:''}
  <div class="card"><div class="emp-head"><div class="avatar">${(!preview&&S.session.photo)?`<img src="${esc(S.session.photo)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`:esc(initials(e.name))}</div>
    <div><h2 style="margin:0">${preview?esc(e.name):'أهلاً '+esc(e.name)+' 👋'} ${e.status==='inactive'?'<span class="badge b-muted">غير نشط</span>':''}</h2><div class="muted">${esc(e.job||'—')} · ${esc(e.dept||'—')} · ${esc(co)}</div></div>
    <div class="toolbar right"><button class="btn primary" onclick="dailyCheckout('${e.id}')">🚪 تسجيل ${preview?'انصراف الموظف':'انصرافي'} اليوم</button><button class="btn" onclick="openStatement('${e.id}')">📄 كشف الحساب (له/عليه)</button>${preview?`<button class="btn" onclick="checkoutMenu('${e.id}')">🚪 تسجيل خروج</button>`:''}</div></div>
    <div class="banner ${att&&att.check_out?'ok':''}" style="margin-top:12px"><span>${att&&att.check_out?'✅ '+(preview?'سجّل الموظف انصرافه':'سجّلت انصرافك')+' اليوم الساعة '+esc(att.check_out):'🕔 '+(preview?'لم يسجّل الموظف انصرافه':'لم تسجّل انصرافك')+' اليوم بعد'}</span></div>
  </div>

  <div class="grid g4" style="margin:16px 0">
    <div class="tile ok"><div class="lbl">راتبي الصافي${instSum(e)>0?' بعد قسط السلفة':''}</div><div class="num" style="font-size:1.4rem">${money(netAfter(e),e.currency)}</div><div class="sub">أساسي ${n2(e.basic)} · بدلات ${n2(e.allowances)} · خصومات ${n2(e.deductions)}${instSum(e)>0?' · قسط سلفة '+n2(instSum(e)):''}</div></div>
    <div class="tile ${s.state==='paid'?'ok':'warn'}"><div class="lbl">راتب ${monthName(monthKey(today()))}</div><div class="num" style="font-size:1.1rem">${s.state==='paid'?'تم الصرف ✅':s.state==='late'?'متأخر':s.state==='due'?'مستحق':s.state==='na'?'غير مستحق':'قادم'}</div><div class="sub">${s.state==='paid'?fmtDate(s.p.paid_at):'يوم الصرف '+(e.pay_day||25)}</div></div>
    <div class="tile ok"><div class="lbl">رصيد إجازاتي السنوية</div><div class="num">${lb.balance}</div><div class="sub">يوم متاح · من ${lb.accrued} مستحق</div></div>
    <div class="tile ${pos.net>0.005?'ok':pos.net<-0.005?'danger':''}"><div class="lbl">صافي موقفي المالي</div><div class="num" style="font-size:1.2rem">${pos.net>0.005?'لي ':pos.net<-0.005?'عليّ ':''}${n2(Math.abs(pos.net))} د.إ</div><div class="sub">${pos.owes?'سلف عليّ '+n0(pos.owes):''}${pos.custDue>0.005?' · 🧰 عهدة معي '+n0(pos.custDue)+' (ليست دَيناً)':''}${pos.due?' · مستحق لي '+n0(pos.due):''}${!pos.owes&&!pos.due&&!(pos.custDue>0.005)?'متوازن':''}</div></div>
  </div>

  <div class="card tight"><div class="card-head"><h2>💵 رواتبي</h2></div><div class="table-wrap">${pays.length?`<table><thead><tr><th>الشهر</th><th class="num">الأساسي</th><th class="num">البدلات</th><th class="num">مكافأة</th><th class="num">خصومات</th><th class="num">الصافي</th><th>تاريخ الصرف</th><th></th></tr></thead><tbody>${pays.slice(0,18).map(p=>`<tr><td>${monthName(p.month)}</td><td class="num">${n2(p.basic)}</td><td class="num">${n2(p.allowances)}</td><td class="num">${n2(p.bonus)}</td><td class="num">${n2(p.deductions)}</td><td class="num"><b>${money(p.amount,p.currency)}</b></td><td>${fmtDate(p.paid_at)}</td><td><button class="btn sm" onclick="printPayslip('${e.id}','${p.id}')">🧾 كشف راتب</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">لم تُسجَّل رواتب بعد</div>'}</div></div>

  <div class="card tight"><div class="card-head"><h2>🤝 سلفي والأقساط المجدولة</h2></div><div style="padding:4px 14px 14px">${loanScheduleHTML(e)}</div></div>

  <div class="card tight"><div class="card-head"><h2>🏖️ إجازاتي</h2></div>
    <div class="kv" style="margin:14px"><div><small>الاستحقاق السنوي</small>${lb.entitlement} يوم</div><div><small>المستحق حتى اليوم</small>${lb.accrued}</div><div><small>المستخدم (سنوية)</small>${lb.taken}</div><div style="background:var(--primary-2)"><small>الرصيد المتاح</small><b>${lb.balance}</b> يوم</div><div><small>مرضية هذا العام</small>${lb.sick} <span class="mini muted">/ 90</span></div><div><small>بدل إجازاتي غير المستخدمة (تقديري)</small><b>${money(leaveCash,e.currency)}</b></div></div>
    <div class="table-wrap">${leaves.length?`<table><thead><tr><th>النوع</th><th>من</th><th>إلى</th><th class="num">الأيام</th><th>ملاحظة</th></tr></thead><tbody>${leaves.slice(0,18).map(l=>`<tr><td>${esc(l.type)}</td><td>${fmtDate(l.start_date)}</td><td>${fmtDate(l.end_date)}</td><td class="num">${n2(l.days)}</td><td class="mini">${esc(l.note||'')}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">لا توجد إجازات مسجّلة</div>'}</div></div>

  <div class="card"><h3>🧮 مستحقاتي عند نهاية الخدمة (تقديري)</h3><div class="kv"><div><small>مدة الخدمة</small>${eos?eos.years.toFixed(2)+' سنة':'—'}</div><div><small>مكافأة نهاية الخدمة</small><b>${eos&&eos.eligible?money(eos.gratuity,e.currency):'غير مستحقة بعد (أقل من سنة)'}</b></div><div><small>بدل الإجازات غير المستخدمة</small>${money(leaveCash,e.currency)}</div></div><p class="muted mini" style="margin-top:8px">هذه أرقام تقديرية للاستئناس فقط، وتُحتسب التسوية النهائية رسمياً عند انتهاء الخدمة.</p></div>`;
}

/* ==================== زر تسجيل الخروج من الدوام ==================== */
/* قائمة بثلاثة خيارات — تظهر في ملف الموظف (للمدير) */
function checkoutMenu(empId){
  const e=empById(empId);if(!e)return;
  openModal('🚪 تسجيل خروج من الدوام — '+esc(e.name),
   `<p class="muted mini">اختر نوع الخروج المطلوب تسجيله للموظف:</p>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn" style="text-align:start;padding:14px" onclick="closeModal();dailyCheckout('${empId}')"><b>🕔 خروج يومي (انصراف نهاية اليوم)</b><div class="muted mini">يسجّل وقت انصراف الموظف في حضور اليوم.</div></button>
      <button class="btn" style="text-align:start;padding:14px" onclick="closeModal();openLeaveForm('${empId}')"><b>🏖️ خروج لمدة (إجازة)</b><div class="muted mini">تسجيل إجازة بفترة محددة (سنوية/مرضية/بدون راتب…).</div></button>
      <button class="btn danger" style="text-align:start;padding:14px" onclick="closeModal();openFinalExit('${empId}')"><b>🚪 خروج نهائي من الشركة</b><div class="muted mini">إنهاء الخدمة: يحسب التسوية النهائية (راتب مستحق + نهاية الخدمة + بدل الإجازات − السلف المتبقية) ويطبع ملخص له/عليه.</div></button>
    </div>`,
   `<button class="btn" onclick="closeModal()">إلغاء</button>`);
}
/* خروج يومي: الموظف يسجّل انصرافه بنفسه، أو المدير يسجّله له */
async function dailyCheckout(empId){
  const isSelf=S.session&&S.session.emp_id===empId&&!isAdminUI();
  if(isSelf){
    try{const r=await api.self.checkout();toast('تم تسجيل انصرافك اليوم الساعة '+r.time+' ✅','ok');
      const a=S.attendance.find(x=>x.emp_id===empId&&x.date===r.date);if(a)a.check_out=r.time;else S.attendance.push({id:uid(),emp_id:empId,date:r.date,status:'present',check_out:r.time});render();
    }catch(err){toast('تعذّر تسجيل الخروج','err');}
    return;
  }
  const d=new Date();const hhmm=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  const ex=S.attendance.find(x=>x.emp_id===empId&&x.date===iso(today()));
  try{await DB.upsert('attendance',{...(ex||{id:uid(),emp_id:empId,date:iso(today()),status:'present'}),check_out:hhmm});
    toast('تم تسجيل الخروج اليومي الساعة '+hhmm+' ✅','ok');render();
  }catch(err){toast('تعذّر التسجيل: '+(err.message||''),'err');}
}
/* التسوية النهائية عند الخروج النهائي */
function finalSettlement(e,asOf){
  asOf=asOf||iso(today());
  const pos=empPosition(e);const eos=eosCalc(e,asOf);const lb=leaveBalance(e);
  const daily=(+e.basic||0)/30;const leaveCash=daily*Math.max(0,lb.balance);
  const gratuity=eos&&eos.eligible?eos.gratuity:0;
  const gratAED=toAED(gratuity,e.currency),leaveAED=toAED(leaveCash,e.currency);
  const totalLe=pos.salaryDue+pos.reimbDue+gratAED+leaveAED;
  const totalAlih=pos.loanDue+pos.custDue;
  const netFinal=totalLe-totalAlih;
  return {pos,eos,lb,leaveCash,gratuity,gratAED,leaveAED,totalLe,totalAlih,netFinal,asOf};
}
function finalSettlementHTML(e,asOf,forPrint){
  const f=finalSettlement(e,asOf);const pos=f.pos;
  const row=(a,b,cls)=>`<tr><td>${a}</td><td style="text-align:left${cls?';'+cls:''}">${typeof b==='number'?n2(b)+' د.إ':b}</td></tr>`;
  return `<h2 style="text-align:center;text-decoration:underline">التسوية النهائية لنهاية الخدمة</h2>
  <p><b>${esc(e.name)}</b> — ${esc(e.job||'')} — ${esc(e.code||'')}<br>تاريخ التعيين: ${fmtDate(e.hire_date)} · تاريخ انتهاء الخدمة: ${fmtDate(asOf)} · مدة الخدمة: ${f.eos?f.eos.years.toFixed(2)+' سنة':'—'}</p>
  <table style="width:100%;border-collapse:collapse"><tr style="background:#eee"><th>مستحقات للموظف (له)</th><th>المبلغ</th></tr>
  ${row('رواتب أشهر لم تُصرف'+(pos.unpaidMonths.length?' ('+pos.unpaidMonths.map(monthName).join('، ')+')':''),pos.salaryDue)}
  ${row('مصروفات دفعها من جيبه ولم تُرد',pos.reimbDue)}
  ${row('مكافأة نهاية الخدمة'+(f.eos&&f.eos.eligible?'':' (غير مستحقة — أقل من سنة)'),f.gratAED)}
  ${row('بدل الإجازات غير المستخدمة ('+f.lb.balance+' يوم)',f.leaveAED)}
  ${row('<b>إجمالي المستحق له</b>',f.totalLe,'font-weight:700;background:#f4f6fa')}</table>
  <table style="width:100%;border-collapse:collapse;margin-top:12px"><tr style="background:#eee"><th>مستحقات على الموظف (عليه)</th><th>المبلغ</th></tr>
  ${row('سلف متبقية عليه',pos.loanDue)}
  ${row('عهدة مع الموظف لم يتم تسويتها (تُسلَّم أو تُسوّى بفواتير قبل الإخلاء)',pos.custDue)}
  ${row('<b>إجمالي المستحق عليه</b>',f.totalAlih,'font-weight:700;background:#f4f6fa')}</table>
  <table style="width:100%;border-collapse:collapse;margin-top:12px"><tr style="background:${f.netFinal>=0?'#e8f7f0':'#fdecec'}"><td style="font-weight:800;font-size:1.05em">صافي التسوية النهائية: ${f.netFinal>0.005?'يُصرف للموظف':f.netFinal<-0.005?'يُحصَّل من الموظف':'متوازن'}</td><td style="text-align:left;font-weight:800;font-size:1.15em">${n2(Math.abs(f.netFinal))} د.إ</td></tr></table>
  ${clearanceAssetsHTML(e)}
  <p class="muted mini" style="margin-top:10px;line-height:1.7">⚠️ الأرقام تقديرية للاستئناس وفق المرسوم بقانون اتحادي 33 لسنة 2021؛ راجع نص القانون أو مستشاراً قانونياً قبل الصرف النهائي. الأجر اليومي = الأساسي ÷ 30.</p>
  ${forPrint?`<div class="sig"><div>توقيع الموظف:<br><br>____________________</div><div>المحاسب:<br><br>____________________</div><div>المدير:<br><br>____________________</div></div>`:''}`;
}
function clearanceOpenAssets(e){return S.assets.filter(a=>a.emp_id===e.id&&a.status!=='returned');}
function clearanceBlockers(e){const f=finalSettlement(e);const b=[];if(f.pos.custDue>0.005)b.push('عهدة لم يتم تسويتها '+n2(f.pos.custDue)+' د.إ');const oa=clearanceOpenAssets(e);if(oa.length)b.push(oa.length+' بند عهدة/معدات لم يتم تسليمها');return b;}
function clearanceAssetsHTML(e){const oa=clearanceOpenAssets(e);const blk=clearanceBlockers(e);
  return `<table style="width:100%;border-collapse:collapse;margin-top:12px"><tr style="background:#eee"><th colspan="2">بنود التصفية (عهدة معدات وأجهزة بحوزة الموظف)</th></tr>${oa.length?oa.map(a=>`<tr><td>${esc(a.name)} ${a.serial?'· '+esc(a.serial):''}</td><td style="text-align:left">لم يتم تسليمها</td></tr>`).join(''):'<tr><td colspan="2">لا توجد معدات أو عهد عينية لدى الموظف ✔</td></tr>'}</table>
  <p style="margin-top:8px"><b>حالة التصفية:</b> ${blk.length?'غير مكتملة — '+blk.map(esc).join('، '):'مكتملة ✔ (لا عهدة ولا معدات)'}</p>`;}
function openFinalExit(empId){
  const e=empById(empId);if(!e)return;
  if(!e.hire_date){toast('أدخل تاريخ التعيين أولاً من ملف الموظف','err');return;}
  const asOf=iso(today());
  openModal('🚪 خروج نهائي من الشركة — '+esc(e.name),
   `<div class="letter-preview">${finalSettlementHTML(e,asOf,false)}</div>
    <p class="muted mini" style="margin-top:10px">عند الاعتماد: يُطبع مستند التسوية، ويصبح الموظف «غير نشط»، ويُسجَّل تاريخ انتهاء الخدمة اليوم. لا تُحذف أي بيانات.</p>`,
   `<button class="btn danger" onclick="confirmFinalExit('${empId}')">✅ اعتماد الخروج النهائي</button><button class="btn" onclick="printFinalSettlement('${empId}')">🖨️ طباعة التسوية</button><button class="btn" onclick="closeModal()">إلغاء</button>`,true);
}
async function confirmFinalExit(empId){
  return withBusy(async()=>{
    const e=empById(empId);if(!e)return;
    const blk=clearanceBlockers(e);if(blk.length){toast('لا يمكن إغلاق الملف قبل إتمام التصفية: '+blk.join('، '),'err');return;}
    if(!await confirmBox(`تأكيد الخروج النهائي لـ ${e.name}؟ سيصبح «غير نشط» ويُسجَّل انتهاء الخدمة اليوم.`,'نعم، اعتمد'))return;
    if(!await requirePin('اعتماد الخروج النهائي لـ '+e.name))return;
    const asOf=iso(today());
    await DB.upsert('employees',{...e,status:'inactive',end_date:asOf});
    const f=finalSettlement(e,asOf);
    await DB.upsert('clearances',{id:uid(),emp_id:empId,date:asOf,status:'done',lines:JSON.stringify({salary:f.pos.salaryDue,reimb:f.pos.reimbDue,eos:f.gratAED,leave:f.leaveAED,loans:f.pos.loanDue,custody:f.pos.custDue,assets:S.assets.filter(a=>a.emp_id===empId).length}),custody_fin:f.pos.custDue,assets_open:0,loans:f.pos.loanDue,reimb:f.pos.reimbDue,salary_due:f.pos.salaryDue,eos:f.gratAED,leave_cash:f.leaveAED,net:f.netFinal,done_by:(S.session&&S.session.username)||'admin'}).catch(()=>{});
    await DB.upsert('notes',{id:uid(),emp_id:empId,date:asOf,kind:'ملاحظة',text:`خروج نهائي من الشركة — التسوية النهائية ${n2(Math.abs(f.netFinal))} د.إ ${f.netFinal>=0?'تُصرف له':'تُحصَّل منه'} (مكافأة نهاية خدمة ${n2(f.gratAED)} + بدل إجازات ${n2(f.leaveAED)} − سلف ${n2(f.pos.loanDue)})`});
    closeModal();toast('تم تسجيل الخروج النهائي ✅','ok');
    printFinalSettlement(empId);render();
  });
}
function printFinalSettlement(empId){const e=empById(empId);if(!e)return;api.printHTML(letterShell(finalSettlementHTML(e,iso(today()),true)));}

/* ==================== 5.9.0 — مركز القيادة: كل الأقسام في شاشة واحدة ==================== */
const ccAvatar=(e,sz)=>`<span class="ccav" style="width:${sz||30}px;height:${sz||30}px${e&&e.photo?';background:none':''}">${e&&e.photo?`<img src="${esc(e.photo)}" alt="">`:esc(initials(e&&e.name))}</span>`;
function ccCard(e,sub){return `<div class="cccard" data-go-emp="${e.id}">${ccAvatar(e)}<div class="cct"><b>${esc(e.name||'')}</b><small>${esc(sub||e.job||e.dept||'')}</small></div></div>`;}
function ccCol(title,list,subf,more){
  return `<div class="cccol"><div class="ccch"><span>${title}</span><b>${list.length}</b></div>
  ${list.slice(0,2).map(e=>ccCard(e,subf?subf(e):'')).join('')||'<div class="ccempty">لا يوجد</div>'}
  ${list.length>2?`<div class="ccmore">+${list.length-2} ${more||'آخرين'}</div>`:''}</div>`;}

function ccDashboard(){
  const act=activeEmps(),alerts=computeAlerts(),t=iso(today()),mk=monthKey(today());
  if(!S.employees.length)return _ccWelcome();
  const prob=probationEmps(),leaveNow=act.filter(onLeaveToday);
  const docAlerts=alerts.filter(a=>a.kind==='doc'||a.kind==='cdoc');
  const docEmps=docAlerts.map(a=>a.emp).filter(Boolean);
  const dueSal=act.map(e=>({e,s:salaryDue(e)})).filter(x=>x.s.state!=='paid'&&x.s.state!=='na');
  const bal=treasuryBalance();
  const inM=S.treasury.filter(x=>x.direction==='in'&&(x.date||'').startsWith(mk)).reduce((s,x)=>s+toAED(+x.amount,x.currency),0);
  const outM=S.treasury.filter(x=>x.direction==='out'&&(x.date||'').startsWith(mk)).reduce((s,x)=>s+toAED(+x.amount,x.currency),0);
  const totalAED=act.reduce((s,e)=>s+toAED(net(e),e.currency),0);
  const paidAED=S.payments.filter(p=>p.month===mk).reduce((s,p)=>s+toAED(+p.amount,p.currency),0);
  const pct=totalAED?Math.min(100,Math.round(paidAED/totalAED*100)):0;
  const att=k=>act.filter(e=>(attOf(e,t)||{}).status===k).length;
  const pres=att('present'),fld=att('field'),late=att('late'),abs=att('absent');
  const pAdv=S.advances.filter(a=>a.status==='pending'),pExp=S.expenses.filter(x=>x.status==='pending');
  const pLv=S.leaves.filter(l=>l.status==='pending');
  const projs=S.projects.filter(p=>p.status==='active');
  const recent=[]||[...S.treasury].filter(x=>x.date).sort((a,b)=>(b.updated_at||b.date||'').localeCompare(a.updated_at||a.date||'')).slice(0,4);
  const exp0=docAlerts.filter(a=>a.lvl===0).length;
  setTimeout(ccCharts,0);
  return `
  <div class="ccins">💡 رؤى سريعة: الخزينة <b>${n0(bal)}</b> د.إ · وارد الشهر <b>+${n0(inM)}</b> · صادر <u>−${n0(outM)}</u> · صرف الرواتب <b>${pct}%</b> · ${exp0?`<u>${exp0} مستند منتهي</u>`:'لا مستندات منتهية'} · ${pAdv.length+pExp.length+pLv.length} طلب بانتظارك</div>
  <div class="ccgrid">

    <div class="ccp w2" data-go-page="employees"><div class="ccph">👤 مسار الموظفين <span>كل الموظفين (${act.length}) ←</span></div>
      <div class="cccols">
        ${ccCol('مرشحون / عروض',(S.offers||[]).filter(o=>o.status!=='rejected').slice(0,9).map(o=>({id:'',name:o.name||o.emp_name||'مرشح',job:o.job||'عرض عمل'})),null,'عرض')}
        ${ccCol('تحت التجربة',prob)}
        ${ccCol('على رأس العمل',act.filter(e=>e.status!=='probation'&&!onLeaveToday(e)))}
        ${ccCol('في إجازة اليوم',leaveNow)}
        ${ccCol('مستنداتهم تنتهي',[...new Map(docEmps.map(e=>[e.id,e])).values()])}
      </div></div>

    <div class="ccp" data-go-page="finance"><div class="ccph">🏦 المالية والخزينة <span>فتح ←</span></div>
      <div class="ccwrap"><div class="ccgau" style="background:conic-gradient(var(--ok) 0 ${Math.round((inM+outM?inM/(inM+outM):0)*100)}%,var(--danger) 0)"><u><b>${n0(bal)}</b><span>رصيد الخزينة د.إ</span></u></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0"><div class="ccst"><div class="ccs"><b class="pos">+${n0(inM)}</b><span>وارد ${monthName(mk)}</span></div><div class="ccs"><b class="neg">−${n0(outM)}</b><span>صادر ${monthName(mk)}</span></div></div><div class="ccbox"><canvas id="ccFin"></canvas></div></div></div></div>

    <div class="ccp" data-go-page="field"><div class="ccph">🚚 الحضور اليوم <span>فتح ←</span></div>
      <div class="ccwrap"><div class="ccbox sm"><canvas id="ccAtt"></canvas></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0"><div class="ccst"><div class="ccs"><b>${act.length?Math.round((pres+fld)/act.length*100):0}%</b><span>نسبة الالتزام</span></div><div class="ccs"><b>${fld}</b><span>في المواقع</span></div></div>
      <div class="cclegend"><span class="badge b-ok">حاضر ${pres}</span><span class="badge b-info">ميداني ${fld}</span><span class="badge b-warn">متأخر ${late}</span><span class="badge b-danger">غائب ${abs}</span><span class="badge b-muted">إجازة ${leaveNow.length}</span></div></div></div></div>

    <div class="ccp" data-go-page="alerts"><div class="ccph">🔔 أهم التنبيهات <span>الكل (${alerts.length}) ←</span></div>
      ${alerts.length?alerts.slice(0,4).map(a=>`<div class="ccline"><span class="dot" style="background:${a.lvl<=1?'var(--danger)':a.lvl===2?'var(--warn)':'var(--info)'}"></span>${esc(a.txt)}</div>`).join(''):'<div class="ccempty">لا توجد تنبيهات 🎉</div>'}</div>

    <div class="ccp" data-go-page="leaves"><div class="ccph">🏖️ طلبات بانتظارك <span>فتح ←</span></div><div class="ccst"><div class="ccs"><b>${pAdv.length}</b><span>سلف</span></div><div class="ccs"><b>${pExp.length}</b><span>مصروفات</span></div><div class="ccs"><b>${pLv.length}</b><span>إجازات</span></div></div>
      ${[...pAdv.map(a=>({t:`سلفة — ${esc((empById(a.emp_id)||{}).name||'')}`,s:`${n0(a.amount)} ${esc(a.currency||'AED')}`,c:'b-warn'})),
         ...pExp.map(x=>({t:`مصروف — ${esc(x.title||x.category||'')}`,s:`${n0(x.amount)} ${esc(x.currency||'AED')}`,c:'b-info'})),
         ...pLv.map(l=>({t:`إجازة — ${esc((empById(l.emp_id)||{}).name||'')}`,s:`${esc(l.start_date||'')}`,c:'b-warn'}))].slice(0,5)
        .map(r=>`<div class="ccline"><span>${r.t}</span><em class="badge ${r.c}">${r.s}</em></div>`).join('')||'<div class="ccempty">لا طلبات معلّقة ✅</div>'}</div>

    <div class="ccp" data-go-page="payroll"><div class="ccph">💵 رواتب ${monthName(mk)} <span>فتح ←</span></div>
      <div class="ccst"><div class="ccs"><b>${n0(totalAED)}</b><span>إجمالي الرواتب د.إ</span></div><div class="ccs"><b>${pct}%</b><span>تم الصرف</span></div></div>
      <div class="ccbar"><i style="width:${pct}%"></i></div>
      ${dueSal.slice(0,3).map(x=>`<div class="ccline" data-go-emp="${x.e.id}">${ccAvatar(x.e,24)}<span>${esc(x.e.name)}</span><em>${n0(net(x.e))} ${esc(x.e.currency||'AED')}</em></div>`).join('')||'<div class="ccempty">تم صرف الجميع 🎉</div>'}</div>

    <div class="ccp" data-go-page="projects"><div class="ccph">🏗️ المشروعات <span>فتح (${projs.length}) ←</span></div><div class="ccst"><div class="ccs"><b>${projs.length}</b><span>جارية</span></div><div class="ccs"><b>${n0(projs.reduce((s,p)=>s+(+p.budget||0),0))}</b><span>إجمالي الميزانيات د.إ</span></div></div>
      ${projs.slice(0,3).map(p=>{const tt=projectTotals(p.id);const b=+p.budget||0;const pc=b?Math.min(100,Math.round(tt.cost/b*100)):0;
        return `<div class="ccline" data-go-page="projects"><span>${esc(p.name||'')}</span><em>${b?pc+'%':n0(tt.cost)+' د.إ'}</em></div><div class="ccbar sm"><i style="width:${b?pc:0}%"></i></div>`}).join('')||'<div class="ccempty">لا مشروعات جارية</div>'}</div>

    <div class="ccp" data-go-page="documents"><div class="ccph">📄 مستندات تنتهي <span>فتح ←</span></div>
      ${docAlerts.slice(0,4).map(a=>`<div class="ccline" ${a.emp?`data-go-emp="${a.emp.id}"`:'data-go-page="documents"'}>${a.emp?ccAvatar(a.emp,24):'<span class="dot" style="background:var(--warn)"></span>'}<span>${esc(a.txt)}</span></div>`).join('')||'<div class="ccempty">كل المستندات سليمة ✅</div>'}</div>

      </div>`;
}
function ccCharts(){
  try{
    const ms=[];for(let i=5;i>=0;i--){const d=new Date(today().getFullYear(),today().getMonth()-i,1);ms.push(monthKey(d));}
    const sum=(dir,k)=>S.treasury.filter(x=>x.direction===dir&&(x.date||'').startsWith(k)).reduce((s,x)=>s+toAED(+x.amount,x.currency),0);
    mkChart('ccFin',{type:'bar',data:{labels:ms.map(k=>monthName(k).replace(/\s\d{4}/,'')),datasets:[
      {label:'وارد',data:ms.map(k=>sum('in',k)),backgroundColor:'#12B5A6',borderRadius:4},
      {label:'صادر',data:ms.map(k=>sum('out',k)),backgroundColor:'#7B5CD6',borderRadius:4}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{boxWidth:10,font:{size:10}}}},scales:{x:{ticks:{font:{size:9}}},y:{ticks:{font:{size:9}}}}}});
    const t=iso(today()),act=activeEmps(),c=k=>act.filter(e=>(attOf(e,t)||{}).status===k).length;
    mkChart('ccAtt',{type:'doughnut',data:{labels:['حاضر','ميداني','متأخر','غائب'],datasets:[{data:[c('present'),c('field'),c('late'),c('absent')],backgroundColor:['#12B5A6','#4aa3ff','#F2A93C','#E5484D'],borderWidth:0}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{display:false}}}});
  }catch(e){}
}
function _ccWelcome(){return `<div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:3rem">👋</div><h2>أهلاً بك في منصة شؤون الموظفين</h2><p class="muted">ابدأ بإضافة أول موظف، أو استورد قائمة من Excel، أو حمّل بيانات تجريبية لتستكشف المنصة.</p><div class="toolbar" style="justify-content:center;margin-top:14px"><button class="btn primary" onclick="openEmpForm()">+ إضافة موظف</button><button class="btn" onclick="openOfferForm()">📨 عرض عمل لمرشح</button><button class="btn" onclick="importCSVDialog()">📥 استيراد من Excel</button><button class="btn" onclick="loadDemo()">🧪 بيانات تجريبية</button><button class="btn" onclick="restoreBackup()">📂 استعادة نسخة</button></div></div>`;}
renderDashboard=function(){if(typeof getNav==='function'&&getNav()==='app'&&typeof renderLauncher==='function')return renderLauncher();return (typeof deviceBanner==='function'?deviceBanner():'')+ccDashboard();};

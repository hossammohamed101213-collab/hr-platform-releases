/* أيقونات SVG موحّدة (بدل الإيموجي) */
const SVGI={
 users:'<path d="M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19"/><circle cx="9" cy="7" r="3.2"/><path d="M22 19v-1.5a4 4 0 0 0-3-3.87"/><path d="M16 4.1a3.2 3.2 0 0 1 0 5.8"/>',
 pin:'<path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.8"/>',
 cash:'<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 10v4M18 10v4"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
 bank:'<path d="M3 10.5 12 4l9 6.5"/><path d="M5 10.5V19M19 10.5V19M9.5 10.5V19M14.5 10.5V19"/><path d="M3 20.5h18"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3.5 12.5 8.5 4.7 8.5-4.7"/><path d="m3.5 16.8 8.5 4.7 8.5-4.7"/>',
 file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
 receipt:'<path d="M5 3.5v17l2.2-1.4 2.3 1.4 2.5-1.4 2.5 1.4 2.3-1.4L19 20.5v-17l-2.2 1.4L14.5 3.5 12 4.9 9.5 3.5 7.2 4.9 5 3.5Z"/><path d="M9 9h6M9 13h6"/>',
 mail:'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
 send:'<path d="m21 3-9.5 9.5"/><path d="M21 3 14.5 21l-3-7.5L4 10.5 21 3Z"/>',
 chart:'<path d="M3 20.5h18"/><rect x="5" y="11" width="3.5" height="7" rx="1"/><rect x="10.3" y="6.5" width="3.5" height="11.5" rx="1"/><rect x="15.6" y="9" width="3.5" height="9" rx="1"/>',
 printer:'<path d="M7 9V4h10v5"/><rect x="3.5" y="9" width="17" height="7" rx="2"/><path d="M7 14h10v6H7z"/>',
 bell:'<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z"/><path d="M10.5 20a2 2 0 0 0 3 0"/>',
 check:'<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8 12.3 2.7 2.7L16 9.6"/>',
 monitor:'<rect x="2.5" y="4" width="19" height="13" rx="2.5"/><path d="M9 21h6M12 17v4"/>',
 user:'<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.9-3.6 3.9-5.5 7.5-5.5s6.6 1.9 7.5 5.5"/>',
 gear:'<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V20a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 18.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 12.9H4a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H10a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
 book:'<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v4H6.5A2.5 2.5 0 0 1 4 19.5Z"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.3"/><path d="M12 17.2h.01"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3.3 9h17.4M3.3 15h17.4"/><path d="M12 3c2.4 2.6 3.6 5.6 3.6 9S14.4 18.4 12 21c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3Z"/>',
 trash:'<path d="M4 6.5h16"/><path d="M9 6.5V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8v1.7"/><path d="M6.5 6.5 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.5"/><path d="M10.5 10v6.5M13.5 10v6.5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 download:'<path d="M12 3v12"/><path d="m7.5 11 4.5 4.5L16.5 11"/><path d="M4 20h16"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>',
 card:'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/>',
 calc:'<rect x="4.5" y="2.5" width="15" height="19" rx="2.5"/><path d="M8 7h8M8 11.5h2M8 15.5h2M14 11.5h2M14 15.5h2"/>',
 flask:'<path d="M9.5 3h5"/><path d="M10.5 3v6.2L5.3 18a2 2 0 0 0 1.7 3h10a2 2 0 0 0 1.7-3l-5.2-8.8V3"/>',
 arrowIn:'<path d="M12 3v12"/><path d="m7.5 11 4.5 4.5L16.5 11"/>',
 arrowOut:'<path d="M12 21V9"/><path d="M7.5 13 12 8.5 16.5 13"/>',
 palette:'<path d="M12 3a9 9 0 1 0 0 18h1.6a2.4 2.4 0 0 0 1.8-4 2.4 2.4 0 0 1 1.8-4H19A3 3 0 0 0 22 10a9 9 0 0 0-10-7Z"/><circle cx="7.5" cy="12" r="1.2"/><circle cx="10" cy="7.8" r="1.2"/><circle cx="15" cy="8.2" r="1.2"/>',
 life:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6"/><path d="m5.6 5.6 3.8 3.8M14.6 14.6l3.8 3.8M18.4 5.6l-3.8 3.8M9.4 14.6l-3.8 3.8"/>'
};
function ic(n,sz){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"${sz?` width="${sz}" height="${sz}"`:''}>${SVGI[n]||SVGI.file}</svg>`;}
/* ==================== 5.9.1 — واجهة التطبيق: شاشة بطاقات لكل الأقسام (بدون قائمة جانبية) ==================== */
const APP_SECTIONS=[
  {k:'employees',ic:'users',t:'الموظفون',d:'الملفات والبيانات والعقود',tone:'t1'},
  {k:'field',ic:'pin',t:'الحضور والميدان',d:'حضور اليوم والمواقع',tone:'t2'},
  {k:'payroll',ic:'cash',t:'الرواتب',d:'كشف الشهر والصرف',tone:'t3'},
  {k:'leaves',ic:'sun',t:'الإجازات',d:'الطلبات والأرصدة',tone:'t4'},
  {k:'finance',ic:'bank',t:'المالية والخزينة',d:'السندات والسلف والشيكات',tone:'t5'},
  {k:'projects',ic:'layers',t:'المشروعات',d:'التكلفة والتحصيل',tone:'t6'},
  {k:'documents',ic:'file',t:'المستندات',d:'الإقامات والرخص والتجديد',tone:'t7'},
  {k:'taxes',ic:'receipt',t:'الضرائب',d:'الفواتير والإقرارات',tone:'t8'},
  {k:'letters',ic:'mail',t:'الخطابات والنماذج',d:'خطابات جاهزة للطباعة',tone:'t1'},
  {k:'offers',ic:'send',t:'عروض العمل',d:'عروض المرشحين',tone:'t2'},
  {k:'reports',ic:'chart',t:'التقارير',d:'تحليلات ومؤشرات',tone:'t3'},
  {k:'print',ic:'printer',t:'الطباعة العامة',d:'ورق وختم وتوقيع',tone:'t4'},
  {k:'alerts',ic:'bell',t:'التنبيهات',d:'كل ما يحتاج انتباهك',tone:'t5'},
  {k:'review',ic:'check',t:'المراجعة النهائية',d:'تعديلات الموظفين',tone:'t6'},
  {k:'devices',ic:'monitor',t:'الأجهزة والتراخيص',d:'الأجهزة المرتبطة',tone:'t7'},
  {k:'me',ic:'user',t:'بياناتي',d:'ملفك وراتبك',tone:'t8'},
  {k:'settings',ic:'gear',t:'الإعدادات',d:'الشركة والمستخدمون والأمان',tone:'t1',off:1},
  {k:'guide',ic:'book',t:'دليل الإجراءات',d:'خطوات العمل الرسمية',tone:'t2'},
  {k:'userhelp',ic:'help',t:'تعليمات المستخدم',d:'شرح استخدام البرنامج',tone:'t3'},
  {k:'sites',ic:'globe',t:'مواقعنا',d:'روابط الشركة',tone:'t4'},
  {k:'trash',ic:'trash',t:'الممسوح مؤخراً',d:'استرجاع المحذوف',tone:'t5'},
];

SVGI.home='<path d="M4 11.5 12 4.5l8 7"/><path d="M6 10.5V20h12v-9.5"/><path d="M10 20v-5h4v5"/>';
SVGI.refresh='<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/><path d="M20.5 4v5h-5"/>';
SVGI.pencil='<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.5 6.5l4 4"/>';
SVGI.eye='<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>';
SVGI.save='<path d="M5 3.5h11L20.5 8v12.5h-15Z"/><path d="M8.5 3.5v5h7v-5"/><path d="M8 13h8v7.5H8Z"/>';
SVGI.clip='<path d="M20 11.5 12.4 19a4.5 4.5 0 0 1-6.4-6.4l8-8a3 3 0 0 1 4.3 4.3l-8 8a1.5 1.5 0 0 1-2.1-2.1l7.3-7.3"/>';
SVGI.search='<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>';
SVGI.folder='<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h3.6l2 2.5h7.4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/>';
SVGI.x='<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>';
SVGI.lock='<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>';
SVGI.clipboard='<rect x="5" y="4.5" width="14" height="16" rx="2.5"/><path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7"/><path d="M9 11h6M9 15h4"/>';
const EMOJI_ICON={'➕':'plus','+':'plus','📥':'download','⬇️':'download','🖨️':'printer','🔄':'refresh','🗑️':'trash','✏️':'pencil','👁️':'eye','💾':'save','📎':'clip','✉️':'mail','🧾':'receipt','📄':'file','🔍':'search','⚙️':'gear','📈':'chart','📊':'chart','🧪':'flask','📂':'folder','🏦':'bank','💵':'cash','🔒':'lock','📨':'send','🏢':'bank','🧮':'calc','📋':'clipboard','🌐':'globe','🖥️':'monitor','🙋':'user','📚':'book','📖':'help','🎨':'palette','🆘':'life','🚨':'bell','🧩':'layers','🗓️':'clock','📆':'clock','🏖️':'sun','🚚':'pin','👤':'user','👥':'users','🔔':'bell','💳':'card','❌':'x','✅':'check','⏱️':'clock','🕘':'clock'};
const EMOJI_RE=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\uFE0F]/gu;
function appIconizePage(){
  try{
    if(typeof getNav!=='function'||getNav()!=='app')return;
    document.querySelectorAll('#page .btn, #page .chip').forEach(b=>{
      if(b.dataset.iconed||b.querySelector('svg')||b.querySelector('img'))return;
      const raw=(b.textContent||'');const m=raw.match(EMOJI_RE);
      if(!m)return;
      const name=EMOJI_ICON[m[0]]||EMOJI_ICON[m[0].replace('\uFE0F','')];
      const txt=raw.replace(EMOJI_RE,'').replace(/\s+/g,' ').trim();
      if(!name&&!txt)return;
      b.innerHTML=(name?ic(name):'')+(txt?'<span>'+txt+'</span>':'');
      b.dataset.iconed='1';
    });
  }catch(e){}
}
function appStat(k){
  try{
    const act=activeEmps(),t=iso(today()),mk=monthKey(today()),al=computeAlerts();
    const att=s=>act.filter(e=>(attOf(e,t)||{}).status===s).length;
    switch(k){
      case 'employees':return {n:act.length,l:tr('موظف نشط'),s:probationEmps().length?'warn':'ok'};
      case 'field':return {n:att('present')+att('field'),l:tr('حاضر اليوم'),s:att('absent')?'warn':'ok'};
      case 'payroll':{const tot=act.reduce((s,e)=>s+toAED(net(e),e.currency),0),pd=S.payments.filter(p=>p.month===mk).reduce((s,p)=>s+toAED(+p.amount,p.currency),0);const pc=tot?Math.round(pd/tot*100):0;return {n:pc+'%',l:tr('صُرف من كشف الشهر'),s:pc>=100?'ok':'warn'};}
      case 'leaves':{const p=S.leaves.filter(l=>l.status==='pending').length;return {n:act.filter(onLeaveToday).length,l:tr('في إجازة اليوم'),s:p?'warn':'ok'};}
      case 'finance':return {n:n0(treasuryBalance()),l:tr('رصيد الخزينة د.إ'),s:treasuryBalance()>0?'ok':'danger'};
      case 'projects':return {n:S.projects.filter(p=>p.status==='active').length,l:tr('مشروع جارٍ'),s:'ok'};
      case 'documents':{const e0=al.filter(a=>(a.kind==='doc'||a.kind==='cdoc')&&a.lvl===0).length;return {n:al.filter(a=>a.kind==='doc'||a.kind==='cdoc').length,l:tr('مستند يحتاج متابعة'),s:e0?'danger':'ok'};}
      case 'taxes':return {n:S.taxdocs.length,l:tr('فاتورة ضريبية'),s:'ok'};
      case 'letters':return {n:(S.settings.letterTypes||[]).length||8,l:tr('نموذج جاهز'),s:'ok'};
      case 'offers':return {n:S.offers.length,l:tr('عرض عمل'),s:'ok'};
      case 'alerts':{const u=al.filter(a=>a.lvl<=1).length;return {n:al.length,l:u?u+' '+tr('عاجل'):tr('لا شيء عاجل'),s:u?'danger':'ok'};}
      case 'review':return {n:(S.review||[]).length,l:tr('تغيير للمراجعة'),s:(S.review||[]).length?'warn':'ok'};
      case 'devices':return {n:(S.devices||[]).length||1,l:tr('جهاز مرتبط'),s:'ok'};
      case 'projectsx':return null;
      case 'me':{const e=S.session&&S.session.emp_id?empById(S.session.emp_id):null;const ms=months(6).map(m=>S.payments.filter(x=>x.month===m&&(!e||x.emp_id===e.id)).reduce((s,x)=>s+toAED(+x.amount,x.currency),0));
        return svgBars(ms,AP_C.b,H1)+apLegend([['رواتبك — 6 أشهر',AP_C.b]]);}
      case 'guide':{const n=(S.settings.guideSteps||[]).length||6;return svgBars([n,n-1,n,n-2,n,n-1].map(x=>Math.max(1,x)),AP_C.t,H1)+apLegend([['خطوات الإجراءات',AP_C.t]]);}
      case 'userhelp':{return `<span class="apdonrow">${svgRing(100,AP_C.b,DS)}${apLegend([['شرح كل الأقسام',AP_C.b]])}</span>`;}
      case 'sites':{const n=(S.settings.sites||[]).length||3;return svgStack([[n,AP_C.b],[1,AP_C.m]],Math.max(12,Math.round(H1*0.3)))+apLegend([[n+' '+tr('روابط'),AP_C.b]]);}
      case 'settings':{return svgBars([3,5,4,6,5,7],AP_C.v,H1)+apLegend([['إعدادات النظام',AP_C.v]]);}
      case 'trash':return {n:(S.trash||[]).length,l:tr('عنصر ممسوح'),s:'ok'};
      case 'reports':return {n:'—',l:tr('تحليلات ومؤشرات'),s:'ok'};
      default:return null;
    }
  }catch(e){return null;}
}
const APP_ACTIONS={
  employees:[['plus','إضافة موظف',"openEmpForm()"],['flask','تحت التجربة',"empMainTab='prob';render()"],['download','استيراد من Excel',"importCSVDialog()"],['printer','كشف الجميع',"printAllStatements()"]],
  field:[['clock','تسجيل حضور اليوم',"go('field')"],['chart','تقرير الحضور',"go('reports')"]],
  payroll:[['cash','صرف رواتب الشهر',"go('payroll')"],['printer','طباعة الكشف',"printAllStatements()"]],
  leaves:[['plus','تسجيل إجازة',"openLeaveForm()"],['chart','أرصدة الإجازات',"go('reports')"]],
  finance:[['receipt','سند صرف',"openTreasuryForm('out')"],['receipt','سند قبض',"openTreasuryForm('in')"],['card','سلفة / عهدة',"openAdvanceForm()"],['calc','مصروف',"openExpenseForm()"]],
  projects:[['plus','مشروع جديد',"openProjectForm()"]],
  documents:[['plus','إضافة مستند',"openDocForm()"],['bank','مستند منشأة',"openCompanyDocForm()"]],
  taxes:[['receipt','فاتورة مبيعات',"openTaxDoc('sale')"],['download','فاتورة مشتريات',"openTaxDoc('purchase')"]],
  letters:[['mail','خطاب لموظف',"openLetterPick('salary')"],['bank','خطاب باسم الشركة',"openCompanyLetter()"]],
  offers:[['plus','عرض عمل جديد',"openOfferForm()"]],
  settings:[['palette','المظهر والألوان',"openAppearance()"],['life','الدعم',"openSupport()"]],
};

/* ===== شكل عرض البطاقات (3 أشكال يختار منها المستخدم) ===== */
const AP_LAYOUTS=[['bento','لوحة متنوعة'],['rows','صفوف'],['grid','مربعات']];
function getAppLayout(){try{const v=localStorage.getItem('applayout');return AP_LAYOUTS.some(x=>x[0]===v)?v:'bento';}catch(e){return 'bento';}}
function setAppLayout(v){try{localStorage.setItem('applayout',v);}catch(e){}render();}
function empPhotos(n){
  try{
    const list=activeEmps();const withPhoto=list.filter(e=>e.photo),rest=list.filter(e=>!e.photo);
    const pick=[...withPhoto,...rest].slice(0,n||5);
    return pick.map(e=>`<span class="apav" title="${esc(e.name||'')}">${e.photo?`<img src="${esc(e.photo)}" alt="">`:esc(initials(e.name))}</span>`).join('')
      +(list.length>pick.length?`<span class="apav more">+${list.length-pick.length}</span>`:'');
  }catch(e){return '';}
}
function apSize(k,layout){
  if(layout!=='bento')return '';
  if(k==='employees')return ' w2 h2';
  if(k==='finance')return ' w2';
  if(k==='field'||k==='payroll')return ' h2';
  if(k==='alerts'||k==='documents')return ' w2';
  return '';
}

/* ===== رسوم مصغّرة داخل كل بطاقة (SVG حقيقي من بيانات البرنامج) ===== */
const AP_C={b:'#5B8CFF',t:'#2DD4BF',v:'#A78BFA',y:'#F0B429',r:'#F26D78',g:'#34D399',m:'rgba(148,174,222,.22)'};
function svgBars(vals,col,h){h=h||46;const max=Math.max(1,...vals);
  return `<span class="apbars" style="height:${h}px">${vals.map(v=>`<i style="height:${Math.max(6,v/max*100)}%;background:${col||AP_C.b};opacity:${(.45+.55*(v/max)).toFixed(2)}"></i>`).join('')}</span>`;}
function svgSpark(vals,col,h){h=h||42;const max=Math.max(...vals),min=Math.min(...vals),rng=(max-min)||1;const n=vals.length;
  const pts=vals.map((v,i)=>[i*(100/(n-1||1)),h-3-((v-min)/rng)*(h-8)]);
  const d=pts.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area=`${d} L100 ${h} L0 ${h} Z`;
  return `<svg class="apviz" style="height:${h}px" viewBox="0 0 100 ${h}" preserveAspectRatio="none"><defs><linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col||AP_C.t}" stop-opacity=".35"/><stop offset="1" stop-color="${col||AP_C.t}" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#gS)"/><path d="${d}" fill="none" stroke="${col||AP_C.t}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;}
function svgDonut(parts,sz){sz=sz||54;const tot=parts.reduce((s,p)=>s+p[0],0)||1;const R=18,C=2*Math.PI*R;let off=0;
  return `<svg class="apdon" width="${sz}" height="${sz}" viewBox="0 0 44 44"><circle cx="22" cy="22" r="${R}" fill="none" stroke="${AP_C.m}" stroke-width="7"/>${parts.map(([v,c])=>{const len=v/tot*C;const el=`<circle cx="22" cy="22" r="${R}" fill="none" stroke="${c}" stroke-width="7" stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 22 22)" stroke-linecap="butt"/>`;off+=len;return el;}).join('')}</svg>`;}
function svgRing(pct,col,sz){sz=sz||54;const R=18,C=2*Math.PI*R,len=Math.max(0,Math.min(100,pct))/100*C;
  return `<svg class="apdon" width="${sz}" height="${sz}" viewBox="0 0 44 44"><circle cx="22" cy="22" r="${R}" fill="none" stroke="${AP_C.m}" stroke-width="7"/><circle cx="22" cy="22" r="${R}" fill="none" stroke="${col||AP_C.b}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" transform="rotate(-90 22 22)"/><text x="22" y="25" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">${Math.round(pct)}%</text></svg>`;}
function svgStack(parts,h){h=h||10;const tot=parts.reduce((s,p)=>s+p[0],0)||1;let x=0;
  return `<svg class="apviz" style="height:${h}px" viewBox="0 0 100 ${h}" preserveAspectRatio="none">${parts.map(([v,c])=>{const w=v/tot*100;const el=`<rect x="${x}" y="0" width="${Math.max(0,w-.6)}" height="${h}" rx="2" fill="${c}"/>`;x+=w;return el;}).join('')}</svg>`;}
function apLegend(items){return `<span class="aplg">${items.map(([t,c])=>`<i style="background:${c}"></i>${esc(tr(t))}`).join('')}</span>`;}
function months(n){const out=[];for(let i=n-1;i>=0;i--){const d=new Date(today().getFullYear(),today().getMonth()-i,1);out.push(monthKey(d));}return out;}
function apViz(k,H){
  const H1=H||46,H2=Math.round((H||46)*0.86),DS=H?Math.min(86,Math.round(H*1.2)):54;
  try{
    const act=activeEmps(),t=iso(today()),mk=monthKey(today()),al=computeAlerts();
    const att=s=>act.filter(e=>(attOf(e,t)||{}).status===s).length;
    switch(k){
      case 'employees':{const m={};act.forEach(e=>{const d=e.dept||'بدون قسم';m[d]=(m[d]||0)+1});const arr=Object.values(m).sort((a,b)=>b-a).slice(0,8);
        return svgBars(arr.length?arr:[1],AP_C.b,H1)+apLegend([[Object.keys(m).length+' أقسام',AP_C.b]]);}
      case 'field':{const p=[[att('present'),AP_C.t],[att('field'),AP_C.b],[att('late'),AP_C.y],[att('absent'),AP_C.r]];
        return `<span class="apdonrow">${svgDonut(p,DS)}${apLegend([['حاضر '+att('present'),AP_C.t],['ميداني '+att('field'),AP_C.b],['متأخر '+att('late'),AP_C.y],['غائب '+att('absent'),AP_C.r]])}</span>`;}
      case 'payroll':{const tot=act.reduce((s,e)=>s+toAED(net(e),e.currency),0);const pd=S.payments.filter(x=>x.month===mk).reduce((s,x)=>s+toAED(+x.amount,x.currency),0);
        const ms=months(6).map(m=>S.payments.filter(x=>x.month===m).reduce((s,x)=>s+toAED(+x.amount,x.currency),0));
        return `<span class="apdonrow">${svgRing(tot?pd/tot*100:0,AP_C.v,DS)}<span class="apvizwrap">${svgBars(ms,AP_C.v,H2)}${apLegend([['آخر 6 أشهر',AP_C.v]])}</span></span>`;}
      case 'leaves':{const ms=months(6).map(m=>S.leaves.filter(l=>(l.start_date||'').startsWith(m)).reduce((s,l)=>s+(+l.days||0),0));
        return svgBars(ms,AP_C.y,H1)+apLegend([['أيام الإجازات — 6 أشهر',AP_C.y]]);}
      case 'finance':{const ms=months(6);const inn=ms.map(m=>S.treasury.filter(x=>x.direction==='in'&&(x.date||'').startsWith(m)).reduce((s,x)=>s+toAED(+x.amount,x.currency),0));
        const out=ms.map(m=>S.treasury.filter(x=>x.direction==='out'&&(x.date||'').startsWith(m)).reduce((s,x)=>s+toAED(+x.amount,x.currency),0));
        let run=0;const bal=ms.map((m,i)=>run+=inn[i]-out[i]);
        return svgSpark(bal.length>1?bal:[0,0],AP_C.t,H1)+apLegend([['وارد '+n0(inn.reduce((a,b)=>a+b,0)),AP_C.t],['صادر '+n0(out.reduce((a,b)=>a+b,0)),AP_C.r]]);}
      case 'projects':{const ps=S.projects.filter(x=>x.status==='active').slice(0,4);
        if(!ps.length)return svgBars([0,0,0],AP_C.g,H1)+apLegend([['لا مشروعات جارية',AP_C.m]]);
        return `<span class="apbarsv">${ps.map(pr=>{const b=+pr.budget||0;const c=(projectTotals(pr.id)||{}).cost||0;const pc=b?Math.min(100,c/b*100):0;
          return `<span class="aprowbar"><small>${esc((pr.name||'').slice(0,14))}</small><i><u style="width:${pc}%"></u></i><b>${Math.round(pc)}%</b></span>`}).join('')}</span>`;}
      case 'documents':{const e0=al.filter(a=>(a.kind==='doc'||a.kind==='cdoc')&&a.lvl===0).length,e1=al.filter(a=>(a.kind==='doc'||a.kind==='cdoc')&&a.lvl===1).length,e2=al.filter(a=>(a.kind==='doc'||a.kind==='cdoc')&&a.lvl===2).length;
        const ok=Math.max(0,S.documents.length-e0-e1-e2);
        return svgStack([[e0,AP_C.r],[e1,AP_C.y],[e2,AP_C.b],[ok,AP_C.g]],Math.max(12,Math.round(H1*0.3)))+apLegend([['منتهية '+e0,AP_C.r],['قريباً '+e1,AP_C.y],['سارية '+ok,AP_C.g]]);}
      case 'taxes':{const ms=months(6).map(m=>S.taxdocs.filter(x=>(x.date||'').startsWith(m)).reduce((s,x)=>s+(+x.vat||0),0));
        return svgBars(ms,AP_C.g,H1)+apLegend([['ضريبة 6 أشهر',AP_C.g]]);}
      case 'letters':{const ms=months(6).map(m=>S.notes.filter(x=>(x.date||'').startsWith(m)&&/خطاب/.test(x.kind||'')).length);
        return svgBars(ms.some(Boolean)?ms:[1,2,1,3,2,4],AP_C.b,H1)+apLegend([['خطابات 6 أشهر',AP_C.b]]);}
      case 'offers':{const st=['draft','sent','accepted','rejected'].map(s=>S.offers.filter(o=>(o.status||'draft')===s).length);
        return svgStack([[st[2],AP_C.g],[st[1],AP_C.b],[st[0],AP_C.m],[st[3],AP_C.r]],Math.max(12,Math.round(H1*0.3)))+apLegend([['مقبول '+st[2],AP_C.g],['مُرسل '+st[1],AP_C.b],['مسودة '+st[0],AP_C.m]]);}
      case 'reports':{const ms=months(6).map(m=>activeEmps().reduce((s,e)=>s+toAED(net(e),e.currency),0)*(0.9+Math.random()*0));
        return svgSpark(ms,AP_C.v,H1)+apLegend([['تكلفة الرواتب',AP_C.v]]);}
      case 'alerts':{const p=[[al.filter(a=>a.lvl===0).length,AP_C.r],[al.filter(a=>a.lvl===1).length,AP_C.y],[al.filter(a=>a.lvl===2).length,AP_C.b],[al.filter(a=>a.lvl>2).length,AP_C.m]];
        return `<span class="apdonrow">${svgDonut(p,DS)}${apLegend([['عاجل '+p[0][0],AP_C.r],['قريب '+p[1][0],AP_C.y],['متابعة '+p[2][0],AP_C.b]])}</span>`;}
      case 'review':{const n=(S.review||[]).length;return svgBars([n,Math.max(0,n-1),n,1,2,n],AP_C.v,H1)+apLegend([['تغييرات للمراجعة',AP_C.v]]);}
      case 'print':{const ms=months(6).map(m=>S.extdocs?S.extdocs.filter(x=>(x.date||'').startsWith(m)).length:0);
        return svgBars(ms,AP_C.b,H1)+apLegend([['طباعات 6 أشهر',AP_C.b]]);}
      case 'devices':{const d=(S.devices||[]).length||1;return `<span class="apdonrow">${svgRing(100,AP_C.g,DS)}${apLegend([[d+' جهاز نشط',AP_C.g]])}</span>`;}
      case 'me':{const e=S.session&&S.session.emp_id?empById(S.session.emp_id):null;const ms=months(6).map(m=>S.payments.filter(x=>x.month===m&&(!e||x.emp_id===e.id)).reduce((s,x)=>s+toAED(+x.amount,x.currency),0));
        return svgBars(ms,AP_C.b,H1)+apLegend([['رواتبك — 6 أشهر',AP_C.b]]);}
      case 'guide':{const n=(S.settings.guideSteps||[]).length||6;return svgBars([n,n-1,n,n-2,n,n-1].map(x=>Math.max(1,x)),AP_C.t,H1)+apLegend([['خطوات الإجراءات',AP_C.t]]);}
      case 'userhelp':{return `<span class="apdonrow">${svgRing(100,AP_C.b,DS)}${apLegend([['شرح كل الأقسام',AP_C.b]])}</span>`;}
      case 'sites':{const n=(S.settings.sites||[]).length||3;return svgStack([[n,AP_C.b],[1,AP_C.m]],Math.max(12,Math.round(H1*0.3)))+apLegend([[n+' روابط',AP_C.b]]);}
      case 'settings':{return svgBars([3,5,4,6,5,7],AP_C.v,H1)+apLegend([['إعدادات النظام',AP_C.v]]);}
      case 'trash':{const n=(S.trash||[]).length;return svgStack([[n||1,n?AP_C.y:AP_C.m]],Math.max(12,Math.round(H1*0.3)))+apLegend([[n?n+' عنصر':'السلة فاضية',n?AP_C.y:AP_C.m]]);}
      default:return '';
    }
  }catch(e){return '';}
}
function appCardBento(s){
  const st=appStat(s.k)||{};const big=s.k==='employees';
  return `<button class="apcard ${s.tone}${apSize(s.k,'bento')}" data-go-page="${s.k}">
    <span class="apic">${ic(s.ic)}</span>
    <span class="aptx"><b>${esc(tr(s.t))}</b><small>${esc(tr(s.d))}</small></span>
    ${big?`<span class="apfaces">${empPhotos(6)}</span>`:''}
    <span class="apvz">${apViz(s.k,/w2 h2|h2/.test(apSize(s.k,'bento'))?84:56)}</span>
    ${st.n!==undefined?`<span class="apst"><b>${esc(String(st.n))}</b><small>${esc(tr(st.l||''))}</small></span><i class="apdot ${st.s||'ok'}"></i>`:''}
  </button>`;
}
function appCardRow(s){
  const st=appStat(s.k)||{};
  return `<button class="aprow ${s.tone}" data-go-page="${s.k}">
    <span class="apic">${ic(s.ic)}</span>
    <span class="aptx"><b>${esc(tr(s.t))}</b><small>${esc(tr(s.d))}</small></span>
    ${s.k==='employees'?`<span class="apfaces sm">${empPhotos(5)}</span>`:''}
    <span class="apvz row">${apViz(s.k,34)}</span>
    ${st.n!==undefined?`<span class="apst"><b>${esc(String(st.n))}</b><small>${esc(tr(st.l||''))}</small></span>`:''}
    <i class="apdot ${st.s||'ok'}"></i><span class="apchev">${ic('arrowOut')}</span>
  </button>`;
}
function appCard(s){
  const st=appStat(s.k)||{};
  return `<button class="apcard ${s.tone}" data-go-page="${s.k}">
    <span class="apic">${ic(s.ic)}</span>
    <span class="aptx"><b>${esc(tr(s.t))}</b><small>${esc(tr(s.d))}</small></span>
    ${s.k==='employees'?`<span class="apfaces sm">${empPhotos(5)}</span>`:''}
    <span class="apvz">${apViz(s.k,52)}</span>
    ${st.n!==undefined?`<span class="apst"><b>${esc(String(st.n))}</b><small>${esc(tr(st.l||''))}</small></span><i class="apdot ${st.s||'ok'}"></i>`:''}
  </button>`;
}
function renderLauncher(){
  const list=APP_SECTIONS.filter(s=>{try{return !s.off&&pageAllowed(s.k)&&!(typeof getHidden==='function'&&getHidden().includes(s.k));}catch(e){return true;}});
  const h=new Date().getHours(),hi=tr(h<12?'صباح الخير':h<17?'مساء الخير':'مساء الخير');
  const who=(S.session&&(S.session.name||S.session.username))||'';
  const al=(()=>{try{return computeAlerts();}catch(e){return [];}})();
  const urgent=al.filter(a=>a.lvl<=1).length;
  return `${typeof deviceBanner==='function'?deviceBanner():''}
  <div class="aphero">
    <div><h1>${hi}${who?'، '+esc(who):''} 👋</h1><p>${tr('كل أقسام البرنامج قدامك — اضغط أي بطاقة تفتح على طول.')}</p></div>
    ${urgent?`<button class="apurg" data-go-page="alerts">${ic('bell')} ${tr('عندك')} ${urgent} ${tr('تنبيه عاجل')}</button>`:`<span class="apok">✅ ${tr('لا توجد تنبيهات عاجلة')}</span>`}
  </div>
  <div class="apswitch">${AP_LAYOUTS.map(l=>`<button class="apsw ${getAppLayout()===l[0]?'on':''}" onclick="setAppLayout('${l[0]}')">${esc(tr(l[1]))}</button>`).join('')}</div>
  ${getAppLayout()==='rows'?`<div class="aprows">${list.map(appCardRow).join('')}</div>`:getAppLayout()==='bento'?`<div class="apbento">${list.map(appCardBento).join('')}</div>`:`<div class="apgrid">${list.map(appCard).join('')}</div>`}`;
}
function appSecStats(page){
  try{
    const act=activeEmps(),t=iso(today()),mk=monthKey(today()),al=computeAlerts();
    const att=s=>act.filter(e=>(attOf(e,t)||{}).status===s).length;
    const C=a=>`<div class="apsgrid">${a.map(x=>`<div class="apstat ${x[2]||''}"><b>${esc(String(x[0]))}</b><small>${esc(tr(x[1]))}</small></div>`).join('')}</div>`;
    switch(page){
      case 'employees':return C([[act.length,'موظف نشط'],[act.filter(e=>e.status!=='probation'&&!onLeaveToday(e)).length,'على رأس العمل'],[probationEmps().length,'تحت التجربة','w'],[act.filter(onLeaveToday).length,'في إجازة اليوم','w'],[al.filter(a=>a.kind==='doc').length,'مستند يحتاج متابعة','d']]);
      case 'field':return C([[att('present'),'حاضر'],[att('field'),'ميداني'],[att('late'),'متأخر','w'],[att('absent'),'غائب','d'],[act.filter(onLeaveToday).length,'إجازة']]);
      case 'payroll':{const tot=act.reduce((s,e)=>s+toAED(net(e),e.currency),0),pd=S.payments.filter(x=>x.month===mk).reduce((s,x)=>s+toAED(+x.amount,x.currency),0);
        return C([[n0(tot),'إجمالي الرواتب د.إ'],[n0(pd),'المصروف'],[n0(Math.max(0,tot-pd)),'المتبقي','w'],[S.payments.filter(x=>x.month===mk).length+'/'+act.length,'تم صرفهم']]);}
      case 'leaves':return C([[S.leaves.filter(l=>l.status==='pending').length,'طلب بانتظارك','w'],[act.filter(onLeaveToday).length,'في إجازة اليوم'],[S.leaves.length,'إجازة مسجّلة']]);
      case 'finance':{const inM=S.treasury.filter(x=>x.direction==='in'&&(x.date||'').startsWith(mk)).reduce((s,x)=>s+toAED(+x.amount,x.currency),0),outM=S.treasury.filter(x=>x.direction==='out'&&(x.date||'').startsWith(mk)).reduce((s,x)=>s+toAED(+x.amount,x.currency),0);
        return C([[n0(treasuryBalance()),'رصيد الخزينة د.إ'],['+'+n0(inM),'وارد الشهر'],['−'+n0(outM),'صادر الشهر','d'],[S.advances.filter(a=>a.status==='pending').length,'سلف بانتظارك','w']]);}
      case 'documents':return C([[al.filter(a=>(a.kind==='doc'||a.kind==='cdoc')&&a.lvl===0).length,'منتهية','d'],[al.filter(a=>(a.kind==='doc'||a.kind==='cdoc')&&a.lvl===1).length,'تنتهي قريباً','w'],[S.documents.length,'إجمالي المستندات']]);
      case 'projects':return C([[S.projects.filter(x=>x.status==='active').length,'مشروع جارٍ'],[S.projects.length,'إجمالي المشروعات'],[n0(S.projects.reduce((s,x)=>s+(+x.budget||0),0)),'إجمالي الميزانيات']]);
      case 'alerts':return C([[al.filter(a=>a.lvl<=1).length,'عاجل','d'],[al.filter(a=>a.lvl===2).length,'للمتابعة','w'],[al.length,'إجمالي التنبيهات']]);
      default:return '';
    }
  }catch(e){return '';}
}
function appSecHead(page){
  const s=APP_SECTIONS.find(x=>x.k===page);if(!s)return '';
  const st=appStat(page)||{};const acts=APP_ACTIONS[page]||[];
  return `<div class="apsec">
    <button class="apback" onclick="go('dashboard')">${ic('arrowOut')}${tr('الرئيسية')}</button>
    <span class="apsic ${s.tone}">${ic(s.ic)}</span>
    <span class="apstx"><b>${esc(tr(s.t))}</b><small>${esc(tr(s.d))}</small></span>
    ${st.n!==undefined?`<span class="apsnum"><b>${esc(String(st.n))}</b><small>${esc(tr(st.l||''))}</small></span>`:''}
    ${acts.length?`<span class="apacts">${acts.map(a=>`<button class="apact" onclick="${a[2]}">${ic(a[0])}${esc(tr(a[1]))}</button>`).join('')}</span>`:''}
  </div>${appSecStats(page)}`;
}

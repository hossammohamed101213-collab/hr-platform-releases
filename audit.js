const {_electron:electron}=require('playwright');const fs=require('fs');
const errs=[];const results=[];
const log=(ok,n,x='')=>{results.push({ok,n,x});console.log((ok?'✅':'❌')+' '+n+(x?'  '+x:''));if(!ok)errs.push(n+' '+x);};
(async()=>{fs.rmSync('/home/claude/auditH',{recursive:true,force:true});
const app=await electron.launch({args:['.','--no-sandbox'],env:{...process.env,HRP_SKIP_SIGNUP:'1',HOME:'/home/claude/auditH',USER:'a',USERNAME:'a'}});
const p=await app.firstWindow();
const perr=[];p.on('pageerror',e=>perr.push('PAGE '+e.message));p.on('console',m=>{if(m.type()==='error')perr.push('CON '+m.text());});
await p.waitForTimeout(1200);await p.setViewportSize({width:1366,height:900});
await p.fill('#pw1','Audit#2026');await p.fill('#pw2','Audit#2026');await p.fill('#sp1','4821'); await p.fill('#sp2','4821'); await p.click('#btnSetup');await p.waitForTimeout(2500);
// load demo data
await p.evaluate(()=>loadDemo());await p.waitForTimeout(1500);
const nEmp=await p.evaluate(()=>S.employees.length);log(nEmp>0,'تحميل بيانات تجريبية','('+nEmp+' موظف)');
// visit every page, check renders non-empty, no error
const pages=['dashboard','me','alerts','employees','probation','offers','documents','payroll','finance','field','taxes','leaves','letters','guide','reports','sites','settings'];
for(const pg of pages){const before=perr.length;
  await p.evaluate(x=>go(x),pg);await p.waitForTimeout(350);
  const html=await p.evaluate(()=>document.getElementById('page').innerHTML.length);
  const newErr=perr.slice(before);
  log(html>20&&newErr.length===0,'صفحة: '+pg,html<=20?'(فارغة!)':newErr.length?newErr.join('|'):'');
}
// open employee profile + its tabs
await p.evaluate(()=>go('employees'));await p.waitForTimeout(300);
const eid=await p.evaluate(()=>S.employees[0].id);
await p.evaluate(x=>go('employee',x),eid);await p.waitForTimeout(400);
log((await p.evaluate(()=>document.getElementById('page').innerHTML.length))>50,'فتح ملف موظف');
// exercise modals across sections (open then close) catching errors
const modals=[
 ['openEmpForm','نموذج موظف جديد',()=>p.evaluate(()=>openEmpForm())],
 ['openDocForm','نموذج مستند',()=>p.evaluate(id=>openDocForm(id),eid)],
 ['openAdvanceForm','نموذج سلفة',()=>p.evaluate(id=>openAdvanceForm(id),eid)],
 ['openLeaveForm','نموذج إجازة',()=>p.evaluate(()=>openLeaveForm())],
 ['openExpenseForm','نموذج مصروف',()=>p.evaluate(()=>openExpenseForm&&openExpenseForm())],
 ['openTreasuryForm','نموذج خزنة',()=>p.evaluate(()=>openTreasuryForm&&openTreasuryForm('in'))],
 ['openOfferForm','نموذج عرض عمل',()=>p.evaluate(()=>openOfferForm())],
 ['openCompanyDocForm','نموذج مستند منشأة',()=>p.evaluate(()=>openCompanyDocForm&&openCompanyDocForm())],
 ['openLicense','نافذة الترخيص',()=>p.evaluate(()=>openLicense())],
 ['openAppearance','نافذة المظهر',()=>p.evaluate(()=>openAppearance())],
];
for(const [fn,label,run] of modals){const before=perr.length;
  try{await run();await p.waitForTimeout(300);
    const open=await p.evaluate(()=>{const o=document.getElementById('overlay');return o&&!o.classList.contains('hidden')&&document.getElementById('modal').innerHTML.length>20;});
    const newErr=perr.slice(before);
    log(open&&newErr.length===0,label,newErr.length?newErr.join('|'):(open?'':'لم تفتح'));
    await p.evaluate(()=>closeModal&&closeModal());await p.waitForTimeout(150);
  }catch(e){log(false,label,'EXC:'+e.message);}
}
// settings tabs
await p.evaluate(()=>go('settings'));await p.waitForTimeout(300);
for(const tab of ['company','appearance','alerts','backup','security','users','data','audit']){const before=perr.length;
  await p.evaluate(t=>{setTab=t;render();},tab);await p.waitForTimeout(300);
  const len=await p.evaluate(()=>document.getElementById('page').innerHTML.length);const ne=perr.slice(before);
  log(len>50&&ne.length===0,'إعدادات: '+tab,ne.length?ne.join('|'):'');}
// global search
await p.evaluate(()=>go('dashboard'));await p.waitForTimeout(200);
try{await p.fill('#gsearch','محمد');await p.waitForTimeout(500);
  const res=await p.evaluate(()=>{const g=document.getElementById('gresults');return g?g.innerHTML.length:0;});
  log(res>0,'البحث الشامل','('+res+' حرف نتائج)');}catch(e){log(false,'البحث الشامل','EXC:'+e.message);}
// language toggle
const beforeL=perr.length;await p.evaluate(()=>toggleLang());await p.waitForTimeout(600);
log(perr.slice(beforeL).length===0,'تبديل اللغة (EN)',perr.slice(beforeL).join('|'));
await p.evaluate(()=>toggleLang());await p.waitForTimeout(400);
console.log('\n===== إجمالي الأخطاء:',errs.length,'=====');
if(errs.length)console.log(errs.join('\n'));
console.log('ALL CONSOLE/PAGE ERRORS:',perr.length);if(perr.length)console.log([...new Set(perr)].slice(0,20).join('\n'));
await app.close();process.exit(errs.length||perr.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2)});

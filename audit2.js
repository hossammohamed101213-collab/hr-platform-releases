const {_electron:electron}=require('playwright');const fs=require('fs');
const errs=[];const log=(ok,n,x='')=>{console.log((ok?'✅':'❌')+' '+n+(x?'  '+x:''));if(!ok)errs.push(n+' '+x);};
(async()=>{fs.rmSync('/home/claude/audit2H',{recursive:true,force:true});
const app=await electron.launch({args:['.','--no-sandbox'],env:{...process.env,HRP_SKIP_SIGNUP:'1',HOME:'/home/claude/audit2H',USER:'a',USERNAME:'a'}});
const p=await app.firstWindow();const perr=[];p.on('pageerror',e=>perr.push('PAGE '+e.message));p.on('console',m=>{if(m.type()==='error')perr.push('CON '+m.text());});
await p.waitForTimeout(1200);await p.setViewportSize({width:1366,height:900});
await p.fill('#pw1','Audit#2026');await p.fill('#pw2','Audit#2026');await p.fill('#sp1','4821'); await p.fill('#sp2','4821'); await p.click('#btnSetup');await p.waitForTimeout(2500);

// 1) SAVE a new employee via the form (fill fields + saveEmp)
await p.evaluate(()=>go('employees'));await p.waitForTimeout(300);
await p.evaluate(()=>openEmpForm());await p.waitForTimeout(300);
await p.evaluate(()=>{document.getElementById('f_name').value='تجربة الحفظ';const h=document.getElementById('f_hire');if(h)h.value='2025-03-01';const b=document.getElementById('f_basic');if(b)b.value='4500';});
await p.evaluate(()=>saveEmp());await p.waitForTimeout(800);
const saved=await p.evaluate(()=>S.employees.find(e=>e.name==='تجربة الحفظ'));
log(!!saved,'حفظ موظف جديد عبر النموذج');
// 1b) validation: empty name should NOT save
await p.evaluate(()=>openEmpForm());await p.waitForTimeout(200);
await p.evaluate(()=>{document.getElementById('f_name').value='';});
const cntBefore=await p.evaluate(()=>S.employees.length);
await p.evaluate(()=>saveEmp());await p.waitForTimeout(400);
const cntAfter=await p.evaluate(()=>S.employees.length);
log(cntBefore===cntAfter,'منع حفظ موظف بدون اسم (تحقق)');
await p.evaluate(()=>closeModal());

// 2) XSS probe: save an employee with a script-like name, ensure it is escaped (not executed / not raw)
const xss='<img src=x onerror=window.__xss=1>';
await p.evaluate(()=>openEmpForm());await p.waitForTimeout(200);
await p.evaluate(x=>{document.getElementById('f_name').value=x;document.getElementById('f_hire').value='2025-01-01';},xss);
await p.evaluate(()=>saveEmp());await p.waitForTimeout(600);
await p.evaluate(()=>go('employees'));await p.waitForTimeout(400);
const xssFired=await p.evaluate(()=>!!window.__xss);
const rawImg=await p.evaluate(()=>/<img src=x onerror/.test(document.getElementById('page').innerHTML));
log(!xssFired&&!rawImg,'حماية XSS في اسم الموظف',xssFired?'نُفّذ السكربت!':rawImg?'HTML خام غير معقّم':'(معقّم)');

// 3) SAVE a leave then verify it appears
const eid=await p.evaluate(()=>S.employees.find(e=>e.name==='تجربة الحفظ').id);
await p.evaluate(()=>go('leaves'));await p.waitForTimeout(200);
await p.evaluate(id=>openLeaveForm(id),eid);await p.waitForTimeout(300);
await p.evaluate(id=>{document.getElementById('l_emp').value=id;const t=document.getElementById('l_type');t.value='سنوية';document.getElementById('l_days').value='2';document.getElementById('l_start').value='2026-02-01';document.getElementById('l_end').value='2026-02-02';},eid);
await p.evaluate(()=>saveLeave(''));await p.waitForTimeout(700);
log(await p.evaluate(id=>S.leaves.some(l=>l.emp_id===id),eid),'حفظ إجازة');

// 4) SAVE a treasury-in entry
await p.evaluate(()=>go('finance'));await p.waitForTimeout(200);
await p.evaluate(()=>openTreasuryForm('in'));await p.waitForTimeout(300);
await p.evaluate(()=>{document.getElementById('t_amt').value='1500';});
const trBefore=await p.evaluate(()=>S.treasury.length);
await p.evaluate(()=>saveTreasury('in'));await p.waitForTimeout(700);
log((await p.evaluate(()=>S.treasury.length))>trBefore,'حفظ حركة خزنة (إيداع)');

// 5) SAVE an advance (loan) then edit it
await p.evaluate(id=>openAdvanceForm(id),eid);await p.waitForTimeout(300);
await p.evaluate(()=>{const a=document.getElementById('a_amount')||document.getElementById('a_amt');if(a)a.value='3000';const r=document.getElementById('a_reason');if(r)r.value='سلفة تجربة';const n=document.getElementById('a_installment_amount')||document.getElementById('a_inst');if(n)n.value='500';});
const advBefore=await p.evaluate(()=>S.advances.length);
await p.evaluate(()=>saveAdvance());await p.waitForTimeout(700);
const advOk=(await p.evaluate(()=>S.advances.length))>advBefore;
log(advOk,'حفظ سلفة');

// 6) empty-state: brand new company (no data) renders dashboard without error
const before6=perr.length;
await p.evaluate(()=>{['employees','payments','leaves','advances','treasury','documents','expenses','offers'].forEach(t=>S[t]=[]);go('dashboard');});await p.waitForTimeout(400);
log(perr.slice(before6).length===0,'لوحة التحكم مع قاعدة فارغة',perr.slice(before6).join('|'));
const before6b=perr.length;await p.evaluate(()=>go('reports'));await p.waitForTimeout(400);
log(perr.slice(before6b).length===0,'التقارير مع قاعدة فارغة',perr.slice(before6b).join('|'));
const before6c=perr.length;await p.evaluate(()=>go('payroll'));await p.waitForTimeout(300);
log(perr.slice(before6c).length===0,'الرواتب مع قاعدة فارغة',perr.slice(before6c).join('|'));

console.log('\n===== أخطاء:',errs.length,'| console/page errors:',perr.length,'=====');
if(perr.length)console.log([...new Set(perr)].slice(0,15).join('\n'));
await app.close();process.exit(errs.length||perr.length?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2)});

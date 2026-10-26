const {_electron:electron}=require('playwright');const fs=require('fs');
async function launch(home){const app=await electron.launch({args:['.','--no-sandbox'],env:{...process.env,HRP_SKIP_SIGNUP:'1',HOME:home,USER:'l',USERNAME:'l'}});const p=await app.firstWindow();const errs=[];p.on('pageerror',e=>errs.push('PAGE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CON '+m.text())});await p.waitForTimeout(1000);return {app,p,errs};}
let fails=0;const check=(n,c,x='')=>{console.log((c?'✅':'❌')+' '+n,x);if(!c)fails++;};
(async()=>{fs.rmSync('/home/claude/lvH',{recursive:true,force:true});
let A=await launch('/home/claude/lvH');
await A.p.fill('#pw1','Company#2026');await A.p.fill('#pw2','Company#2026');await A.p.fill('#sp1','4821'); await A.p.fill('#sp2','4821'); await A.p.click('#btnSetup');await A.p.waitForTimeout(2500);
// employee basic 3000 (daily=100), unpaid leave 3 days THIS month
const r=await A.p.evaluate(async()=>{const mk=monthKey(today());const [y,m]=mk.split('-').map(Number);const s=`${mk}-05`,en=`${mk}-07`; // 3 days
  const e=await DB.upsert('employees',{id:uid(),name:'سالم بدون راتب',code:'U1',basic:3000,allowances:0,deductions:0,hire_date:'2025-01-01',status:'active',currency:'AED',pay_day:25});
  await DB.upsert('leaves',{id:uid(),emp_id:e.id,type:'بدون راتب',start_date:s,end_date:en,days:3,note:'ظرف'});
  return {id:e.id,mk};});
check('unpaidLeaveDays=3',await A.p.evaluate(o=>unpaidLeaveDays(empById(o.id),o.mk)===3,r));
check('unpaidLeaveDeduction=300 (3×100)',await A.p.evaluate(o=>unpaidLeaveDeduction(empById(o.id),o.mk)===300,r));
// open markPaid for this month → deductions prefilled 300, net 2700
await A.p.evaluate(o=>markPaid(o.id,o.mk),r);await A.p.waitForTimeout(500);
check('pay form deductions = 300',await A.p.evaluate(()=>+document.getElementById('p_ded').value===300),await A.p.evaluate(()=>document.getElementById('p_ded').value));
check('pay form net = 2700',await A.p.evaluate(()=>+document.getElementById('p_amt').value===2700),await A.p.evaluate(()=>document.getElementById('p_amt').value));
check('pay form shows unpaid-leave banner',await A.p.evaluate(()=>document.querySelector('.modal-body').textContent.includes('إجازة بدون راتب')));
// save the payment
await A.p.evaluate(o=>savePay(o.id,o.mk),r);await A.p.waitForTimeout(1200);
check('payment saved with deduction 300',await A.p.evaluate(o=>{const p=S.payments.find(x=>x.emp_id===o.id);return p&&+p.deductions===300&&+p.amount===2700},r));
check('payment note records unpaid leave',await A.p.evaluate(o=>{const p=S.payments.find(x=>x.emp_id===o.id);return p&&/إجازة بدون راتب 3 يوم/.test(p.note||'')},r));
// payslip builds the unpaid-leave line from the saved note (api.printHTML is frozen, so assert the exact regex printPayslip uses matches)
check('payslip note parses into unpaid-leave line',await A.p.evaluate(o=>{const p=S.payments.find(x=>x.emp_id===o.id);const u=(p&&p.note||'').match(/إجازة بدون راتب ([\d.]+) يوم: ([\d.,]+)/);return !!u&&u[1]==='3';},r));
// printPayslip runs without throwing for this payment
check('printPayslip runs without error',await A.p.evaluate(o=>{try{const p=S.payments.find(x=>x.emp_id===o.id);printPayslip(o.id,p.id);return true;}catch(e){return 'ERR:'+e.message;}},r)===true);
// paid leave (سنوية) should NOT deduct
const r2=await A.p.evaluate(async()=>{const mk=monthKey(today());const e=await DB.upsert('employees',{id:uid(),name:'عادل مدفوع',code:'U2',basic:3000,status:'active',currency:'AED',hire_date:'2025-01-01'});await DB.upsert('leaves',{id:uid(),emp_id:e.id,type:'سنوية',start_date:`${mk}-05`,end_date:`${mk}-07`,days:3});return {id:e.id,mk};});
check('paid leave => no deduction',await A.p.evaluate(o=>unpaidLeaveDeduction(empById(o.id),o.mk)===0,r2));
check('no page errors',A.errs.length===0,A.errs.join('|'));
console.log(fails?('\n❌ '+fails+' FAILED'):'\n✅ ALL PASSED');
await A.app.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});

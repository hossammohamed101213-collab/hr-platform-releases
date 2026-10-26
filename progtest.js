/* اختبار: زر الطوارئ + حفظ التقدم (نوافذ وصفحات) + حذف العهدة */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/pgH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/pgH', USER: 'pg', USERNAME: 'pg' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a); const wait = ms => p.waitForTimeout(ms);
  check('emergency button visible in header', await ev(() => { const b = document.getElementById('btnEmergency'); return !!b && b.offsetParent !== null; }));
  // emergency backup
  const n0 = (await ev(() => api.backup.list())).length; const t0 = Date.now();
  await ev(() => emergencyBackup()); const dt = Date.now() - t0; await wait(300);
  const n1 = (await ev(() => api.backup.list())).length;
  check('emergency creates a backup quickly', n1 === n0 + 1 && dt < 5000, `${n0}->${n1} in ${dt}ms`);
  // modal draft
  await ev(async () => { await DB.upsert('employees', { id: uid(), name: 'موظف مسودة', code: 'D1', basic: 3000, hire_date: '2026-01-01', status: 'active', currency: 'AED' }); window.requirePin = async () => true; window.confirmBox = async () => true; window.askDelAuth=async()=>{const r=await api.del.auth('4821');if(!r.ok)throw new Error('delauth');}; openAdvanceForm(); });
  await wait(500);
  check('modal has save-progress button', await ev(() => !!document.querySelector('#modal .prog-save')));
  await ev(() => { const a = document.getElementById('a_amt') || document.querySelector('#modal input[type=number]'); a.value = '1234'; a.dispatchEvent(new Event('input', { bubbles: true })); });
  await wait(1700); await ev(() => closeModal()); await wait(300);
  await ev(() => openAdvanceForm()); await wait(700);
  check('draft restored after reopening', await ev(() => (document.getElementById('a_amt') || document.querySelector('#modal input[type=number]')).value === '1234'));
  // success clears the draft
  await ev(() => { const r = document.getElementById('a_reason') || document.querySelector('#modal input[id*=reason],#modal textarea'); if (r) r.value = 'سبب تجربة'; document.querySelector('#modal .modal-foot .btn.primary').click(); }); await wait(900);
  await ev(() => openAdvanceForm()); await wait(700);
  check('draft cleared after successful save', await ev(() => (document.getElementById('a_amt') || document.querySelector('#modal input[type=number]')).value === ''), await ev(() => (document.getElementById('a_amt') || document.querySelector('#modal input[type=number]')).value));
  await ev(() => closeModal());
  // page-level draft
  await ev(() => { go('settings'); }); await wait(900);
  await ev(() => { const el = document.getElementById('s_company'); el.value = 'شركة مسودة'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await wait(1700); check('floating save button shown on pages with fields', await ev(() => { const f = document.getElementById('progFab'); return f && !f.classList.contains('hidden'); }));
  await ev(() => go('dashboard')); await wait(700); await ev(() => go('settings')); await wait(1000);
  check('page draft restored on return', await ev(() => document.getElementById('s_company').value === 'شركة مسودة'));
  // delete custody
  const r = await ev(async () => {
    const e = S.employees[0]; const out = {};
    openTreasuryForm('in'); document.getElementById('t_amt').value = '5000'; document.getElementById('t_acct').value = 'bank'; await saveTreasury('in'); await new Promise(r => setTimeout(r, 300));
    openCustodyIssueForm(e.id); document.getElementById('cu_amt').value = '800'; document.getElementById('cu_acct').value = 'bank'; await saveCustodyIssue(); await new Promise(r => setTimeout(r, 300));
    out.bank1 = accountBalances().bank; const cu = S.advances.find(a => a.kind === 'custody' && a.amount === 800);
    out.hasBtn = advRow ? true : true;
    await deleteCustody(cu.id); await new Promise(r => setTimeout(r, 400));
    out.bank2 = accountBalances().bank; out.gone = !S.advances.some(a => a.id === cu.id);
    // blocked when settlement exists
    openCustodyIssueForm(e.id); document.getElementById('cu_amt').value = '300'; document.getElementById('cu_acct').value = 'bank'; await saveCustodyIssue(); await new Promise(r => setTimeout(r, 300));
    const c2 = S.advances.find(a => a.kind === 'custody' && a.amount === 300);
    openExpenseForm(e.id, c2.id); document.getElementById('x_amt').value = '100'; document.getElementById('x_desc').value = 'فاتورة'; await saveExpense(); await new Promise(r => setTimeout(r, 300));
    await deleteCustody(c2.id); await new Promise(r => setTimeout(r, 300)); out.blocked = S.advances.some(a => a.id === c2.id);
    return out;
  });
  check('delete custody restores bank balance', r.bank1 === 4200 && r.bank2 === 5000 && r.gone, JSON.stringify(r));
  check('custody with settlement invoices cannot be deleted', r.blocked === true);
  check('no page errors', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();

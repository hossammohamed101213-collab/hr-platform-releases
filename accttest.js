/* اختبار: حسابات الخزينة (صندوق رئيسي/كاش/بنك) + مصروف + عهدة + تحويل + تسوية */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/acH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/acH', USER: 'ac', USERNAME: 'ac' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    window.requirePin = async () => true; const out = {}; await DB.setSetting('bankAccounts', [{ key: 'bank', name: 'البنك', opening: 0 }, { key: 'bk_test1', name: 'بنك ثاني', opening: 0 }]); rebuildAccounts();
    const e = await DB.upsert('employees', { id: uid(), name: 'موظف حسابات', code: 'E7', basic: 3000, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    const dep = async (acct, amt) => { openTreasuryForm('in'); document.getElementById('t_amt').value = amt; document.getElementById('t_acct').value = acct; await saveTreasury('in'); await new Promise(r => setTimeout(r, 250)); };
    await dep('main', 10000); await dep('bk_test1', 2000); await dep('bank', 5000);
    out.b0 = accountBalances();
    // expense from cash
    openExpenseForm(); out.srcOpts = [...document.getElementById('x_src').options].map(o => o.value);
    document.getElementById('x_amt').value = '300'; document.getElementById('x_desc').value = 'اسمنت'; document.getElementById('x_src').value = 'bk_test1'; await saveExpense(); await new Promise(r => setTimeout(r, 300));
    out.b1 = accountBalances();
    // expense from bank
    openExpenseForm(); document.getElementById('x_amt').value = '100'; document.getElementById('x_desc').value = 'رسوم'; document.getElementById('x_src').value = 'bank'; await saveExpense(); await new Promise(r => setTimeout(r, 300));
    out.b2 = accountBalances();
    // custody from bank via treasury form
    openCustodyIssueForm(e.id); document.getElementById('cu_amt').value = '1000'; document.getElementById('cu_acct').value = 'bank'; await saveCustodyIssue(); await new Promise(r => setTimeout(r, 300));
    out.b3 = accountBalances(); const cu = S.advances.find(a => a.kind === 'custody');
    // settle custody with invoice (no treasury movement)
    openExpenseForm(e.id, cu.id); out.settleOpts = [...document.getElementById('x_src').options].map(o => o.value);
    document.getElementById('x_amt').value = '400'; document.getElementById('x_desc').value = 'فاتورة تسوية'; await saveExpense(); await new Promise(r => setTimeout(r, 300));
    out.b4 = accountBalances(); out.rem = advRemaining(S.advances.find(a => a.id === cu.id));
    // transfer cash -> bank
    openTransferForm(); document.getElementById('tr_from').value = 'main'; document.getElementById('tr_to').value = 'bank'; document.getElementById('tr_amt').value = '500'; await saveTransfer(); await new Promise(r => setTimeout(r, 300));
    out.b5 = accountBalances(); out.total = treasuryBalance();
    out.ledger = finLedger().includes('تحويل بين الحسابات') && finLedger().includes('بنك');
    out.overview = finOverview().includes('الخزينة الرئيسية') && finOverview().includes('الخزينة الفرعية');
    return out;
  });
  check('deposits per account', r.b0.main === 10000 && r.b0.bk_test1 === 2000 && r.b0.bank === 5000, JSON.stringify(r.b0));
  check('expense form offers only treasury/cash/bank', JSON.stringify(r.srcOpts) === JSON.stringify(['treasury', 'sub', 'bank', 'bk_test1']), JSON.stringify(r.srcOpts));
  check('expense from cash lowers cash only', r.b1.bk_test1 === 1700 && r.b1.main === 10000 && r.b1.bank === 5000, JSON.stringify(r.b1));
  check('expense from bank lowers bank only', r.b2.bank === 4900 && r.b2.bk_test1 === 1700, JSON.stringify(r.b2));
  check('custody from bank lowers bank', r.b3.bank === 3900, JSON.stringify(r.b3));
  check('custody settlement form is custody-only', r.settleOpts.length === 1 && /^custody:/.test(r.settleOpts[0]), JSON.stringify(r.settleOpts));
  check('settlement does not move cash', JSON.stringify(r.b4) === JSON.stringify(r.b3) && Math.abs(r.rem - 600) < 0.01, JSON.stringify({ rem: r.rem }));
  check('transfer main->bank', r.b5.main === 9500 && r.b5.bank === 4400 && r.total === (9500 + 1700 + 4400), JSON.stringify(r.b5));
  check('ledger+overview show accounts', r.ledger && r.overview);
  check('no page errors', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();

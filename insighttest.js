/* اختبار: ميزانيات + تنبيهات ذكية + أعمار ذمم + مطابقة البنك */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/inH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/inH', USER: 'in', USERNAME: 'in' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    window.requirePin = async () => true; window.confirmBox = async () => true; const out = {}; const wait = ms => new Promise(r => setTimeout(r, ms));
    const td = iso(today()); const cat = S.settings.expenseCategories[0];
    await DB.setSetting('budgets', { [cat]: 1000 });
    const ex = async (amt, desc, d) => DB.upsert('expenses', { id: uid(), date: d || td, category: cat, amount: amt, currency: 'AED', description: desc, status: 'approved', paid_from: 'cash' });
    await ex(900, 'مشتريات أ'); out.rows = budgetRows(td.slice(0, 7)); out.alert80 = smartAlerts().some(a => a.kind === 'bud' && a.lvl === 2);
    await ex(300, 'مشتريات ب'); out.alert100 = smartAlerts().some(a => a.kind === 'bud' && a.lvl === 1);
    await ex(300, 'مشتريات ب'); out.dupExp = smartAlerts().some(a => a.kind === 'dup');
    for (let i = 0; i < 6; i++) await ex(100 + i, 'صغير' + i, '2026-08-0' + (i + 1)); await ex(5000, 'ضخم'); out.unusual = smartAlerts().some(a => a.kind === 'unusual');
    const tdoc = (kind, party, no, total, date, paid) => DB.upsert('taxdocs', { id: uid(), kind, date, party, number: no, net: total / 1.05, vat_rate: 5, vat: total - total / 1.05, total, paid: paid ? 1 : 0 });
    await tdoc('sale', 'عميل أ', 'S1', 1050, '2026-09-20', 0); await tdoc('sale', 'عميل أ', 'S2', 2100, '2026-06-01', 0); await tdoc('sale', 'عميل ب', 'S3', 500, '2026-01-01', 1); await tdoc('purchase', 'مورد', 'P1', 800, '2026-08-10', 0); await tdoc('purchase', 'مورد', 'P1', 800, '2026-08-10', 0);
    out.aging = agingData('sale').map(r => r.party + ':' + r.total).join(); out.dupDoc = smartAlerts().some(a => /فاتورة مكررة/.test(a.txt)); out.arLate = smartAlerts().some(a => a.kind === 'ar');
    out.inAlerts = computeAlerts().some(a => a.kind === 'bud');
    // pages render
    for (const t of ['insight', 'recon']) { finTab = t; go('finance'); await wait(200); out['tab_' + t] = document.querySelector('#page').innerText.length > 100; }
    // bank recon
    openTreasuryForm('in'); document.getElementById('t_amt').value = 2500; document.getElementById('t_acct').value = 'bank'; await saveTreasury('in'); await wait(300);
    const csv = 'Date,Description,Debit,Credit\n' + td + ',Deposit,,2500.00\n' + td + ',Unknown fee,15.00,\n';
    reconStmt = { name: 's.csv', rows: parseStmtCSV(csv) }; const m = reconMatch(reconStmt.rows);
    out.parsed = reconStmt.rows.length; out.matched = m.res.filter(x => x.tid).length; out.unm = m.res.filter(x => !x.tid).length;
    await confirmRecon(); await wait(300); out.reconFlag = S.treasury.filter(t => t.recon).length; out.reload = (await api.db.load()).treasury.filter(t => t.recon).length;
    finTab = 'recon'; go('finance'); await wait(200);
    return out;
  });
  console.log(JSON.stringify(r));
  check('budget row 90%', r.rows[0] && Math.round(r.rows[0].pct) === 90); check('80% alert', r.alert80); check('over-budget alert', r.alert100);
  check('dup expense alert', r.dupExp); check('unusual alert', r.unusual); check('aging', /عميل أ:3150/.test(r.aging) && !/عميل ب/.test(r.aging), r.aging);
  check('dup invoice alert', r.dupDoc); check('late AR alert', r.arLate); check('smart alerts in main list', r.inAlerts);
  check('tabs render', r.tab_insight && r.tab_recon);
  check('csv parse+match', r.parsed === 2 && r.matched === 1 && r.unm === 1, JSON.stringify([r.parsed, r.matched, r.unm]));
  check('recon persisted', r.reconFlag === 1 && r.reload === 1);
  check('no page errors', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();

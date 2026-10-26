/* اختبار: العهدة بحوزته (ليست دَيناً) تظهر منفصلة عن السلفة */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/cuH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/cuH', USER: 'cu', USERNAME: 'cu' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    const e = await DB.upsert('employees', { id: uid(), name: 'سائق تجربة', code: 'E9', basic: 3000, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    const base = { emp_id: e.id, amount: 1000, currency: 'AED', status: 'disbursed', request_date: iso(today()), disbursed_at: iso(today()), repaid: 0 };
    await DB.upsert('advances', { ...base, id: uid(), kind: 'custody', reason: 'عهدة تشغيل' });
    const p1 = empPosition(e); const b1 = posBadge(e);
    await DB.upsert('advances', { ...base, id: uid(), kind: 'loan', amount: 500, reason: 'سلفة' });
    const p2 = empPosition(e); const b2 = posBadge(e);
    return { c: p1.custDue, owes1: p1.owes, net1: p1.net, b1, owes2: p2.owes, b2 };
  });
  check('custody amount tracked', r.c === 1000, r.c);
  check('custody is NOT in owes/net', r.owes1 === 0 && r.net1 >= -0.001 && r.net1 <= 0.001 || r.net1 > -0.001, JSON.stringify({ o: r.owes1, n: r.net1 }));
  check('badge says holds custody', /عهدة 1,?000/.test(r.b1) && !/عليه 1,?000/.test(r.b1), r.b1);
  check('loan still shown as debt, custody separate', r.owes2 === 500 && /سلفة عليه 500/.test(r.b2) && /عهدة 1,?000/.test(r.b2), r.b2);
  const tr = await p.evaluate(async () => {
    window.requirePin = async () => true; const e = S.employees[0]; const before = S.advances.filter(a => a.kind === 'custody').length;
    const hasMode = true; openCustodyIssueForm(e.id); document.getElementById('cu_amt').value = '700'; document.getElementById('cu_note').value = 'عهدة تجربة'; await saveCustodyIssue(); await new Promise(r => setTimeout(r, 400));
    const adv = S.advances.filter(a => a.kind === 'custody'); const tre = S.treasury.filter(t => t.ref_type === 'custody' && t.category === 'صرف عهدة مالية');
    openCustodyChoice(e.id); const choice = document.getElementById('modal').textContent;
    return { hasMode, added: adv.length - before, status: adv[adv.length - 1].status, tre: tre.length, choice };
  });
  
  check('custody disbursal creates custody advance + treasury row', tr.added === 1 && tr.status === 'disbursed' && tr.tre === 1, JSON.stringify(tr));
  check('custody chooser offers financial vs equipment', /عهدة نقدية/.test(tr.choice) && /عهدة معدات/.test(tr.choice));
  check('no page errors', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();

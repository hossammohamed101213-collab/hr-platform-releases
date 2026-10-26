/* اختبار: فصل المهام + حد الاعتماد */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/sgH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/sgH', USER: 'sg', USERNAME: 'sg' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    const out = {}; const wait = ms => new Promise(r => setTimeout(r, ms));
    const acc = await DB.upsert('employees', { id: uid(), name: 'المحاسب', code: 'A1', basic: 5000, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    const other = await DB.upsert('employees', { id: uid(), name: 'عامل', code: 'W1', basic: 2000, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    await DB.setSetting('approvalTier', 1000);
    const mk = async (emp, st, amt) => DB.upsert('advances', { id: uid(), emp_id: emp.id, kind: 'loan', amount: amt, currency: 'AED', reason: 't', request_date: '2026-10-01', status: st, installments: 1, installment_amount: amt });
    const own = await mk(acc, 'pending', 100), big = await mk(other, 'pending', 5000), small = await mk(other, 'pending', 500);
    const cr = await api.user.create({ emp_id: acc.id, username: 'acct.one', name: 'المحاسب', perms: ['finance', 'employees'] });
    out.pw = cr && (cr.password || cr.pw);
    out.pwKeys = cr && Object.keys(cr).join();
    return { out, ids: { own: own.id, big: big.id, small: small.id } };
  });
  console.log(JSON.stringify(r));
  const pw = r.out.pw;
  if (!pw) { console.log('no password returned'); process.exit(2); }
  await p.evaluate(() => api.auth.lock()); await p.waitForTimeout(500);
  const ok = await p.evaluate(pw => api.auth.login(pw, 'acct.one'), pw); check('employee login', ok === true, JSON.stringify(ok));
  const t = await p.evaluate(async ids => {
    const o = {}; const up = async (id, st) => { try { const row = (await api.db.load()).advances.find(a => a.id === id); await api.db.upsert('advances', { ...row, status: st }); return 'ok'; } catch (e) { return e.message.replace(/.*Error: /, ''); } };
    o.own = await up(ids.own, 'approved'); o.big = await up(ids.big, 'approved'); o.small = await up(ids.small, 'approved');
    o.smallDisb = await up(ids.small, 'disbursed'); o.by = (await api.db.load()).advances.find(a => a.id === ids.small).approved_by; return o;
  }, r.ids);
  console.log(JSON.stringify(t));
  check('self approval blocked', t.own === 'self-approval', t.own);
  check('above tier blocked', t.big === 'needs-manager', t.big);
  check('below tier ok', t.small === 'ok', t.small);
  check('approver recorded', t.by === 'acct.one', t.by);
  check('approver cannot disburse', t.smallDisb === 'same-person', t.smallDisb);
  check('no page errors', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();

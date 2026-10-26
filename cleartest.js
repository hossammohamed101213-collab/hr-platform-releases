/* اختبار: التصفية قبل إغلاق ملف الموظف */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/clH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/clH', USER: 'cl', USERNAME: 'cl' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    window.requirePin = async () => true; window.confirmBox = async () => true; window.api.printHTML = () => {}; const out = {}; const wait = ms => new Promise(r => setTimeout(r, ms));
    const e = await DB.upsert('employees', { id: uid(), name: 'موظف مغادر', code: 'E9', basic: 3000, hire_date: '2024-01-01', status: 'active', currency: 'AED' });
    await DB.upsert('assets', { id: uid(), emp_id: e.id, kind: 'معدات', name: 'لابتوب', qty: 1, value: 3000, received_date: '2025-01-01', status: 'with' });
    out.b1 = clearanceBlockers(e).length; out.html = clearanceAssetsHTML(e).includes('لابتوب');
    openFinalExit(e.id); await wait(200); await confirmFinalExit(e.id); await wait(300);
    out.stillActive = S.employees.find(x => x.id === e.id).status; out.noClear = S.clearances.length;
    const a = S.assets[0]; await DB.upsert('assets', { ...a, status: 'returned', returned_date: '2026-10-02' });
    out.b2 = clearanceBlockers(e).length;
    await confirmFinalExit(e.id); await wait(400);
    out.status = S.employees.find(x => x.id === e.id).status; out.clr = S.clearances.map(c => c.status + ':' + c.emp_id).join();
    out.eid = e.id; return out;
  });
  console.log(JSON.stringify(r));
  check('blocker detected', r.b1 === 1 && r.html);
  check('exit blocked while equipment out', r.stillActive !== 'inactive' && r.noClear === 0);
  check('no blockers after return', r.b2 === 0);
  check('exit done + clearance saved', r.status === 'inactive' && r.clr === 'done:' + r.eid, r.clr);
  check('no page errors', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();

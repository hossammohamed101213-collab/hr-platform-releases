/* اختبار 5.7.0: المراجعة النهائية + الموظفون بلا أكواد + الراتب بعد خصم القسط + تبويب «السلف» */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/rvH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/rvH', USER: 'rv', USERNAME: 'rv' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => { if (!/Canvas is already/.test(String(e))) errs.push(String(e)); }); p.on('console', m => { if (m.type() === 'error' && !/Canvas is already/.test(m.text())) errs.push('console:' + m.text()); });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const R = (fn, arg) => p.evaluate(fn, arg); const W = ms => new Promise(r => setTimeout(r, ms));
  const s0 = await R(async () => {
    window.confirmBox = async () => true; window.__rp = window.requirePin; window.requirePin = async () => true; await api.secpin.verify('4821'); await api.pin.set('Company#2026', '1234'); await api.pin.verify('1234');
    window.__printed = []; window.letterShell = h => { window.__printed.push(h); return h; }; api.printHTML = async () => true;
    await DB.setSetting('approvalTier', 100);
    const e1 = await DB.upsert('employees', { id: uid(), name: 'سامي', code: 'S1', basic: 3000, allowances: 0, deductions: 0, hire_date: '2026-01-01', status: 'active', currency: 'AED', pay_day: 25 });
    const e2 = await DB.upsert('employees', { id: uid(), name: 'رامي', code: 'S2', basic: 2000, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    await DB.upsert('advances', { id: uid(), emp_id: e1.id, kind: 'loan', amount: 900, currency: 'AED', reason: 'سلفة', request_date: '2026-09-01', status: 'disbursed', approved_by: 'admin', disbursed_at: '2026-09-02', installments: 3, installment_amount: 300, remaining: 900, repay_method: 'salary' });
    const e3 = await DB.upsert('employees', { id: uid(), name: 'كريم', code: 'S3', basic: 1500, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    await DB.upsert('advances', { id: uid(), emp_id: e3.id, kind: 'loan', amount: 600, currency: 'AED', reason: 'سلفة معتمدة', request_date: '2026-10-01', status: 'approved', approved_by: 'admin', installments: 3, installment_amount: 200, remaining: 600 });
    const n1 = await DB.upsert('notes', { id: uid(), emp_id: e1.id, date: '2026-09-01', kind: 'إنجاز', text: 'م1' });
    const u1 = await api.user.create({ emp_id: e1.id, username: 'emp.a', name: 'سامي', perms: ['employees', 'finance', 'treasury', 'expenses', 'advances'], password: 'EmpPass#1' });
    await DB.load(); return { e1: e1.id, e2: e2.id, n1: n1.id, u1: u1.user.id };
  });
  // --- salary after installment
  const sal = await R(async id => { go('employees'); const t1 = document.getElementById('page').innerText; go('employee', id); const t2 = document.getElementById('page').innerText; empTab = 'fin'; render(); const t3 = document.getElementById('page').innerText; go('payroll'); const t4 = document.getElementById('page').innerText; printPayroll(); const pr = window.__printed.pop() || ''; const st = empStatementHTML(empById(id), false); return { list: /2,700/.test(t1) && /قسط سلفة 300/.test(t1), head: /2,700/.test(t2) && /قسط سلفة/.test(t2), tab: /💰 السلف/.test(t3) && !/سلف وعُهد/.test(t3), pay: /2,700/.test(t4) && /الراتب الكامل 3,000/.test(t4), print: /قسط سلفة/.test(pr) && /2,700/.test(pr) && /300/.test(pr), stmt: /بعد خصم قسط السلفة/.test(st) && /2,700/.test(st), after: netAfter(empById(id)) }; }, s0.e1);
  check('employees list shows salary after installment (2700) with note', sal.list && sal.after === 2700, JSON.stringify(sal));
  check('employee header shows net after installment', sal.head);
  check('tab renamed to «السلف»', sal.tab);
  check('payroll table + printed sheet + statement show net after installment', sal.pay && sal.print && sal.stmt, JSON.stringify(sal));
  const all = await R(async () => { window.__printed.length = 0; printAllStatements(); const h = window.__printed.pop() || ''; return { ok: /كشف حساب الموظفين/.test(h) && /2,700/.test(h) && /1,800|2,000/.test(h) && /سامي/.test(h) && /900/.test(h) }; });
  check('bulk statement for all employees (net after installment)', all.ok, JSON.stringify(all));
  const sc = await R(async () => { const e = S.employees.find(x => x.name === 'كريم'); go('employees'); const t = document.getElementById('page').innerText; return { v: netAfter(e), list: /1,300/.test(t) && /لم تُصرف بعد/.test(t) && /الراتب الكامل 1,500/.test(t) }; });
  check('approved (scheduled) loan also shows salary after installment (1300)', sc.v === 1300 && sc.list, JSON.stringify(sc));
  // --- no codes in UI
  const ui = await R(async id => { go('settings'); setTab = 'users'; render(); const t = document.getElementById('page').innerText; empTab = 'account'; go('employee', id); const t2 = document.getElementById('page').innerText; return { col: /كود المسح/.test(t), box: /كود الصلاحيات والمسح|موظف موثوق/.test(t2), nav: !!document.querySelector('[data-page="review"]'), trashNav: !!document.querySelector('[data-page="trash"]') }; }, s0.e1);
  check('no delete-code column/box; nav has «المراجعة النهائية»', !ui.col && !ui.box && ui.nav && !ui.trashNav, JSON.stringify(ui));
  // --- employee works freely
  await R(async () => { await api.auth.lock(); }); await W(500);
  const lg = await R(async () => api.auth.login('EmpPass#1', 'emp.a')); check('employee login', lg === true, JSON.stringify(lg)); await W(800);
  const w = await R(async ({ e1, n1 }) => {
    await DB.load(); window.promptBox = async () => { throw new Error('PROMPTED'); }; window.requirePin = window.__rp; window.confirmBox = async () => true;
    const out = {}; out.delSt = (await api.del.status()).open; out.pin = (await api.pin.status()).trusted;
    try { await DB.remove('notes', n1); out.del = 'ok'; } catch (e) { out.del = e.message; }
    const n2 = await DB.upsert('notes', { id: uid(), emp_id: e1, date: '2026-10-01', kind: 'إنجاز', text: 'جديد' }); out.add = !!n2;
    await DB.upsert('notes', { ...n2, text: 'معدّل' }); await DB.upsert('notes', { ...n2, text: 'معدّل' }); /* تعديل بلا تغيير لا يُسجَّل */
    try { await DB.upsert('treasury', { id: uid(), date: '2026-10-02', direction: 'out', amount: 70, currency: 'AED', account: 'main', description: 'صرف بدون كود', method: 'cash' }); out.spend = 'ok'; } catch (e) { out.spend = e.message; }
    try { await DB.upsert('expenses', { id: uid(), date: '2026-10-02', emp_id: e1, category: 'مواصلات', amount: 500, currency: 'AED', description: 'فوق الحد ولنفسه', status: 'approved', paid_from: 'cash' }); out.exp = 'ok'; } catch (e) { out.exp = e.message; }
    out.pinAsk = await requirePin('صرف');
    try { await api.review.list(); out.rv = 'listed'; } catch (e) { out.rv = e.message; }
    out.setOpen = (await api.setgate.status()).open; return out; }, s0);
  check('employee: delete/add/edit/spend/approve all without any code or block', w.delSt === true && w.pin === true && w.del === 'ok' && w.add && w.spend === 'ok' && w.exp === 'ok' && w.pinAsk === true, JSON.stringify(w));
  check('employee: settings locked, review admin-only', w.setOpen === false && /admin-only/.test(w.rv), JSON.stringify(w));
  // --- admin reviews
  await R(async () => { await api.auth.lock(); }); await W(500);
  await R(async () => api.auth.login('Company#2026')); await W(800);
  const rv = await R(async () => { await DB.load(); const cnt = await api.review.count(); const rows = await api.review.list('pending'); const acts = rows.map(r => r.action).sort(); const flag = rows.find(r => r.tbl === 'expenses'); const ed = rows.find(r => r.action === 'edit' && r.tbl === 'notes'); return { cnt, n: rows.length, acts, flag: flag && flag.label, edDiff: ed && ed.detail && ed.detail.text, byName: rows.every(r => r.by_name === 'سامي'), trash: (await api.trash.list()).filter(t => t.status === 'pending').length }; });
  check('review log: add + edit + 2 spend, flagged ⚠️, diff, by name; trash pending', rv.n === 4 && rv.acts.join() === 'add,edit,spend,spend' && /⚠️/.test(rv.flag) && /اعتمد لنفسه/.test(rv.flag) && /فوق حد/.test(rv.flag) && rv.edDiff && rv.edDiff.from === 'جديد' && rv.edDiff.to === 'معدّل' && rv.byName && rv.trash === 1 && rv.cnt === 5, JSON.stringify(rv));
  const pg = await R(async () => { window.__reviewLoaded = false; go('review'); await new Promise(r => setTimeout(r, 700)); const t = document.getElementById('page').innerText; reviewTab = 'spend'; render(); const t2 = document.getElementById('page').innerText; reviewTab = 'del'; render(); const t3 = document.getElementById('page').innerText; const badge = document.getElementById('navTrashCount'); return { tabs: /المضاف مؤخراً/.test(t) && /المعدَّل مؤخراً/.test(t) && /المصروف مؤخراً/.test(t) && /الممسوح مؤخراً/.test(t), rows: /جديد ← معدّل/.test(t) && /PV-2026-0001/.test(t) && /اعتمد لنفسه/.test(t) && /الموظف: سامي/.test(t), spendOnly: /PV-2026-0001/.test(t2) && !/جديد ← معدّل/.test(t2), del: /إنجاز/.test(t3) && /بانتظار قرارك/.test(t3), badge: badge && badge.textContent }; });
  check('review page: 4 tabs, rows, spend filter, trash tab, badge=5', pg.tabs && pg.rows && pg.spendOnly && pg.del && pg.badge === '5', JSON.stringify(pg));
  const ap = await R(async () => { await api.secpin.verify('4821'); reviewTab = 'all'; window.confirmBox = async () => true; await approveReview(); await new Promise(r => setTimeout(r, 500)); const rows = await api.review.list('all'); return { approved: rows.filter(r => r.status === 'approved').length, pending: rows.filter(r => r.status === 'pending').length, cnt: await api.review.count() }; });
  check('approve all with secret PIN → 4 approved, count drops to trash only', ap.approved === 4 && ap.pending === 0 && ap.cnt === 1, JSON.stringify(ap));
  const adm = await R(async () => { const a = await DB.upsert('notes', { id: uid(), emp_id: S.employees[0].id, date: '2026-10-03', kind: 'إنجاز', text: 'من المدير' }); const rows = await api.review.list('pending'); return rows.length; });
  check('admin actions are not logged for review', adm === 0, String(adm));
  check('zero console/page errors', errs.length === 0, errs.join(' | '));
  console.log(fails ? 'FAILS ' + fails : 'ALL PASS'); await app.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });

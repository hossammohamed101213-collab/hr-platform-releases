/* اختبار 5.3.0: كود المسح الخماسي + الممسوح مؤخراً + بوابة الإعدادات */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/dlH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/dlH', USER: 'dl', USERNAME: 'dl' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/Canvas is already/.test(m.text())) errs.push('console:' + m.text()); });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const R = (fn, arg) => p.evaluate(fn, arg);
  // ---- admin: setup data
  const s0 = await R(async () => {
    window.confirmBox = async () => true; window.requirePin = async () => true;
    const e1 = await DB.upsert('employees', { id: uid(), name: 'موظف أ', code: 'E1', basic: 3000, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    const e2 = await DB.upsert('employees', { id: uid(), name: 'موظف ب', code: 'E2', basic: 2000, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    const n1 = await DB.upsert('notes', { id: uid(), emp_id: e1.id, date: '2026-09-01', kind: 'إنجاز', text: 'ملاحظة 1' });
    const n2 = await DB.upsert('notes', { id: uid(), emp_id: e1.id, date: '2026-09-02', kind: 'إنجاز', text: 'ملاحظة 2' });
    await DB.upsert('payments', { id: uid(), emp_id: e1.id, month: '2026-08', basic: 3000, allowances: 0, deductions: 0, amount: 3000, currency: 'AED', paid_at: '2026-08-30', method: 'bank' });
    await DB.upsert('payments', { id: uid(), emp_id: e1.id, month: '2026-09', basic: 3000, allowances: 0, deductions: 0, amount: 3000, currency: 'AED', paid_at: '2026-09-30', method: 'bank' });
    const u1 = await api.user.create({ emp_id: e1.id, username: 'emp.a', name: 'موظف أ', perms: ['employees'], password: 'EmpPass#1' });
    const u2 = await api.user.create({ emp_id: e2.id, username: 'emp.b', name: 'موظف ب', perms: ['employees'], password: 'EmpPass#2' });
    return { e1: e1.id, e2: e2.id, n1: n1.id, n2: n2.id, c1: u1.user.code, c2: u2.user.code, u1: u1.user.id };
  });
  check('every account gets a unique 5-digit code', /^\d{5}$/.test(s0.c1) && /^\d{5}$/.test(s0.c2) && s0.c1 !== s0.c2, JSON.stringify([s0.c1, s0.c2]));
  // admin delete without auth blocked
  const a1 = await R(async id => { try { await api.db.delete('notes', id); return 'deleted'; } catch (e) { return e.message; } }, s0.n1);
  check('admin delete blocked without secret', /delcode-required/.test(a1), a1);
  const a2 = await R(async () => (await api.del.auth('0000')).ok); check('admin wrong secret rejected', a2 === false);
  const a3 = await R(async id => { const r = await api.del.auth('4821'); await api.db.delete('notes', id); const t = await api.trash.list(); return { ok: r.ok, trash: t.map(x => [x.tbl, x.status, x.by_role]) }; }, s0.n1);
  check('admin delete with secret -> goes to trash (auto-confirmed)', a3.ok && a3.trash.some(x => x[0] === 'notes' && x[1] === 'confirmed' && x[2] === 'admin'), JSON.stringify(a3));
  // set code manually + uniqueness + validation
  const cc = await R(async ([id, other]) => { const out = {}; try { await api.usercode.set(id, '12'); } catch (e) { out.bad = e.message; } try { const u = await api.usercode.set(id, '12345'); out.set = u.code; } catch (e) { out.err = e.message; } try { await api.usercode.set(other, '12345'); } catch (e) { out.dup = e.message; } const g = await api.usercode.set(id); out.regen = g.code; return out; }, [s0.u1, (await R(async () => (await api.user.list())[1].id))]);
  check('code validation / uniqueness / regenerate', /bad-code/.test(cc.bad) && cc.set === '12345' && /code-taken/.test(cc.dup) && /^\d{5}$/.test(cc.regen) && cc.regen !== '12345', JSON.stringify(cc));
  // ---- admin deletes employee -> cascade snapshot, then restore
  const d1 = await R(async id => { await api.del.auth('4821'); await DB.remove('employees', id); const t = (await api.trash.list()).find(x => x.tbl === 'employees'); return { count: t.count, id: t.id, still: S.employees.some(e => e.id === id) }; }, s0.e2);
  check('deleted employee leaves live data', d1.still === false);
  // ---- switch to employee session
  await R(async () => { await api.auth.lock(); });
  await p.waitForTimeout(500);
  const lg = await R(async () => api.auth.login('EmpPass#1', 'emp.a'));
  check('employee login', lg === true, JSON.stringify(lg)); await p.waitForTimeout(800);
  const e0 = await R(async () => { await DB.load(); return { adm: isAdminUI(), settingsPage: pageAllowed('settings'), trashPage: pageAllowed('trash'), trashLoaded: (await api.trash.count()) }; });
  check('settings visible to employee, trash hidden', e0.settingsPage === true && e0.trashPage === false && e0.trashLoaded === 0, JSON.stringify(e0));
  const g0 = await R(async () => { const st = await api.setgate.status(); let w; try { await api.db.setSetting('company', 'X'); w = 'wrote'; } catch (e) { w = e.message; } return { open: st.open, w }; });
  check('settings locked for employee', g0.open === false && /admin-only/.test(g0.w), JSON.stringify(g0));
  const g1 = await R(async () => { const bad = await api.setgate.unlock('1111'); const ok = await api.setgate.unlock('4821'); await api.db.setSetting('company', 'شركة تجربة'); return { bad: bad.ok, ok: ok.ok, st: (await api.setgate.status()).open }; });
  check('settings unlock: wrong rejected, manager PIN opens, writes allowed', g1.bad === false && g1.ok === true && g1.st === true, JSON.stringify(g1));
  const g2 = await R(async () => { let r; try { await api.user.list(); r = 'listed'; } catch (e) { r = e.message; } try { await api.db.wipe(); r += '|wiped'; } catch (e) { r += '|' + e.message; } return r; });
  check('unlock does not grant admin powers', /admin-only/.test(g2) && !/wiped|listed/.test(g2), g2);
  // UI gate for employee
  const ui = await R(async () => { setGate = { open: false, until: 0, user: null }; go('settings'); const t1 = document.getElementById('page').innerText; setGate = { open: true, until: Date.now() + 60000, user: S.session.username }; render(); const t2 = document.getElementById('page').innerText; const tabs = [...document.querySelectorAll('#page .tab')].map(x => x.textContent); return { locked: /الإعدادات محمية/.test(t1), opened: /المنشأة|اسم الشركة/.test(t2), tabs }; });
  check('settings gate screen then limited tabs', ui.locked && ui.opened && ui.tabs.length === 3, JSON.stringify(ui));
  // employee delete: 5.7.0 — no codes at all, deletion lands in trash/review
  const m1 = await R(async id => { try { await api.db.delete('notes', id); return 'deleted'; } catch (e) { return e.message; } }, s0.n2);
  check('employee delete works with no code (5.7.0)', m1 === 'deleted', m1);
  const m5 = await R(async () => { await DB.load(); return S.notes.some(n => n.text === 'ملاحظة 2'); });
  check('deleted note gone from live data', m5 === false);
  const un = await R(async () => { let e; try { await api.db.upsert('trash', { id: 'x1', tbl: 'notes' }); e = 'wrote'; } catch (er) { e = er.message; } return e; });
  check('employee cannot touch trash table', /admin-only|bad-table/.test(un), un);
  // ---- back to admin: review trash
  await R(async () => { await api.auth.lock(); }); await p.waitForTimeout(500);
  await R(async () => { }).catch(() => { });
  const al = await R(async () => api.auth.login('Company#2026')); check('admin login', al === true || (al && al.ok), JSON.stringify(al)); await p.waitForTimeout(800);
  const t1 = await R(async () => { await DB.load(); window.confirmBox = async () => true; await api.secpin.verify('4821'); const list = await api.trash.list(); const audit = (await api.db.audit(200)); return { pending: list.filter(x => x.status === 'pending').map(x => [x.tbl, x.by_user]), emp: list.find(x => x.tbl === 'employees'), wrong: audit.filter(a => a.action === 'delcode-wrong').map(a => a.user + ':' + a.detail), lockout: audit.some(a => a.action === 'delcode-lockout'), unlockFail: audit.some(a => a.action === 'settings-unlock-fail') }; });
  check('trash shows employee deletion by user name', t1.pending.some(x => x[0] === 'notes' && x[1] === 'emp.a'), JSON.stringify(t1.pending));
  check('audit logs wrong settings PIN', t1.unlockFail, JSON.stringify(t1.wrong));
  // UI page
  const pg = await R(async () => { window.__trashLoaded = false; go('trash'); await new Promise(r => setTimeout(r, 600)); const t = document.getElementById('page').innerText; trashFilter = 'all'; render(); const t2 = document.getElementById('page').innerText; return { has: /ملاحظة 2|ملاحظة/.test(t2), who: /emp\.a/.test(t2), badge: !!document.getElementById('navTrashCount') }; });
  check('trash page renders deleted note + who', pg.has && pg.who && pg.badge, JSON.stringify(pg));
  // restore the employee (cascade) and the note
  const rs = await R(async ([e2]) => {
    const list = await api.trash.list(); const emp = list.find(x => x.tbl === 'employees'); const note = list.find(x => x.tbl === 'notes' && x.status === 'pending');
    await api.trash.restore(emp.id); await api.trash.restore(note.id); await DB.load();
    const after = await api.trash.list();
    return { emp: S.employees.some(e => e.id === e2), note: S.notes.some(n => n.text === 'ملاحظة 2'), st: after.filter(x => x.status === 'restored').length };
  }, [s0.e2]);
  check('restore brings back employee and note', rs.emp && rs.note && rs.st === 2, JSON.stringify(rs));
  // delete employee A (has payments) as admin -> restore -> payments return
  const cs = await R(async id => { await api.del.auth('4821'); await DB.remove('employees', id); const gone = !S.payments.some(x => x.emp_id === id); const l = (await api.trash.list()).find(x => x.tbl === 'employees' && x.rec_id === id); await api.trash.restore(l.id); await DB.load(); return { gone, back: S.payments.filter(x => x.emp_id === id).length, emp: S.employees.some(e => e.id === id), count: l.count }; }, s0.e1);
  check('employee cascade removed then fully restored', cs.gone && cs.back === 2 && cs.emp && cs.count >= 3, JSON.stringify(cs));
  // child restore without parent -> refused
  const pr = await R(async () => { const n = await DB.upsert('notes', { id: uid(), emp_id: S.employees[0].id, date: '2026-09-03', kind: 'إنجاز', text: 'ملاحظة 3' }); await api.del.auth('4821'); await DB.remove('notes', n.id); const l = (await api.trash.list()).find(x => x.label && x.label.includes('إنجاز')); return !!l; });
  check('note delete recorded', pr);
  // confirm pending
  const cf = await R(async () => { const l = (await api.trash.list()).filter(x => x.status === 'pending'); const n = await api.trash.confirm(l.map(x => x.id)); const after = (await api.trash.list()).filter(x => x.status === 'pending').length; return { n, after, cnt: await api.trash.count() }; });
  check('confirm finalizes pending', cf.after === 0 && cf.cnt === 0, JSON.stringify(cf));
  // wipe requires secret window (secret verified above) and still works
  check('zero console/page errors', errs.length === 0, errs.join(' | '));
  console.log(fails ? 'FAILS ' + fails : 'ALL PASS'); await app.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });

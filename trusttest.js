/* اختبار 5.6.3: موظف موثوق — بلا كود مسح ولا كود مدير، الإعدادات تبقى مقفولة */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/trH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/trH', USER: 'tr', USERNAME: 'tr' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => { if (!/Canvas is already/.test(String(e))) errs.push(String(e)); }); p.on('console', m => { if (m.type() === 'error' && !/Canvas is already/.test(m.text())) errs.push('console:' + m.text()); });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const R = (fn, arg) => p.evaluate(fn, arg); const W = ms => new Promise(r => setTimeout(r, ms));
  // admin: data + manager PIN + two employees
  const s0 = await R(async () => {
    window.confirmBox = async () => true; window.__rp = window.requirePin; window.requirePin = async () => true; await api.secpin.verify('4821');
    await api.pin.set('Company#2026', '1234');
    const e1 = await DB.upsert('employees', { id: uid(), name: 'موثوق', code: 'T1', basic: 3000, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    const e2 = await DB.upsert('employees', { id: uid(), name: 'عادي', code: 'T2', basic: 2000, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    const n1 = await DB.upsert('notes', { id: uid(), emp_id: e1.id, date: '2026-09-01', kind: 'إنجاز', text: 'م1' });
    const n2 = await DB.upsert('notes', { id: uid(), emp_id: e1.id, date: '2026-09-02', kind: 'إنجاز', text: 'م2' });
    const n3 = await DB.upsert('notes', { id: uid(), emp_id: e2.id, date: '2026-09-03', kind: 'إنجاز', text: 'م3' });
    const u1 = await api.user.create({ emp_id: e1.id, username: 'emp.t', name: 'موثوق', perms: ['employees', 'finance', 'treasury', 'expenses'], password: 'EmpPass#1' });
    const u2 = await api.user.create({ emp_id: e2.id, username: 'emp.n', name: 'عادي', perms: ['employees'], password: 'EmpPass#2' });
    return { e1: e1.id, n1: n1.id, n2: n2.id, n3: n3.id, u1: u1.user.id, u2: u2.user.id };
  });
  await R(async () => { await DB.load(); });
  // UI: box exists in account tab, toggle requires secpin and works
  const ui = await R(async id => { empTab = 'account'; go('employee', id); await new Promise(r => setTimeout(r, 300)); const t = document.getElementById('page').innerText; return { box: /موظف موثوق — بلا أكواد/.test(t), off: /غير مفعّل/.test(t) }; }, s0.e1);
  check('trusted box shown in account tab (off)', ui.box && ui.off, JSON.stringify(ui));
  const tg = await R(async id => { await setUserTrusted(id, true); await new Promise(r => setTimeout(r, 400)); const u = (await api.user.list()).find(x => x.id === id); const t = document.getElementById('page').innerText; return { trusted: u.trusted, on: /مفعّل/.test(t) && !/غير مفعّل/.test(t) }; }, s0.u1);
  check('toggle on → users.trusted=1 and badge', tg.trusted === 1 && tg.on, JSON.stringify(tg));
  const lst = await R(() => { go('settings'); setTab = 'users'; render(); return document.getElementById('page').innerText; });
  check('users list shows ✅ موثوق', /موثوق/.test(lst));
  const bad = await R(async id => { try { await api.user.update(id, { trusted: 1 }); return 'ok'; } catch (e) { return e.message; } }, 'nope');
  check('bad id rejected', /bad-id/.test(bad), bad);
  // trusted employee login
  await R(async () => { await api.auth.lock(); }); await W(500);
  const lg = await R(async () => api.auth.login('EmpPass#1', 'emp.t')); check('trusted employee login', lg === true, JSON.stringify(lg)); await W(800);
  const d1 = await R(async id => { await DB.load(); const st = await api.del.status(); const ps = await api.pin.status(); let w; try { await api.db.delete('notes', id); w = 'deleted'; } catch (e) { w = e.message; } return { open: st.open, trusted: ps.trusted, w }; }, s0.n1);
  check('trusted: delete without any code', d1.open === true && d1.trusted === true && d1.w === 'deleted', JSON.stringify(d1));
  const d2 = await R(async id => { window.promptBox = async () => { throw new Error('PROMPTED'); }; try { await DB.remove('notes', id); return 'removed'; } catch (e) { return e.message; } }, s0.n2);
  check('trusted: DB.remove never prompts', d2 === 'removed', d2);
  const d3 = await R(async () => { window.promptBox = async () => { throw new Error('PROMPTED'); }; window.requirePin = window.__rp; return await requirePin('صرف'); });
  check('trusted: requirePin passes silently', d3 === true, JSON.stringify(d3));
  const d4 = await R(async () => { try { const r = await DB.upsert('treasury', { id: uid(), date: '2026-10-01', direction: 'out', amount: 50, currency: 'AED', account: 'main', description: 'صرف اختبار', method: 'cash' }); return r ? 'ok' : 'none'; } catch (e) { return e.message; } });
  check('trusted: treasury out without manager PIN', d4 === 'ok', d4);
  const g0 = await R(async () => { const st = await api.setgate.status(); let w; try { await api.db.setSetting('company', 'X'); w = 'wrote'; } catch (e) { w = e.message; } let adm; try { await api.user.list(); adm = 'listed'; } catch (e) { adm = e.message; } return { open: st.open, w, adm }; });
  check('trusted: settings still locked, no admin powers', g0.open === false && /admin-only/.test(g0.w) && /admin-only/.test(g0.adm), JSON.stringify(g0));
  const tr0 = await R(async () => { try { await api.user.update('x', { trusted: 0 }); return 'ok'; } catch (e) { return e.message; } });
  check('employee cannot change trusted flag', /admin-only/.test(tr0), tr0);
  // normal employee still needs code
  await R(async () => { await api.auth.lock(); }); await W(500);
  const lg2 = await R(async () => api.auth.login('EmpPass#2', 'emp.n')); check('normal employee login', lg2 === true); await W(800);
  const n1 = await R(async id => { await DB.load(); const st = await api.del.status(); const ps = await api.pin.status(); let w; try { await api.db.delete('notes', id); w = 'deleted'; } catch (e) { w = e.message; } return { open: st.open, trusted: ps.trusted, w }; }, s0.n3);
  check('normal employee: still needs delete code', n1.open === false && n1.trusted === false && /delcode-required/.test(n1.w), JSON.stringify(n1));
  // admin: trash has the trusted employee's deletions; toggle off
  await R(async () => { await api.auth.lock(); }); await W(500);
  await R(async () => api.auth.login('Company#2026')); await W(800);
  const tr = await R(async id => { await api.secpin.verify('4821'); const rows = await api.trash.list(); const u = await api.user.update(id, { trusted: 0 }); const ps = await api.pin.status(); return { pending: rows.filter(r => r.status === 'pending').length, trusted: u.trusted, byName: rows.some(r => /emp\.t|موثوق/.test(JSON.stringify(r))), adminTrusted: ps.trusted }; }, s0.u1);
  check('deletions landed in trash by name; toggle off works; admin never "trusted"', tr.pending >= 2 && tr.trusted === 0 && tr.byName && tr.adminTrusted === false, JSON.stringify(tr));
  check('zero console/page errors', errs.length === 0, errs.join(' | '));
  console.log(fails ? 'FAILS ' + fails : 'ALL PASS'); await app.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });

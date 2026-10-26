/* اختبار 5.8.6: كود المدير لكل موظف — تفعيل: لا صرف ولا حذف إلا بكوده الخماسي (يُطلب في العملية)؛ إيقاف: حرّ ولا يُطلب منه شيء؛ المدير يعدّل/يمسح/يعمل كود جديد */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/cdH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/cdH', USER: 'cd', USERNAME: 'cd' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  const W = ms => new Promise(r => setTimeout(r, ms)); const R = (fn, a) => p.evaluate(fn, a);
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Demo#2026'); await p.fill('#pw2', 'Demo#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const ids = await R(async () => { await api.secpin.verify('4821'); await api.pin.set('Demo#2026', '1234'); window.confirmBox = async () => true;
    const e1 = await DB.upsert('employees', { id: uid(), name: 'مرفت', code: 'E1', basic: 3000, hire_date: '2025-01-01', status: 'active', currency: 'AED' });
    const e2 = await DB.upsert('employees', { id: uid(), name: 'سامي', code: 'E2', basic: 3000, hire_date: '2025-01-01', status: 'active', currency: 'AED' });
    const r1 = await api.user.create({ emp_id: e1.id, username: 'emp.a', name: 'مرفت', perms: ['finance', 'employees'], password: 'EmpPass#1' });
    const r2 = await api.user.create({ emp_id: e2.id, username: 'emp.b', name: 'سامي', perms: ['finance'], password: 'EmpPass#2' }); await DB.load(); return { u1: r1.user.id, u2: r2.user.id, code2: r2.user.code }; });
  const login = async (u, pw) => { await R(async () => { await api.auth.lock(); }); await W(500); const r = await R(async ([pw, u]) => api.auth.login(pw, u), [pw, u]); await W(900); await p.evaluate(AP).catch(()=>{}); await p.evaluate(SP).catch(()=>{}); return r; };
  const AP = `window.answerPin = async v => { for (let i = 0; i < 80; i++) { const el = document.querySelector('#overlay.open #pbIn'); if (el) { if (v === null) document.querySelector('#overlay.open #pbNo').click(); else { el.value = v; document.querySelector('#overlay.open #pbOk').click(); } return true; } await new Promise(r => setTimeout(r, 50)); } return false; };
    window.askCode = async (typed, code) => { const S0 = ms => new Promise(r => setTimeout(r, ms)); const rp = requirePin('صرف'); await S0(900); const el = document.querySelector('#overlay.open #pbIn'); const shown = !!el; if (el) { if (typed === null) document.querySelector('#overlay.open #pbNo').click(); else { el.value = typed; document.querySelector('#overlay.open #pbOk').click(); } } if (typed !== null && typed !== code) { await S0(900); if (document.querySelector('#overlay.open #pbIn')) document.querySelector('#overlay.open #pbNo').click(); } const r = await rp; await S0(1200); return { shown, r }; };`;
  const SP = `window.spendTry = async () => { try { await DB.upsert('treasury', { id: uid(), date: iso(today()), direction: 'out', category: 'مصروفات', amount: 50, currency: 'AED', account: 'main', note: 'x' }); return 'saved'; } catch (e) { return String(e.message); } };`;
  const getCode = async id => { await login(null, 'Demo#2026'); return R(async id => (await api.user.list()).find(x => x.id === id).code, id); };
  // 1) الافتراضي: حرّة
  await login('emp.a', 'EmpPass#1');
  const d0 = await R(async () => ({ pin: await api.pin.status(), del: await api.del.status() }));
  check('الافتراضي: الموظفة حرّة بلا أي كود', d0.pin.trusted === true && d0.pin.guard === false && d0.del.open === true, JSON.stringify(d0));
  // 2) المدير يفعّل
  const code1 = await getCode(ids.u1); check('لكل موظفة كود خماسي في حسابها', /^\d{5}$/.test(code1), code1);
  const on = await R(async ({ u1 }) => { const r = await api.user.update(u1, { code_on: 1 }); await DB.load(); return r.code_on; }, ids);
  check('المدير يفعّل الكود بضغطة (بدون أي رقم سري)', on === 1, String(on));
  await login('emp.b', 'EmpPass#2'); const o1 = await R(async () => (await api.pin.status()));
  check('موظف آخر لم يُفعَّل له يبقى حرّاً', o1.trusted === true && o1.guard === false, JSON.stringify(o1));
  await login('emp.a', 'EmpPass#1');
  const g = await R(async () => { const st = await api.pin.status(); const ds = await api.del.status(); const sv = await spendTry(); return { guard: st.guard, trusted: st.trusted, dsOpen: ds.open, sv }; });
  check('مفعّل: الصرف والحذف مقفولان على الموظفة بدون الكود (سيرفر)', g.guard === true && g.trusted === false && g.dsOpen === false && /pin-required/.test(g.sv), JSON.stringify(g));
  const ad = await R(async () => { const n = await DB.upsert('notes', { id: uid(), emp_id: S.employees[0].id, date: iso(today()), kind: 'ملاحظة', text: 'تعديل مسموح' }); return !!n; });
  check('مفعّل: الإضافة والتعديل العادي شغّالان', ad);
  // الواجهة: يُطلب الكود في العملية
  const w = await R(async ([_, code]) => { const T = (pr, ms = 8000) => Promise.race([pr, new Promise(r => setTimeout(() => r('TIMEOUT'), ms))]); const S0 = ms => new Promise(r => setTimeout(r, ms));
    const ask = async (typed) => { const rp = requirePin('صرف'); await S0(900); const el = document.querySelector('#overlay.open #pbIn'); const shown = !!el; if (el) { if (typed === null) document.querySelector('#overlay.open #pbNo').click(); else { el.value = typed; document.querySelector('#overlay.open #pbOk').click(); } }
      if (typed !== null && typed !== code) { await S0(900); const el2 = document.querySelector('#overlay.open #pbIn'); if (el2) document.querySelector('#overlay.open #pbNo').click(); } const r = await T(rp); await S0(1200); return { shown, r }; };
    const a = await ask('00000'); const b = await ask(null); const c = await ask(code); return { wrong: a, cancel: b, right: c }; }, [AP, code1]);
  check('الواجهة: كود غلط/إلغاء → يُمنع، والكود الصحيح → يمر', w.wrong.shown && w.wrong.r === false && w.cancel.shown && w.cancel.r === false && w.right.shown && w.right.r === true, JSON.stringify(w));
  await R(async () => { for (let i = 0; i < 10; i++) { const n = document.querySelector('#overlay.open #pbNo'); if (n) n.click(); modalStack.length = 0; closeModal(); await new Promise(r => setTimeout(r, 350)); } }); await W(300);
  const after = await R(async () => await spendTry());
  check('بعد إدخال الكود الصحيح يتم الصرف', after === 'saved', after);
  const dl = await R(async ([_, code]) => { const n = await DB.upsert('notes', { id: uid(), emp_id: S.employees[0].id, date: iso(today()), kind: 'ملاحظة', text: 'للحذف' }); S.notes.push(n);
    let p = answerPin(code); let err = ''; try { await askDelAuth(); } catch (e) { err = String(e.message); } await p; return { err }; }, [AP, code1]);
  check('الحذف: يطلب كودها ويمر بالكود الصحيح', dl.err === '', JSON.stringify(dl));
  // 5 محاولات غلط
  await login('emp.a', 'EmpPass#1');
  const lock = await R(async () => { let w = 0, last = null; for (let i = 0; i < 6; i++) { last = await api.del.auth('11111'); if (last.why === 'locked') break; w++; } return { w, last }; });
  check('5 محاولات غلط تقفل الكود 5 دقائق', lock.last && lock.last.why === 'locked' && lock.w === 5, JSON.stringify(lock));
  // 3) المدير يوقف → حرّ تماماً ولا يُطلب شيء
  await login(null, 'Demo#2026'); await R(async () => { await DB.load(); });
  await R(async () => { for (let i = 0; i < 10; i++) { const n = document.querySelector('#overlay.open #pbNo'); if (n) n.click(); modalStack.length = 0; closeModal(); await new Promise(r => setTimeout(r, 350)); } }); await W(500);
  const ui = await R(async () => { setTab = 'users'; go('settings'); await new Promise(r => setTimeout(r, 500)); const t = document.getElementById('page').innerText; return { col: /كود المدير/.test(t), on: /مفعّل/.test(t), off: /موقوف/.test(t), btn: !!document.querySelector('[onclick^="setUserCodeOn"]') }; });
  check('الإعدادات ← المستخدمون: عمود «كود المدير» (مفعّل/موقوف) وزر لكل موظف', ui.col && ui.on && ui.off && ui.btn, JSON.stringify(ui));
  const sw = await R(async ({ u1 }) => { await setUserCodeOn(u1, false); await new Promise(r => setTimeout(r, 400)); const a = S.users.find(x => x.id === u1); return { a: ucAuth(a), pr: !!document.querySelector('#overlay.open #pbIn'), h: (document.querySelector('#modal')||{innerHTML:''}).innerHTML.slice(0, 250) }; }, ids);
  check('الإيقاف من الواجهة بضغطة بدون أي نافذة رقم', sw.a === false && !sw.pr, JSON.stringify(sw));
  await login('emp.a', 'EmpPass#1'); await R(async () => { for (let i = 0; i < 10; i++) { const n = document.querySelector('#overlay.open #pbNo'); if (n) n.click(); modalStack.length = 0; closeModal(); await new Promise(r => setTimeout(r, 350)); } }); await W(500); const f1 = await R(async () => { const st = await api.pin.status(); const ds = await api.del.status(); const sv = await spendTry(); const r = await requirePin('x'); return { t: st.trusted, dsOpen: ds.open, sv, r, noPrompt: !document.querySelector('#overlay.open #pbIn') }; });
  check('بعد الإيقاف: لا يُطلب منها أي كود في أي عملية', f1.t && f1.dsOpen && f1.sv === 'saved' && f1.r === true && f1.noPrompt, JSON.stringify(f1));
  // 4) تعديل / مسح / كود جديد
  await login(null, 'Demo#2026'); await R(async ({ u1 }) => { await api.secpin.verify('4821'); await api.user.update(u1, { code_on: 1 }); await DB.load(); }, ids);
  const cd = await R(async ({ u1, u2 }) => { const man = await api.usercode.set(u1, '24680'); let taken = ''; try { await api.usercode.set(u2, '24680'); } catch (e) { taken = String(e.message); }
    const cl = await api.usercode.clear(u1); const list = await api.user.list(); const stay = list.find(x => x.id === u1).code === '';
    return { man: man.code, taken: /code-taken/.test(taken), cleared: cl.code === '', stay }; }, ids);
  check('تعديل الكود يدوياً (ورفض المكرر) + مسحه', cd.man === '24680' && cd.taken && cd.cleared && cd.stay, JSON.stringify(cd));
  await login('emp.a', 'EmpPass#1'); await R(async () => { for (let i = 0; i < 10; i++) { const n = document.querySelector('#overlay.open #pbNo'); if (n) n.click(); modalStack.length = 0; closeModal(); await new Promise(r => setTimeout(r, 350)); } }); await W(500); const b3 = await R(async () => { const st = await api.pin.status(); const sv = await spendTry(); const r = await requirePin('x'); return { restricted: st.restricted, sv, r, noPrompt: !document.querySelector('#overlay.open #pbIn') }; });
  check('مفعّل + الكود ممسوح: العملية عند المدير فقط بلا أي نافذة', b3.restricted && /manager-only/.test(b3.sv) && b3.r === false && b3.noPrompt, JSON.stringify(b3));
  await login(null, 'Demo#2026'); await R(async ({ u1 }) => { await api.secpin.verify('4821'); await api.usercode.set(u1, '13579'); await DB.load(); }, ids);
  await login('emp.a', 'EmpPass#1'); await R(async () => { for (let i = 0; i < 10; i++) { const n = document.querySelector('#overlay.open #pbNo'); if (n) n.click(); modalStack.length = 0; closeModal(); await new Promise(r => setTimeout(r, 350)); } }); await W(500); const b4 = await R(async () => { const old = await askCode('24680', '13579'); const nw = await askCode('13579', '13579'); return { old: old.r, nw: nw.r }; });
  check('بعد كود جديد: القديم لا يعمل والجديد يعمل', b4.old === false && b4.nw === true, JSON.stringify(b4));
  console.log('page errors:', JSON.stringify(errs.slice(0, 5)));
  console.log(fails ? `FAILS ${fails}` : 'ALL PASS'); await app.close(); process.exit(fails ? 1 : 0);
})();

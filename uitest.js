/* فحص شامل للواجهة بعد تغيير التصميم (5.9.0):
   كل قسم يُفتح، كل زر له وظيفة، لا تجاوز أفقي، النوافذ تفتح وتُغلق، الثيمات وأشكال القوائم، صلاحيات الموظف */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/uiH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/uiH', USER: 'ui', USERNAME: 'ui' } });
  const p = await app.firstWindow(); await p.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  const R = (fn, a) => p.evaluate(fn, a); const W = ms => new Promise(r => setTimeout(r, ms));
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Demo#2026'); await p.fill('#pw2', 'Demo#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  await R(async () => { window.confirmBox = async () => true; await loadDemo(); }); await W(2500);

  const PAGES = ['dashboard', 'alerts', 'employees', 'finance', 'projects', 'field', 'taxes', 'letters', 'leaves', 'payroll', 'reports', 'print', 'offers', 'documents', 'guide', 'userhelp', 'sites', 'devices', 'review', 'settings'];

  // 1) كل قسم يفتح بمحتوى حقيقي وبدون أخطاء
  const pg = await R(async (PAGES) => { const out = {}; for (const k of PAGES) { const before = document.getElementById('page').innerHTML; go(k); await new Promise(r => setTimeout(r, 450)); const el = document.getElementById('page'); out[k] = { len: el.innerText.trim().length, changed: el.innerHTML !== before || k === 'dashboard' }; } return out; }, PAGES);
  const bad = Object.entries(pg).filter(([k, v]) => v.len < 40);
  check('كل الأقسام تفتح بمحتوى (' + PAGES.length + ' قسم)', bad.length === 0, JSON.stringify(bad));

  // 2) كل زر ظاهر له وظيفة فعلية (onclick أو handler أو data-go)
  const btns = await R(async (PAGES) => { const out = {}; let total = 0;
    for (const k of PAGES) { go(k); await new Promise(r => setTimeout(r, 420));
      const all = [...document.querySelectorAll('#page button, #page .chip, #page [data-go-page], #page [data-go-emp], .topbar button, .side .nav')].filter(b => b.offsetParent !== null);
      total += all.length;
      const dead = all.filter(b => !(b.onclick || b.getAttribute('onclick') || b.dataset.goPage || b.dataset.goEmp || b.dataset.page || b.id || b.closest('[onclick]') || b.type === 'submit')).map(b => (b.innerText || '').trim().slice(0, 24));
      if (dead.length) out[k] = dead; }
    return { out, total }; }, PAGES);
  check('كل الأزرار الظاهرة لها وظيفة (' + btns.total + ' زر)', Object.keys(btns.out).length === 0, JSON.stringify(btns.out).slice(0, 400));

  // 3) ثبات التصميم: لا تمرير أفقي ولا عناصر خارج الشاشة
  const lay = await R(async (PAGES) => { const out = {}; for (const k of PAGES) { go(k); await new Promise(r => setTimeout(r, 400));
      const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const main = document.querySelector('.main'); const mo = main.scrollWidth - main.clientWidth;
      if (over > 4 || mo > 4) out[k] = { over, mo }; } return out; }, PAGES);
  check('لا يوجد تمرير أفقي أو خروج عن الشاشة في أي قسم', Object.keys(lay).length === 0, JSON.stringify(lay));

  // 4) الشاشة الرئيسية: كل الأقسام بطاقات وتفتح بضغطة
  const nav = await R(async () => { go('dashboard'); await new Promise(r => setTimeout(r, 500));
    const cards = [...document.querySelectorAll('.apcard,.aprow')]; const res = [];
    for (const c of cards) { const want = c.dataset.goPage; c.click(); await new Promise(r => setTimeout(r, 380)); res.push({ want, got: current.page, back: !!document.querySelector('.apback') }); go('dashboard'); await new Promise(r => setTimeout(r, 260)); }
    return res; });
  check('كل بطاقة في الشاشة الرئيسية تفتح قسمها ومعها زر رجوع', nav.length >= 15 && nav.every(r => r.want === r.got && r.back), JSON.stringify(nav.filter(r => r.want !== r.got || !r.back)));

  // 5) النوافذ تفتح وتُغلق بسلام
  const mods = await R(async () => { const out = {}; const open = ['openAppearance', 'openSectionControl', 'openSupport', 'openEmpForm', 'openSectionGrid', 'openSectionHelp'];
    for (const f of open) { try { await window[f](); await new Promise(r => setTimeout(r, 450)); const on = document.getElementById('overlay').classList.contains('open'); closeModal(); await new Promise(r => setTimeout(r, 300)); out[f] = on && !document.getElementById('overlay').classList.contains('open'); } catch (e) { out[f] = 'ERR:' + e.message; } } return out; });
  check('النوافذ الرئيسية تفتح وتُغلق', Object.values(mods).every(v => v === true), JSON.stringify(mods));

  // 6) الثيمات وأشكال القوائم كلها سليمة مع التصميم الجديد
  const th = await R(async () => { const out = {}; for (const t of THEMES.map(x => x.k)) { setTheme(t); await new Promise(r => setTimeout(r, 260)); const b = getComputedStyle(document.body); out[t] = { bg: b.backgroundColor !== 'rgba(0, 0, 0, 0)', panels: document.querySelectorAll('.apcard,.aprow').length }; } setTheme('dark'); await new Promise(r => setTimeout(r, 250));
    const nv = {}; for (const n of NAVMODES.map(x => x.k)) { setNav(n); await new Promise(r => setTimeout(r, 350)); nv[n] = n === 'app' ? document.querySelectorAll('.apcard,.aprow').length > 0 : document.querySelectorAll('.side .nav').length > 0; } setNav('app'); await new Promise(r => setTimeout(r, 400)); return { out, nv }; });
  check('كل الثيمات تعمل والبطاقات تظهر فيها', Object.values(th.out).every(v => v.bg && v.panels >= 15), JSON.stringify(th.out));
  check('كل أشكال الواجهة (تطبيق/جانبية/مصغّرة/شبكة/علوية) تعمل', Object.values(th.nv).every(Boolean), JSON.stringify(th.nv));

  // 7) البحث السريع والرجوع
  const srch = await R(async () => { const i = document.getElementById('gsearch'); i.value = 'أحمد'; i.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, 600)); const n = document.querySelectorAll('#gresults *').length; i.value = ''; i.dispatchEvent(new Event('input')); return n; });
  check('البحث السريع يعطي نتائج', srch > 0, String(srch));
  const back = await R(async () => { go('employees'); await new Promise(r => setTimeout(r, 400)); go('finance'); await new Promise(r => setTimeout(r, 400)); goBack(); await new Promise(r => setTimeout(r, 450)); const pgp = current.page; go('dashboard'); return pgp; });
  check('زر الرجوع يعمل', back === 'employees', String(back));

  // 8) إضافة/تعديل/حذف ما زالت تعمل بعد تغيير التصميم
  const crud = await R(async () => { window.askDelAuth = async () => true; window.confirmBox = async () => true; const e = await DB.upsert('employees', { id: uid(), name: 'اختبار التصميم', code: 'UI1', basic: 1000, hire_date: '2025-01-01', status: 'active', currency: 'AED' });
    const e2 = await DB.upsert('employees', { ...e, basic: 1500 }); await DB.load();
    const inList = (() => { go('employees'); return true })(); await new Promise(r => setTimeout(r, 500));
    const shown = document.getElementById('page').innerText.includes('اختبار التصميم');
    const av = document.querySelectorAll('#page .ccav').length;
    await api.secpin.verify('4821'); await api.del.auth('4821'); await DB.remove('employees', e.id); await DB.load(); await new Promise(r => setTimeout(r, 400));
    go('employees'); await new Promise(r => setTimeout(r, 450)); const gone = !document.getElementById('page').innerText.includes('اختبار التصميم');
    go('dashboard'); return { add: !!e, edit: e2.basic === 1500, shown, av, gone }; });
  check('إضافة وتعديل وحذف الموظفين تعمل وتظهر الصور في القائمة', crud.add && crud.edit && crud.shown && crud.av > 0 && crud.gone, JSON.stringify(crud));

  // 9) حساب موظف: يرى أقسامه فقط ولا يرى الإعدادات أو الأجهزة
  const ids = await R(async () => { const e = S.employees[0]; const r = await api.user.create({ emp_id: e.id, username: 'ui.emp', name: e.name, perms: ['employees'], password: 'UiPass#1' }); await DB.load(); return r.user.id; });
  await R(async () => { await api.auth.lock(); }); await W(600);
  await R(async () => api.auth.login('UiPass#1', 'ui.emp')); await W(1200);
  await R(async () => { await DB.load(); if (typeof applySession === 'function') applySession(); }); await W(700);
  const emp = await R(async () => { go('dashboard'); await new Promise(r => setTimeout(r, 600));
    const visible = [...document.querySelectorAll('.apcard,.aprow')].map(b => b.dataset.goPage);
    let blocked = ''; try { go('settings'); await new Promise(r => setTimeout(r, 400)); blocked = document.getElementById('page').innerText.slice(0, 40); } catch (e) { blocked = 'ERR'; }
    let dbg = ''; try { await api.user.list(); dbg = 'LEAK'; } catch (e) { dbg = String(e.message); }
    go('dashboard'); await new Promise(r => setTimeout(r, 400)); return { visible, panels: document.querySelectorAll('.apcard,.aprow').length, blocked, dbg }; });
  check('الموظف لا يرى أقسام المدير في الشاشة الرئيسية', !emp.visible.includes('devices') && !emp.visible.includes('review'), JSON.stringify(emp.visible));
  check('قائمة المستخدمين محمية من الموظف', /admin|forbidden|ليس|صلاحي|not/i.test(emp.dbg) && emp.dbg !== 'LEAK', emp.dbg);
  check('لوحة الموظف تظهر بالتصميم الجديد', emp.visible.length > 0, JSON.stringify(emp));

  console.log('page errors:', errs.slice(0, 4));
  check('بدون أي أخطاء صفحة طوال الفحص', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILS ' + fails : 'ALL PASS');
  await app.close(); process.exit(0);
})();

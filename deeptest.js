/* فحص عميق 5.9.3: كل شكل واجهة × كل ثيم × كل قسم — التمرير، الأيقونات والأسماء، الأزرار، النوافذ، التخطيط */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/deepH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/deepH', USER: 'dp', USERNAME: 'dp' } });
  const p = await app.firstWindow(); await p.setViewportSize({ width: 1366, height: 768 }).catch(() => {});
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : String(x).slice(0, 300)); if (!c) fails++; };
  const R = (fn, a) => p.evaluate(fn, a); const W = ms => new Promise(r => setTimeout(r, ms));
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Demo#2026'); await p.fill('#pw2', 'Demo#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  await R(async () => { window.confirmBox = async () => true; await loadDemo(); }); await W(2500);
  // بيانات كثيرة لضمان صفحات طويلة تحتاج تمرير
  await R(async () => { const e0 = S.employees[0]; for (let i = 0; i < 40; i++) await DB.upsert('employees', { id: uid(), name: 'موظف اختبار ' + i, code: 'T' + i, basic: 2000 + i, currency: 'AED', hire_date: '2025-01-01', status: 'active', job: 'فني', dept: 'التشغيل' });
    for (let i = 0; i < 30; i++) await DB.upsert('documents', { id: uid(), emp_id: e0.id, type: 'مستند ' + i, number: 'N' + i, expiry_date: '2027-01-' + String((i % 28) + 1).padStart(2, '0') });
    for (let i = 0; i < 30; i++) await DB.upsert('treasury', { id: uid(), date: iso(today()), direction: i % 2 ? 'in' : 'out', category: 'بند ' + i, amount: 100 + i, currency: 'AED', account: 'main' });
    await DB.load(); }); await W(1500);

  const PAGES = ['dashboard', 'employees', 'documents', 'finance', 'payroll', 'leaves', 'field', 'projects', 'alerts', 'reports', 'print', 'offers', 'taxes', 'letters', 'guide', 'userhelp', 'devices', 'review', 'settings'];
  const NAVS = ['app', 'top', 'side', 'compact', 'grid'];
  const THEMES_K = ['dark', 'light', 'blue', 'pink', 'lavender', 'mauve'];

  // 1) التمرير يعمل في كل قسم طويل × كل شكل واجهة × عدة ثيمات
  const scroll = await R(async ({ PAGES, NAVS }) => {
    const bad = [];
    for (const nav of NAVS) {
      for (const th of ['dark', 'light']) {
        setNav(nav); setTheme(th); if (typeof applyTopLayout === 'function') applyTopLayout(); render(); await new Promise(r => setTimeout(r, 420));
        for (const pg of PAGES) {
          go(pg); await new Promise(r => setTimeout(r, 300));
          const sc = document.querySelector('.main');
          const doc = document.documentElement;
          const tall = sc.scrollHeight > sc.clientHeight + 8 || doc.scrollHeight > doc.clientHeight + 8;
          if (!tall) continue;
          const before = sc.scrollTop + doc.scrollTop;
          sc.scrollTop = 500; doc.scrollTop = 500; await new Promise(r => setTimeout(r, 90));
          const after = sc.scrollTop + doc.scrollTop;
          const hidden = getComputedStyle(sc).overflowY === 'hidden' && getComputedStyle(doc).overflowY === 'hidden';
          if (after <= before || hidden) bad.push(nav + '/' + th + '/' + pg + ' h=' + sc.scrollHeight + '/' + sc.clientHeight);
          sc.scrollTop = 0; doc.scrollTop = 0;
        }
      }
    }
    setNav('app'); setTheme('dark'); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 450));
    return bad;
  }, { PAGES, NAVS });
  check('التمرير العمودي يعمل في كل قسم طويل × كل شكل × الثيمات', scroll.length === 0, scroll.slice(0, 8).join(' | '));

  // 2) كل زر في أشرطة الأدوات له شكل واضح (أيقونة أو نص) واسم عند الوقوف عليه
  const btns = await R(async (NAVS) => {
    const bad = [];
    for (const nav of NAVS) {
      setNav(nav); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 450));
      document.querySelectorAll('.actions .btn, #topTools .btn, #appbar .btn, .side .foot .btn').forEach(b => {
        if (b.offsetParent === null) return;
        const hasSvg = !!b.querySelector('svg'), txt = (b.textContent || '').trim();
        const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(txt);
        const title = (b.getAttribute('title') || '').trim();
        const r = b.getBoundingClientRect();
        if (!hasSvg && !txt) bad.push(nav + ': زر فاضي');
        else if (emoji) bad.push(nav + ': إيموجي ' + txt.slice(0, 10));
        else if (!title) bad.push(nav + ': بدون اسم ' + txt.slice(0, 12));
        else if (r.width < 18 || r.height < 18) bad.push(nav + ': صغير جداً ' + title);
      });
    }
    setNav('app'); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 450));
    return bad;
  }, NAVS);
  check('كل أزرار الأدوات لها أيقونة واضحة واسم يظهر عند الوقوف عليها', btns.length === 0, btns.slice(0, 8).join(' | '));

  // 3) كل ثيم × كل شكل: الواجهة سليمة (لا تمرير أفقي، لا تداخل، العناصر ظاهرة)
  const layout = await R(async ({ PAGES, NAVS, THEMES_K }) => {
    const bad = [];
    for (const nav of NAVS) for (const th of THEMES_K) {
      setNav(nav); setTheme(th); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 380));
      for (const pg of ['dashboard', 'employees', 'finance', 'settings']) {
        go(pg); await new Promise(r => setTimeout(r, 260));
        const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        const m = document.querySelector('.main'); const mo = m.scrollWidth - m.clientWidth;
        const page = document.getElementById('page');
        if (over > 4 || mo > 4) bad.push(nav + '/' + th + '/' + pg + ' overflow ' + over + '/' + mo);
        if (page.innerText.trim().length < 30) bad.push(nav + '/' + th + '/' + pg + ' فارغ');
      }
    }
    setNav('app'); setTheme('dark'); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 450));
    return bad;
  }, { PAGES, NAVS, THEMES_K });
  check('كل ثيم × كل شكل: لا تمرير أفقي ولا صفحات فارغة', layout.length === 0, layout.slice(0, 8).join(' | '));

  // 4) كل الأقسام: كل زر داخل الصفحة له وظيفة
  const dead = await R(async (PAGES) => {
    const bad = []; let total = 0;
    for (const pg of PAGES) { go(pg); await new Promise(r => setTimeout(r, 320));
      [...document.querySelectorAll('#page button, #page .chip')].filter(b => b.offsetParent !== null).forEach(b => { total++;
        if (!(b.onclick || b.getAttribute('onclick') || b.dataset.goPage || b.dataset.goEmp || b.id || b.closest('[onclick]') || b.type === 'submit')) bad.push(pg + ':' + (b.innerText || '').trim().slice(0, 18)); }); }
    return { bad, total };
  }, PAGES);
  check('كل أزرار الأقسام لها وظيفة (' + dead.total + ' زر)', dead.bad.length === 0, dead.bad.slice(0, 6).join(' | '));

  // 4b) زر الرجوع العائم ظاهر دائماً حتى بعد التمرير
  const fab = await R(async ({ PAGES, NAVS }) => { const bad = [];
    for (const nav of NAVS) for (const th of ['dark', 'light', 'mauve']) {
      setNav(nav); setTheme(th); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 400));
      for (const pg of PAGES) { go(pg); await new Promise(r => setTimeout(r, 260));
        const sc = document.querySelector('.main'); sc.scrollTop = 99999; document.documentElement.scrollTop = 99999; await new Promise(r => setTimeout(r, 140));
        const f = document.getElementById('apFab');
        const cs = f && getComputedStyle(f); const vis = !!f && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0' && f.getBoundingClientRect().height > 20;
        const inView = f && f.getBoundingClientRect().bottom <= window.innerHeight + 1 && f.getBoundingClientRect().top >= 0;
        if (pg === 'dashboard') { if (vis) bad.push(nav + '/' + th + '/الرئيسية: الزر ظاهر وهو مش لازم'); }
        else if (!vis || !inView) bad.push(nav + '/' + th + '/' + pg + ' fab=' + vis + ' inView=' + inView);
        sc.scrollTop = 0; document.documentElement.scrollTop = 0; } }
    setNav('app'); setTheme('dark'); applyTopLayout(); go('dashboard'); render(); await new Promise(r => setTimeout(r, 450)); return bad; }, { PAGES, NAVS });
  check('زر الرجوع العائم ظاهر في كل قسم وكل ثيم حتى بعد التمرير لأسفل', fab.length === 0, fab.slice(0, 8).join(' | '));
  const fabGo = await R(async () => { go('employees'); await new Promise(r => setTimeout(r, 400)); document.querySelector('.main').scrollTop = 99999; await new Promise(r => setTimeout(r, 200)); document.getElementById('apFab').click(); await new Promise(r => setTimeout(r, 450)); return current.page; });
  check('الضغط على زر الرجوع العائم يرجّع للرئيسية', fabGo === 'dashboard', String(fabGo));

  // 5) النوافذ المهمة تفتح وتُغلق في كل شكل
  const mods = await R(async (NAVS) => {
    const bad = [];
    for (const nav of NAVS) { setNav(nav); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 400));
      for (const f of ['openAppearance', 'openSectionControl', 'openSupport', 'openEmpForm', 'openTreasuryForm', 'openLeaveForm', 'openDocForm', 'openProjectForm', 'openOfferForm']) {
        try { await window[f](f === 'openTreasuryForm' ? 'out' : undefined); await new Promise(r => setTimeout(r, 380));
          const on = document.getElementById('overlay').classList.contains('open'); closeModal(); await new Promise(r => setTimeout(r, 240));
          const off = !document.getElementById('overlay').classList.contains('open');
          if (!on || !off) bad.push(nav + '/' + f); } catch (e) { bad.push(nav + '/' + f + ':' + e.message); } } }
    setNav('app'); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 420));
    return bad;
  }, NAVS);
  check('كل النوافذ تفتح وتُغلق في كل شكل واجهة', mods.length === 0, mods.slice(0, 6).join(' | '));

  // 6) التنقل الكامل: كل قسم يُفتح ويُرجع منه
  const navAll = await R(async (PAGES) => { const bad = [];
    for (const pg of PAGES) { go(pg); await new Promise(r => setTimeout(r, 300)); if (current.page !== pg) bad.push('فتح ' + pg);
      const back = document.querySelector('.apback') || document.getElementById('abHome'); if (back && pg !== 'dashboard') { back.click(); await new Promise(r => setTimeout(r, 320)); if (current.page !== 'dashboard') bad.push('رجوع من ' + pg); } }
    return bad; }, PAGES);
  check('كل الأقسام تُفتح ويُرجع منها للرئيسية', navAll.length === 0, navAll.slice(0, 6).join(' | '));

  // 7) الوظائف الأساسية بعد كل هذا التبديل
  const crud = await R(async () => { window.askDelAuth = async () => true; window.confirmBox = async () => true;
    const e = await DB.upsert('employees', { id: uid(), name: 'فحص عميق', code: 'DP1', basic: 1234, currency: 'AED', hire_date: '2025-01-01', status: 'active' });
    const e2 = await DB.upsert('employees', { ...e, basic: 4321 });
    const d = await DB.upsert('documents', { id: uid(), emp_id: e.id, type: 'إقامة', number: 'X1', expiry_date: '2027-05-05' });
    const tr = await DB.upsert('treasury', { id: uid(), date: iso(today()), direction: 'in', category: 'تحصيل', amount: 500, currency: 'AED', account: 'main' });
    await api.secpin.verify('4821'); await api.del.auth('4821');
    await DB.remove('treasury', tr.id); await DB.remove('documents', d.id); await DB.remove('employees', e.id); await DB.load();
    const gone = !S.employees.some(x => x.id === e.id);
    return { add: !!e, edit: e2.basic === 4321, doc: !!d, tr: !!tr, gone }; });
  check('الإضافة والتعديل والحذف تعمل بعد كل التبديلات', crud.add && crud.edit && crud.doc && crud.tr && crud.gone, JSON.stringify(crud));

  for (const [nav, th] of [['app', 'dark'], ['top', 'dark'], ['app', 'light'], ['side', 'blue']]) {
    await R(([n, t]) => { setNav(n); setTheme(t); applyTopLayout(); go('employees'); render(); }, [nav, th]); await W(900);
    await p.screenshot({ path: `/mnt/user-data/outputs/deep-${nav}-${th}.png` });
  }
  await R(() => { setNav('app'); setTheme('dark'); applyTopLayout(); go('dashboard'); render(); }); await W(700);

  console.log('page errors:', errs.slice(0, 4));
  check('بدون أي أخطاء صفحة طوال الفحص العميق', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILS ' + fails : 'ALL PASS');
  await app.close(); process.exit(0);
})();

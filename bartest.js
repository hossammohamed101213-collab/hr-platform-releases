/* فحص الوصول للضبط/الإعدادات والتنقل في كل الشاشات وكل الثيمات وكل أشكال الواجهة (5.9.2) */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/barH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/barH', USER: 'bar', USERNAME: 'bar' } });
  const p = await app.firstWindow(); await p.setViewportSize({ width: 1366, height: 768 }).catch(() => {});
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  const R = (fn, a) => p.evaluate(fn, a); const W = ms => new Promise(r => setTimeout(r, ms));
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Demo#2026'); await p.fill('#pw2', 'Demo#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  await R(async () => { window.confirmBox = async () => true; await loadDemo(); }); await W(2500);

  const PAGES = ['dashboard', 'employees', 'finance', 'payroll', 'documents', 'leaves', 'field', 'projects', 'alerts', 'reports', 'print', 'offers', 'taxes', 'letters', 'guide', 'settings'];

  // 1) في كل شكل واجهة × كل الأقسام: يوجد طريق ظاهر للإعدادات وللرئيسية
  const probe = await R(async (PAGES) => {
    const out = {};
    const lum = c => { const m = (c || '').match(/\d+/g) || [0, 0, 0]; const f = m.slice(0, 3).map(v => { v = v / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * f[0] + .7152 * f[1] + .0722 * f[2]; };
    for (const nav of NAVMODES.map(x => x.k)) {
      setNav(nav); if (typeof applyTopLayout === 'function') applyTopLayout(); render(); await new Promise(r => setTimeout(r, 450));
      const per = {};
      for (const pg of PAGES) {
        go(pg); await new Promise(r => setTimeout(r, 300));
        const vis = el => !!el && el.offsetParent !== null && el.getBoundingClientRect().height > 8;
        const set = vis(document.getElementById('abSet')) || vis(document.querySelector('.side .nav[data-page="settings"]')) || vis(document.querySelector('.menuBtn'));
        const home = vis(document.getElementById('abHome')) || vis(document.querySelector('.side .nav[data-page="dashboard"]')) || vis(document.querySelector('.apback')) || vis(document.querySelector('.menuBtn'));
        const look = vis(document.getElementById('abLook')) || vis(document.querySelector('[onclick*="openAppearance"]'));
        const search = vis(document.getElementById('gsearch'));
        per[pg] = { set, home, look, search };
      }
      out[nav] = per;
    }
    setNav('app'); if (typeof applyTopLayout === 'function') applyTopLayout(); render(); await new Promise(r => setTimeout(r, 500));
    return out;
  }, PAGES);
  const bad = [];
  Object.entries(probe).forEach(([nav, per]) => Object.entries(per).forEach(([pg, v]) => { if (!v.set || !v.home || !v.look || !v.search) bad.push(nav + '/' + pg + ':' + JSON.stringify(v)); }));
  check('كل شكل واجهة × كل قسم: الإعدادات والرئيسية والمظهر والبحث ظاهرين', bad.length === 0, bad.slice(0, 6).join(' | '));

  // 2) كل الثيمات: الشريط ظاهر وبتباين مقروء
  const th = await R(async () => {
    const out = {}; const lum = c => { const m = (c || '').match(/\d+/g) || [0, 0, 0]; const f = m.slice(0, 3).map(v => { v = v / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * f[0] + .7152 * f[1] + .0722 * f[2]; };
    go('dashboard'); await new Promise(r => setTimeout(r, 400));
    for (const t of THEMES.map(x => x.k)) {
      setTheme(t); go('dashboard'); await new Promise(r => setTimeout(r, 420));
      const ab = document.getElementById('appbar'); const brand = ab && ab.querySelector('.abrand');
      const card = document.querySelector('.apcard,.aprow'); const title = card && card.querySelector('.aptx b');
      const cb = getComputedStyle(ab).backgroundColor, ct = getComputedStyle(brand).color;
      const kb = card ? getComputedStyle(card).backgroundColor : '', kt = title ? getComputedStyle(title).color : '';
      out[t] = { bar: !!ab && ab.getBoundingClientRect().height > 20, set: !!document.getElementById('abSet'), contrastBar: Math.abs(lum(cb) - lum(ct)) > .25, contrastCard: Math.abs(lum(kb) - lum(kt)) > .25, cards: document.querySelectorAll('.apcard,.aprow').length };
    }
    setTheme('dark'); await new Promise(r => setTimeout(r, 350)); return out;
  });
  check('كل الثيمات: الشريط ظاهر وأزراره موجودة', Object.values(th).every(v => v.bar && v.set && v.cards >= 15), JSON.stringify(th));
  check('كل الثيمات: النصوص مقروءة (تباين كافٍ)', Object.values(th).every(v => v.contrastBar && v.contrastCard), JSON.stringify(th));

  // 3) ترقية من أي قيمة محفوظة قديمة لا تكسر الشريط
  const up = await R(async () => { const o = {};
    for (const old of ['side', 'compact', 'grid', 'top', 'bad-value']) {
      localStorage.setItem('navmode', old); applyNav(getNav()); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 380));
      setNav('app'); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 450));
      o[old] = { bar: !!document.getElementById('appbar'), search: !!document.querySelector('#appbar #gsearch'), set: !!document.getElementById('abSet'), home: !!document.getElementById('abHome'), look: !!document.getElementById('abLook'), dup: document.querySelectorAll('#gsearch').length };
    } return o; });
  check('الترقية من أي شكل قديم تُبقي الشريط كاملاً بلا تكرار', Object.values(up).every(v => v.bar && v.search && v.set && v.home && v.look && v.dup === 1), JSON.stringify(up));

  // 4) الأزرار تعمل فعلياً في كل الثيمات وأشكال العرض
  const acts = await R(async () => { const o = {};
    for (const t of ['dark', 'light', 'blue', 'pink', 'lavender', 'mauve']) { setTheme(t); await new Promise(r => setTimeout(r, 300));
      for (const L of ['bento', 'rows', 'grid']) { setAppLayout(L); await new Promise(r => setTimeout(r, 350));
        document.getElementById('abSet').click(); await new Promise(r => setTimeout(r, 400)); const s = current.page;
        document.getElementById('abHome').click(); await new Promise(r => setTimeout(r, 400)); const h = current.page;
        document.getElementById('abLook').click(); await new Promise(r => setTimeout(r, 450)); const m = document.getElementById('overlay').classList.contains('open'); closeModal(); await new Promise(r => setTimeout(r, 250));
        o[t + '/' + L] = { s, h, m }; } }
    setTheme('dark'); setAppLayout('bento'); await new Promise(r => setTimeout(r, 400)); return o; });
  check('أزرار الإعدادات/الرئيسية/المظهر تعمل في كل ثيم وكل شكل عرض', Object.values(acts).every(v => v.s === 'settings' && v.h === 'dashboard' && v.m === true), JSON.stringify(Object.entries(acts).filter(([k, v]) => !(v.s === 'settings' && v.h === 'dashboard' && v.m))));

  // 5) تغيير شكل الواجهة من نافذة المظهر نفسها ثم الرجوع
  const swap = await R(async () => { setNav('side'); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 450));
    const sideOk = document.querySelector('.side').offsetParent !== null && !document.getElementById('appbar');
    setNav('app'); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 500));
    const appOk = !!document.getElementById('abSet') && document.querySelector('.side').offsetParent === null;
    return { sideOk, appOk }; });
  check('التبديل بين «تطبيق» و«قائمة جانبية» والعودة يشتغل بدون مشاكل', swap.sideOk && swap.appOk, JSON.stringify(swap));

  // لقطات لكل ثيم للمراجعة البصرية
  for (const t of ['dark', 'light', 'blue', 'mauve']) { await R(th => { setTheme(th); go('dashboard'); }, t); await W(900); await p.screenshot({ path: `/mnt/user-data/outputs/bar-${t}.png` }); }
  await R(() => { setTheme('dark'); go('employees'); }); await W(900); await p.screenshot({ path: '/mnt/user-data/outputs/bar-section.png' });

  console.log('page errors:', errs.slice(0, 3));
  check('بدون أخطاء صفحة', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILS ' + fails : 'ALL PASS');
  await app.close(); process.exit(0);
})();

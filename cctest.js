/* اختبار 5.9.0: مركز القيادة — كل الأقسام في شريط علوي + لوحة واحدة */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/ccH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/ccH', USER: 'cc', USERNAME: 'cc' } });
  const p = await app.firstWindow(); await p.setViewportSize({ width: 1500, height: 950 }).catch(() => {});
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  const R = (fn, a) => p.evaluate(fn, a); const W = ms => new Promise(r => setTimeout(r, ms));
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Demo#2026'); await p.fill('#pw2', 'Demo#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  await R(async () => { window.confirmBox = async () => true; await loadDemo(); }); await W(2500);
  await R(() => { go('dashboard'); }); await W(1200);

  const nav = await R(() => ({ mode: document.body.getAttribute('data-nav'), sideVisible: !!document.querySelector('.side') && document.querySelector('.side').offsetParent !== null, topbar: document.querySelector('.topbar').offsetParent !== null, bar: !!document.getElementById('appbar'), cards: document.querySelectorAll('.apcard').length, hero: !!document.querySelector('.aphero'), search: !!document.querySelector('#appbar #gsearch') }));
  check('لا توجد قائمة جانبية ولا شريط تنقل تقليدي', nav.sideVisible === false && nav.topbar === false && nav.bar === true, JSON.stringify(nav));
  check('الشاشة الرئيسية بطاقات لكل الأقسام (' + nav.cards + ' بطاقة)', nav.mode === 'app' && nav.cards >= 15 && nav.hero && nav.search, JSON.stringify(nav));

  const all = await R(() => { const keys = [...document.querySelectorAll('.apcard')].map(b => b.dataset.goPage); const allowed = APP_SECTIONS.filter(s => !s.off && pageAllowed(s.k)).map(s => s.k); return { keys, missing: allowed.filter(k => !keys.includes(k)) }; });
  check('كل أقسام البرنامج ظاهرة في الشاشة الرئيسية بدون إخفاء', all.missing.length === 0, JSON.stringify(all.missing));

  const ai = await R(() => /مساعد ذكي|المساعد الذكي|AI Assistant/i.test(document.body.innerText));
  check('لا يوجد مساعد ذكي في الواجهة', ai === false, String(ai));

  const open = await R(async () => { const res = []; for (const k of ['employees', 'finance', 'payroll', 'documents', 'leaves', 'field', 'projects', 'alerts']) {
      go('dashboard'); await new Promise(r => setTimeout(r, 350));
      const c = document.querySelector(`.apcard[data-go-page="${k}"]`); if (!c) { res.push({ k, got: 'no-card' }); continue; }
      c.click(); await new Promise(r => setTimeout(r, 500));
      res.push({ k, got: current.page, head: !!document.querySelector('.apsec'), back: !!document.querySelector('.apback'), len: document.getElementById('page').innerText.length }); }
    return res; });
  check('كل بطاقة تفتح قسمها مباشرة بضغطة واحدة', open.every(r => r.k === r.got && r.len > 60), JSON.stringify(open.filter(r => r.k !== r.got)));
  check('كل قسم فيه هيدر بنفس الهوية وزر رجوع واضح', open.every(r => r.head && r.back), JSON.stringify(open.filter(r => !r.back)));

  const back = await R(async () => { const c = document.querySelector('.apcard[data-go-page="employees"]'); go('dashboard'); await new Promise(r => setTimeout(r, 400)); document.querySelector('.apcard[data-go-page="employees"]').click(); await new Promise(r => setTimeout(r, 500)); document.querySelector('.apback').click(); await new Promise(r => setTimeout(r, 500)); return { page: current.page, cards: document.querySelectorAll('.apcard').length }; });
  check('زر الرجوع يعيدك للشاشة الرئيسية', back.page === 'dashboard' && back.cards >= 15, JSON.stringify(back));

  const stats = await R(async () => { const o = {}; for (const k of ['employees', 'finance', 'payroll', 'documents']) { go(k); await new Promise(r => setTimeout(r, 450)); o[k] = document.querySelectorAll('.apstat').length; } go('dashboard'); await new Promise(r => setTimeout(r, 400)); return o; });
  check('كل قسم فيه ملخص سريع على شكل بطاقات', Object.values(stats).every(v => v >= 3), JSON.stringify(stats));

  const acts = await R(async () => { go('finance'); await new Promise(r => setTimeout(r, 500)); const b = [...document.querySelectorAll('.apact')]; const n = b.length; b[0].click(); await new Promise(r => setTimeout(r, 600)); const opened = document.getElementById('overlay').classList.contains('open'); closeModal(); await new Promise(r => setTimeout(r, 300)); go('dashboard'); return { n, opened }; });
  check('الإجراءات الرئيسية داخل القسم تشتغل بضغطة', acts.n >= 2 && acts.opened, JSON.stringify(acts));

    const mob = await (async () => { await p.setViewportSize({ width: 420, height: 860 }); await W(700); const c = await R(() => { const g = document.querySelector('.apbento,.apgrid,.aprows'); return { cols: getComputedStyle(g).gridTemplateColumns.split(' ').filter(x => x !== 'none').length || 1, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }; }); await p.setViewportSize({ width: 1440, height: 900 }); await W(600); return c; })();
  check('التصميم يشتغل على الموبايل (عمودان بدون تمرير أفقي)', mob.cols <= 2 && mob.over <= 4, JSON.stringify(mob));

  const viz = await R(async () => { go('dashboard'); await new Promise(r => setTimeout(r, 600));
    const cards = [...document.querySelectorAll('.apcard')];
    const withViz = cards.filter(c => c.querySelector('.apviz, .apbars, .apdon, .apbarsv')).length;
    return { cards: cards.length, withViz, faces: document.querySelectorAll('.apfaces .apav').length, legends: document.querySelectorAll('.aplg').length }; });
  check('كل بطاقة فيها تحليل مرئي (شارت) من بياناتها', viz.withViz >= viz.cards - 2 && viz.legends >= 10, JSON.stringify(viz));
  check('صور الموظفين ظاهرة على بطاقة الموظفين', viz.faces >= 3, JSON.stringify(viz));

  const lays = await R(async () => { const o = {};
    for (const [k] of AP_LAYOUTS) { setAppLayout(k); await new Promise(r => setTimeout(r, 650));
      o[k] = { n: document.querySelectorAll('.apcard, .aprow').length, viz: document.querySelectorAll('.apviz, .apbars, .apdon, .apbarsv').length, box: !!document.querySelector(k === 'rows' ? '.aprows' : k === 'bento' ? '.apbento' : '.apgrid') }; }
    setAppLayout('bento'); await new Promise(r => setTimeout(r, 600)); return o; });
  check('3 أشكال للشاشة الرئيسية تعمل (لوحة/صفوف/مربعات)', Object.values(lays).every(v => v.n >= 15 && v.viz >= 10 && v.box), JSON.stringify(lays));

  const gear = await R(async () => { const b = document.getElementById('abSet'); if (!b) return 'no-btn'; b.click(); await new Promise(r => setTimeout(r, 600)); const pg = current.page; go('dashboard'); await new Promise(r => setTimeout(r, 400)); return pg; });
  check('زر الإعدادات فوق جنب أزرار الخدمات ويفتح الإعدادات', gear === 'settings', String(gear));
  const noSetCard = await R(() => !document.querySelector('.apcard[data-go-page="settings"], .aprow[data-go-page="settings"]'));
  check('الإعدادات مش بطاقة في الشبكة', noSetCard === true);

  const svgs = await R(() => ({ page: document.querySelectorAll('#page svg').length, bar: document.querySelectorAll('#appbar svg').length, emoji: (document.querySelector('#appbar').innerText.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length }));
  check('أيقونات SVG احترافية بدل الإيموجي', svgs.page >= 20 && svgs.bar >= 5 && svgs.emoji === 0, JSON.stringify(svgs));

  // الشريط العلوي لا يختفي أبداً (حتى بعد الترقية من شكل قديم)
  const barOk = async () => R(() => { const ab = document.getElementById('appbar'); return { ab: !!ab, search: !!document.querySelector('#appbar #gsearch'), home: !!document.getElementById('abHome'), set: !!document.getElementById('abSet'), look: !!document.getElementById('abLook'), btns: document.querySelectorAll('#appbar .btn').length, vis: ab ? ab.getBoundingClientRect().height > 20 : false }; });
  const up = await R(async () => { localStorage.setItem('navmode', 'top'); applyNav('top'); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 600));
    setNav('app'); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 700)); return true; });
  const b1 = await barOk();
  check('الشريط العلوي كامل بعد التبديل من الشكل القديم (ترقية)', b1.ab && b1.search && b1.home && b1.set && b1.look && b1.vis, JSON.stringify(b1));
  const b2 = await R(async () => { for (const m of ['side', 'compact', 'grid', 'top', 'app']) { setNav(m); applyTopLayout(); render(); await new Promise(r => setTimeout(r, 420)); }
    return { ab: !!document.getElementById('appbar'), search: !!document.querySelector('#appbar #gsearch'), set: !!document.getElementById('abSet'), look: !!document.getElementById('abLook'), home: !!document.getElementById('abHome'), dup: document.querySelectorAll('#abSet').length }; });
  check('التنقل بين كل أشكال الواجهة ذهاباً وإياباً يحافظ على الشريط', b2.ab && b2.search && b2.set && b2.look && b2.home && b2.dup === 1, JSON.stringify(b2));
  const look = await R(async () => { document.getElementById('abLook').click(); await new Promise(r => setTimeout(r, 600)); const on = document.getElementById('overlay').classList.contains('open'); const txt = document.getElementById('modal').innerText.slice(0, 80); closeModal(); await new Promise(r => setTimeout(r, 300)); return { on, txt }; });
  check('زر المظهر يفتح نافذة تغيير شكل الواجهة', look.on === true, JSON.stringify(look));
  const home = await R(async () => { go('employees'); await new Promise(r => setTimeout(r, 500)); document.getElementById('abHome').click(); await new Promise(r => setTimeout(r, 500)); return current.page; });
  check('زر الشاشة الرئيسية يرجّعك من أي قسم', home === 'dashboard', String(home));

  await p.screenshot({ path: '/mnt/user-data/outputs/cc-real-dashboard.png' });
  await R(() => { go('employees'); }); await W(900); await p.screenshot({ path: '/mnt/user-data/outputs/cc-real-employees.png' });
  console.log('page errors:', errs.slice(0, 3));
  check('بدون أخطاء صفحة', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILS ' + fails : 'ALL PASS');
  await app.close(); process.exit(0);
})();

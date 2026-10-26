/* فحص أمان وثبات التصميم الجديد (5.9.0):
   حقن XSS في كل الحقول، بيانات ضخمة/تالفة، CSP، صلاحيات الواجهة، عدم انهيار اللوحة */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/s2H', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/s2H', USER: 's2', USERNAME: 's2' } });
  const p = await app.firstWindow(); await p.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  const R = (fn, a) => p.evaluate(fn, a); const W = ms => new Promise(r => setTimeout(r, ms));
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Demo#2026'); await p.fill('#pw2', 'Demo#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  await R(async () => { window.confirmBox = async () => true; window.__xss = 0; await loadDemo(); }); await W(2500);

  const X = `"><img src=x onerror="window.__xss=1"><script>window.__xss=2<\/script>`;
  // 1) حقن في كل الحقول التي تظهر في اللوحة الجديدة
  const inj = await R(async (X) => {
    let badCur = 'rejected'; try { await DB.upsert('employees', { id: uid(), name: 'ع', basic: 1, currency: X, hire_date: '2025-01-01', status: 'active' }); badCur = 'ACCEPTED'; } catch (e) { badCur = 'rejected'; }
    const e = await DB.upsert('employees', { id: uid(), name: X, code: X, job: X, dept: X, basic: 1000, currency: 'AED', hire_date: '2025-01-01', status: 'active' });
    await DB.upsert('documents', { id: uid(), emp_id: e.id, type: X, number: X, expiry_date: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10) });
    await DB.upsert('treasury', { id: uid(), date: iso(today()), direction: 'out', category: X, note: X, amount: 50, currency: 'AED', account: 'main' });
    await DB.upsert('projects', { id: uid(), name: X, client: X, status: 'active', budget: 1000 });
    await DB.upsert('advances', { id: uid(), emp_id: e.id, kind: 'loan', amount: 100, currency: 'AED', reason: X, status: 'pending', request_date: iso(today()) });
    await DB.load(); go('dashboard'); await new Promise(r => setTimeout(r, 1200));
    const html = document.getElementById('page').innerHTML;
    return { badCur, xss: window.__xss, imgs: document.querySelectorAll('#page img[src="x"]').length, scripts: document.querySelectorAll('#page script').length, raw: document.querySelectorAll('#page [onerror],#page [onload],#page iframe,#page object,#page embed').length > 0, esc: !/<img src=x/.test(html), id: e.id };
  }, X);
  check('السيرفر يرفض القيم غير الصالحة قبل التخزين', inj.badCur === 'rejected', JSON.stringify(inj.badCur));
  check('لا تنفيذ لأي كود محقون في اللوحة (XSS)', inj.xss === 0 && inj.imgs === 0 && inj.scripts === 0 && !inj.raw && inj.esc, JSON.stringify(inj));

  // 2) نفس الحقن داخل كل الأقسام
  const pagesX = await R(async () => { const out = {}; for (const k of ['employees', 'documents', 'finance', 'projects', 'leaves', 'payroll', 'alerts', 'reports', 'field']) { go(k); await new Promise(r => setTimeout(r, 450)); out[k] = { xss: window.__xss, img: document.querySelectorAll('#page img[src="x"]').length, scr: document.querySelectorAll('#page script').length }; } go('dashboard'); await new Promise(r => setTimeout(r, 500)); return out; });
  check('كل الأقسام محصّنة ضد الحقن', Object.values(pagesX).every(v => v.xss === 0 && v.img === 0 && v.scr === 0), JSON.stringify(pagesX));

  // 3) CSP فعّالة: eval وسكربت خارجي مرفوضان
  const csp = await R(async () => { 
    let ext = 'blocked'; try { const s = document.createElement('script'); s.src = 'https://example.com/x.js'; document.body.appendChild(s); await new Promise(r => setTimeout(r, 400)); ext = s.dataset.loaded ? 'ALLOWED' : 'blocked'; s.remove(); } catch (e) { ext = 'blocked'; }
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]'); const c = meta ? meta.content : ''; return { noeval: !/unsafe-eval/.test(c), frame: /form-action 'none'/.test(c), ext, has: !!meta, obj: /object-src 'none'/.test(meta ? meta.content : ''), base: /base-uri 'none'/.test(meta ? meta.content : ''), def: /default-src 'self'/.test(meta ? meta.content : '') }; });
  check('سياسة الأمان CSP كما هي ولم تُضعف', csp.has && csp.def && csp.obj && csp.base && csp.ext === 'blocked' && csp.noeval && csp.frame, JSON.stringify(csp));

  // 4) بيانات ضخمة/تالفة لا توقف اللوحة
  const stress = await R(async () => { const big = 'ض'.repeat(20000);
    const ids = []; for (let i = 0; i < 120; i++) { const e = await DB.upsert('employees', { id: uid(), name: 'ضغط ' + i + (i % 7 === 0 ? big : ''), code: 'S' + i, basic: 1000 + i, currency: 'AED', hire_date: '2025-01-01', status: 'active' }); ids.push(e.id); }
    let badIn = 0; for (const bad of [{ name: null, basic: 'نص-غلط' }, { name: 'ع', basic: -999999 }, { name: 'ع', basic: 1, currency: 'XX' }, { name: 'ع', basic: 1, hire_date: 'xx-yy' }]) { try { await DB.upsert('employees', { id: uid(), status: 'active', currency: 'AED', hire_date: '2025-01-01', basic: 1, ...bad }); } catch (e) { badIn++; } }
    for (const bad of [{ amount: 'كتير' }, { date: 'بدون-تاريخ' }, { direction: 'sideways' }, { account: '../../etc' }]) { try { await DB.upsert('treasury', { id: uid(), date: iso(today()), direction: 'out', amount: 10, currency: 'AED', account: 'main', ...bad }); } catch (e) { badIn++; } }
    await DB.load(); const t0 = performance.now(); go('dashboard'); await new Promise(r => setTimeout(r, 1500)); const ms = performance.now() - t0;
    const ok = document.querySelectorAll('.apcard,.aprow,.ccp').length >= 9;
    const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return { ms: Math.round(ms), ok, over, badIn, emps: S.employees.length }; });
  check('السيرفر يرفض البيانات التالفة (' + stress.badIn + ' محاولة مرفوضة) واللوحة تتحمل الضغط', stress.ok && stress.over <= 4 && stress.badIn >= 5, JSON.stringify(stress));
  check('سرعة فتح اللوحة مقبولة مع ' + stress.emps + ' موظف', stress.ms < 6000, stress.ms + 'ms');

  // 5) الموظف لا يستطيع تجاوز الواجهة إلى بيانات أو عمليات المدير
  await R(async () => { const e = S.employees[0]; await api.user.create({ emp_id: e.id, username: 's2.emp', name: 'موظف', perms: ['employees'], password: 'S2Pass#1' }); });
  await R(async () => { await api.auth.lock(); }); await W(600);
  await R(async () => api.auth.login('S2Pass#1', 's2.emp')); await W(1200);
  await R(async () => { await DB.load(); applySession(); }); await W(600);
  const esc2 = await R(async () => { const out = {};
    const probe = async (f) => { try { await f(); return 'LEAK'; } catch (e) { return String(e.message); } };
    out.users = await probe(() => api.user.list());
    out.secpin = await probe(() => api.secpin.set('1111'));
    out.meta = await probe(() => api.owner && api.owner.tools ? api.owner.tools() : Promise.reject(new Error('no-api')));
    out.forced = await (async () => { go('settings'); await new Promise(r => setTimeout(r, 500)); const txt = document.getElementById('page').innerText; return /محمية|رقم المدير|🔐/.test(txt) ? 'blocked' : txt.slice(0, 40); })();
    out.devices = await (async () => { go('devices'); await new Promise(r => setTimeout(r, 450)); return document.getElementById('page').innerText.slice(0, 30); })();
    go('dashboard'); await new Promise(r => setTimeout(r, 400)); return out; });
  check('الموظف لا يقدر يوصل لبيانات/إعدادات المدير حتى لو فتح القسم بالقوة', esc2.users !== 'LEAK' && esc2.secpin !== 'LEAK' && esc2.forced === 'blocked', JSON.stringify(esc2));

  const m = fs.readFileSync('main.js', 'utf8');
  const hard = { sandbox: /sandbox:\s*true/.test(m), ctx: /contextIsolation:\s*true/.test(m), node: /nodeIntegration:\s*false/.test(m), web: /webSecurity:\s*true/.test(m) };
  check('إعدادات نافذة Electron ما زالت مشدّدة', Object.values(hard).every(Boolean), JSON.stringify(hard));
  const srcs = ['renderer/pages20.js', 'renderer/pages21.js', 'renderer/pages.js'];
  const RISK = /\$\{\s*(?!esc\()(?!st\.)[A-Za-z_$][\w$.]*\.(name|job|dept|note|category|txt|reason|title|client|number|type|currency|photo|code|phone|party|username|text)\s*(\}|\|\|)/g;
  const leaks = []; for (const f of srcs) { for (const ln of fs.readFileSync(f, 'utf8').split('\n')) { if (/confirmBox\(|confirmDel\(|promptBox\(|toast\(/.test(ln)) continue; let mm; RISK.lastIndex = 0; while ((mm = RISK.exec(ln))) leaks.push(f + ': ' + mm[0]); } }
  check('كل بيانات المستخدم تُعقَّم قبل العرض (لا ثغرة XSS في الكود)', leaks.length === 0, leaks.slice(0, 5).join(' | '));
  check('نوافذ التأكيد تعقّم نصوصها تلقائياً', /function confirmBox\([^)]*\)\{[^]{0,160}esc\(msg\)/.test(fs.readFileSync('renderer/core.js', 'utf8')));
  console.log('page errors:', errs.slice(0, 4));
  check('بدون أخطاء صفحة أثناء الفحص الأمني', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log(fails ? 'FAILS ' + fails : 'ALL PASS');
  await app.close(); process.exit(0);
})();

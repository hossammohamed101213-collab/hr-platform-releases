/* اختبار التسجيل الأولي + الموافقة + الشروط + طلب الشراء + جواز السفر + الصورة + الترحيب */
const { _electron: electron } = require('playwright'); const fs = require('fs'); const crypto = require('crypto'); const { spawn } = require('child_process');
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const privB64 = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'); const pubB64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const TOKEN = 'regtoken', PORT = 4602, URL = 'http://127.0.0.1:' + PORT;
async function launch(home, skip) { const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, ...(skip ? { HRP_SKIP_SIGNUP: '1' } : {}), HOME: home, USER: 'r' + home.slice(-2), USERNAME: 'r' + home.slice(-2), HRP_TEST_PUBKEY: pubB64 } }); const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CON ' + m.text()); }); return { app, p, errs }; }
let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
(async () => {
  for (const d of ['/home/claude/rgO', '/home/claude/rgC', '/home/claude/rgX']) fs.rmSync(d, { recursive: true, force: true });
  const srv = spawn('node', ['server.js'], { cwd: '/home/claude/hr-sync', env: { ...process.env, PORT, COMPANY_TOKEN: TOKEN, SIGN_PRIVATE_KEY: privB64 }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise(r => srv.stdout.on('data', d => String(d).includes('hr-sync on') && r()));
  let O, C, X;
  try {
    /* المالك */
    O = await launch('/home/claude/rgO', true); await O.p.waitForSelector('#pw1'); await O.p.fill('#pw1', 'Company#2026'); await O.p.fill('#pw2', 'Company#2026'); await O.p.fill('#sp1','4821'); await O.p.fill('#sp2','4821'); await O.p.click('#btnSetup'); await O.p.waitForTimeout(2500);
    await O.p.evaluate(({ u, t }) => api.sync.configure(u, t, true), { u: URL, t: TOKEN }); await O.p.evaluate(k => api.owner.setKey(k), privB64); await O.p.waitForTimeout(3000);
    /* عميل جديد: يظهر نموذج التسجيل بدل شاشة إنشاء كلمة المرور */
    C = await launch('/home/claude/rgC', false); await C.p.waitForSelector('#lockForm input', { timeout: 20000 });
    await C.app.evaluate(() => 0); await C.p.waitForTimeout(500);
    check('fresh install shows registration form (not password setup)', await C.p.evaluate(() => !!document.getElementById('rg_company') && !document.getElementById('btnSetup')));
    check('form has all fields', await C.p.evaluate(() => ['rg_company', 'rg_person', 'rg_activity', 'rg_phone', 'rg_user', 'rg_pw1', 'rg_pw2'].every(i => document.getElementById(i))));
    // قبل التسجيل لا يمكن استخدام التطبيق
    check('join-existing-company option present', await C.p.evaluate(() => !!document.getElementById('rg_join')));
    await C.p.evaluate(u => api.sync.configure(u, '', false), URL);
    await C.p.fill('#rg_company', 'شركة النور'); await C.p.fill('#rg_person', 'أحمد سالم'); await C.p.fill('#rg_activity', 'مقاولات وصيانة عامة'); await C.p.fill('#rg_phone', '+971501234567'); await C.p.fill('#rg_user', 'ahmed.s'); await C.p.fill('#rg_pw1', 'Ahmed#2026'); await C.p.fill('#rg_pw2', 'Wrong#2026');
    await C.p.click('#rg_send'); await C.p.waitForTimeout(500); check('mismatched passwords blocked', await C.p.evaluate(() => !!document.getElementById('rg_send')));
    await C.p.fill('#rg_pw2', 'Ahmed#2026'); await C.p.click('#rg_send'); await C.p.waitForTimeout(2000);
    check('moved to waiting-for-approval screen', await C.p.evaluate(() => !!document.getElementById('rg_verify') && /بانتظار موافقة المالك/.test(document.getElementById('lockSub').textContent)));
    // المالك يرى الإشعار على الداشبورد
    await O.p.evaluate(() => go('dashboard')); await O.p.waitForTimeout(500); await O.p.evaluate(() => regRefresh(false)); await O.p.waitForTimeout(1500);
    check('owner dashboard shows pending request with details', await O.p.evaluate(() => { const t = (document.getElementById('regPanel') || {}).textContent || ''; return /شركة النور/.test(t) && /أحمد سالم/.test(t) && /ahmed\.s/.test(t) && /مقاولات/.test(t) && /\+971501234567/.test(t) && /بانتظار موافقتك/.test(t); }), await O.p.evaluate(() => (document.getElementById('regPanel') || {}).textContent));
    // كود خاطئ/قبل الموافقة
    let r = await C.p.evaluate(() => api.reg.verify('ZZZZZZ')); check('verify before approval -> pending', r.ok === false && r.why === 'pending', JSON.stringify(r));
    // المالك يوافق
    const id = await O.p.evaluate(async () => (await api.reg.list()).items[0].id); const ap = await O.p.evaluate(i => api.reg.approve(i), id); check('owner approves -> code', ap.ok && /^[A-Z2-9]{6}$/.test(ap.code), JSON.stringify(ap));
    r = await C.p.evaluate(() => api.reg.verify('AAAAAA')); check('wrong code rejected', r.ok === false && r.why === 'code', JSON.stringify(r));
    const stC = await C.p.evaluate(() => api.lic.status()); 
    await C.p.fill('#rg_code', ap.code.toLowerCase()); await C.p.click('#rg_verify'); await C.p.waitForTimeout(5000);
    check('after code: account created & entered app', await C.p.evaluate(() => !document.getElementById('app').classList.contains('hidden') && S.session && S.session.role === 'admin'));
    const lic = await C.p.evaluate(() => api.lic.status()); check('trial started: 14 days', lic.state === 'trial' && lic.daysLeft === 14, JSON.stringify(lic));
    check('company/phone/activity applied to settings', await C.p.evaluate(() => S.settings.company === 'شركة النور' && S.settings.phone === '+971501234567' && /مقاولات/.test(S.settings.activities || '')));
    // الشروط
    await C.p.waitForTimeout(6000);
    check('terms modal appears after registration', await C.p.evaluate(() => !!document.getElementById('termsBox')));
    await C.p.evaluate(() => termsAnswer(true)); await C.p.waitForTimeout(1500);
    check('terms accepted & modal closed', await C.p.evaluate(() => !document.getElementById('overlay').classList.contains('open')) && (await C.p.evaluate(() => api.auth.status())).reg.termsPending === false);
    await O.p.evaluate(() => regRefresh(false)); await O.p.waitForTimeout(1200);
    check('owner sees terms accepted + active status', await O.p.evaluate(() => { const t = document.getElementById('regPanel').textContent; return /قبل/.test(t) && /فعّال/.test(t); }));
    // طلب الشراء
    await C.p.evaluate(() => openBuy()); await C.p.waitForTimeout(800);
    check('buy modal has request button + contact methods', await C.p.evaluate(() => !!document.getElementById('prBtn') && /وسائل التواصل/.test(document.querySelector('#modal').textContent)));
    await C.p.evaluate(() => openPurchaseRequest()); await C.p.waitForTimeout(600);
    check('purchase form prefilled from registration', await C.p.evaluate(() => fv('pr_company') === 'شركة النور' && fv('pr_person') === 'أحمد سالم'));
    await C.p.evaluate(() => sendPurchase()); await C.p.waitForTimeout(1500);
    await O.p.evaluate(() => regRefresh(false)); await O.p.waitForTimeout(1200);
    check('owner sees purchase request with machine id', await O.p.evaluate(m => { const t = document.getElementById('regPanel').textContent; return /شراء/.test(t) && t.includes(m); }, lic.machine));
    check('owner has issue-code button', await O.p.evaluate(() => !!document.querySelector('#regPanel button[onclick^="regIssue"]')));
    await O.p.evaluate(() => { const b = document.querySelector('#regPanel button[onclick^="regIssue"]'); b.click(); }); await O.p.waitForTimeout(2500);
    const code = await O.p.evaluate(() => (document.querySelector('#regOut b') || {}).textContent); check('owner issued activation code', /^[A-Z2-9]{4}(-[A-Z2-9]{4}){2}$/.test(code || ''), code);
    r = await C.p.evaluate(c => api.lic.activateCode(c, 'شركة النور'), code); check('customer activates paid code', r.ok && r.lic.plan === 'business');
    await C.p.evaluate(() => licApplied()); check('customer now licensed', (await C.p.evaluate(() => api.lic.status())).state === 'licensed');
    // جواز السفر
    const ppt = await C.p.evaluate(async () => { go('employees'); const e = await DB.upsert('employees', { id: uid(), name: 'سامي', code: 'P1', basic: 2000, status: 'active', currency: 'AED', hire_date: '2026-01-01', passport_no: 'N1234567' }); empTab = 'info'; go('employee', e.id); return e.id; });
    await C.p.waitForTimeout(500); check('passport shown in employee file', await C.p.evaluate(() => /N1234567/.test(document.getElementById('page').textContent)));
    await C.p.evaluate(id => openEmpForm(id), ppt).catch(() => { }); await C.p.waitForTimeout(500);
    const hasField = await C.p.evaluate(() => { const i = document.getElementById('f_passport'); return i ? i.value : null; }); check('passport field in edit form with value', hasField === 'N1234567', String(hasField));
    await C.p.evaluate(() => { document.getElementById('f_passport').value = 'Z9999999'; }); await C.p.evaluate(id => saveEmp(id), ppt); await C.p.waitForTimeout(1000);
    check('passport edit saved', await C.p.evaluate(id => (S.employees.find(e => e.id === id) || {}).passport_no === 'Z9999999', ppt));
    // الصورة في الزاوية
    check('header avatar present', await C.p.evaluate(() => !!document.querySelector('#hdrAvatar') && document.querySelector('#hdrAvatar').textContent.trim().length > 0));
    await C.p.evaluate(async () => { await DB.setSetting('adminPhoto', 'data:image/gif;base64,R0lGODlhAQABAAAAACw='); applySession(); });
    check('avatar shows photo', await C.p.evaluate(() => !!document.querySelector('#hdrAvatar img')));
    // الترحيب
    await C.p.evaluate(async () => { await DB.setSetting('greetings', { admin: 'صباح الخير يا وحش' }); showWelcome(); }); await C.p.waitForTimeout(300);
    check('welcome starts hidden (slow reveal) with big title', await C.p.evaluate(() => { const w = document.querySelector('.welcomepop'); return !!w && !!w.querySelector('.wp-tag') && /رسالة ترحيب/.test(w.textContent) && getComputedStyle(w.querySelector('.wp-in')).transitionDuration.startsWith('2'); }));
    await C.p.waitForTimeout(2500); check('welcome centered and fully visible', await C.p.evaluate(() => { const r = document.querySelector('.wp-in').getBoundingClientRect(); return Math.abs((r.left + r.width / 2) - innerWidth / 2) < 5 && Math.abs((r.top + r.height / 2) - innerHeight / 2) < 5 && +getComputedStyle(document.querySelector('.wp-in')).opacity > .95; }));
    // مستخدم قائم (meta موجود): لا تسجيل ولا شروط
    X = await launch('/home/claude/rgX', true); await X.p.waitForSelector('#pw1'); await X.p.fill('#pw1', 'Exist#2026'); await X.p.fill('#pw2', 'Exist#2026'); await X.p.fill('#sp1','4821'); await X.p.fill('#sp2','4821'); await X.p.click('#btnSetup'); await X.p.waitForTimeout(2500);
    const xs = await X.p.evaluate(() => api.auth.status()); check('existing/skip install: no reg stage, no terms', xs.reg.stage === 'none' && !xs.reg.termsPending);
    await X.p.evaluate(() => api.auth.lock()).catch(() => { }); 
    check('owner: no console/page errors', O.errs.length === 0, O.errs.join('|').slice(0, 300));
    check('customer: no console/page errors', C.errs.length === 0, C.errs.join('|').slice(0, 300));
    check('existing: no console/page errors', X.errs.length === 0, X.errs.join('|').slice(0, 300));
  } catch (e) { console.error('EXC', e); fails++; }
  for (const a of [O, C, X]) try { await a.app.close(); } catch { } srv.kill();
  console.log(fails ? '\n❌ ' + fails + ' FAILED' : '\n✅ ALL PASSED'); process.exit(fails ? 1 : 0);
})();

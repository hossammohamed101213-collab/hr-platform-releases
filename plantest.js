/* اختبار الباقات والتفعيل: سيرفر hr-sync حقيقي (Postgres) + جهاز المالك + جهاز عميل.
   التشغيل: DATABASE_URL=... pkill Xvfb; Xvfb :99 ... & DISPLAY=:99 node plantest.js */
const { _electron: electron } = require('playwright'); const fs = require('fs'); const crypto = require('crypto'); const { spawn } = require('child_process');
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const privB64 = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
const pubB64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const TOKEN = 'plantoken', PORT = 4601, URL = 'http://127.0.0.1:' + PORT;
async function launch(home) { const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: home, USER: 'u' + home.slice(-3), USERNAME: 'u' + home.slice(-3), HRP_TEST_PUBKEY: pubB64 } }); const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CON ' + m.text()); }); await p.waitForSelector('#pw1', { timeout: 20000 }); return { app, p, errs }; }
let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
const navVisible = (p, page) => p.evaluate(pg => { const b = document.querySelector('.nav[data-page=' + pg + ']'); return !!b && !b.classList.contains('hidden'); }, page);
(async () => {
  for (const d of ['/home/claude/plO', '/home/claude/plC']) fs.rmSync(d, { recursive: true, force: true });
  const srv = spawn('node', ['server.js'], { cwd: '/home/claude/hr-sync', env: { ...process.env, PORT, COMPANY_TOKEN: TOKEN, SIGN_PRIVATE_KEY: privB64 }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise(r => srv.stdout.on('data', d => String(d).includes('hr-sync on') && r()));
  await fetch(URL + '/healthz');
  let O, C;
  try {
    /* ---------- جهاز المالك ---------- */
    O = await launch('/home/claude/plO');
    await O.p.fill('#pw1', 'Company#2026'); await O.p.fill('#pw2', 'Company#2026'); await O.p.fill('#sp1','4821'); await O.p.fill('#sp2','4821'); await O.p.click('#btnSetup'); await O.p.waitForTimeout(2500);
    await O.p.evaluate(({ u, t }) => api.sync.configure(u, t, true), { u: URL, t: TOKEN }); await O.p.waitForTimeout(3500);
    let st = await O.p.evaluate(() => api.lic.status());
    check('owner (company-sync) device: licensed, all modules', st.state === 'licensed' && st.modules === null, JSON.stringify(st.lic));
    for (const pg of ['payroll', 'finance', 'taxes', 'offers']) check('owner sees nav ' + pg, await navVisible(O.p, pg));
    let r = await O.p.evaluate(() => api.lic.newCode({ name: 'x', plan: 'starter' })); check('newCode without private key -> no-key', r.why === 'no-key', JSON.stringify(r));
    await O.p.evaluate(k => api.owner.setKey(k), privB64);
    // الواجهة: أدوات المالك
    await O.p.evaluate(() => { setTab = 'security'; go('settings'); }); await O.p.waitForTimeout(800);
    check('owner tools: plan select exists', await O.p.evaluate(() => !!document.getElementById('cc_plan') && document.getElementById('cc_plan').options.length === 4));
    await O.p.evaluate(() => { document.getElementById('cc_name').value = 'شركة النور'; document.getElementById('cc_plan').value = 'starter'; document.getElementById('cc_uses').value = '2'; document.getElementById('cc_days').value = '365'; genActivationCode(); });
    await O.p.waitForTimeout(1500);
    const codeStarter = await O.p.evaluate(() => (document.getElementById('ccShow') || {}).textContent);
    check('UI created starter code', /^[A-Z2-9]{4}(-[A-Z2-9]{4}){2}$/.test(codeStarter || ''), codeStarter);
    await O.p.evaluate(() => { document.getElementById('cc_plan').value = 'custom'; ccPlanChange(); });
    check('custom plan reveals module checkboxes', await O.p.evaluate(() => getComputedStyle(document.getElementById('cc_mods')).display !== 'none'));
    await O.p.evaluate(() => { document.querySelector('.cc_mod[value=payroll]').checked = true; document.querySelector('.cc_mod[value=taxes]').checked = true; document.getElementById('cc_name').value = 'مخصص'; document.getElementById('cc_days').value = ''; genActivationCode(); });
    await O.p.waitForTimeout(1500);
    const codeCustom = await O.p.evaluate(() => (document.getElementById('ccShow') || {}).textContent);
    check('UI created custom code', /^[A-Z2-9]{4}(-[A-Z2-9]{4}){2}$/.test(codeCustom || ''), codeCustom);
    const rp = await O.p.evaluate(() => api.lic.newCode({ name: 'برو', plan: 'pro', max_uses: 1 })); const codePro = rp.code; check('API created pro code', rp.ok && rp.modules.includes('payroll') && !rp.modules.includes('finance'), JSON.stringify(rp));
    await O.p.evaluate(() => listActivationCodes()); await O.p.waitForTimeout(1000);
    check('codes list renders 3 rows', await O.p.evaluate(() => document.querySelectorAll('#cc_out tbody tr').length === 3), await O.p.evaluate(() => document.getElementById('cc_out').textContent.slice(0, 120)));

    /* ---------- جهاز العميل ---------- */
    C = await launch('/home/claude/plC');
    await C.p.fill('#pw1', 'Customer#2026'); await C.p.fill('#pw2', 'Customer#2026'); await C.p.fill('#sp1','4821'); await C.p.fill('#sp2','4821'); await C.p.click('#btnSetup'); await C.p.waitForTimeout(2500);
    await C.p.evaluate(u => api.sync.configure(u, '', false), URL);
    st = await C.p.evaluate(() => api.lic.status()); check('customer starts in trial with all modules', st.state === 'trial' && st.modules === null);
    for (const pg of ['payroll', 'finance']) check('trial sees nav ' + pg, await navVisible(C.p, pg));
    // بيانات في الأقسام أثناء التجربة
    const ids = await C.p.evaluate(async () => { const e = await DB.upsert('employees', { id: uid(), name: 'موظف تجريبي', code: 'T1', basic: 3000, status: 'active', currency: 'AED', hire_date: '2026-01-01' }); const pay = await DB.upsert('payments', { id: uid(), emp_id: e.id, month: '2026-09', basic: 3000, allowances: 0, bonus: 0, deductions: 0, amount: 3000, currency: 'AED', paid_at: '2026-09-25' }); return { e: e.id, pay: pay.id }; });
    // 1) الأساسية
    r = await C.p.evaluate(c => api.lic.activateCode(c, 'شركة النور'), codeStarter); check('activate starter code', r.ok && r.lic.plan === 'starter', JSON.stringify(r));
    await C.p.evaluate(() => licApplied()); await C.p.waitForTimeout(500);
    st = await C.p.evaluate(() => api.lic.status());
    check('state licensed with starter modules', st.state === 'licensed' && st.modules.join() === 'employees,documents,leaves,letters,guide', JSON.stringify(st.modules));
    for (const pg of ['employees', 'documents', 'leaves', 'letters', 'guide']) check('starter sees nav ' + pg, await navVisible(C.p, pg));
    for (const pg of ['payroll', 'finance', 'field', 'taxes', 'offers', 'reports']) check('starter hides nav ' + pg, !(await navVisible(C.p, pg)));
    check('session.perms excludes payroll', await C.p.evaluate(() => !S.session.perms.includes('payroll') && S.session.perms.includes('employees')));
    await C.p.evaluate(() => go('payroll')); await C.p.waitForTimeout(300);
    check('go(payroll) blocked -> dashboard', await C.p.evaluate(() => current.page === 'dashboard'));
    check('toast says plan lock', await C.p.evaluate(() => /غير مشمول في باقتك/.test(document.body.textContent)));
    const w = await C.p.evaluate(async () => { try { await api.db.upsert('payments', { id: 'abcdef123456', emp_id: null, month: '2026-10', basic: 1, allowances: 0, deductions: 0, amount: 1, currency: 'AED' }); return 'ALLOWED'; } catch (e) { return String(e.message); } });
    check('core rejects write to locked module (payments)', /no-permission/.test(w), w);
    const d = await C.p.evaluate(async () => { try { await api.db.delete('payments', 'whatever12345'); return 'ALLOWED'; } catch (e) { return String(e.message); } });
    check('core rejects delete in locked module', /no-permission/.test(d), d);
    check('db:load hides locked data', await C.p.evaluate(async () => { const x = await api.db.load(); return x.payments.length === 0 && x.employees.length >= 1; }));
    const emp = await C.p.evaluate(async () => { try { const e = await DB.upsert('employees', { id: uid(), name: 'موظف جديد', code: 'T2', basic: 1000, status: 'active', currency: 'AED', hire_date: '2026-02-01' }); return !!e.id; } catch (e) { return String(e.message); } });
    check('licensed module still writable (employees)', emp === true, String(emp));
    await C.p.evaluate(() => { openLicense(); }); await C.p.waitForTimeout(400);
    check('license modal shows plan + locked chips', await C.p.evaluate(() => /الأساسية/.test(document.querySelector('.modal-body').textContent) && /🔒/.test(document.querySelector('.modal-body').textContent)));
    await C.p.evaluate(() => closeModal());
    // 2) ترقية للاحترافية
    r = await C.p.evaluate(c => api.lic.activateCode(c, 'شركة النور'), codePro); check('upgrade with pro code', r.ok && r.lic.plan === 'pro');
    await C.p.evaluate(() => licApplied()); await C.p.waitForTimeout(500);
    for (const pg of ['payroll', 'offers', 'reports']) check('pro sees nav ' + pg, await navVisible(C.p, pg));
    for (const pg of ['finance', 'field', 'taxes']) check('pro hides nav ' + pg, !(await navVisible(C.p, pg)));
    check('payroll data from trial is back after upgrade', await C.p.evaluate(id => S.payments.some(p => p.id === id), ids.pay));
    await C.p.evaluate(() => go('payroll')); await C.p.waitForTimeout(500);
    check('go(payroll) works on pro', await C.p.evaluate(() => current.page === 'payroll'));
    // 3) مخصّصة
    r = await C.p.evaluate(c => api.lic.activateCode(c, 'مخصص'), codeCustom); check('custom code', r.ok && r.lic.plan === 'custom');
    await C.p.evaluate(() => licApplied()); await C.p.waitForTimeout(500);
    check('custom: payroll+taxes visible, leaves hidden', (await navVisible(C.p, 'payroll')) && (await navVisible(C.p, 'taxes')) && !(await navVisible(C.p, 'leaves')) && (await navVisible(C.p, 'employees')));
    // 4) إلغاء من المالك
    r = await O.p.evaluate(c => api.lic.revokeCode(c, true), codeCustom); check('owner revoked custom code', r.ok && r.revoked);
    st = await C.p.evaluate(async () => { const s = await api.lic.checkNow(); return s; });
    check('customer after check: expired+revoked (no trial fallback)', st.state === 'expired' && st.revoked === true, JSON.stringify(st));
    await C.p.waitForTimeout(800); await C.p.evaluate(() => licApplied());
    const w2 = await C.p.evaluate(async () => { try { await api.db.upsert('employees', { id: 'abcdef999999', name: 'x', status: 'active', currency: 'AED' }); return 'ALLOWED'; } catch (e) { return String(e.message); } });
    check('revoked: writes blocked (license-expired)', /license-expired/.test(w2), w2);
    check('revoked banner shown', await C.p.evaluate(() => /تم إلغاء الترخيص/.test(document.body.textContent) || /إلغاء/.test((document.querySelector('.banner') || {}).textContent || '')), '');
    // عميل جديد على نفس الكود الملغي لا يستطيع
    r = await C.p.evaluate(c => api.lic.activateCode(c, 'x'), codeCustom); check('re-activate revoked code -> revoked', r.ok === false && r.why === 'revoked', JSON.stringify(r));
    // المالك يستعيد
    r = await O.p.evaluate(c => api.lic.revokeCode(c, false), codeCustom); check('owner restored code', r.ok);
    r = await C.p.evaluate(c => api.lic.activateCode(c, 'مخصص'), codeCustom); check('re-activate after restore ok', r.ok);
    st = await C.p.evaluate(() => api.lic.status()); check('licensed again', st.state === 'licensed' && st.plan === undefined && st.lic.plan === 'custom');
    // كود غير صالح / بدون اتصال
    r = await C.p.evaluate(() => api.lic.activateCode('AAAA-BBBB-CCCC', 'x')); check('invalid code', r.ok === false && r.why === 'invalid', JSON.stringify(r));
    await C.p.evaluate(() => api.sync.configure('http://127.0.0.1:1', '', false)); r = await C.p.evaluate(c => api.lic.activateCode(c, 'x'), codeStarter); check('offline -> offline', r.ok === false && r.why === 'offline', JSON.stringify(r));
    // أمان: عميل (بدون صلاحية مالك) لا يستطيع إنشاء أكواد
    const tok = await C.p.evaluate(u => api.sync.configure(u, 'plantoken', false), URL);
    r = await C.p.evaluate(() => api.lic.newCode({ name: 'hack', plan: 'business' })); check('customer without owner key cannot create codes', r.ok === false && r.why === 'no-key', JSON.stringify(r));
    // الخادم نفسه يرفض طلب موقّع بمفتاح آخر
    const bad = crypto.generateKeyPairSync('ed25519').privateKey; const body = JSON.stringify({ name: 'h', plan: 'business' }); const ts = Date.now();
    const sig = Buffer.from(crypto.sign(null, Buffer.from('POST /license/newcode\n' + ts + '\n' + body), bad)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const hr = await fetch(URL + '/license/newcode', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'X-Owner-Ts': ts, 'X-Owner-Sig': sig }, body }); check('server rejects forged owner signature (token alone insufficient)', hr.status === 403);
    // لا أخطاء
    check('owner: no console/page errors', O.errs.length === 0, O.errs.join(' | ').slice(0, 400));
    check('customer: no console/page errors', C.errs.length === 0, C.errs.join(' | ').slice(0, 400));
  } catch (e) { console.error('EXC', e); fails++; }
  try { await O.app.close(); } catch { } try { await C.app.close(); } catch { } srv.kill();
  console.log(fails ? '\n❌ ' + fails + ' FAILED' : '\n✅ ALL PASSED'); process.exit(fails ? 1 : 0);
})();

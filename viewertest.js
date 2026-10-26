/* اختبار 5.6.2: حساب مشاهدة للمخ — إنشاء من الإعدادات، بلا موظف/صلاحيات، لا يدخل البرنامج، ويفتح النسخة المشفّرة بقارئ hr-reader.js */
const { _electron: electron } = require('playwright'); const fs = require('fs'); const path = require('path');
const R = require('/home/claude/hrreader_t/hr-reader.js');
(async () => {
  const HOME = '/home/claude/vwH'; fs.rmSync(HOME, { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME, USER: 'vw', USERNAME: 'vw' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => { if (!/Canvas is already/.test(String(e))) errs.push(String(e)); }); p.on('console', m => { if (m.type() === 'error' && !/Canvas is already/.test(m.text())) errs.push('console:' + m.text()); });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const R_ = (fn, arg) => p.evaluate(fn, arg); const W = ms => new Promise(r => setTimeout(r, ms));
  await R_(async () => { window.confirmBox = async () => true; await api.secpin.verify('4821'); await DB.upsert('employees', { id: uid(), name: 'موظف', code: 'E1', basic: 3000, hire_date: '2026-01-01', status: 'active', currency: 'AED' }); await DB.upsert('employees', { id: uid(), name: 'موظفة', code: 'E2', basic: 2000, hire_date: '2026-01-01', status: 'active', currency: 'AED' }); });
  // UI: settings -> users -> button -> create
  const ui = await R_(async () => { go('settings'); setTab = 'users'; render(); const t = document.getElementById('page').innerText; openBrainViewer(); const hasForm = !!document.getElementById('bv_user'); await brainViewerCreate(); await new Promise(r => setTimeout(r, 500)); const env = (document.getElementById('bv_env') || {}).value || ''; return { btn: /حساب مشاهدة للمخ/.test(t), hasForm, env }; });
  const pw = (ui.env.match(/HR_VIEWER_PASS=(\S+)/) || [])[1];
  check('button exists, form opens, env block shown with generated password', ui.btn && ui.hasForm && /HR_SYNC_URL=/.test(ui.env) && /HR_VIEWER_USER=brain\.viewer/.test(ui.env) && pw && pw.length >= 20, ui.env.replace(/HR_VIEWER_PASS=\S+/, 'HR_VIEWER_PASS=***'));
  const u = await R_(async () => { const v = (await api.user.list()).find(x => x.username === 'brain.viewer'); return v && { role: v.role, emp: v.emp_id, perms: v.perms, status: v.status }; });
  check('viewer user: role viewer, no employee, no perms', u && u.role === 'viewer' && !u.emp && u.perms.length === 0 && u.status === 'active', JSON.stringify(u));
  const lst = await R_(() => { render(); return document.getElementById('page').innerText; });
  check('users list shows viewer badge', /مشاهدة/.test(lst) && /brain\.viewer/.test(lst));
  // viewer cannot log into the app
  await R_(async () => { await api.auth.lock(); }); await W(500);
  const lg = await R_(async pw => api.auth.login(pw, 'brain.viewer'), pw);
  check('viewer cannot log in to the app', lg && lg.ok === false && lg.why === 'viewer', JSON.stringify(lg));
  const al = await R_(async () => api.auth.login('Company#2026')); check('admin login back', al === true); await W(800);
  // hr-reader can unlock real data with the viewer account (meta.json + hr.db.enc from the data dir)
  const dir = await R_(async () => (await api.info()).dataDir);
  await R_(async () => { await api.backup.now(); }); await W(800);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')); const blob = fs.readFileSync(path.join(dir, 'hr.db.enc')).toString('base64');
  global.fetch = async (url, o) => ({ status: o.headers.Authorization === 'Bearer TOK' ? 200 : 401, json: async () => ({ ok: true, version: 3, meta, blob, updatedAt: 'x' }) });
  let data = null, err = ''; try { data = await R.readToday({ url: 'http://x', token: 'TOK', username: 'brain.viewer', password: pw }); } catch (e) { err = e.message; }
  check('hr-reader unlocks real app data with viewer account', data && data.employees === 2 && data.staff.length === 2, err || JSON.stringify(data && { employees: data.employees }));
  let bad = ''; try { await R.readToday({ url: 'http://x', token: 'TOK', username: 'brain.viewer', password: 'wrong-pass' }); } catch (e) { bad = e.message; }
  check('wrong viewer password rejected', !!bad);
  // disable viewer -> reader refuses (status in meta mirror)
  const dis = await R_(async () => { const v = (await api.user.list()).find(x => x.username === 'brain.viewer'); await api.user.update(v.id, { status: 'disabled' }); await api.backup.now(); return true; }); await W(800);
  const meta2 = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  global.fetch = async () => ({ status: 200, json: async () => ({ ok: true, version: 4, meta: meta2, blob, updatedAt: 'x' }) });
  let dErr = ''; try { await R.readToday({ url: 'http://x', token: 'TOK', username: 'brain.viewer', password: pw }); } catch (e) { dErr = e.message; }
  check('disabled viewer is refused by reader', dErr === 'user-disabled', dErr);
  check('zero console/page errors', errs.length === 0, errs.join(' | '));
  console.log(fails ? 'FAILS ' + fails : 'ALL PASS'); await app.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });

/* اختبار 5.4.0: نبضة الجهاز + لوحة الأجهزة للمالك + التعطيل وإعدام الدخول عن بُعد (سيرفر وهمي محلي) */
const { _electron: electron } = require('playwright'); const fs = require('fs'); const http = require('http'); const crypto = require('crypto');
const PORT = 4571, TOKEN = 'testtoken';
const kp = crypto.generateKeyPairSync('ed25519'); const PRIV_B64 = kp.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
const b64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const M = { devices: {}, pings: [], admin: [], status: {}, sigOk: [] };
const other = { machine: 'AAAA-BBBB-CCCC-DDDD', host: 'PC-CLIENT-1', app_version: '5.4.0', os: 'win32 10.0', lic_state: 'trial', trial_start: '2026-09-25', company: 'شركة العميل', status: 'active', seen_count: 3, first_seen: '2026-09-25T10:00:00Z', last_seen: new Date().toISOString(), activations: [{ code: 'SEVE-N123-ABCD', name: 'عميل 1', at: '2026-09-26T10:00:00Z', plan: 'pro', revoked: false }], signups: [{ id: 's1', kind: 'purchase', company: 'شركة العميل', person: 'أحمد', phone: '0501234567', status: 'done', created_at: '2026-09-26T09:00:00Z' }] };
const mock = http.createServer(async (req, res) => {
  const body = await new Promise(r => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => r(Buffer.concat(c).toString())); });
  const send = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  const u = new URL(req.url, 'http://x'); let b = {}; try { b = body ? JSON.parse(body) : {}; } catch { }
  if (u.pathname === '/healthz') return send(200, { ok: true, version: '1.4.0' });
  if (u.pathname === '/device/ping') { M.pings.push(b); const m = b.machine; M.devices[m] = { ...(M.devices[m] || { first_seen: new Date().toISOString(), seen_count: 0, status: 'active' }), machine: m, host: b.host, app_version: b.version, os: b.os, lic_state: b.lic && b.lic.state, company: b.company, trial_start: b.trialStart, last_seen: new Date().toISOString() }; M.devices[m].seen_count++; return send(200, { ok: true, status: M.status[m] || 'active', message: M.status[m] ? 'سبب تجريبي' : null, ts: Date.now() }); }
  if ((req.headers.authorization || '') !== 'Bearer ' + TOKEN) return send(401, { ok: false });
  if (u.pathname.startsWith('/admin/')) {
    const ts = req.headers['x-owner-ts'], sig = req.headers['x-owner-sig']; let ok = false; try { ok = crypto.verify(null, Buffer.from(req.method + ' ' + u.pathname + '\n' + ts + '\n' + (req.method === 'POST' ? body : '')), kp.publicKey, b64u(sig)); } catch { } M.sigOk.push(ok); if (!ok) return send(403, { ok: false, why: 'owner-only' });
    if (u.pathname === '/admin/devices') return send(200, { ok: true, devices: [...Object.values(M.devices).map(d => ({ ...d, activations: [], signups: [], status: M.status[d.machine] || 'active' })), other], orphans: [{ machine: '1111-2222-3333-4444', name: 'قديم', code: 'OLDC-ODE1-2345', at: '2026-08-01T00:00:00Z' }], ts: Date.now() });
    if (u.pathname === '/admin/device/status') { M.admin.push(b); if (b.machine === other.machine) other.status = b.status; else M.status[b.machine] = b.status === 'active' ? null : b.status; return send(200, { ok: true, machine: b.machine, status: b.status }); }
  }
  if (u.pathname === '/sync/pull') return send(200, { ok: true, version: 0, empty: true });
  if (u.pathname === '/sync/push') return send(200, { ok: true, version: 1 });
  if (u.pathname === '/sync/meta') return send(200, { ok: true, version: 1 });
  return send(404, { ok: false });
});
(async () => {
  await new Promise(r => mock.listen(PORT, r));
  fs.rmSync('/home/claude/dvH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/dvH', USER: 'dv', USERNAME: 'dv' } });
  app.process().stderr.on('data', d => { const t=String(d); if(!/dbus|xkb|Warning/.test(t)) console.log('STDERR', t.slice(0, 800)); });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/Canvas is already/.test(m.text())) errs.push('console:' + m.text()); });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const R = (fn, arg) => p.evaluate(fn, arg); const W = ms => new Promise(r => setTimeout(r, ms));
  await R(async ({ u, t, k }) => { window.confirmBox = async () => true; window.promptBox = async () => 'ملاحظة'; window.csvOf = () => { throw new Error('cap'); }; await api.sync.configure(u, t, true); await api.owner.setKey(k); await api.secpin.verify('4821'); await DB.setSetting('company', 'SEVENGATES TEST'); }, { u: 'http://localhost:' + PORT, t: TOKEN, k: PRIV_B64 });
  await W(500);
  const me = await R(async () => (await api.info()).machine);
  // 1) ping registers device with details
  const pg = await R(async () => api.dev.ping());
  check('ping ok + active', pg.status === 'active' && pg.lastPing, JSON.stringify(pg));
  const last = M.pings[M.pings.length - 1];
  check('ping carries machine/host/version/os/company/lic', last && last.machine === me && last.host && /^\d+\.\d+\.\d+$/.test(last.version) && last.os && last.company === 'SEVENGATES TEST' && last.lic && last.lic.state, JSON.stringify(last));
  // 2) owner dashboard
  const ui = await R(async () => { devData = null; devErr = null; go('devices'); await new Promise(r => setTimeout(r, 1200)); const t = document.getElementById('page').innerText; return { t, n: (devData && devData.devices || []).length, orph: devData && devData.orphans.length }; });
  check('devices page lists this device + client + orphan', ui.n === 2 && ui.orph === 1 && /هذا الجهاز/.test(ui.t) && /PC-CLIENT-1/.test(ui.t) && /شركة العميل/.test(ui.t) && /تم الشراء/.test(ui.t) && /قديم/.test(ui.t), ui.t.slice(0, 300));
  check('owner signature verified by server', M.sigOk.length >= 1 && M.sigOk.every(Boolean), JSON.stringify(M.sigOk));
  const f = await R(async () => { const out = {}; for (const k of ['licensed', 'trial', 'need', 'sold', 'blocked', 'all']) { devFilter = k; render(); out[k] = (document.querySelectorAll('#page tbody tr').length); } devFilter = 'all'; devQ = 'CLIENT'; render(); out.q = document.querySelectorAll('#page tbody tr').length; devQ = ''; devOpen = 'AAAA-BBBB-CCCC-DDDD'; render(); out.det = /SEVE-N123-ABCD/.test(document.getElementById('page').innerText) && /أحمد/.test(document.getElementById('page').innerText); devOpen = null; try { await exportDevices(); } catch (e) { } return out; });
  check('filters / search / details', f.trial >= 1 && f.sold >= 1 && f.q >= 1 && f.det, JSON.stringify(f));
  // 3) disable the other device from dashboard
  await R(async () => setDevStatus('AAAA-BBBB-CCCC-DDDD', 'disabled')); await W(800);
  check('disable sent to server with note', M.admin.length === 1 && M.admin[0].status === 'disabled' && M.admin[0].note === 'ملاحظة' && other.status === 'disabled', JSON.stringify(M.admin));
  const ownBtn = await R(async () => { render(); const row = [...document.querySelectorAll('#page tbody tr')].find(tr => /هذا الجهاز/.test(tr.innerText)); return row ? row.innerText : ''; });
  check('own device cannot be disabled from UI', /لا يمكن تعطيل جهازك/.test(ownBtn) && !/إعدام الدخول/.test(ownBtn), ownBtn.slice(0, 200));
  // 4) server disables THIS device -> edits blocked, view ok, banner
  M.status[me] = 'disabled';
  const d1 = await R(async () => { const st = await api.dev.ping(); let w; try { await DB.upsert('employees', { id: uid(), name: 'x', code: 'E9', basic: 1, hire_date: '2026-01-01', status: 'active', currency: 'AED' }); w = 'wrote'; } catch (e) { w = e.message; } await DB.load(); go('dashboard'); const t = document.getElementById('page').innerText; return { st: st.status, w, banner: /تم تعطيل هذا البرنامج/.test(t), msg: st.message }; });
  check('disabled: edits blocked, banner shown, message passed', d1.st === 'disabled' && /device-disabled/.test(d1.w) && d1.banner && d1.msg === 'سبب تجريبي', JSON.stringify(d1));
  M.status[me] = null;
  const d2 = await R(async () => { const st = await api.dev.ping(); let w; try { await DB.upsert('employees', { id: uid(), name: 'موظف', code: 'E9', basic: 1, hire_date: '2026-01-01', status: 'active', currency: 'AED' }); w = 'wrote'; } catch (e) { w = e.message; } return { st: st.status, w }; });
  check('re-enabled: edits work again', d2.st === 'active' && d2.w === 'wrote', JSON.stringify(d2));
  // 5) kill switch: locks app, login refused, screen shown; restore -> login ok
  M.status[me] = 'killed';
  const k1 = await R(async () => { const st = await api.dev.ping(); await new Promise(r => setTimeout(r, 600)); const a = await api.auth.status(); let lg; try { lg = await api.auth.login('Company#2026'); } catch (e) { lg = e.message; } const lockTxt = document.getElementById('lock').innerText; return { st: st.status, unlocked: a.unlocked, dev: a.device.status, lg, screen: /تم تعطيل الدخول لهذا البرنامج/.test(lockTxt), hidden: document.getElementById('app').classList.contains('hidden') }; });
  check('killed: app locked, login refused, kill screen', k1.st === 'killed' && k1.unlocked === false && k1.dev === 'killed' && /device-killed/.test(String(k1.lg)) && k1.screen && k1.hidden, JSON.stringify(k1));
  // persists offline: status stored locally
  const k2 = await R(async () => (await api.dev.status()).status); check('kill status persisted locally', k2 === 'killed');
  M.status[me] = null;
  const k3 = await R(async () => { const st = await api.dev.ping(); const lg = await api.auth.login('Company#2026'); return { st: st.status, lg }; });
  check('restored: login works', k3.st === 'active' && k3.lg === true, JSON.stringify(k3));
  await W(800);
  const au = await R(async () => { await DB.load(); const a = await api.db.audit(100); return a.filter(x => x.action === 'device-status').map(x => x.detail); });
  check('audit records status changes', au.length >= 3 && au.some(x => /killed/.test(x)), JSON.stringify(au));
  // 6) non-admin cannot list devices
  const na = await R(async () => { const e = await DB.upsert('employees', { id: uid(), name: 'ع', code: 'E10', basic: 1, hire_date: '2026-01-01', status: 'active', currency: 'AED' }); await api.user.create({ emp_id: e.id, username: 'emp.x', name: 'ع', perms: ['employees'], password: 'EmpPass#1' }); await api.auth.lock(); await api.auth.login('EmpPass#1', 'emp.x'); let r; try { await api.dev.list(); r = 'listed'; } catch (er) { r = er.message; } let s; try { await api.dev.setStatus('AAAA-BBBB-CCCC-DDDD', 'killed'); s = 'set'; } catch (er) { s = er.message; } await DB.load(); return { r, s, page: pageAllowed('devices') }; });
  check('employee blocked from devices API and page', /admin-only/.test(na.r) && /admin-only/.test(na.s) && na.page === false, JSON.stringify(na));
  check('zero console/page errors', errs.length === 0, errs.join(' | '));
  console.log(fails ? 'FAILS ' + fails : 'ALL PASS'); await app.close(); mock.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });

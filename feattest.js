/* اختبار: عهد/معدات، صورة، كارت، وظائف/ترقيات، جواز، الثيم الأبيض */
const { _electron: electron } = require('playwright'); const fs = require('fs');
async function launch(home) { const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: home, USER: 'ft', USERNAME: 'ft' } }); const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CON ' + m.text()); }); return { app, p, errs }; }
let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
const PNG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
(async () => {
  fs.rmSync('/home/claude/ftH', { recursive: true, force: true }); const A = await launch('/home/claude/ftH'); const p = A.p;
  await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1','4821'); await p.fill('#sp2','4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  // ---- نموذج الموظف: صورة + مكان العمل + جواز
  await p.evaluate(() => { go('employees'); openEmpForm(); }); await p.waitForTimeout(400);
  check('form has photo/workloc/passport fields', await p.evaluate(() => ['f_photo', 'f_photoFile', 'f_workloc', 'f_passport'].every(i => document.getElementById(i))));
  await p.evaluate(d => { document.getElementById('f_name').value = 'خالد منصور'; document.getElementById('f_code').value = 'K1'; document.getElementById('f_job').value = 'فني كهرباء'; document.getElementById('f_trade').value = ''; document.getElementById('f_phone').value = '0501112223'; document.getElementById('f_hire').value = '2026-01-01'; document.getElementById('f_basic').value = '3000'; document.getElementById('f_allow').value = '500'; document.getElementById('f_workloc').value = 'موقع برج النخيل'; document.getElementById('f_passport').value = 'P7654321'; document.getElementById('f_photo').value = d; }, PNG);
  await p.evaluate(() => saveEmp()); await p.waitForTimeout(1200);
  const emp = await p.evaluate(() => S.employees.find(e => e.code === 'K1')); check('employee saved with photo+workloc+passport', emp && emp.photo.startsWith('data:image') && emp.work_location === 'موقع برج النخيل' && emp.passport_no === 'P7654321');
  await p.evaluate(id => { empTab = 'docs'; go('employee', id); }, emp.id); await p.waitForTimeout(500);
  check('profile shows photo avatar + work location', await p.evaluate(() => !!document.querySelector('.emp-head .avatar img') && /موقع برج النخيل/.test(document.getElementById('page').textContent)));
  // ---- كارت الموظف
  const card = await p.evaluate(id => empCardHTML(empById(id)), emp.id);
  check('card has only allowed fields', /خالد منصور/.test(card) && /فني كهرباء/.test(card) && /موقع برج النخيل/.test(card) && /0501112223/.test(card) && !/P7654321/.test(card) && !/3000/.test(card) && /<img/.test(card));
  check('card button exists', await p.evaluate(() => !!document.querySelector('button[onclick^="printEmpCard"]')));
  // ---- العهد والمعدات
  await p.evaluate(() => { empTab = 'assets'; render(); }); await p.waitForTimeout(300);
  check('assets tab + add button', await p.evaluate(() => !!document.querySelector('button[onclick^="openAssetForm"]') && /إضافة معدات/.test(document.getElementById('page').textContent)));
  await p.evaluate(id => openAssetForm(id), emp.id); await p.waitForTimeout(300);
  await p.evaluate(() => { as_name.value = 'لابتوب ديل'; as_serial.value = 'SN-4455'; as_qty.value = '1'; as_value.value = '2500'; as_cond.value = 'جديد'; as_kind.value = 'معدات'; });
  await p.evaluate(id => saveAsset(id, ''), emp.id); await p.waitForTimeout(800);
  await p.evaluate(id => openAssetForm(id), emp.id); await p.waitForTimeout(300); await p.evaluate(() => { as_name.value = 'مفتاح سيارة'; as_qty.value = '2'; }); await p.evaluate(id => saveAsset(id, ''), emp.id); await p.waitForTimeout(800);
  check('2 assets saved on employee', await p.evaluate(id => S.assets.filter(a => a.emp_id === id).length === 2, emp.id));
  check('assets table shows items + serial', await p.evaluate(() => /لابتوب ديل/.test(document.getElementById('page').textContent) && /SN-4455/.test(document.getElementById('page').textContent)));
  const rc = await p.evaluate(id => assetReceiptHTML(S.assets.find(a => a.emp_id === id && a.name === 'لابتوب ديل')), emp.id);
  check('receipt includes employee data + item', /خالد منصور/.test(rc) && /K1/.test(rc) && /P7654321/.test(rc) && /0501112223/.test(rc) && /SN-4455/.test(rc));
  await p.evaluate(() => returnAsset && 0); const aid = await p.evaluate(id => S.assets.find(a => a.emp_id === id && a.name === 'مفتاح سيارة').id, emp.id);
  await p.evaluate(async id => { const a = S.assets.find(x => x.id === id); await DB.upsert('assets', { ...a, status: 'returned', returned_date: '2026-10-01' }); }, aid);
  check('returned asset persisted', await p.evaluate(id => S.assets.find(a => a.id === id).status === 'returned', aid));
  const bad = await p.evaluate(async () => { try { await api.db.upsert('assets', { id: 'abcdef123456', name: '', emp_id: null }); return 'OK'; } catch (e) { return e.message; } }); check('validation rejects empty asset name', /bad-name/.test(bad), bad);
  // ---- الوظائف والترقيات
  await p.evaluate(() => { empMainTab = 'jobs'; go('employees'); }); await p.waitForTimeout(400);
  check('jobs tab renders (separate from employee list)', await p.evaluate(() => /الوظائف/.test(document.getElementById('page').textContent) && !!document.querySelector('button[onclick="openJobForm()"]') && !document.querySelector('#empTable')));
  await p.evaluate(() => openJobForm()); await p.waitForTimeout(300); await p.evaluate(() => { jb_title.value = 'مشرف موقع'; jb_cat.value = 'ميداني'; jb_level.value = 'مشرف'; jb_allow.value = '400'; jb_leave.value = '35'; }); await p.evaluate(() => saveJob('')); await p.waitForTimeout(600);
  check('job defined', await p.evaluate(() => S.jobs.some(j => j.title === 'مشرف موقع' && j.category === 'ميداني' && +j.allowance === 400)));
  // ترقية لوظيفة معرّفة: تطبّق الامتيازات
  await p.evaluate(id => { empTab = 'docs'; go('employee', id); }, emp.id); await p.waitForTimeout(400);
  check('promote button in employee file', await p.evaluate(() => !!document.querySelector('button[onclick^="openPromote"]')));
  await p.evaluate(id => openPromote(id), emp.id); await p.waitForTimeout(300); await p.evaluate(() => { pm_job.value = 'مشرف موقع'; promoteFill(); });
  check('defined job auto-fills category+allowance', await p.evaluate(() => pm_cat.value === 'ميداني' && +pm_allow.value === 400 && +pm_leave.value === 35));
  await p.evaluate(() => { pm_note.value = 'أداء ممتاز'; }); await p.evaluate(() => savePromote()); await p.waitForTimeout(1500);
  const e2 = await p.evaluate(id => S.employees.find(e => e.id === id), emp.id);
  check('employee moved to new job/category with perks', e2.job === 'مشرف موقع' && e2.category === 'ميداني' && e2.level === 'مشرف' && +e2.allowances === 900 && +e2.annual_leave === 35 && +e2.basic === 3000, JSON.stringify({ j: e2.job, c: e2.category, a: e2.allowances, l: e2.annual_leave }));
  check('promotion + timeline note recorded', await p.evaluate(id => S.promotions.some(x => x.emp_id === id && x.to_job === 'مشرف موقع' && x.from_job === 'فني كهرباء') && S.notes.some(n => n.emp_id === id && n.kind === 'ترقية'), emp.id));
  // ترقية لوظيفة جديدة بحرية الإدارة (تُنشأ تلقائياً) مع راتب جديد، والبدل القديم يُستبدل
  await p.evaluate(id => openPromote(id), emp.id); await p.waitForTimeout(300); await p.evaluate(() => { pm_job.value = 'مدير مشاريع'; promoteFill(); pm_cat.value = 'إداري'; pm_allow.value = '1000'; pm_basic.value = '6000'; }); await p.evaluate(() => savePromote()); await p.waitForTimeout(1500);
  const e3 = await p.evaluate(id => S.employees.find(e => e.id === id), emp.id);
  check('free-text new job: category admin, allowance swapped (500+0 -> old 400 removed +1000), basic 6000', e3.job === 'مدير مشاريع' && e3.category === 'إداري' && +e3.allowances === 1500 && +e3.basic === 6000, JSON.stringify({ a: e3.allowances, b: e3.basic }));
  check('new job auto-added to jobs list', await p.evaluate(() => S.jobs.some(j => j.title === 'مدير مشاريع' && j.category === 'إداري')));
  check('promotions tab in file shows history (2)', await p.evaluate(() => { empTab = 'prom'; go('employee', S.employees.find(e => e.code === 'K1').id); return document.querySelectorAll('#page tbody tr').length === 2; }));
  check('same-job promotion rejected', await (async () => { await p.evaluate(id => openPromote(id), emp.id); await p.waitForTimeout(200); await p.evaluate(() => { pm_job.value = 'مدير مشاريع'; }); await p.evaluate(() => savePromote()); await p.waitForTimeout(300); const n = await p.evaluate(() => S.promotions.length); await p.evaluate(() => closeModal()); return n === 2; })());
  // ---- مزامنة/حذف: حذف الموظف يحذف عهده وترقياته
  await p.evaluate(async id => { await DB.remove('employees', id); }, emp.id); await p.waitForTimeout(500);
  check('delete employee cascades assets & promotions', await p.evaluate(id => S.assets.every(a => a.emp_id !== id) && S.promotions.every(x => x.emp_id !== id), emp.id) && await p.evaluate(async () => { const x = await api.db.load(); return x.assets.length === 0 && x.promotions.length === 0; }));
  // ---- الثيم الأبيض: وضوح الألوان
  await p.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); document.documentElement.setAttribute('data-tone', 'light'); });
  const lum = c => { const m = c.match(/\d+(\.\d+)?/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
  const cols = await p.evaluate(() => { const g = (cls, html = 'x', tag = 'span') => { const e = document.createElement(tag); e.className = cls; e.textContent = html; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; }; const opt = (() => { const s = document.createElement('select'); s.className = 'search'; s.innerHTML = '<option>a</option>'; document.body.appendChild(s); const o = s.firstChild; const r = [getComputedStyle(o).color, getComputedStyle(o).backgroundColor]; s.remove(); return r; })(); return { primary: g('btn primary', 'x', 'button'), chipOn: g('chip on'), bw: g('badge b-warn'), bd: g('badge b-danger'), bo: g('badge b-ok'), bi: g('badge b-info'), nw: g('banner warn', 'x', 'div'), nd: g('banner danger', 'x', 'div'), ni: g('banner info', 'x', 'div'), nok: g('banner ok', 'x', 'div'), optColor: opt[0], optBg: opt[1], tab: g('tab active', 'x', 'button') }; });
  for (const k of ['primary', 'chipOn']) check('light: ' + k + ' text is dark (on light teal)', lum(cols[k]) < .15, cols[k]);
  for (const k of ['bw', 'bd', 'bo', 'bi', 'nw', 'nd', 'ni', 'nok', 'tab']) check('light: ' + k + ' readable on white (lum<.25)', lum(cols[k]) < .25, cols[k]);
  check('light: select option dark text on white bg', lum(cols.optColor) < .1 && lum(cols.optBg) > .7, cols.optColor + ' / ' + cols.optBg);
  check('light: accent-ink dark', lum(await p.evaluate(() => { const e = document.createElement('div'); e.style.color = 'var(--accent-ink)'; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; })) < .1);
  check('no console/page errors', A.errs.length === 0, A.errs.join('|').slice(0, 400));
  await A.app.close(); console.log(fails ? '\n❌ ' + fails + ' FAILED' : '\n✅ ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

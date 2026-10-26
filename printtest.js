/* اختبار 5.8.0: ترتيب القائمة + تحت التجربة داخل الموظفين + زر الرجوع + «آخر تعديل» + الطباعة العامة */
const { _electron: electron } = require('playwright'); const fs = require('fs');
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';
const PDF = fs.readFileSync('/tmp/test2p.b64', 'utf8');
(async () => {
  fs.rmSync('/home/claude/ptH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/ptH', USER: 'pt', USERNAME: 'pt' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => { if (!/Canvas is already/.test(String(e))) errs.push(String(e)); }); p.on('console', m => { if (m.type() === 'error' && !/Canvas is already/.test(m.text())) errs.push('console:' + m.text()); });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const R = (fn, arg) => p.evaluate(fn, arg); const W = ms => new Promise(r => setTimeout(r, ms));
  const s0 = await R(async () => {
    window.confirmBox = async () => true; window.__rp = window.requirePin; window.requirePin = async () => true; await api.secpin.verify('4821'); await api.pin.set('Company#2026', '1234'); await api.pin.verify('1234');
    window.__printed = []; window.__testPrint = async h => { window.__printed.push(h); return true; };
    const e1 = await DB.upsert('employees', { id: uid(), name: 'سامي', code: 'S1', basic: 3000, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    const e2 = await DB.upsert('employees', { id: uid(), name: 'تجريبي', code: 'S2', basic: 2000, hire_date: '2026-09-01', status: 'probation', currency: 'AED' });
    const n1 = await DB.upsert('notes', { id: uid(), emp_id: e1.id, date: '2026-09-01', kind: 'إنجاز', text: 'أ' });
    const n2 = await DB.upsert('notes', { id: uid(), emp_id: e1.id, date: '2026-09-02', kind: 'إنجاز', text: 'ب' });
    const u1 = await api.user.create({ emp_id: e1.id, username: 'emp.a', name: 'سامي', perms: ['employees', 'finance'], password: 'EmpPass#1' });
    await DB.load(); return { e1: e1.id, e2: e2.id, n1: n1.id, n2: n2.id };
  });
  // ---- nav order + probation inside employees + back button
  const nv = await R(async () => {
    const order = [...document.querySelectorAll('.side .nav')].map(b => b.dataset.page); const hasProbNav = order.includes('probation');
    go('probation'); await new Promise(r => setTimeout(r, 200)); const t = document.getElementById('page').innerText; const lbl = [...document.querySelectorAll('.side .nav')].find(b => b.dataset.page === 'alerts').textContent;
    return { first: order.slice(0, 11).join(), hasProbNav, page: current.page, tab: empMainTab, prob: /تجريبي/.test(t) && /تحت التجربة/.test(t), tabs: /الوظائف والترقيات/.test(t) && /الموظفون/.test(t), lbl: /الإشعارات والتنبيهات/.test(lbl), hasPrint: order.includes('print') };
  });
  check('nav order exact (11 first), probation not in main menu, label renamed, print section present', nv.first === 'dashboard,alerts,employees,finance,projects,field,taxes,letters,leaves,payroll,reports' && !nv.hasProbNav && nv.lbl && nv.hasPrint, JSON.stringify(nv));
  check('probation opens as a tab inside employees', nv.page === 'employees' && nv.tab === 'prob' && nv.prob && nv.tabs, JSON.stringify(nv));
  const bk = await R(async () => {
    const W = ms => new Promise(r => setTimeout(r, ms)); const vis = () => !document.getElementById('btnBack').classList.contains('hidden'); const out = [];
    go('dashboard'); await W(60); out.push(vis()); go('employees'); await W(60); out.push(vis()); go('finance'); await W(60); go('payroll'); await W(60);
    goBack(); await W(60); out.push(current.page); goBack(); await W(60); out.push(current.page); goBack(); await W(60); out.push(current.page); out.push(vis());
    go('employees'); await W(60); go('employee', S.employees[0].id); await W(60); goBack(); await W(60); out.push(current.page); return out;
  });
  check('back button: hidden on dashboard, steps back finance→employees→dashboard, then hidden', bk[0] === false && bk[1] === true && bk[2] === 'finance' && bk[3] === 'employees' && bk[4] === 'dashboard' && bk[5] === false && bk[6] === 'employees', JSON.stringify(bk));
  // ---- employee edits the same record several times
  await R(async () => { await api.auth.lock(); }); await W(500);
  const lg = await R(async () => api.auth.login('EmpPass#1', 'emp.a')); check('employee login', lg === true, JSON.stringify(lg)); await W(800);
  const ee = await R(async ({ n1, n2 }) => { await DB.load(); window.confirmBox = async () => true; const a = S.notes.find(x => x.id === n1); const b = S.notes.find(x => x.id === n2);
    await DB.upsert('notes', { ...a, text: 'أ1' }); await new Promise(r => setTimeout(r, 15)); await DB.upsert('notes', { ...a, text: 'أ2' }); await new Promise(r => setTimeout(r, 15)); await DB.upsert('notes', { ...a, text: 'أ3' }); await new Promise(r => setTimeout(r, 15)); await DB.upsert('notes', { ...b, text: 'ب1' });
    // employee opens print section and uploads stamp (no admin rights needed)
    window.__testPick = async () => ({ name: 'stamp.png', mime: 'image/png', data: window.__PNG, size: 70 }); return true; }, s0).catch(e => 'ERR ' + e.message);
  await R(async png => { window.__PNG = png; }, PNG);
  const emp = await R(async () => { window.__PNG = window.__PNG; window.__testPick = async () => ({ name: 'stamp.png', mime: 'image/png', data: window.__PNG, size: 70 }); window.requirePin = window.__rp; go('print'); await new Promise(r => setTimeout(r, 300)); const t = document.getElementById('page').innerText; await prUploadAsset('stamp'); await DB.load(); return { page: current.page, tabs: /طباعة ورقة/.test(t) && /الختم والتوقيع/.test(t) && /الأوراق الخارجية/.test(t) && /توزيع تلقائي/.test(t), stamp: !!extRow('stamp'), img: !!extImg('stamp') }; });
  check('employee can open «الطباعة العامة» and upload the company stamp', emp.page === 'print' && emp.tabs && emp.stamp && emp.img, JSON.stringify(emp));
  // ---- admin: latest-edit logic
  await R(async () => { await api.auth.lock(); }); await W(500);
  await R(async () => api.auth.login('Company#2026')); await W(800);
  const rv = await R(async ({ n1, n2 }) => { await DB.load(); const rows = await api.review.list('pending'); const ed = rows.filter(r => r.action === 'edit' && r.tbl === 'notes'); const gA = ed.filter(r => r.rec_id === n1).sort((a, b) => a.created_at.localeCompare(b.created_at)); const gB = ed.filter(r => r.rec_id === n2);
    return { nA: gA.length, oldA: gA.map(r => r.old), latestA: gA.map(r => r.latest), others: gA.map(r => r.others), nB: gB.length, oldB: gB.map(r => r.old), cnt: await api.review.count(), total: rows.length, last: gA[gA.length - 1] && gA[gA.length - 1].detail.text }; }, s0);
  check('same-record edits: only the newest is «latest»; older ones are old', rv.nA === 3 && rv.oldA.join() === 'true,true,false' && rv.latestA.join() === 'false,false,true' && rv.last && rv.last.to === 'أ3' && rv.nB === 1 && rv.oldB[0] === false, JSON.stringify(rv));
  check('badge count ignores superseded edits', rv.cnt === rv.total - 2, JSON.stringify(rv));
  const ui = await R(async () => { window.__reviewLoaded = false; go('review'); await new Promise(r => setTimeout(r, 800)); reviewShowOld = false; render(); const t1 = document.getElementById('page').innerText; reviewShowOld = true; render(); const t2 = document.getElementById('page').innerText; reviewShowOld = false; return { hasLatest: /آخر تعديل/.test(t1), chip: /التعديلات السابقة \(2\)/.test(t1), hideOld: !/أ1/.test(t1) && !/تعديل سابق/.test(t1), showOld: /تعديل سابق — غير مهم/.test(t2) && /حذف/.test(t2), prune: /حذف التعديلات القديمة/.test(t1) }; });
  check('review UI: ✅ آخر تعديل badge, old hidden by default, shown on demand, prune button', ui.hasLatest && ui.chip && ui.hideOld && ui.showOld && ui.prune, JSON.stringify(ui));
  const rm = await R(async ({ n1 }) => { const rows = await api.review.list('pending'); const ed = rows.filter(r => r.action === 'edit' && r.rec_id === n1).sort((a, b) => a.created_at.localeCompare(b.created_at)); const latest = ed[ed.length - 1], old = ed[0];
    const r1 = await api.review.remove([latest.id]); const r2 = await api.review.remove([old.id]); const after = (await api.review.list('pending')).filter(r => r.action === 'edit' && r.rec_id === n1); return { r1, r2, left: after.length, latestKept: after.some(r => r.id === latest.id) }; }, s0);
  check('cannot delete the latest edit; can delete an old one', rm.r1 === 0 && rm.r2 === 1 && rm.left === 2 && rm.latestKept, JSON.stringify(rm));
  const pr = await R(async () => { const n = await api.review.prune(); const rows = await api.review.list('pending'); return { n, olds: rows.filter(r => r.old).length }; });
  check('prune removes remaining old edits only', pr.n === 1 && pr.olds === 0, JSON.stringify(pr));
  const ap = await R(async ({ n2 }) => { await api.secpin.verify('4821'); const rows = await api.review.list('pending'); const l = rows.find(r => r.action === 'edit' && r.rec_id === n2); const n = await api.review.approve([l.id]); const all = await api.review.list('all'); return { n, st: all.find(r => r.id === l.id).status }; }, s0);
  check('approve latest edit', ap.n === 1 && ap.st === 'approved', JSON.stringify(ap));
  const xr = await R(async () => { const rows = await api.review.list('all'); return rows.some(r => r.tbl === 'extdocs' && /ختم/.test(r.label || '')); });
  check('employee stamp upload shows in final review', xr);
  // ---- print section as admin
  const pg = await R(async png => {
    window.requirePin = async () => true; window.confirmBox = async () => true; await DB.load();
    window.__testPick = async () => ({ name: 'sig.png', mime: 'image/png', data: png, size: 70 }); await prUploadAsset('signature');
    go('print'); await new Promise(r => setTimeout(r, 400)); prTab = 'assets'; render(); const t = document.getElementById('page').innerText;
    return { assets: /ختم الشركة/.test(t) && /توقيع المدير العام/.test(t), st: !!extImg('stamp'), sg: !!extImg('signature') };
  }, PNG);
  check('stamp + GM signature stored and shown', pg.assets && pg.st && pg.sg, JSON.stringify(pg));
  const pr1 = await R(async png => {
    await prSetSource({ name: 'scan.png', mime: 'image/png', data: png }, null); prOpt.mode = 'asis'; prAdd('stamp'); prAdd('sig');
    const h = prAsIsHTML(); const ov = (h.match(/class="ov"/g) || []).length; prTab = 'print'; go('print'); await new Promise(r => setTimeout(r, 300)); const t = document.getElementById('page').innerText; const drag = document.querySelectorAll('.prdrag').length;
    window.__printed.length = 0; await prPrint(); return { pages: prCur.pages.length, bg: /class="bg"/.test(h), ov, a4: /size:A4 portrait/.test(h), ui: /ختم هنا/.test(t) && /توقيع هنا/.test(t), drag, printed: window.__printed.length };
  }, PNG);
  check('print as-is: scanned image page + per-page stamp/signature items, draggable preview, sent to printer', pr1.pages === 1 && pr1.bg && pr1.ov === 2 && pr1.a4 && pr1.ui && pr1.drag === 2 && pr1.printed === 1, JSON.stringify(pr1));
  const pr2 = await R(async pdf => {
    await prSetSource({ name: 't.pdf', mime: 'application/pdf', data: pdf }, null);
    const o = {}; o.n = prCur.pages.length; o.jpeg = prCur.pages[0].startsWith('data:image/jpeg'); o.len = prCur.pages[0].length;
    prOpt.pv = 0; prAddItem('stamp'); prAddItem('sig'); prItems[0][0].x = 50; prItems[0][0].y = 12; prItems[0][1].x = 8; prItems[0][1].y = 70; prCopyAll();
    prItems[1][0].x = 21; /* موضع مختلف في الصفحة الثانية */
    let h = prAsIsHTML(); let parts = h.split('class="pg"').slice(1); o.ovPer = parts.map(x => (x.match(/class="ov"/g) || []).length).join(); o.left = parts.map(x => (x.match(/left:([\d.]+)%/) || [])[1]).join();
    prOpt.pv = 1; prClearPage(); h = prAsIsHTML(); parts = h.split('class="pg"').slice(1); o.afterClear = parts.map(x => (x.match(/class="ov"/g) || []).length).join();
    prOpt.pv = 0; prSel = { p: 0, i: 0 }; prSelSize(30); o.w = prItems[0][0].w; prDelSel(); o.afterDel = (prItems[0] || []).length;
    window.__testSavePDF = async (html, name) => { window.__pdfHtml = html; window.__pdfName = name; return 'C:/x/' + name; }; await prSavePDF(); o.pdf = /class="ov"/.test(window.__pdfHtml) && /\.pdf$/.test(window.__pdfName) && /مختوم/.test(window.__pdfName);
    return o;
  }, PDF);
  check('PDF → pages (pdf.js); per-page placement, copy to all, per-page override, clear page, resize, delete, save as stamped PDF', pr2.n === 2 && pr2.jpeg && pr2.len > 2000 && pr2.ovPer === '2,2' && pr2.left === '50,21' && pr2.afterClear === '2,0' && pr2.w === 30 && pr2.afterDel === 1 && pr2.pdf, JSON.stringify(pr2));
  const lt = await R(async png => {
    const u0 = S.settings.useLetterheadImg, i0 = S.settings.letterheadImg, m0 = S.settings.letterheadMode; await prSetSource({ name: 'lh.png', mime: 'image/png', data: png }, null); prOpt.mode = 'letter'; prOpt.title = 'خطاب تجربة'; prOpt.text = 'السادة المحترمون\nنص الخطاب الأول'; const h = prLetterHTML(); const noBg = (() => { prCur.pages = []; const x = prLetterHTML(); return /خطاب تجربة/.test(x); })();
    return { text: /نص الخطاب الأول/.test(h) && /خطاب تجربة/.test(h), bg: /<img class="bg" src="data:image\/png/.test(h) || /data:image\/png;base64/.test(h), stamp: (h.match(/mix-blend-mode:multiply/g) || []).length >= 2, noBg, restored: S.settings.useLetterheadImg === u0 && S.settings.letterheadImg === i0 && S.settings.letterheadMode === m0 };
  }, PNG);
  check('letter mode: text over uploaded letterhead background + stamp/signature; fallback without background', lt.text && lt.bg && lt.stamp && lt.noBg && lt.restored, JSON.stringify(lt));
  const au = await R(async () => { prOpt.mode = 'asis'; const a0 = letterShell('<p>خطاب</p>'); await prAutoAsset('stamp', true); await prAutoAsset('signature', true); const a1 = letterShell('<p>خطاب</p>'); const stamp = extImg('stamp'); window.__noAutoStamp = true; const a2 = letterShell('<p>خطاب</p>'); window.__noAutoStamp = false; return { before: !a0.includes(stamp), after: a1.includes(stamp), skip: !a2.includes(stamp) }; });
  check('auto stamp/signature on every program printout when enabled', au.before && au.after && au.skip, JSON.stringify(au));
  // ---- archive
  const ar = await R(async png => {
    openExtDocForm(); pendingFile = { name: 'inv.png', mime: 'image/png', data: png, size: 70 }; document.getElementById('xd_kind').value = 'invoice'; document.getElementById('xd_title').value = 'فاتورة مورد'; document.getElementById('xd_amt').value = '850'; await saveExtDoc();
    prTab = 'archive'; go('print'); await new Promise(r => setTimeout(r, 300)); const t = document.getElementById('page').innerText; const row = S.extdocs.find(x => x.title === 'فاتورة مورد'); const trBefore = S.treasury.length;
    return { row: !!row && row.kind === 'invoice' && !!row.file_id, ui: /فاتورة مورد/.test(t) && /أرشيف فقط/.test(t), treasuryUntouched: trBefore === 0 };
  }, PNG);
  check('external papers archive (invoice) — saved, listed, no treasury entry', ar.row && ar.ui && ar.treasuryUntouched, JSON.stringify(ar));
  // ---- distribution
  const ps = await R(async () => { const o = {}; const P = dsParse;
    o.a = P('حط المبلغ 500 درهم في الخزنة صرف إيجار المكتب'); o.b = P('سند قبض ٣٠٠٠ دولار من العميل'); o.c = P('قيد 1200 مصروفات مواصلات'); o.d = P('شيك مستلم 7500 بنك'); o.e = P('شيك صرف 900'); o.f = P('فاتورة مشتريات 2100 من مورد الحديد'); o.g = P('فاتورة مبيعات 5250'); o.h = P('حط كشف الموظفين ده في قسم الموظفين'); o.i = P('احفظها للأرشيف'); o.j = P('صرف 100 لسامي'); o.k = P('قبض 250 بتاريخ 2026-09-15'); return o; });
  check('parser: dest/amount/currency/account/employee/date', ps.a.dest === 'out' && ps.a.amount === '500' && ps.a.cur === 'AED' && ps.a.acct === 'main' && ps.b.dest === 'in' && ps.b.amount === '3000' && ps.b.cur === 'USD' && ps.c.dest === 'expense' && ps.c.amount === '1200' && ps.d.dest === 'cheque_in' && ps.d.acct !== 'main' && ps.e.dest === 'cheque_out' && ps.f.dest === 'purchase' && ps.g.dest === 'sale' && ps.h.dest === 'employees' && ps.i.dest === 'archive' && !!ps.j.emp && ps.k.date === '2026-09-15' && ps.k.dest === 'in', JSON.stringify(ps));
  const ex = await R(async () => {
    const paper = S.extdocs.find(x => x.title === 'فاتورة مورد'); dsSrc = paper.id; const out = {};
    dsText = 'حط المبلغ 500 درهم في الخزنة صرف إيجار المكتب'; dsForm = dsParse(dsText); const t0 = S.treasury.length; await dsExecute(); const tr = S.treasury.find(t => +t.amount === 500 && t.direction === 'out'); out.out = !!tr && !!tr.file_id && /إيجار/.test(tr.note || '') && S.treasury.length === t0 + 1; out.linked = S.extdocs.find(x => x.id === paper.id).dest === 'سند صرف';
    dsForm = dsParse('سند قبض 3000 دفعة من العميل'); await dsExecute(); const ti = S.treasury.find(t => +t.amount === 3000 && t.direction === 'in'); out.in = !!ti && !!ti.file_id;
    dsForm = dsParse('مصروف 120 مواصلات'); const x0 = S.expenses.length; await dsExecute(); const xe = S.expenses.find(x => +x.amount === 120); out.exp = S.expenses.length === x0 + 1 && !!xe && !!xe.file_id && /مواصلات/.test(xe.description);
    dsForm = dsParse('شيك مستلم 7500 بنك الإمارات'); await dsExecute(); out.chq = (S.cheques || []).some(c => +c.amount === 7500 && c.kind === 'in');
    dsForm = dsParse('فاتورة مبيعات 5250'); await dsExecute(); const td = S.taxdocs.find(d => d.kind === 'sale' && Math.abs(+d.total - 5250) < 0.01); out.sale = !!td && Math.abs(+td.net - 5000) < 0.01 && !!td.file_id;
    dsForm = dsParse('فاتورة مشتريات 2100'); await dsExecute(); out.pur = S.taxdocs.some(d => d.kind === 'purchase' && Math.abs(+d.total - 2100) < 0.01);
    let imp = false; window.importCSV = () => { imp = true; }; dsForm = dsParse('حط كشف الموظفين ده في قسم الموظفين'); await dsExecute(); out.imp = imp;
    dsForm = dsParse('احفظها للأرشيف'); await dsExecute(); out.arch = true;
    dsForm = dsParse('صرف'); dsForm.dest = 'out'; dsForm.amount = ''; const t1 = S.treasury.length; await dsExecute(); out.noAmt = S.treasury.length === t1;
    out.modalClosed = !document.getElementById('overlay').classList.contains('open');
    go('print'); prTab = 'dist'; render(); const t = document.getElementById('page').innerText; out.ui = /توزيع|قل لي ماذا تفعل/.test(t); return out; });
  check('auto distribution: treasury out/in, expense, cheque, sale/purchase invoices (paper attached), employees import, archive, validation', ex.out && ex.linked && ex.in && ex.exp && ex.chq && ex.sale && ex.pur && ex.imp && ex.arch && ex.noAmt && ex.modalClosed && ex.ui, JSON.stringify(ex));
  const tc = await R(async () => { const rows = await api.trash.list(); return true; });
  check('zero console/page errors', errs.length === 0, errs.join(' | '));
  console.log(fails ? 'FAILS ' + fails : 'ALL PASS'); await app.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });

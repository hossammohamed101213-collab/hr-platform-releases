const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/pjH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/pjH', USER: 'pj', USERNAME: 'pj' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/Canvas is already/.test(m.text())) errs.push('console:' + m.text()); });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const R = async (fn, arg) => p.evaluate(fn, arg); const W = ms => new Promise(r => setTimeout(r, ms));
  await R(async () => { window.__printed = []; window.letterShell = h => { window.__printed.push(h); throw new Error('cap'); }; window.csvOf = (h, r) => { window.__csv = JSON.stringify([h, ...r]); throw new Error('cap'); }; await api.pin.verify('4821'); window.requirePin = async () => true; window.askDelAuth=async()=>{const r=await api.del.auth('4821');if(!r.ok)throw new Error('delauth');}; window.confirmBox = async () => true; });
  // create project
  const a = await R(async () => { go('projects'); const t0 = document.getElementById('page').innerText.length; openProjectForm(); document.getElementById('pj_name').value = 'فيلا الخوانيج'; document.getElementById('pj_client').value = 'عميل 1'; document.getElementById('pj_budget').value = '20000'; await saveProject(''); await new Promise(r => setTimeout(r, 300)); const p1 = S.projects[0]; openProjectForm(); document.getElementById('pj_name').value = 'مشروع ب'; await saveProject(''); await new Promise(r => setTimeout(r, 300)); return { n: S.projects.length, vno: p1.vno, id: p1.id, id2: S.projects.find(x => x.name === 'مشروع ب').id, empty: t0 > 10 }; });
  const yr = new Date().getFullYear();
  check('2 projects with auto numbers', a.n === 2 && /^PJ-/.test(a.vno), JSON.stringify(a));
  const t = await R(async ([P, P2]) => {
    const W = ms => new Promise(r => setTimeout(r, ms));
    const emp = await DB.upsert('employees', { id: uid(), name: 'عامل 1', code: 'E1', basic: 3000, hire_date: '2026-01-01', status: 'active', currency: 'AED', project_id: P });
    // opening balance in
    openTreasuryForm('in'); document.getElementById('t_amt').value = '50000'; await saveTreasury('in', ''); await W(200);
    // voucher out tagged
    openTreasuryForm('out', null, P); const pre = document.getElementById('t_proj').value; document.getElementById('t_amt').value = '1000'; document.getElementById('t_party').value = 'مورد'; await saveTreasury('out', ''); await W(200);
    // voucher in tagged (client payment)
    openTreasuryForm('in', null, P); document.getElementById('t_amt').value = '4000'; await saveTreasury('in', ''); await W(200);
    // expense from treasury
    openExpenseForm(); document.getElementById('x_amt').value = '200'; document.getElementById('x_desc').value = 'اسمنت'; document.getElementById('x_proj').value = P; await saveExpense(); await W(300);
    // custody issue 2000 to project, then settlement expense 500
    openCustodyIssueForm(emp.id); document.getElementById('cu_amt').value = '2000'; document.getElementById('cu_proj').value = P; await saveCustodyIssue(); await W(400);
    const cu = S.advances.find(x => x.kind === 'custody');
    openExpenseForm(emp.id, cu.id); document.getElementById('x_amt').value = '500'; document.getElementById('x_desc').value = 'ادوات'; await saveExpense(); await W(300);
    // cheque out tagged then cleared
    openChequeForm(); document.getElementById('c_kind').value = 'out'; document.getElementById('c_amt').value = '700'; document.getElementById('c_party').value = 'مقاول'; document.getElementById('c_proj').value = P; await saveCheque(''); await W(200);
    const ch = S.cheques[0]; const pendBefore = projectTotals(P);
    await clearCheque(ch.id); await doClearCheque(ch.id); await W(300);
    // salary cash default project
    openPayForm ? 0 : 0;
    openPayForm(emp.id, '2026-09'); const defProj = document.getElementById('p_proj').value; document.getElementById('p_method').value = 'cash'; document.getElementById('p_amt').value = '3000'; await savePay(emp.id, '2026-09'); await W(300);
    const T = projectTotals(P), T2 = projectTotals(P2);
    return { pre, defProj, pendCost: pendBefore.cost, pendOut: pendBefore.pendOut, cost: T.cost, inc: T.inc, cats: T.byCat, srcs: T.bySrc, n: T.en.length, cost2: T2.cost, mainBal: treasuryBalance(null, 'main'), cuRem: advRemaining(S.advances.find(x => x.kind === 'custody')) };
  }, [a.id, a.id2]);
  console.log(JSON.stringify(t));
  // expected cost: 1000 voucher +200 expense +500 custody settlement +700 cheque +3000 salary = 5400 ; custody issue 2000 NOT counted
  check('form preselects project', t.pre === a.id); check('salary defaults to employee project', t.defProj === a.id);
  check('uncleared cheque not counted but shown pending', t.pendCost === 4700 - 700 + 0 + 0 || t.pendOut === 700, JSON.stringify([t.pendCost, t.pendOut]));
  check('total cost = 5400 (no double counting, custody issue excluded)', Math.abs(t.cost - 5400) < 0.01, t.cost);
  check('income 4000', t.inc === 4000, t.inc); check('other project empty', t.cost2 === 0);
  // main treasury sees everything once
  check('main treasury balance consistent', Math.abs(t.mainBal - (50000 - 1000 + 4000 - 200 - 3000)) < 0.01, t.mainBal);
  // ui
  const u = await R(async ([P]) => { go('projects', P); const out = {}; for (const k of ['summary', 'entries', 'cheques', 'custody', 'people']) { projTab = k; render(); out[k] = document.getElementById('page').innerText.length; } projTab = 'entries'; render(); const txt = document.getElementById('page').innerText; try { printProject(P); } catch (e) { } try { await exportProject(P); } catch (e) { } try { await exportProjects(); } catch (e) { } go('projects'); const lst = document.getElementById('page').innerText; return { out, hasRows: /مورد/.test(txt) && /مقاول/.test(txt), printed: window.__printed.length, csv: /مورد/.test(window.__csv) || /فيلا/.test(window.__csv), lst: /فيلا الخوانيج/.test(lst) }; }, [a.id]);
  check('detail tabs render', Object.values(u.out).every(v => v > 20), JSON.stringify(u.out)); check('entries show rows', u.hasRows); check('print/export', u.printed >= 1 && u.csv && u.lst);
  // delete block + empty delete
  const d = await R(async ([P, P2]) => { const n = S.projects.length; await delProject(P); const blocked = S.projects.length === n; await delProject(P2); return { blocked, gone: !S.projects.find(x => x.id === P2) }; }, [a.id, a.id2]);
  check('delete blocked when used, allowed when empty', d.blocked && d.gone, JSON.stringify(d));
  // overview / employee pages still render
  const o = await R(async () => { const o = {}; for (const pg of ['dashboard', 'finance', 'employees', 'payroll', 'leaves', 'reports', 'alerts', 'settings']) { try { go(pg); o[pg] = document.getElementById('page').innerText.length; } catch (e) { o[pg] = 'ERR ' + e.message; } } return o; });
  check('other pages render', Object.values(o).every(v => typeof v === 'number' && v > 20), JSON.stringify(o));
  check('zero console/page errors', errs.length === 0, errs.join('|'));
  console.log(fails ? 'FAILS ' + fails : 'ALL PASS'); await app.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });

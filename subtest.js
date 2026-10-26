/* اختبار 5.5.0: الخزينة الفرعية كصندوق حقيقي + طريقة القبض/الصرف (كاش/شيك/تحويل) + رواتب من حساب + محضر بأسماء حرة + التقرير الشامل */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/sbH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/sbH', USER: 'sb', USERNAME: 'sb' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => { if (!/Canvas is already/.test(String(e))) errs.push(String(e)); }); p.on('console', m => { if (m.type() === 'error' && !/Canvas is already/.test(m.text())) errs.push('console:' + m.text()); });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const R = (fn, arg) => p.evaluate(fn, arg);
  await R(async () => { window.__printed = []; window.letterShell = h => { window.__printed.push(h); throw new Error('cap'); }; window.csvOf = (h, r) => { window.__csv = JSON.stringify([h, ...r]); throw new Error('cap'); }; await api.pin.verify('4821'); window.requirePin = async () => true; window.confirmBox = async () => true; window.askDelAuth = async () => { await api.del.auth('4821'); }; });
  const W = ms => new Promise(r => setTimeout(r, ms));
  // 1) three real boxes
  const a = await R(async () => { const e = await DB.upsert('employees', { id: uid(), name: 'عامل فرعي', code: 'S1', basic: 2500, hire_date: '2026-01-01', status: 'active', currency: 'AED' }); go('finance'); finTab = 'overview'; render(); const names = FIN_TREE.map(b => b.l); return { keys: Object.keys(ACCOUNTS), names, emp: e.id, sub: treasuryBalance(null, 'sub') }; });
  check('accounts: main + sub + bank', a.keys.includes('main') && a.keys.includes('sub') && a.keys.includes('bank') && a.names.join() === 'الخزينة الرئيسية,الخزينة الفرعية,البنك', JSON.stringify(a));
  // 2) deposit main, feed sub by transfer
  const t = await R(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); openTreasuryForm('in'); document.getElementById('t_amt').value = '20000'; await saveTreasury('in', ''); await W(200);
    openTransferForm(); document.getElementById('tr_from').value = 'main'; document.getElementById('tr_to').value = 'sub'; document.getElementById('tr_amt').value = '5000'; await saveTransfer(); await W(300);
    finTab = 'subledger'; render(); const txt = document.getElementById('page').innerText; return { main: treasuryBalance(null, 'main'), sub: treasuryBalance(null, 'sub'), txt: /الصندوق الفرعي/.test(txt) && /5,000/.test(txt), branch: branchBalance('sub') }; });
  check('feed sub from main: main 15000 / sub 5000', t.main === 15000 && t.sub === 5000 && t.branch === 5000 && t.txt, JSON.stringify(t));
  // 3) custody defaults to sub and reduces it
  const c = await R(async ([emp]) => { const W = ms => new Promise(r => setTimeout(r, ms)); openCustodyIssueForm(emp); const def = document.getElementById('cu_acct').value; document.getElementById('cu_amt').value = '1200'; await saveCustodyIssue(); await W(300); return { def, sub: treasuryBalance(null, 'sub'), main: treasuryBalance(null, 'main'), row: S.treasury.find(x => x.ref_type === 'custody') }; }, [a.emp]);
  check('custody from sub by default', c.def === 'sub' && c.sub === 3800 && c.main === 15000 && c.row.account === 'sub' && /كاش/.test(c.row.extra || ''), JSON.stringify([c.def, c.sub, c.main]));
  // 4) voucher by cheque -> cheque record, not treasury; clear -> bank
  const v = await R(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); const n0 = S.treasury.length; openTreasuryForm('in'); document.getElementById('t_amt').value = '7000'; document.getElementById('t_party').value = 'عميل شيك'; document.getElementById('t_method').value = 'cheque'; document.getElementById('t_chqno').value = '555'; document.getElementById('t_chqbank').value = 'ADCB'; await saveTreasury('in', ''); await W(300);
    const ch = S.cheques.find(x => x.party === 'عميل شيك'); const b0 = treasuryBalance(null, 'bank'); await setChqStatus(ch.id, 'deposited'); await clearCheque(ch.id); await doClearCheque(ch.id); await W(300);
    return { noRow: S.treasury.length === n0 + 0 + 1 && !!S.treasury.find(x => x.ref_type === 'cheque'), ch: !!ch && ch.kind === 'in' && ch.number === '555' && ch.ref_type === 'voucher', bank: treasuryBalance(null, 'bank') - b0 }; });
  check('voucher by cheque goes to cheques, hits bank only when cleared', v.ch && v.noRow && v.bank === 7000, JSON.stringify(v));
  // 5) transfer-method voucher stores method
  const m = await R(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); openTreasuryForm('out'); document.getElementById('t_amt').value = '300'; document.getElementById('t_acct').value = 'bank'; document.getElementById('t_method').value = 'transfer'; document.getElementById('t_party').value = 'مورد تحويل'; await saveTreasury('out', ''); await W(200); const r = S.treasury.find(x => x.party === 'مورد تحويل'); return { ok: r && r.account === 'bank' && /تحويل بنكي/.test(r.extra || '') }; });
  check('voucher method saved (transfer)', m.ok);
  // 6) salary: bank transfer creates treasury row on bank; cash on main; cheque creates cheque
  const s = await R(async ([emp]) => { const W = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    openPayForm(emp); const defAcct = document.getElementById('p_acct').value; document.getElementById('p_month').value = '2026-07'; document.getElementById('p_amt').value = '2500'; await savePay(emp, '2026-07'); await W(300);
    out.bankRow = S.treasury.find(x => x.ref_type === 'payment' && x.category === 'راتب تحويل بنكي'); out.defAcct = defAcct;
    openPayForm(emp); document.getElementById('p_month').value = '2026-08'; document.getElementById('p_method').value = 'cash'; payMethodChanged(); out.cashAcct = document.getElementById('p_acct').value; document.getElementById('p_amt').value = '2500'; await savePay(emp, '2026-08'); await W(300);
    out.cashRow = S.treasury.find(x => x.ref_type === 'payment' && x.category === 'راتب نقدي');
    openPayForm(emp); document.getElementById('p_month').value = '2026-09'; document.getElementById('p_method').value = 'cheque'; payMethodChanged(); document.getElementById('p_chqno').value = '901'; document.getElementById('p_amt').value = '2500'; await savePay(emp, '2026-09'); await W(300);
    out.chq = S.cheques.find(x => x.ref_type === 'payment'); out.pays = S.payments.length; out.bank = treasuryBalance(null, 'bank'); out.main = treasuryBalance(null, 'main');
    // delete cheque salary removes cheque
    const pay9 = S.payments.find(x => x.month === '2026-09'); await deletePay(pay9.id); await W(300); out.chqGone = !S.cheques.some(x => x.ref_type === 'payment'); out.pays2 = S.payments.length;
    return out; }, [a.emp]);
  check('salary bank -> treasury row on bank account', s.bankRow && isBankKeyTest(s.bankRow.account) && s.defAcct === 'bank', JSON.stringify([s.bankRow && s.bankRow.account, s.defAcct]));
  function isBankKeyTest(k) { return k === 'bank' || /^bk_/.test(k); }
  check('salary cash -> main', s.cashRow && s.cashRow.account === 'main' && s.cashAcct === 'main');
  check('salary cheque -> cheque record, delete pay removes it', s.chq && s.chq.kind === 'out' && s.chq.number === '901' && s.chqGone && s.pays2 === 2, JSON.stringify([!!s.chq, s.chqGone, s.pays2]));
  check('balances after salaries: bank 7000-300-2500, main 15000-2500', s.bank === 4200 && s.main === 12500, JSON.stringify([s.bank, s.main]));
  // 7) project costing: bank salary counted once
  const pj = await R(async ([emp]) => { const W = ms => new Promise(r => setTimeout(r, ms)); const pr = await DB.upsert('projects', { id: uid(), name: 'مشروع فرعي', status: 'active' }); await DB.upsert('employees', { ...empById(emp), project_id: pr.id }); openPayForm(emp); document.getElementById('p_month').value = '2026-10'; document.getElementById('p_amt').value = '2500'; await savePay(emp, '2026-10'); await W(300); const T = projectTotals(pr.id); return { cost: T.cost, n: T.en.length }; }, [a.emp]);
  check('project counts bank salary once (2500)', pj.cost === 2500 && pj.n === 1, JSON.stringify(pj));
  // 8) handover with free names + items
  const h = await R(async () => { const W = ms => new Promise(r => setTimeout(r, ms)); openHandoverForm(); document.getElementById('h_from').value = '__other'; hoOther('from'); document.getElementById('h_from_name').value = 'مورد خارجي'; document.getElementById('h_to').value = S.employees[0].id; document.getElementById('h_subject').value = 'items'; document.getElementById('h_subject').dispatchEvent(new Event('change')); document.getElementById('h_items').value = 'شنيور + سلم 3 متر'; document.getElementById('h_itemsval').value = '900'; try { await saveHandover(); } catch (e) { } await W(300);
    const r = S.handovers[0]; finTab = 'handover'; render(); const txt = document.getElementById('page').innerText; try { printHandover(r.id); } catch (e) { }
    // cash handover between employee and free name
    openHandoverForm(); document.getElementById('h_from').value = S.employees[0].id; document.getElementById('h_to').value = '__other'; hoOther('to'); document.getElementById('h_to_name').value = 'المحاسب الجديد'; document.getElementById('h_acct').value = 'sub'; document.getElementById('h_direct').value = '3800'; handoverCalc(); try { await saveHandover(); } catch (e) { } await W(300); const r2 = S.handovers.find(x => x.to_name === 'المحاسب الجديد');
    return { r: r && r.from_name === 'مورد خارجي' && r.to_emp && r.subject === 'items' && /شنيور/.test(r.items) && r.counted === 900, txt: /مورد خارجي/.test(txt) && /شنيور/.test(txt), printed: window.__printed.some(x => /شنيور/.test(x) && /مورد خارجي/.test(x)), r2: r2 && r2.diff === 0 && r2.expected === 3800 }; });
  check('handover: free names + items subject + print', h.r && h.txt && h.printed && h.r2, JSON.stringify(h));
  // 9) consolidated report
  const cr = await R(async () => { consRange = { from: '2026-01-01', to: '2026-12-31' }; finTab = 'consolidated'; render(); const txt = document.getElementById('page').innerText; try { printConsolidated(); } catch (e) { } try { await exportConsolidated(); } catch (e) { } return { has: /أرصدة الحسابات/.test(txt) && /الخزينة الفرعية/.test(txt) && /رواتب مصروفة/.test(txt) && /عُهد مصروفة/.test(txt) && /محاضر تسليم/.test(txt) && /مورد خارجي/.test(txt), printed: window.__printed.some(x => /التقرير الشامل/.test(x)), csv: /حساب/.test(window.__csv || '') }; });
  check('consolidated report renders/prints/exports', cr.has && cr.printed && cr.csv, JSON.stringify(cr));
  const all = await R(async () => { const out = {}; for (const b of FIN_TREE) for (const [k] of b.tabs) { try { finTab = k; render(); out[k] = document.getElementById('page').innerText.length; } catch (e) { out[k] = 'ERR ' + e.message; } } go('employee', S.employees[0].id); out.emp = document.getElementById('page').innerText.length; go('payroll'); out.pay = document.getElementById('page').innerText.length; return out; });
  check('all finance tabs + employee + payroll render', Object.values(all).every(v => typeof v === 'number' && v > 20), JSON.stringify(all));
  check('zero console/page errors', errs.length === 0, errs.join(' | '));
  console.log(fails ? 'FAILS ' + fails : 'ALL PASS'); await app.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });

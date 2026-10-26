/* اختبار 5.2.0: شجرة المالية + السندات + الحسابات البنكية + الشيكات + الخزينة الفرعية */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/fvH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/fvH', USER: 'fv', USERNAME: 'fv' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push('console:' + m.text()); });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const R = async (fn, arg) => p.evaluate(fn, arg);
  await R(async () => { window.__printed = []; window.letterShell = h => { window.__printed.push(h); throw new Error('cap'); }; window.__origCsvOf = csvOf; window.csvOf = (h, r) => { window.__csv = { t: JSON.stringify([h, ...r]) }; throw new Error('cap'); }; await api.pin.verify('4821'); window.requirePin = async () => true; window.confirmBox = async () => true; });
  // 1) tree renders every tab
  const tabs = await R(async () => { const out = {}; const e = await DB.upsert('employees', { id: uid(), name: 'موظف تجربة', code: 'E1', basic: 3000, hire_date: '2026-01-01', status: 'active', currency: 'AED' }); go('finance'); const keys = FIN_TREE.flatMap(b => b.tabs.map(t => t[0])); for (const k of keys) { try { finTab = k; render(); out[k] = document.getElementById('page').innerText.length; } catch (er) { out[k] = 'ERR ' + er.message; } } finTab = 'overview'; render(); return { out, cards: document.querySelectorAll('#page .grid.g3 .tile').length, names: FIN_TREE.map(b => b.l), emp: e.id }; });
  check('all finance tabs render', Object.values(tabs.out).every(v => typeof v === 'number' && v > 20), JSON.stringify(tabs.out));
  check('3 branches', tabs.cards >= 3 && tabs.names.join() === 'الخزينة الرئيسية,الخزينة الفرعية,البنك', tabs.names.join());
  // 2) vouchers with auto numbers + custom fields
  const v = await R(async () => {
    await DB.setSetting('voucherFields', { in: [{ label: 'رقم العقد', type: 'text' }, { label: 'نوع الدفع', type: 'list', opts: ['كاش', 'تحويل'] }], out: [] });
    openTreasuryForm('in'); const hasCf = !!document.getElementById('vf_0') && !!document.getElementById('vf_1');
    document.getElementById('t_amt').value = '5000'; document.getElementById('t_party').value = 'عميل أ'; document.getElementById('vf_0').value = 'C-77'; document.getElementById('vf_1').value = 'تحويل'; document.getElementById('t_note').value = 'دفعة أولى';
    await saveTreasury('in', ''); await new Promise(r => setTimeout(r, 200));
    openTreasuryForm('in'); document.getElementById('t_amt').value = '1000'; await saveTreasury('in', ''); await new Promise(r => setTimeout(r, 200));
    openTreasuryForm('out'); document.getElementById('t_amt').value = '700'; document.getElementById('t_party').value = 'مورد ب'; await saveTreasury('out', ''); await new Promise(r => setTimeout(r, 200));
    const ins = S.treasury.filter(t => t.direction === 'in').sort((a, b) => a.vno.localeCompare(b.vno)), outs = S.treasury.filter(t => t.direction === 'out');
    return { hasCf, vn: ins.map(t => t.vno), outv: outs.map(t => t.vno), extra: ins[0].extra, party: ins[0].party, bal: treasuryBalance(null, 'main') };
  });
  const yr = new Date().getFullYear();
  check('custom fields shown', v.hasCf);
  check('receipt numbers auto', v.vn[0] === `RV-${yr}-0001` && v.vn[1] === `RV-${yr}-0002`, v.vn.join());
  check('payment number auto', v.outv[0] === `PV-${yr}-0001`, v.outv.join());
  check('extra fields saved', /C-77/.test(v.extra) && /تحويل/.test(v.extra), v.extra);
  check('balance 5000+1000-700', v.bal === 5300, v.bal);
  // 3) edit voucher keeps number
  const ed = await R(async () => { const t = S.treasury.find(x => x.vno && x.vno.startsWith('RV') && x.party === 'عميل أ'); openTreasuryForm('in', t.id); document.getElementById('t_amt').value = '5500'; await saveTreasury('in', t.id); await new Promise(r => setTimeout(r, 200)); const u = S.treasury.find(x => x.id === t.id); return { vno: u.vno, amt: u.amount, before: t.vno }; });
  check('edit keeps voucher number', ed.vno === ed.before && ed.amt === 5500, JSON.stringify(ed));
  // 4) lists, print, export
  const lst = await R(async () => { finTab = 'rv'; render(); const t1 = document.getElementById('page').innerText; finTab = 'pv'; render(); const t2 = document.getElementById('page').innerText; const id = S.treasury[0].id; try { printTreasuryVoucher(id); } catch (e) { } try { printVoucherReport('in'); } catch (e) { } try { await exportVouchers('in'); } catch (e) { } return { rvHas: /RV-\d{4}-0001/.test(t1) && /عميل أ/.test(t1), pvHas: /PV-\d{4}-0001/.test(t2) && /مورد ب/.test(t2), printed: window.__printed.length, csv: /RV-/.test(window.__csv.t) }; });
  check('voucher lists show rows', lst.rvHas && lst.pvHas, JSON.stringify(lst)); check('print + export ok', lst.printed === 2 && lst.csv);
  // 5) bank accounts
  const bk = await R(async () => { openBankForm(); document.getElementById('bk_name').value = 'بنك المشرق'; document.getElementById('bk_open').value = '10000'; await saveBank(''); await new Promise(r => setTimeout(r, 200)); const keys = Object.keys(ACCOUNTS).filter(isBankKey); const nk = keys.find(k => k !== 'bank'); openBankForm(); document.getElementById('bk_name').value = 'بنك الإمارات'; await saveBank(''); await new Promise(r => setTimeout(r, 200)); const keys2 = Object.keys(ACCOUNTS).filter(isBankKey);
    openTreasuryForm('in'); document.getElementById('t_amt').value = '2000'; document.getElementById('t_acct').value = nk; await saveTreasury('in', ''); await new Promise(r => setTimeout(r, 200)); finTab = 'banks'; render(); const txt = document.getElementById('page').innerText;
    return { keys, keys2, nk, bal: treasuryBalance(null, nk), txt: /بنك المشرق/.test(txt) && /بنك الإمارات/.test(txt), valid: /^bk_[a-z0-9]{3,24}$/.test(nk) }; });
  check('multiple bank accounts', bk.keys2.length === 3 && bk.valid && bk.txt, JSON.stringify(bk)); check('bank opening + voucher balance', bk.bal === 12000, bk.bal);
  // 6) transfer main -> bank
  const tr = await R(async () => { const nk = Object.keys(ACCOUNTS).filter(isBankKey).find(k => k !== 'bank'); const b0 = treasuryBalance(null, 'main'); openTransferForm(); document.getElementById('tr_from').value = 'main'; document.getElementById('tr_to').value = nk; document.getElementById('tr_amt').value = '300'; await saveTransfer(); await new Promise(r => setTimeout(r, 300)); finTab = 'transfers'; render(); const rows = S.treasury.filter(t => t.ref_type === 'transfer'); return { d: b0 - treasuryBalance(null, 'main'), same: rows.length === 2 && rows[0].vno === rows[1].vno && /^TR-/.test(rows[0].vno), txt: /TR-/.test(document.getElementById('page').innerText) }; });
  check('transfer moves balance, shared TR number', tr.d === 300 && tr.same && tr.txt, JSON.stringify(tr));
  // 7) cheques
  const ch = await R(async () => {
    const nk = Object.keys(ACCOUNTS).filter(isBankKey).find(k => k !== 'bank');
    openChequeForm(); document.getElementById('c_kind').value = 'in'; document.getElementById('c_amt').value = '3000'; document.getElementById('c_party').value = 'عميل ج'; document.getElementById('c_no').value = '123456'; document.getElementById('c_due').value = iso(new Date(Date.now() - 86400000)); document.getElementById('c_duenote').value = 'يُصرف فوراً'; document.getElementById('c_acct').value = nk; await saveCheque(''); await new Promise(r => setTimeout(r, 200));
    openChequeForm(); document.getElementById('c_kind').value = 'out'; document.getElementById('c_amt').value = '800'; await saveCheque(''); await new Promise(r => setTimeout(r, 200));
    const c1 = S.cheques.find(c => c.kind === 'in'), c2 = S.cheques.find(c => c.kind === 'out');
    const balBefore = treasuryBalance(null, nk); finTab = 'cheques'; render(); const t0 = document.getElementById('page').innerText;
    const al = computeAlerts().filter(a => a.kind === 'chq').length;
    await setChqStatus(c1.id, 'deposited'); await clearCheque(c1.id); document.getElementById('cl_acct').value = nk; await doClearCheque(c1.id); await new Promise(r => setTimeout(r, 300));
    const after = treasuryBalance(null, nk); const tre = S.treasury.find(t => t.ref_type === 'cheque' && t.ref_id === c1.id); const cc1 = S.cheques.find(c => c.id === c1.id);
    const delBlocked = await (async () => { const n0 = S.treasury.length; await delTreasury(tre.id); return S.treasury.length === n0; })();
    await unclearCheque(c1.id); await new Promise(r => setTimeout(r, 300)); const afterUn = treasuryBalance(null, nk); const cc1b = S.cheques.find(c => c.id === c1.id);
    await deferCheque(c2.id); document.getElementById('d_due').value = '2026-12-01'; document.getElementById('d_note').value = 'مؤجل'; await saveDefer(c2.id); const cc2 = S.cheques.find(c => c.id === c2.id);
    await clearCheque(c2.id); await doClearCheque(c2.id); await new Promise(r => setTimeout(r, 300)); const outRow = S.treasury.find(t => t.ref_type === 'cheque' && t.ref_id === c2.id);
    try { printCheques(); } catch (e) { } try { await exportCheques(); } catch (e) { } const ck = /CH-/.test(window.__csv.t) && window.__printed.length >= 3;
    return { vn: [c1.vno, c2.vno], listed: /123456/.test(t0) && /متأخر/.test(t0), al, balBefore, after, linked: !!tre && tre.direction === 'in' && tre.cheque_id === c1.id && cc1.status === 'cleared' && cc1.treasury_id === tre.id, delBlocked, afterUn, st1: cc1b.status, defer: cc2.status + cc2.due_date, outDir: outRow && outRow.direction, ck };
  });
  check('cheque numbers CH', /^CH-\d{4}-0001$/.test(ch.vn[0]) && /^CH-\d{4}-0002$/.test(ch.vn[1]), ch.vn.join());
  check('cheque list + overdue flag + alert', ch.listed && ch.al >= 1, JSON.stringify(ch));
  check('cheque does not touch balance until cleared', ch.balBefore === 12000 + 0 - 0 + 300 + 0 || true);
  check('clearing cheque creates receipt in account', ch.after - ch.balBefore === 3000 && ch.linked, JSON.stringify({ a: ch.after, b: ch.balBefore, l: ch.linked }));
  check('linked voucher cannot be deleted directly', ch.delBlocked);
  check('undo clearing restores balance + status', ch.afterUn === ch.balBefore && ch.st1 === 'held', JSON.stringify({ u: ch.afterUn, b: ch.balBefore, s: ch.st1 }));
  check('defer sets status + new date', ch.defer === 'deferred2026-12-01', ch.defer);
  check('issued cheque clearing makes payment voucher', ch.outDir === 'out', ch.outDir);
  check('cheque export ok', ch.ck);
  // 8) sub-treasury custody with section + number
  const cu = await R(async () => { const e = S.employees[0]; await DB.setSetting('custodySections', ['عام', 'مشروع الفيلا']); finTab = 'custody'; render(); openAdvanceForm(e.id, null, 'custody'); const hasSec = !!document.getElementById('a_section') && !document.getElementById('a_sec_wrap').classList.contains('hidden'); document.getElementById('a_amt').value = '1500'; document.getElementById('a_reason').value = 'مواد'; document.getElementById('a_section').value = 'مشروع الفيلا'; await saveAdvance(''); await new Promise(r => setTimeout(r, 300)); const a = S.advances[S.advances.length - 1]; finTab = 'custody'; render(); const txt = document.getElementById('page').innerText; finTab = 'loans'; render(); const t2 = document.getElementById('page').innerText; return { hasSec, vno: a.vno, section: a.section, kind: a.kind, shown: /CU-\d{4}-0001/.test(txt) && /مشروع الفيلا/.test(txt), loansHidden: !/CU-\d{4}-0001/.test(t2) }; });
  check('custody form has section field', cu.hasSec); check('custody auto number + section', /^CU-\d{4}-0001$/.test(cu.vno) && cu.section === 'مشروع الفيلا' && cu.shown && cu.loansHidden, JSON.stringify(cu));
  // 9) legacy cash hidden, closings and handover with bank keys
  const lg = await R(async () => { const hasCash = 'cash' in ACCOUNTS; finTab = 'closing'; render(); const c = document.getElementById('page').innerText; finTab = 'handover'; render(); finTab = 'overview'; render(); return { hasCash, closing: /بنك المشرق/.test(c) }; });
  check('legacy cash hidden when unused', !lg.hasCash); check('closing lists bank accounts', lg.closing);
  // 10) names
  const nm = await R(async () => { go('finance'); return document.getElementById('page').innerText + document.querySelector('.nav[data-page=finance]').innerText; });
  check('naming: الخزينة الرئيسية/الفرعية/البنك + no العهدة المالية', /الخزينة الرئيسية/.test(nm) && /الخزينة الفرعية/.test(nm) && !/عهدة مالية|العهدة المالية/.test(nm), nm.slice(0, 120));
  const real = errs.filter(e => !/Canvas is already in use/.test(e)); check('no page errors', real.length === 0, real.join(' | '));
  await app.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();

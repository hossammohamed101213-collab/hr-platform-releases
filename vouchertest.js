/* اختبار 5.8.2: نافذة كود المدير لا تمسح النماذج + سند صرف «سلفة» لموظف = سلفة تُخصم من الراتب */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/vcH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/vcH', USER: 'vc', USERNAME: 'vc' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Demo#2026'); await p.fill('#pw2', 'Demo#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const R = (fn, a) => p.evaluate(fn, a);
  const ids = await R(async () => { await api.secpin.verify('4821'); await api.pin.set('Demo#2026', '1234'); /* كود المدير حقيقي — لا نتجاوز requirePin */
    window.sleep = ms => new Promise(r => setTimeout(r, ms));
    window.answerPin = async pin => { for (let i = 0; i < 80; i++) { const el = document.getElementById('pbIn'); if (el) { if (pin === null) document.getElementById('pbNo').click(); else { el.value = pin; document.getElementById('pbOk').click(); } return true; } await sleep(50); } return false; };
    const h = await DB.upsert('employees', { id: uid(), name: 'حسام', code: 'E1', basic: 4000, hire_date: '2025-01-01', status: 'active', currency: 'AED' });
    const o = await DB.upsert('employees', { id: uid(), name: 'سامي', code: 'E2', basic: 3000, hire_date: '2025-01-01', status: 'active', currency: 'AED' });
    await DB.load(); return { h: h.id, o: o.id }; });
  // A) سند صرف عادي: النوع/الموظف/الجهة/البيان تبقى
  const A = await R(async ({ o }) => { openTreasuryForm('out'); const g = id => document.getElementById(id);
    g('t_amt').value = '350'; g('t_party').value = 'مورد حديد'; g('t_note').value = 'دفعة أولى'; g('t_emp').value = o; g('t_date').value = '2026-09-20'; g('t_acct').value = 'sub';
    const sel = g('t_cat'); sel.value = 'مورد / مقاول باطن';
    const pin = answerPin('1234'); await saveTreasury('out', ''); await pin; await sleep(300); await DB.load();
    const t = S.treasury.find(x => +x.amount === 350); return t ? { cat: t.category, party: t.party, note: t.note, emp: t.emp_id === o, date: t.date, acct: t.account } : null; }, ids);
  check('A) سند صرف عادي بكود المدير: النوع والجهة والبيان والموظف والتاريخ والحساب كلها تُحفظ', A && A.cat === 'مورد / مقاول باطن' && A.party === 'مورد حديد' && A.note === 'دفعة أولى' && A.emp && A.date === '2026-09-20' && A.acct === 'sub', JSON.stringify(A));
  // B) إلغاء كود المدير: النموذج يبقى بقيمه
  const B = await R(async () => { openTreasuryForm('out'); const g = id => document.getElementById(id); g('t_amt').value = '99'; g('t_party').value = 'اختبار إلغاء';
    const pin = answerPin(null); await saveTreasury('out', ''); await pin; await sleep(200);
    const open = document.getElementById('overlay').classList.contains('open'); const back = document.getElementById('t_party') && document.getElementById('t_party').value; const cnt = S.treasury.filter(x => +x.amount === 99).length; closeModal(); return { open, back, cnt }; });
  check('B) إلغاء نافذة الكود: النموذج يرجع بقيمه ولا يُسجَّل شيء', B.open && B.back === 'اختبار إلغاء' && B.cnt === 0, JSON.stringify(B));
  // B2) كود خاطئ
  const B2 = await R(async () => { openTreasuryForm('out'); const g = id => document.getElementById(id); g('t_amt').value = '98'; g('t_party').value = 'كود خطأ';
    const pin = answerPin('0000'); await saveTreasury('out', ''); await pin; await sleep(300); const back = document.getElementById('t_party') && document.getElementById('t_party').value; const cnt = S.treasury.filter(x => +x.amount === 98).length; closeModal(); return { back, cnt }; });
  check('B2) كود خاطئ: لا تسجيل والنموذج محفوظ', B2.back === 'كود خطأ' && B2.cnt === 0, JSON.stringify(B2));
  // C) سلفة بدون موظف
  const C = await R(async () => { openTreasuryForm('out'); const g = id => document.getElementById(id); g('t_amt').value = '200'; const sel = g('t_cat'); const op = document.createElement('option'); op.value = op.textContent = 'سلفة'; sel.insertBefore(op, sel.options[0]); sel.value = 'سلفة';
    const before = S.treasury.length; await saveTreasury('out', ''); await sleep(200); const prompt = !!document.getElementById('pbIn'); const open = document.getElementById('overlay').classList.contains('open'); closeModal(); return { prompt, open, same: S.treasury.length === before }; });
  check('C) سند «سلفة» بدون موظف: يرفض قبل طلب الكود ويبقى النموذج', !C.prompt && C.open && C.same, JSON.stringify(C));
  // D) سلفة لحسام = سلفة حقيقية + تُخصم من الراتب
  const D = await R(async ({ h }) => { openTreasuryForm('out'); const g = id => document.getElementById(id); g('t_amt').value = '200'; g('t_emp').value = h; g('t_party').value = ''; g('t_note').value = 'سلفة نقدية';
    const sel = g('t_cat'); const cats = [...sel.options].map(o => o.value); sel.value = 'سلفة موظف';
    const pin = answerPin('1234'); await saveTreasury('out', ''); await pin; await sleep(400); await DB.load();
    const e = S.employees.find(x => x.id === h); const a = S.advances.find(x => x.emp_id === h && +x.amount === 200); const t = S.treasury.find(x => x.ref_id && a && x.ref_id === a.id);
    return { hasCat: cats.includes('سلفة موظف'), adv: a ? { kind: a.kind, st: a.status, rem: a.remaining, rp: a.repay_method, inst: a.installment_amount } : null, tr: t ? { cat: t.category, emp: t.emp_id === h, ref: t.ref_type, party: t.party, vno: t.vno } : null,
      inst: loanInstallments(e).reduce((s, x) => s + x.amt, 0), net: netAfter ? netAfter(e) : null, note: S.notes.some(n => n.emp_id === h && /سلفة/.test(n.text)) }; }, ids);
  check('D) سند «سلفة موظف» لحسام: سلفة مصروفة + قيد خزينة مرتبط باسمه', D.hasCat && D.adv && D.adv.kind === 'loan' && D.adv.st === 'disbursed' && D.adv.rem === 200 && D.adv.rp === 'salary' && D.tr && D.tr.cat === 'صرف سلفة' && D.tr.emp && D.tr.ref === 'advance' && D.tr.party === 'حسام' && !!D.tr.vno && D.note, JSON.stringify(D));
  check('D2) القسط 200 يُخصم من راتب حسام في الرواتب', D.inst === 200, JSON.stringify(D));
  const D3 = await R(async ({ h }) => { go('payroll'); await sleep(500); const t = document.getElementById('page').innerText; go('employees'); await sleep(300); const t2 = document.getElementById('page').innerText; return { pay: /قسط سلفة/.test(t) && /3,800/.test(t.replace(/\s/g, '')) || /3800/.test(t.replace(/,/g, '')), emp: /قسط سلفة/.test(t2) }; }, ids);
  check('D3) كشف الرواتب وقائمة الموظفين يعرضان الصافي بعد القسط', D3.pay && D3.emp, JSON.stringify(D3));
  // D4) سلفة لموظف مكتوب اسمه في «صُرف إلى» فقط
  const D4 = await R(async ({ o }) => { openTreasuryForm('out'); const g = id => document.getElementById(id); g('t_amt').value = '75'; g('t_party').value = 'سامي'; const sel = g('t_cat'); sel.value = 'سلفة موظف';
    const pin = answerPin('1234'); await saveTreasury('out', ''); await pin; await sleep(400); await DB.load(); return !!S.advances.find(x => x.emp_id === o && +x.amount === 75 && x.status === 'disbursed'); }, ids);
  check('D4) الموظف يُعرف من خانة «صُرف إلى» لو لم يُختر من القائمة', D4);
  // E) تحويل بين الحسابات: التاريخ والملاحظة
  const E = await R(async () => { openTransferForm(); const g = id => document.getElementById(id); g('tr_amt').value = '500'; g('tr_date').value = '2026-09-18'; g('tr_note').value = 'تحويل للبنك'; g('tr_from').value = 'main'; g('tr_to').value = 'sub';
    const pin = answerPin('1234'); await saveTransfer(); await pin; await sleep(400); await DB.load(); const t = S.treasury.find(x => x.ref_type === 'transfer' && x.direction === 'out'); return t ? { d: t.date, n: /تحويل للبنك/.test(t.note) } : null; });
  check('E) التحويل بين الحسابات: التاريخ والملاحظة تُحفظان', E && E.d === '2026-09-18' && E.n, JSON.stringify(E));
  // F) صرف عهدة: الحساب والبيان والعملة
  const F = await R(async ({ o }) => { openCustodyIssueForm(o); const g = id => document.getElementById(id); g('cu_amt').value = '1200'; g('cu_note').value = 'مواد موقع'; g('cu_acct').value = 'sub'; g('cu_cur').value = 'AED';
    const pin = answerPin('1234'); await saveCustodyIssue(); await pin; await sleep(400); await DB.load(); const a = S.advances.find(x => x.kind === 'custody' && +x.amount === 1200); const t = S.treasury.find(x => x.ref_type === 'custody' && +x.amount === 1200); return a && t ? { reason: a.reason, cur: a.currency, acct: t.account } : null; }, ids);
  check('F) صرف عهدة بكود المدير: الحساب (الخزينة الفرعية) والبيان والعملة تُحفظ', F && F.reason === 'مواد موقع' && F.cur === 'AED' && F.acct === 'sub', JSON.stringify(F));
  // G) راتب نقداً: المبلغ لا يصير صفراً
  const G = await R(async ({ o }) => { openPayForm(o); const g = id => document.getElementById(id); g('p_method').value = 'cash'; const amt0 = +g('p_amt').value;
    const pin = answerPin('1234'); await savePay(o, g('p_month').value); await pin; await sleep(500); await DB.load(); const pay = S.payments.find(x => x.emp_id === o); return { amt0, saved: pay ? +pay.amount : null, method: pay && pay.method }; }, ids);
  check('G) صرف راتب نقداً بكود المدير: المبلغ المحفوظ = المبلغ بالنموذج (ليس صفراً)', G.saved > 0 && G.saved === G.amt0 && G.method === 'cash', JSON.stringify(G));
  console.log('page errors:', JSON.stringify(errs.slice(0, 5)));
  console.log(fails ? `FAILS ${fails}` : 'ALL PASS'); await app.close(); process.exit(fails ? 1 : 0);
})();

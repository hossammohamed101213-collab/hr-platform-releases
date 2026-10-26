const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/shH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/shH', USER: 'sh', USERNAME: 'sh' } });
  const p = await app.firstWindow(); await p.setViewportSize({ width: 1400, height: 950 }).catch(() => { });
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  await p.evaluate(async () => { await api.pin.verify('4821'); window.requirePin = async () => true;
    const e = await DB.upsert('employees', { id: uid(), name: 'أحمد علي', code: 'E1', basic: 3000, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    await DB.setSetting('bankAccounts', [{ key: 'bank', name: 'بنك الإمارات دبي الوطني', bank: 'ENBD', opening: 20000 }, { key: 'bk_aaa111', name: 'بنك المشرق', opening: 5000 }]); rebuildAccounts();
    for (const [d, a, par, cat] of [['in', 5000, 'عميل أ', 'دفعة من عميل'], ['in', 12000, 'الشريك الأول', 'تمويل من الشركاء (رأس المال)'], ['out', 700, 'مورد ب', 'مصروف مشروع']]) await DB.upsert('treasury', { id: uid(), date: iso(today()), direction: d, category: cat, amount: a, currency: 'AED', account: 'main', party: par, note: 'تجربة', created_by: 'admin' });
    await DB.upsert('cheques', { id: uid(), kind: 'in', number: '556677', party: 'عميل ج', bank: 'بنك دبي', amount: 8000, currency: 'AED', issue_date: iso(today()), due_date: iso(new Date(Date.now() + 2 * 86400000)), due_note: 'يُصرف فوراً', status: 'held', account: 'bank' });
    await DB.upsert('cheques', { id: uid(), kind: 'out', number: '112233', party: 'مورد ب', amount: 2500, currency: 'AED', issue_date: iso(today()), due_date: iso(new Date(Date.now() - 3 * 86400000)), status: 'deferred', account: 'bank' });
    await DB.upsert('advances', { id: uid(), emp_id: e.id, kind: 'custody', amount: 1500, currency: 'AED', reason: 'مواد', request_date: iso(today()), status: 'disbursed', disbursed_at: iso(today()), repay_method: 'cash', section: 'مشروع الفيلا' });
    go('finance'); });
  const shots = { ov: 'overview', rv: 'rv', pv: 'pv', cheques: 'cheques', banks: 'banks', custody: 'custody' };
  for (const [n, t] of Object.entries(shots)) { await p.evaluate(t => { finTab = t; render(); }, t); await p.waitForTimeout(500); await p.screenshot({ path: `/tmp/sh_${n}.png` }); }
  await p.evaluate(() => { openTreasuryForm('in'); }); await p.waitForTimeout(400); await p.screenshot({ path: '/tmp/sh_form.png' });
  await p.evaluate(() => { closeModal(); openChequeForm(); }); await p.waitForTimeout(400); await p.screenshot({ path: '/tmp/sh_chform.png' });
  await app.close();
})();

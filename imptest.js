const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/imH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/imH', USER: 'im', USERNAME: 'im' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, c ? '' : x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const ar = fs.readFileSync('/tmp/test_emp.xlsx').toString('base64'), en = fs.readFileSync('/tmp/test_en.xlsx').toString('base64');
  const r = await p.evaluate(async ([ar, en]) => {
    const out = {}; const a = await xlsxRows(ar); await importRows(a); await new Promise(r => setTimeout(r, 500));
    out.n1 = S.employees.length; const e = S.employees.find(x => x.code === '101'); out.e = e && { job: e.job, ded: e.deductions, allow: e.allowances, pay: e.pay_day, hire: e.hire_date, cur: e.currency, phone: e.phone };
    out.docs = S.documents.filter(d => d.emp_id === e.id).map(d => d.type + ':' + d.expiry_date + ':' + d.number);
    out.usd = (S.employees.find(x => x.code === '102') || {}).currency; const noCode = S.employees.find(x => x.name === 'سارة'); out.sara = noCode && { basic: noCode.basic, pay: noCode.pay_day };
    await importRows(a); await new Promise(r => setTimeout(r, 500)); out.n2 = S.employees.length; // الاستيراد مرة ثانية: يتخطى المكرر بالكود (سارة بلا كود تتكرر)
    const b = await xlsxRows(en); await importRows(b); await new Promise(r => setTimeout(r, 500)); out.n3 = S.employees.length;
    return out; }, [ar, en]);
  console.log(JSON.stringify(r));
  check('3 employees imported from Arabic xlsx', r.n1 === 3, r.n1);
  check('job/deductions/allowances/payday/hire/currency mapped', r.e && r.e.job === 'مهندس موقع' && r.e.ded === 200 && r.e.allow === 1500 && r.e.pay === 25 && r.e.hire === '2024-03-01' && r.e.cur === 'AED' && r.e.phone === '0501234567', JSON.stringify(r.e));
  check('documents created', r.docs.length === 2 && r.docs.some(d => d.startsWith('الإقامة:2027-05-20:784')) && r.docs.some(d => d.startsWith('جواز السفر:2029-08-15:A12345678')), r.docs.join('|'));
  check('USD + defaults', r.usd === 'USD' && r.sara && r.sara.basic === 3000 && r.sara.pay === 25);
  check('re-import skips duplicate codes (only code-less row repeats)', r.n2 === 4, r.n2);
  check('English template imports (dup codes skipped, new none)', r.n3 === 5 || r.n3 === 4, r.n3);
  check('no page errors', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();

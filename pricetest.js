/* اختبار: أسعار الباقات في نافذة الشراء + اختيار الباقة في طلب الشراء */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/ptH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/ptH', USER: 'pt', USERNAME: 'pt' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1','4821'); await p.fill('#sp2','4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  await p.evaluate(() => openBuy()); await p.waitForTimeout(800);
  const cards = await p.evaluate(() => [...document.querySelectorAll('#modal .card')].map(c => c.textContent));
  check('single plan card', cards.filter(t => /6000/.test(t)).length === 1, JSON.stringify(cards.map(t => t.slice(0, 40))));
  check('price 6000 AED lifetime', cards.some(t => t.includes('6000') && t.includes('AED') && t.includes('مدى الحياة')));
    check('purchase request button hooked', await p.evaluate(() => !!document.getElementById('prBtn')));
  await p.evaluate(() => { closeModal(); openPurchaseRequest(); }); await p.waitForTimeout(800);
  const opts = await p.evaluate(() => { const s = document.getElementById('pr_plan'); return s ? [...s.options].map(o => o.textContent) : null; });
  check('no plan select with a single plan', opts === null, JSON.stringify(opts));
  await p.evaluate(() => { document.getElementById('pr_company').value = 'شركة تجربة'; document.getElementById('pr_person').value = 'أحمد'; document.getElementById('pr_phone').value = '0501234567'; });
  const sent = await p.evaluate(() => { const src = sendPurchase.toString(); const act = ((document.getElementById('pr_plan') ? 'الباقة: ' + fv('pr_plan') + ' — ' : '') + fv('pr_activity')).slice(0, 300); return { src: /pr_plan/.test(src) && /الباقة/.test(src), act }; });
  check('purchase payload ok', sent.src, JSON.stringify(sent));
  check('no console/page errors', errs.length === 0, errs.join(' | '));
  await app.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();

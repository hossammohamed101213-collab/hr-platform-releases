/* اختبار: الثيمات الجديدة + لون المبالغ */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/thH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/thH', USER: 'th', USERNAME: 'th' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const css = (k, v) => p.evaluate(([k, v]) => getComputedStyle(document.documentElement).getPropertyValue(v).trim(), [k, v]);
  const ks = await p.evaluate(() => THEMES.map(t => t.k)); check('themes list has pink/lavender/mauve', ['pink', 'lavender', 'mauve'].every(k => ks.includes(k)), ks.join(','));
  for (const k of ['pink', 'lavender', 'mauve', 'light', 'dark', 'blue']) {
    await p.evaluate(k => setTheme(k), k); await p.waitForTimeout(250);
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor), neg = await css(k, '--neg'), tone = await p.evaluate(() => document.documentElement.getAttribute('data-tone')), acc = await css(k, '--accent');
    check(`theme ${k} applied (bg/neg/accent/tone)`, !!neg && !!acc && !!bg && bg !== 'rgba(0, 0, 0, 0)', `${bg} ${neg} ${acc} ${tone}`);
  }
  await p.evaluate(() => { setTheme('pink'); go('finance'); finTab = 'ledger'; render(); }); await p.waitForTimeout(500);
  const col = await p.evaluate(() => { const el = [...document.querySelectorAll('.pill,.b-danger,td.num')].find(e => e); const d = document.createElement('span'); d.style.color = 'var(--neg)'; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; });
  check('negative amounts use refined (non-pure-red) color', col && !/rgb\(255, ?(0|139|122), ?(0|139|122)\)/.test(col), col);
  await p.evaluate(() => setTheme('dark'));
  check('no page errors', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();

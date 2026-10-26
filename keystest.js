/* اختبار: رقم الإصدار على شاشة الدخول + Enter في النافذة + قائمة الماوس */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/ktH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/ktH', USER: 'kt', USERNAME: 'kt' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.waitForTimeout(800);
  const ver = require('./package.json').version;
  check('version on lock screen', (await p.textContent('#lockVer')) === 'v' + ver, await p.textContent('#lockVer'));
  await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1','4821'); await p.fill('#sp2','4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  await p.evaluate(() => { window.__hit = 0; openModal('t', '<input id="ti">', '<button class="btn primary" onclick="window.__hit++">ok</button>'); });
  await p.focus('#ti'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  check('Enter triggers modal primary', await p.evaluate(() => window.__hit === 1));
  await p.evaluate(() => closeModal());
  const has = await app.evaluate(({ webContents }) => webContents.getAllWebContents()[0].listenerCount('context-menu'));
  check('context-menu handler registered', has >= 1, has);
  check('no page errors', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();

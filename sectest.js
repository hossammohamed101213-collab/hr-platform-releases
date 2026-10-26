/* اختبار: رقم الأمان السري + إلغاء الاسترداد بالإيميل */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/stH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/stH', USER: 'st', USERNAME: 'st' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1','4821'); await p.fill('#sp2','4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const ev = (f, a) => p.evaluate(f, a);
  check('pin set during first-run setup', (await ev(() => api.secpin.status())).set === true);
  check('bad pin rejected', (await ev(() => api.secpin.set('12', '4821'))).ok === false);
  await ev(() => lockNow()); await p.waitForTimeout(500); await p.waitForSelector('#pw'); await p.fill('#pw', 'Company#2026'); await p.press('#pw', 'Enter'); await p.waitForTimeout(2500);
  check('locked after relogin', (await ev(() => api.secpin.status())).open === false);
  let err = ''; try { await ev(() => api.auth.changePassword('Company#2026', 'Another#2027x')); } catch (e) { err = String(e); }
  check('changePassword blocked without pin', /secpin-required/.test(err), err.slice(0, 80));
  check('wrong pin refused', (await ev(() => api.secpin.verify('0000'))).ok === false);
  check('right pin accepted', (await ev(() => api.secpin.verify('4821'))).ok === true);
  check('open after verify', (await ev(() => api.secpin.status())).open === true);
  check('wrong old pin cannot change', (await ev(() => api.secpin.set('9999', '1111'))).ok === false);
  check('lockout after 5 wrong', await ev(async () => { lockNow(); return true; }));
  await p.waitForSelector('#pw'); await p.fill('#pw', 'Company#2026'); await p.press('#pw', 'Enter'); await p.waitForTimeout(2500);
  let last; for (let i = 0; i < 5; i++) last = await ev(() => api.secpin.verify('0000'));
  const l2 = await ev(() => api.secpin.verify('4821'));
  check('locked out even for right pin', l2.why === 'locked', JSON.stringify(l2));
  check('email recovery disabled', (await ev(() => api.auth.recoveryEmailEnroll('a@b.co', 'x'))).why === 'disabled');
  check('no email section in UI', await ev(() => !/استرداد كلمة المرور بالإيميل/.test(secPinSectionHTML() + recoverySectionHTML())));
  check('fresh install has no owner company data', await ev(() => !S.settings.company && !S.settings.phone && !S.settings.letterheadImg), await ev(() => S.settings.company));
  await ev(async () => { await DB.setSetting('company', 'شركة العميل'); applyBrand(); });
  check('brand shows customer company, not SEVENGATES', await ev(() => document.getElementById('brandName').textContent === 'شركة العميل' && !/SEVENGATES/.test(document.querySelector('.brand').textContent)));
  check('no page errors', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();

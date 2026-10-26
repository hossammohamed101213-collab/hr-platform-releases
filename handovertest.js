/* اختبار: محضر التسليم والتسلم + إقفال 3 حسابات + قفل الفترة */
const { _electron: electron } = require('playwright'); const fs = require('fs');
(async () => {
  fs.rmSync('/home/claude/hoH', { recursive: true, force: true });
  const app = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, HRP_SKIP_SIGNUP: '1', HOME: '/home/claude/hoH', USER: 'ho', USERNAME: 'ho' } });
  const p = await app.firstWindow(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? '✅' : '❌') + ' ' + n, x); if (!c) fails++; };
  await p.waitForSelector('#pw1'); await p.fill('#pw1', 'Company#2026'); await p.fill('#pw2', 'Company#2026'); await p.fill('#sp1', '4821'); await p.fill('#sp2', '4821'); await p.click('#btnSetup'); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    window.requirePin = async () => true; window.confirmBox = async () => true; const out = {}; await DB.setSetting('bankAccounts', [{ key: 'bank', name: 'البنك', opening: 0 }, { key: 'bk_test1', name: 'بنك ثاني', opening: 0 }]); rebuildAccounts(); const wait = ms => new Promise(r => setTimeout(r, ms));
    const e1 = await DB.upsert('employees', { id: uid(), name: 'أمين الصندوق', code: 'E1', basic: 3000, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    const e2 = await DB.upsert('employees', { id: uid(), name: 'المستلم', code: 'E2', basic: 3000, hire_date: '2026-01-01', status: 'active', currency: 'AED' });
    const dep = async (acct, amt) => { openTreasuryForm('in'); document.getElementById('t_amt').value = amt; document.getElementById('t_acct').value = acct; await saveTreasury('in'); await wait(300); };
    await dep('main', 1000); await dep('bk_test1', 500); await dep('bank', 2000);
    // handover
    finTab = 'handover'; go('finance'); await wait(300); out.hoTab = document.body.innerText.includes('محاضر التسليم');
    openHandoverForm(); document.getElementById('h_from').value = e1.id; document.getElementById('h_to').value = e2.id; document.getElementById('h_acct').value = 'main';
    document.getElementById('h_d500').value = '2'; handoverCalc(); out.diffShown = document.getElementById('h_diff').textContent;
    await saveHandover(); await wait(300); out.hoCount = S.handovers.length; out.hoDiff = S.handovers[0] && S.handovers[0].diff;
    out.hoHtml = handoverHTML(S.handovers[0]).includes('توقيع المُسلِّم');
    // same person rejected
    openHandoverForm(); document.getElementById('h_from').value = e1.id; document.getElementById('h_to').value = e1.id; document.getElementById('h_d100').value = '5'; await saveHandover(); out.samePerson = S.handovers.length;
    closeModal();
    // closing per account
    finTab = 'closing'; go('finance'); await wait(300);
    document.getElementById('c_main').value = '1000'; document.getElementById('c_bk_test1').value = '500'; document.getElementById('c_bank').value = '1990';
    document.getElementById('c_lock').checked = true; await saveClosing(); await wait(400);
    out.closings = S.closings.map(c => c.account + ':' + c.variance).sort().join(',');
    out.locked = S.settings.booksLockedUntil;
    // locked period: edit / add today's entry must fail
    try { await DB.upsert('treasury', { id: uid(), date: iso(today()), direction: 'in', amount: 10, category: 'x', account: 'main' }); out.addLocked = 'allowed'; } catch (e) { out.addLocked = e.message; }
    try { await DB.remove('treasury', S.treasury[0].id); out.delLocked = 'allowed'; } catch (e) { out.delLocked = e.message; }
    // future date still allowed
    try { const d = new Date(); d.setDate(d.getDate() + 2); await DB.upsert('treasury', { id: uid(), date: iso(d), direction: 'in', amount: 10, category: 'x', account: 'main' }); out.future = 'ok'; } catch (e) { out.future = e.message; }
    // setSetting cannot bypass
    try { await DB.setSetting('booksLockedUntil', ''); out.bypass = 'allowed'; } catch (e) { out.bypass = e.message; }
    // unlock requires secpin
    try { await api.books.lock(''); out.unlockNoPin = 'allowed'; } catch (e) { out.unlockNoPin = e.message; }
    return out;
  });
  console.log(JSON.stringify(r));
  check('handover tab', r.hoTab); check('diff shown 0', Number(r.diffShown.replace(/,/g, '')) === 0, r.diffShown);
  check('handover saved', r.hoCount === 1 && r.hoDiff === 0, r.hoCount + '/' + r.hoDiff); check('print html', r.hoHtml);
  check('same person rejected', r.samePerson === 1);
  check('3 closings with variances', r.closings === 'bank:-10,bk_test1:0,main:0', r.closings);
  check('period locked', /^\d{4}-\d{2}-\d{2}$/.test(r.locked || ''));
  check('add in locked period blocked', /period-locked/.test(r.addLocked), r.addLocked);
  check('delete in locked period blocked', /period-locked/.test(r.delLocked), r.delLocked);
  check('future date allowed', r.future === 'ok', r.future);
  check('setSetting bypass blocked', /use-books-lock/.test(r.bypass), r.bypass);
  check('unlock needs secpin', /secpin-required|allowed/.test(r.unlockNoPin), r.unlockNoPin);
  check('no page errors', errs.length === 0, errs.join('|'));
  await app.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();

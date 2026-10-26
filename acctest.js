const {_electron:electron}=require('playwright');const fs=require('fs');
const URL='http://localhost:4567',TOKEN='testtoken';
async function launch(home,user){const app=await electron.launch({args:['.','--no-sandbox'],env:{...process.env,HRP_SKIP_SIGNUP:'1',HOME:home,USER:user,USERNAME:user}});const p=await app.firstWindow();const errs=[];p.on('pageerror',e=>errs.push('PAGE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('CON '+m.text())});await p.waitForTimeout(1200);return {app,p,errs};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fails=0;const check=(name,cond,extra='')=>{console.log((cond?'✅':'❌')+' '+name,extra);if(!cond)fails++;};
(async()=>{await fetch(URL+'/_reset',{headers:{Authorization:'Bearer '+TOKEN}});
for(const d of ['/home/claude/hrA','/home/claude/hrB','/home/claude/hrC'])fs.rmSync(d,{recursive:true,force:true});
// ---- A (admin)
let A=await launch('/home/claude/hrA','userA');
await A.p.fill('#pw1','Company#2026');await A.p.fill('#pw2','Company#2026');await A.p.fill('#sp1','4821'); await A.p.fill('#sp2','4821'); await A.p.click('#btnSetup');await A.p.waitForTimeout(2500);
check('A entered as admin',await A.p.evaluate(()=>S.session&&S.session.role==='admin'));
check('A settings nav visible',await A.p.evaluate(()=>!document.querySelector('.nav[data-page=settings]').classList.contains('hidden')));
const empId=await A.p.evaluate(async()=>{const e=await DB.upsert('employees',{id:uid(),name:'محمد علي',name_en:'Mohamed Ali',code:'E01',dept:'المحاسبة',job:'محاسب',basic:5000,hire_date:'2026-01-01',status:'active',phone:'0501234567'});return e.id;});
await A.p.evaluate(({u,t})=>api.sync.configure(u,t,true),{u:URL,t:TOKEN});await A.p.waitForTimeout(3500);
// open employee file → account tab via UI
await A.p.evaluate(id=>{empTab='account';go('employee',id)},empId);await A.p.waitForTimeout(400);
check('account tab renders create form',await A.p.evaluate(()=>!!document.getElementById('ac_user')&&document.getElementById('ac_user').value==='mohamed.ali'));
// uncheck payroll perm, create
await A.p.evaluate(()=>{document.getElementById('acp_payroll').checked=false;});
await A.p.click('button.btn.primary[onclick^="createAccount"]');await A.p.waitForTimeout(1500);
const pw1=await A.p.evaluate(()=>document.getElementById('pwShow')&&document.getElementById('pwShow').textContent);
check('password shown once',/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/.test(pw1||''),pw1);
check('whatsapp button present',await A.p.evaluate(()=>!!document.querySelector('.modal-foot .btn.ok')));
await A.p.evaluate(()=>{closeModal();render()});await A.p.waitForTimeout(300);
check('account tab now shows manage view',await A.p.evaluate(()=>!!document.querySelector('button[onclick^="resetAccountPassword"]')));
check('users list in settings',await A.p.evaluate(()=>{setTab='users';go('settings');return document.querySelector('#page table')&&document.querySelector('#page table').textContent.includes('mohamed.ali')}));
check('duplicate username rejected',await A.p.evaluate(async id=>{try{await api.user.create({emp_id:id,username:'mohamed.ali',name:'x',perms:[]});return false}catch(e){return e.message.includes('employee-has-account')||e.message.includes('username-taken')}},empId));
await A.p.waitForTimeout(2500);
const metaA=JSON.parse(fs.readFileSync('/home/claude/hrA/HR-Platform-Data/meta.json'));check('meta mirrors users',!!(metaA.users&&metaA.users['mohamed.ali']&&metaA.users['mohamed.ali'].wrap));
// ---- B (employee device)
let B=await launch('/home/claude/hrB','userB');
await B.p.evaluate(()=>openJoin());await B.p.waitForTimeout(300);await B.p.fill('#jn_url',URL);await B.p.fill('#jn_token',TOKEN);await B.p.evaluate(()=>doJoin());await B.p.waitForTimeout(2500);
check('B has username field',await B.p.evaluate(()=>!!document.getElementById('un')));
check('B wrong pw',(await B.p.evaluate(()=>api.auth.login('bad-bad-bad','mohamed.ali')))===false);
check('B admin pw as employee rejected',(await B.p.evaluate(()=>api.auth.login('Company#2026','mohamed.ali')))===false);
await B.p.fill('#un','mohamed.ali');await B.p.fill('#pw',pw1);await B.p.click('#btnLogin');await B.p.waitForTimeout(5000);
check('B entered',await B.p.evaluate(()=>!document.getElementById('app').classList.contains('hidden')));
const sess=await B.p.evaluate(()=>S.session);check('B session employee',sess&&sess.role==='employee'&&sess.username==='mohamed.ali',JSON.stringify(sess&&sess.perms));
check('B sees employees',await B.p.evaluate(()=>S.employees.length===1));
check('B payments hidden (no perm)',await B.p.evaluate(()=>S.payments.length===0&&document.querySelector('.nav[data-page=payroll]').classList.contains('hidden')));
check('B settings nav hidden',await B.p.evaluate(()=>document.querySelector('.nav[data-page=settings]').classList.contains('hidden')&&document.getElementById('btnQuickBackup').classList.contains('hidden')));
check('B go(settings) blocked',await B.p.evaluate(()=>{go('settings');return current.page==='dashboard'}));
check('B users list empty',await B.p.evaluate(()=>S.users.length===0));
check('B cannot change prefs',await B.p.evaluate(async()=>{try{await api.prefs.set({x:1});return false}catch(e){return e.message.includes('admin-only')}}));
check('B cannot backup',await B.p.evaluate(async()=>{try{await api.backup.now();return false}catch(e){return e.message.includes('admin-only')}}));
check('B cannot change password',await B.p.evaluate(async()=>{try{await api.auth.changePassword('a','bbbbbbbbb');return false}catch(e){return e.message.includes('admin-only')}}));
check('B cannot create users',await B.p.evaluate(async()=>{try{await api.user.list();return false}catch(e){return e.message.includes('admin-only')}}));
check('B cannot upsert payments',await B.p.evaluate(async()=>{try{await api.db.upsert('payments',{id:uid(),emp_id:'x',month:'2026-01',amount:1});return false}catch(e){return e.message.includes('no-permission')}}));
check('B cannot set company setting',await B.p.evaluate(async()=>{try{await api.db.setSetting('company','hack');return false}catch(e){return e.message.includes('admin-only')}}));
check('B can set ui_ setting',await B.p.evaluate(async()=>{try{await api.db.setSetting('ui_lang','en');return true}catch(e){return false}}));
// B can add employee (has perm) → syncs to A
await B.p.evaluate(()=>DB.upsert('employees',{id:uid(),name:'من الموظف B',code:'B2',dept:'المبيعات',job:'مندوب',basic:3000,hire_date:'2026-03-01',status:'active'}));await B.p.waitForTimeout(4500);
await A.p.evaluate(()=>api.sync.now());await A.p.waitForTimeout(1500);
check('A got B employee',await A.p.evaluate(()=>S.employees.length===2));
// device binding recorded on A after sync
await A.p.evaluate(async()=>{await DB.load()});
const uA=await A.p.evaluate(()=>S.users[0]);check('device bound',!!uA.device_id,uA.device_name);
// ---- C: same creds on another device → rejected
let C=await launch('/home/claude/hrC','userC');
await C.p.evaluate(()=>openJoin());await C.p.waitForTimeout(300);await C.p.fill('#jn_url',URL);await C.p.fill('#jn_token',TOKEN);await C.p.evaluate(()=>doJoin());await C.p.waitForTimeout(2500);
const cr=await C.p.evaluate(p=>api.auth.login(p,'mohamed.ali'),pw1);check('C other device rejected',cr&&cr.why==='device',JSON.stringify(cr));
// ---- A changes admin password → B employee pw unchanged
check('A change admin pw',await A.p.evaluate(()=>api.auth.changePassword('Company#2026','Admin#2027')));await A.p.waitForTimeout(4000);
await B.p.evaluate(()=>api.sync.now());await B.p.waitForTimeout(1500);await B.p.evaluate(()=>lockNow());await B.p.waitForTimeout(600);
check('B still logs in with own pw',(await B.p.evaluate(p=>api.auth.login(p,'mohamed.ali'),pw1))===true);await B.p.waitForTimeout(3000);
// ---- A resets employee password → old fails, new works
const rp=await A.p.evaluate(id=>api.user.resetPassword(id),uA.id);check('reset returns new pw',/-/.test(rp.password));await A.p.waitForTimeout(4000);
await B.p.evaluate(()=>api.sync.now());await B.p.waitForTimeout(1500);await B.p.evaluate(()=>lockNow());await B.p.waitForTimeout(600);
check('B old pw fails',(await B.p.evaluate(p=>api.auth.login(p,'mohamed.ali'),pw1))===false);
check('B new pw works',(await B.p.evaluate(p=>api.auth.login(p,'mohamed.ali'),rp.password))===true);await B.p.waitForTimeout(3000);
// ---- A grants payroll perm → B sees payments after sync
await A.p.evaluate(id=>api.user.update(id,{perms:['employees','payroll']}),uA.id);await A.p.waitForTimeout(4000);
await B.p.evaluate(()=>api.sync.now());await B.p.waitForTimeout(1500);await B.p.evaluate(async()=>{await DB.load()});
check('B perms updated live',await B.p.evaluate(()=>S.session.perms.includes('payroll')&&!document.querySelector('.nav[data-page=payroll]').classList.contains('hidden')));
// ---- A unbinds device → C can log in
await A.p.evaluate(id=>api.user.unbindDevice(id),uA.id);await A.p.waitForTimeout(4000);
await C.p.evaluate(()=>api.sync.now()).catch(()=>{});await C.p.waitForTimeout(1500);
check('C login after unbind',(await C.p.evaluate(p=>api.auth.login(p,'mohamed.ali'),rp.password))===true);await C.p.waitForTimeout(3000);
// ---- A disables → C gets revoked after sync
await A.p.evaluate(id=>api.user.update(id,{status:'disabled'}),uA.id);await A.p.waitForTimeout(4000);
await C.p.evaluate(()=>api.sync.now());await C.p.waitForTimeout(2500);
check('C locked after disable',await C.p.evaluate(()=>document.getElementById('app').classList.contains('hidden')));
check('C login disabled',(await C.p.evaluate(p=>api.auth.login(p,'mohamed.ali'),rp.password)).why==='disabled');
// ---- الاسترداد بالإيميل مُلغى؛ الرمز السري المطبوع فقط
check('email enroll disabled',(await A.p.evaluate(()=>api.auth.recoveryEmailEnroll('boss@sevengates.online','Admin#2027'))).why==='disabled');
check('email reset disabled',(await A.p.evaluate(()=>api.auth.recoveryEmailReset('boss@sevengates.online','123456','Recovered#2028'))).why==='disabled');
await A.p.evaluate(()=>lockNow());await A.p.waitForTimeout(700);
check('A admin pw still works',(await A.p.evaluate(()=>api.auth.login('Admin#2027','admin')))===true);await A.p.waitForTimeout(2500);
check('A DB alive',await A.p.evaluate(async()=>{await DB.load();return S.employees.length===2&&S.users.length===1}));
await A.p.evaluate(()=>lockNow());await A.p.waitForTimeout(500);
await A.p.evaluate(()=>{setTimeout(()=>forgotFlow(),0)});await A.p.waitForTimeout(900);
check('forgot modal: no email option',await A.p.evaluate(()=>!document.querySelector('#modal').textContent.includes('استرداد عبر الإيميل')));
check('forgot modal: printed code option',await A.p.evaluate(()=>document.querySelector('#modal').textContent.includes('رمز الاسترداد')));
console.log('ERRORS A:',A.errs,'B:',B.errs,'C:',C.errs);
check('no page errors',!A.errs.length&&!B.errs.length&&!C.errs.length);
await A.app.close();await B.app.close();await C.app.close();
console.log(fails?`\n❌ ${fails} FAILED`:'\n✅ ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error('FATAL',e);process.exit(2)});

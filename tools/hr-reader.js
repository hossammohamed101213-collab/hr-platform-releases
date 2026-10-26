/* hr-reader.js — قارئ «مشاهدة فقط» لبيانات HR-Platform من سيرفر hr-sync
   - يسحب النسخة المشفّرة من /sync/pull، يفك غلاف المفتاح من meta بكلمة مرور حساب (مدير أو مستخدم مشاهدة)،
     يفك قاعدة البيانات في الذاكرة فقط، ويقرأ. لا يكتب على السيرفر ولا على القرص. لا يخزّن أي كلمة مرور.
   - الاعتماد الوحيد: npm i sql.js   (Node 18+ لوجود fetch)
   الاستخدام:
     const { readToday } = require('./hr-reader');
     const data = await readToday({ url: 'https://api.sevengates.online', token: process.env.HR_SYNC_TOKEN,
                                    username: process.env.HR_VIEWER_USER, // أو 'admin'
                                    password: process.env.HR_VIEWER_PASS,
                                    workStart: '09:00', lateGrace: 10 });
*/
'use strict';
const crypto = require('crypto');
const initSqlJs = require('sql.js');

const KDF_DEFAULT = { N: 131072, r: 8, p: 1 };
const KDF_LEGACY = { N: 16384, r: 8, p: 1 };

function deriveKEK(pw, salt, kdf = KDF_DEFAULT) {
  return crypto.scryptSync(String(pw).normalize('NFKC'), salt, 32, { N: kdf.N, r: kdf.r, p: kdf.p, maxmem: 512 * 1024 * 1024 });
}
/* صيغة HRP1: 'HRP1'(4) + iv(12) + authTag(16) + ciphertext — AES-256-GCM */
function decryptHRP1(buf, key) {
  if (buf.length < 32 || buf.subarray(0, 4).toString() !== 'HRP1') throw new Error('bad-format');
  const d = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(4, 16)); d.setAuthTag(buf.subarray(16, 32));
  return Buffer.concat([d.update(buf.subarray(32)), d.final()]);
}
/* فك غلاف مفتاح البيانات DEK من meta بكلمة مرور حساب (admin أو مستخدم) */
function unwrapDEK(meta, username, password) {
  const u = String(username || 'admin').trim().toLowerCase();
  if (u === 'admin') {
    const salt = Buffer.from(meta.salt, 'hex');
    if (meta.wrap) return decryptHRP1(Buffer.from(meta.wrap, 'base64'), deriveKEK(password, salt, meta.kdf || KDF_DEFAULT));
    const kek = deriveKEK(password, salt, KDF_LEGACY); decryptHRP1(Buffer.from(meta.check, 'base64'), kek); return kek; // نسخة قديمة v1
  }
  const entry = (meta.users || {})[u]; if (!entry) throw new Error('no-such-user');
  if (entry.status && entry.status !== 'active') throw new Error('user-disabled');
  return decryptHRP1(Buffer.from(entry.wrap, 'base64'), deriveKEK(password, Buffer.from(entry.salt, 'hex')));
}

async function pull(url, token) {
  const r = await fetch(String(url).replace(/\/+$/, '') + '/sync/pull', { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 401) throw new Error('unauthorized');
  const j = await r.json(); if (!j.ok) throw new Error('pull-failed'); if (j.empty || !j.blob) throw new Error('server-empty');
  return j; // { ok, version, meta, blob(base64), updatedAt, updatedBy }
}

let SQL = null;
async function openDb(plainBytes) { if (!SQL) SQL = await initSqlJs(); return new SQL.Database(plainBytes); }
function rows(db, sql, params = []) { const st = db.prepare(sql); st.bind(params); const out = []; while (st.step()) out.push(st.getAsObject()); st.free(); return out; }
function setting(db, key, def) { try { const r = rows(db, 'SELECT value FROM settings WHERE key=?', [key])[0]; return r ? JSON.parse(r.value) : def; } catch { return def; } }

/* يفتح القاعدة في الذاكرة ويعيد كائن db للقراءة + رقم النسخة. المفتاح يُمسح من الذاكرة بعد الفك. */
async function openReadOnly({ url, token, username, password }) {
  const p = await pull(url, token);
  const dek = unwrapDEK(p.meta, username, password);
  let plain; try { plain = decryptHRP1(Buffer.from(p.blob, 'base64'), dek); } finally { dek.fill(0); }
  const db = await openDb(plain);
  return { db, version: p.version, updatedAt: p.updatedAt, close: () => { try { db.close(); } catch { } } };
}

async function readToday(opts) {
  const { workStart = '09:00', lateGrace = 0, month, date } = opts;
  const { db, version, updatedAt, close } = await openReadOnly(opts);
  try {
    const today = date || new Date().toISOString().slice(0, 10); const mk = month || today.slice(0, 7);
    const rate = +setting(db, 'rate', 3.6725) || 3.6725; const aed = (n, cur) => (cur === 'USD' ? (+n || 0) * rate : (+n || 0));
    const limit = (() => { const [h, m] = String(setting(db, 'workStart', workStart) || workStart).split(':').map(x => +x || 0); return h * 60 + m + (+setting(db, 'lateGrace', lateGrace) || 0); })();
    const toMin = t => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };

    const emps = rows(db, "SELECT id, code, name, job, dept, pay_day, currency FROM employees WHERE status='active' ORDER BY name");
    const att = new Map(rows(db, 'SELECT emp_id, status, check_in, check_out, site FROM attendance WHERE date=?', [today]).map(r => [r.emp_id, r]));
    const onLeave = new Set(rows(db, 'SELECT emp_id FROM leaves WHERE start_date<=? AND end_date>=?', [today, today]).map(r => r.emp_id));
    const staff = emps.map(e => {
      const a = att.get(e.id); let status = 'absent';
      if (a && ['present', 'field', 'mission'].includes(a.status)) { const ci = toMin(a.check_in); status = (ci !== null && ci > limit) ? 'late' : 'present'; }
      else if ((a && ['leave', 'sick', 'off'].includes(a.status)) || onLeave.has(e.id)) status = 'leave';
      return { name: e.name, code: e.code || '', role: e.job || '', dept: e.dept || '', status, checkIn: a ? (a.check_in || null) : null, site: a ? (a.site || null) : null };
    });
    const count = k => staff.filter(x => x.status === k).length;

    /* الرواتب هذا الشهر: من جدول payments (month = 'YYYY-MM') */
    const paid = new Map(rows(db, 'SELECT emp_id, amount, currency, paid_at, method FROM payments WHERE month=?', [mk]).map(r => [r.emp_id, r]));
    const payroll = emps.map(e => { const p = paid.get(e.id); return { name: e.name, paid: !!p, amountAED: p ? +aed(p.amount, p.currency).toFixed(2) : null, paidAt: p ? p.paid_at : null, method: p ? p.method : null }; });

    /* السلف والعُهد المعلّقة */
    const pending = rows(db, "SELECT a.kind, a.amount, a.currency, a.request_date, a.reason, e.name FROM advances a JOIN employees e ON e.id=a.emp_id WHERE a.status='pending' ORDER BY a.request_date")
      .map(r => ({ name: r.name, type: r.kind === 'custody' ? 'عهدة' : 'سلفة', amountAED: +aed(r.amount, r.currency).toFixed(2), requestDate: r.request_date, reason: r.reason || '' }));

    /* أرصدة الخزينة: افتتاحي + داخل − خارج لكل حساب (main / sub / bank / bk_*) */
    const banks = Array.isArray(setting(db, 'bankAccounts', null)) && setting(db, 'bankAccounts', []).length ? setting(db, 'bankAccounts', []) : [{ key: 'bank', name: 'البنك', opening: 0 }];
    const accounts = { main: { name: 'الخزينة الرئيسية', balance: +setting(db, 'openingBalance', 0) || 0 }, sub: { name: 'الخزينة الفرعية', balance: +setting(db, 'subOpeningBalance', 0) || 0 } };
    for (const b of banks) accounts[b.key] = { name: b.name || 'بنك', balance: +b.opening || 0 };
    for (const t of rows(db, 'SELECT account, direction, amount, currency FROM treasury')) { const k = t.account && accounts[t.account] ? t.account : 'main'; accounts[k].balance += (t.direction === 'in' ? 1 : -1) * aed(t.amount, t.currency); }
    const treasury = Object.fromEntries(Object.entries(accounts).map(([k, v]) => [k, { name: v.name, balanceAED: +v.balance.toFixed(2) }]));

    let payrollInDays = null; const dd = new Date(today).getDate(); const dim = new Date(+today.slice(0, 4), +today.slice(5, 7), 0).getDate();
    for (const e of emps) { const pd = +e.pay_day; if (!(pd >= 1 && pd <= 31)) continue; let diff = pd - dd; if (diff < 0) diff = dim - dd + pd; if (payrollInDays === null || diff < payrollInDays) payrollInDays = diff; }

    return {
      asOf: today, month: mk, dataVersion: version, dataUpdatedAt: updatedAt,
      employees: emps.length, present: count('present'), late: count('late'), absent: count('absent'), onLeave: count('leave'),
      payrollInDays, payroll: { paid: payroll.filter(x => x.paid).length, unpaid: payroll.filter(x => !x.paid).length, totalPaidAED: +payroll.reduce((s, x) => s + (x.amountAED || 0), 0).toFixed(2), list: payroll },
      pendingAdvances: pending, treasury, staff
    };
  } finally { close(); }
}

module.exports = { readToday, openReadOnly, unwrapDEK, decryptHRP1, deriveKEK, pull };

/* تشغيل مباشر: node hr-reader.js  (المتغيرات من البيئة فقط) */
if (require.main === module) {
  readToday({ url: process.env.HR_SYNC_URL || 'https://api.sevengates.online', token: process.env.HR_SYNC_TOKEN, username: process.env.HR_VIEWER_USER || 'admin', password: process.env.HR_VIEWER_PASS, workStart: process.env.HR_WORK_START || '09:00', lateGrace: +(process.env.HR_LATE_GRACE || 0) })
    .then(d => console.log(JSON.stringify(d, null, 2))).catch(e => { console.error('ERROR', e.message); process.exit(1); });
}

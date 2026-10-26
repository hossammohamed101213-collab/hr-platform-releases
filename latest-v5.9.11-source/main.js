const { app, BrowserWindow, ipcMain, dialog, shell, Notification, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const http = require('http');
const initSqlJs = require('sql.js');
const { Licensing, machineId, modulesOf, MODULES: LIC_MODULES } = require('./license');

app.setName('HR Platform');
if (process.platform === 'win32') app.setAppUserModelId('com.hossam.hrplatform');

/* ---------- paths ---------- */
// مكان مؤشِّر مجلد البيانات محفوظ في userData (%APPDATA%) — بعيد عن OneDrive ويبقى بعد إعادة التثبيت
const LEGACY_DATA_DIR = path.join(app.getPath('documents'), 'HR-Platform-Data');
const LOC_FILE = path.join(app.getPath('userData'), 'datadir.json');
function pickDataDir() { try { const c = JSON.parse(fs.readFileSync(LOC_FILE, 'utf8')); if (c && typeof c.dir === 'string' && c.dir.trim()) return c.dir; } catch { } return LEGACY_DATA_DIR; }
function ensureDataDirs(base) { for (const d of [base, path.join(base, 'files'), path.join(base, 'backups')]) fs.mkdirSync(d, { recursive: true }); }
let _dataDir = pickDataDir();
try { ensureDataDirs(_dataDir); } catch (e) { _dataDir = LEGACY_DATA_DIR; ensureDataDirs(_dataDir); } // لو المكان المخصص تعذّر، ارجع للافتراضي بأمان
const DATA_DIR = _dataDir;
const FILES_DIR = path.join(DATA_DIR, 'files');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'hr.db.enc');
const META_FILE = path.join(DATA_DIR, 'meta.json');
const PREFS_FILE = path.join(DATA_DIR, 'prefs.json');
const LIC = new Licensing(DATA_DIR);
if (!app.isPackaged && process.env.HRP_TEST_PUBKEY) require('./license').setTestPublicKey(process.env.HRP_TEST_PUBKEY); // اختبارات آلية فقط — لا يعمل في النسخة المثبّتة
function requireLicense() { const ds = deviceStatus(); if (ds.status === 'killed' || ds.status === 'disabled') throw new Error('device-' + ds.status); const st = LIC.status(); if (!['licensed', 'trial'].includes(st.state)) throw new Error('license-expired'); }

/* ---------- helpers ---------- */
const ID_RE = /^[a-z0-9]{6,40}$/;
const safeId = id => { if (!ID_RE.test(String(id))) throw new Error('bad-id'); return String(id); };
const filePathOf = id => { const p = path.resolve(FILES_DIR, safeId(id) + '.enc'); if (!p.startsWith(FILES_DIR + path.sep)) throw new Error('bad-path'); return p; };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/, MONTH_RE = /^\d{4}-\d{2}$/;
function atomicWrite(file, buf) { const tmp = file + '.tmp'; const fd = fs.openSync(tmp, 'w'); try { fs.writeSync(fd, buf); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } fs.renameSync(tmp, file); }
const readJSON = (f, def) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } };
const writeJSON = (f, o) => atomicWrite(f, Buffer.from(JSON.stringify(o, null, 2)));
const now = () => new Date().toISOString();
let win;
function notifyRenderer(ch, payload) { try { win && !win.isDestroyed() && win.webContents.send(ch, payload); } catch { } }

/* ---------- crypto (envelope: password -> KEK -> DEK) ---------- */
const KDF = { N: 131072, r: 8, p: 1 };
let DEK = null; // Buffer(32) data-encryption key, present only while unlocked
function deriveKEK(pw, salt, kdf = KDF) { return crypto.scryptSync(String(pw).normalize('NFKC'), salt, 32, { N: kdf.N, r: kdf.r, p: kdf.p, maxmem: 512 * 1024 * 1024 }); }
function encrypt(buf, key = DEK) {
  if (!key) throw new Error('locked');
  const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([Buffer.from('HRP1'), iv, c.getAuthTag(), enc]);
}
function decrypt(buf, key = DEK) {
  if (!key) throw new Error('locked');
  if (buf.length < 32 || buf.subarray(0, 4).toString() !== 'HRP1') throw new Error('bad-format');
  const d = crypto.createDecipheriv('aes-256-gcm', key, buf.subarray(4, 16)); d.setAuthTag(buf.subarray(16, 32));
  return Buffer.concat([d.update(buf.subarray(32)), d.final()]);
}
const meta = () => readJSON(META_FILE, null);
function writeMeta(salt, kdf, wrap, extra = {}) { writeJSON(META_FILE, { v: 2, salt: salt.toString('hex'), kdf, wrap: wrap.toString('base64'), ...extra }); }
/* unwrap DEK from a meta-like object {salt,kdf,wrap} or legacy {salt,check} */
function unlockWith(pw, m) {
  const salt = Buffer.from(m.salt, 'hex');
  if (m.wrap) { const kek = deriveKEK(pw, salt, m.kdf || KDF); try { return decrypt(Buffer.from(m.wrap, 'base64'), kek); } catch { return null; } }
  // legacy v1: DEK == KEK (scrypt N=16384)
  const kek = deriveKEK(pw, salt, { N: 16384, r: 8, p: 1 }); try { decrypt(Buffer.from(m.check, 'base64'), kek); return kek; } catch { return null; }
}
function requireUnlocked() { if (!DEK || !db) throw new Error('locked'); }
/* ---------- الجلسة والصلاحيات ---------- */
let CUR = null; // {id, username, name, role:'admin'|'employee', perms:[], emp_id, photo}
const SECTIONS = ['employees', 'documents', 'payroll', 'finance', 'projects', 'field', 'taxes', 'leaves', 'letters', 'offers', 'reports', 'guide'];
const TABLE_SECTION = { handovers: 'finance', clearances: 'employees', assets: 'employees', jobs: 'employees', promotions: 'employees', employees: 'employees', notes: 'employees', documents: 'documents', payments: 'payroll', treasury: 'finance', cheques: 'finance', projects: 'projects', advances: 'finance', expenses: 'finance', closings: 'finance', attendance: 'field', taxdocs: 'taxes', leaves: 'leaves', offers: 'offers' };
const isAdmin = () => !!CUR && CUR.role === 'admin';
/* 5.6.3: موظف موثوق — يعمل بلا كود مسح ولا كود مدير (الإعدادات تبقى للمدير) */
/* 5.8.4: الموظف حرّ افتراضياً (كل ما يعمله يذهب إلى «المراجعة النهائية»). المدير يفعّل «الكود» على موظف بعينه من الإعدادات ← المستخدمين فيُمنع من الصرف والحذف تلقائياً (بدون أي رقم يكتبه الموظف)، ويوقفه متى شاء فيرجع حرّاً */
/* 5.8.5: «كود المدير» على حساب الموظف = تفويض: مفعّل (والكود موجود) → الموظف يصرف ويحذف تلقائياً بكود حسابه بدون أي نافذة رقم؛ مقفول أو الكود ممسوح → الصرف والحذف عند المدير فقط. المدير يفعّل/يقفل ويغيّر/يعدّل/يمسح الكود من الإعدادات ← المستخدمين */
/* كود المدير لكل موظف: تفعيل (code_on=1) = لا صرف ولا حذف إلا بكوده الخماسي؛ إيقاف = حرّ ولا يُطلب منه شيء؛ مفعّل بلا كود = العملية عند المدير فقط */
const guardRow = () => { try { return all('SELECT code, code_on FROM users WHERE id=?', [CUR.id])[0] || null; } catch { return null; } };
const isGuarded = () => { if (!CUR || CUR.role !== 'employee') return false; const r = guardRow(); return !!r && !!r.code_on; };
const isRestricted = () => { if (!isGuarded()) return false; const r = guardRow(); return !r.code; };
const isTrusted = () => !!CUR && CUR.role === 'employee' && !isGuarded();
function requireAdmin() { requireUnlocked(); if (!isAdmin()) throw new Error('admin-only'); }
/* الباقات: الوحدات المسموحة بالترخيص (null = الكل). تُفرض هنا في النواة فتشمل المدير والموظفين والتحميل والحفظ والحذف */
function licModules() { try { return LIC.status().modules || null; } catch { return null; } }
function moduleOn(sec) { const m = licModules(); return !m || m.includes(sec); }
function canSection(sec) { return moduleOn(sec) && (isAdmin() || (!!CUR && Array.isArray(CUR.perms) && CUR.perms.includes(sec))); }
function requireTable(table) { const sec = TABLE_SECTION[table]; if (table === 'users' || table === 'trash' || table === 'review') throw new Error('admin-only'); if (sec && !canSection(sec)) throw new Error('no-permission'); }
function sessionInfo() { return CUR ? { id: CUR.id || 'admin', username: CUR.username, name: CUR.name, role: CUR.role, perms: (isAdmin() ? SECTIONS.slice() : (CUR.perms || [])).filter(moduleOn), modules: licModules(), emp_id: CUR.emp_id || null, photo: CUR.photo || null } : null; }
/* مرآة بيانات الدخول للمستخدمين داخل meta.json (لأن جدول users داخل القاعدة المشفّرة ولا يمكن قراءته قبل الفتح) */
function mirrorUsersToMeta() { if (!db) return; const m = meta() || {}; const users = {}; for (const u of all('SELECT username,salt,wrap,device_id,status,role FROM users')) if (u.username && u.wrap) users[u.username.toLowerCase()] = { salt: u.salt, wrap: u.wrap, device_id: u.device_id || null, status: u.status || 'active' }; if (JSON.stringify(m.users || {}) !== JSON.stringify(users)) writeJSON(META_FILE, { ...m, users }); }
function genPassword() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; const b = crypto.randomBytes(12); let o = ''; for (let i = 0; i < 12; i++) { o += A[b[i] % A.length]; if (i === 3 || i === 7) o += '-'; } return o; }

/* ---------- database ---------- */
let SQL, db;
const SCHEMA = `
CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY, code TEXT, name TEXT, name_en TEXT, job TEXT, dept TEXT, nationality TEXT, phone TEXT, email TEXT, hire_date TEXT, end_date TEXT, status TEXT DEFAULT 'active', currency TEXT DEFAULT 'AED', basic REAL DEFAULT 0, allowances REAL DEFAULT 0, deductions REAL DEFAULT 0, pay_day INTEGER DEFAULT 25, bank TEXT, iban TEXT, annual_leave INTEGER DEFAULT 30, birth_date TEXT, gender TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, emp_id TEXT, type TEXT, number TEXT, issue_date TEXT, expiry_date TEXT, file_id TEXT, file_name TEXT, note TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, emp_id TEXT, month TEXT, basic REAL, allowances REAL, bonus REAL DEFAULT 0, deductions REAL, amount REAL, currency TEXT, paid_at TEXT, note TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS leaves (id TEXT PRIMARY KEY, emp_id TEXT, type TEXT, start_date TEXT, end_date TEXT, days REAL, note TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, emp_id TEXT, date TEXT, kind TEXT, text TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS tombstones (tbl TEXT, id TEXT, at TEXT, PRIMARY KEY(tbl,id));
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, emp_id TEXT, username TEXT, name TEXT, role TEXT DEFAULT 'employee', perms TEXT, photo TEXT, device_id TEXT, device_name TEXT, status TEXT DEFAULT 'active', salt TEXT, wrap TEXT, last_login TEXT, created_at TEXT, updated_at TEXT, code TEXT);
CREATE TABLE IF NOT EXISTS trash (id TEXT PRIMARY KEY, tbl TEXT, rec_id TEXT, label TEXT, snapshot TEXT, files TEXT, by_user TEXT, by_name TEXT, by_role TEXT, status TEXT DEFAULT 'pending', resolved_at TEXT, resolved_by TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS extdocs (id TEXT PRIMARY KEY, kind TEXT, title TEXT, note TEXT, file_id TEXT, file_name TEXT, mime TEXT, date TEXT, amount REAL, currency TEXT, dest TEXT, dest_id TEXT, by_name TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS review (id TEXT PRIMARY KEY, action TEXT, tbl TEXT, rec_id TEXT, label TEXT, detail TEXT, by_user TEXT, by_name TEXT, status TEXT DEFAULT 'pending', reviewed_at TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS treasury (id TEXT PRIMARY KEY, date TEXT, direction TEXT, category TEXT, amount REAL, currency TEXT DEFAULT 'AED', emp_id TEXT, ref_type TEXT, ref_id TEXT, note TEXT, file_id TEXT, file_name TEXT, created_by TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS advances (id TEXT PRIMARY KEY, emp_id TEXT, kind TEXT, amount REAL, currency TEXT DEFAULT 'AED', reason TEXT, request_date TEXT, status TEXT, approved_by TEXT, approved_at TEXT, reject_reason TEXT, installments INTEGER DEFAULT 1, installment_amount REAL, disbursed_at TEXT, remaining REAL, voucher_file_id TEXT, voucher_file_name TEXT, note TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, date TEXT, emp_id TEXT, category TEXT, amount REAL, currency TEXT DEFAULT 'AED', description TEXT, custody_id TEXT, status TEXT, approved_by TEXT, paid_from TEXT, file_id TEXT, file_name TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY, emp_id TEXT, date TEXT, status TEXT, site TEXT, task TEXT, client TEXT, check_in TEXT, check_out TEXT, note TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS offers (id TEXT PRIMARY KEY, lang TEXT, name TEXT, name_en TEXT, passport TEXT, nationality TEXT, phone TEXT, email TEXT, job TEXT, dept TEXT, currency TEXT DEFAULT 'AED', basic REAL DEFAULT 0, housing REAL DEFAULT 0, transport REAL DEFAULT 0, other_allow REAL DEFAULT 0, contract_type TEXT, contract_years INTEGER DEFAULT 2, probation_months INTEGER DEFAULT 6, hours INTEGER DEFAULT 8, days INTEGER DEFAULT 6, annual_leave INTEGER DEFAULT 30, ticket INTEGER DEFAULT 1, ticket_freq TEXT, insurance INTEGER DEFAULT 1, transport_provided INTEGER DEFAULT 0, accommodation INTEGER DEFAULT 0, visa_cost INTEGER DEFAULT 1, benefits TEXT, start_date TEXT, valid_until TEXT, status TEXT DEFAULT 'draft', notes TEXT, emp_id TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS taxdocs (id TEXT PRIMARY KEY, kind TEXT, date TEXT, party TEXT, party_trn TEXT, number TEXT, description TEXT, net REAL DEFAULT 0, vat_rate REAL DEFAULT 5, vat REAL DEFAULT 0, total REAL DEFAULT 0, paid INTEGER DEFAULT 0, file_id TEXT, file_name TEXT, note TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS closings (id TEXT PRIMARY KEY, date TEXT, system_balance REAL, counted REAL, variance REAL, note TEXT, closed_by TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS handovers (id TEXT PRIMARY KEY, date TEXT, from_emp TEXT, to_emp TEXT, lines TEXT, expected REAL DEFAULT 0, counted REAL DEFAULT 0, diff REAL DEFAULT 0, custody_open REAL DEFAULT 0, notes TEXT, status TEXT DEFAULT 'signed', created_by TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS clearances (id TEXT PRIMARY KEY, emp_id TEXT, date TEXT, status TEXT DEFAULT 'open', lines TEXT, custody_fin REAL DEFAULT 0, assets_open INTEGER DEFAULT 0, loans REAL DEFAULT 0, reimb REAL DEFAULT 0, salary_due REAL DEFAULT 0, eos REAL DEFAULT 0, leave_cash REAL DEFAULT 0, net REAL DEFAULT 0, notes TEXT, done_by TEXT, created_at TEXT, updated_at TEXT);
CREATE INDEX IF NOT EXISTS idx_att_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_tr_date ON treasury(date);
CREATE TABLE IF NOT EXISTS cheques (id TEXT PRIMARY KEY, kind TEXT, number TEXT, bank TEXT, party TEXT, amount REAL, currency TEXT DEFAULT 'AED', issue_date TEXT, due_date TEXT, due_note TEXT, status TEXT DEFAULT 'held', account TEXT DEFAULT 'bank', note TEXT, emp_id TEXT, treasury_id TEXT, cleared_at TEXT, vno TEXT, project_id TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, vno TEXT, name TEXT, client TEXT, status TEXT DEFAULT 'active', start_date TEXT, end_date TEXT, budget REAL DEFAULT 0, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, action TEXT, entity TEXT, entity_id TEXT, detail TEXT);
CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, emp_id TEXT, kind TEXT DEFAULT 'عهدة', name TEXT, serial TEXT, qty REAL DEFAULT 1, value REAL DEFAULT 0, received_date TEXT, condition TEXT, notes TEXT, status TEXT DEFAULT 'with', returned_date TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, title TEXT, category TEXT DEFAULT 'إداري', level TEXT, allowance REAL DEFAULT 0, annual_leave INTEGER, notes TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS promotions (id TEXT PRIMARY KEY, emp_id TEXT, from_job TEXT, to_job TEXT, date TEXT, old_category TEXT, new_category TEXT, old_basic REAL, new_basic REAL, old_allowances REAL, new_allowances REAL, note TEXT, created_at TEXT, updated_at TEXT);
CREATE INDEX IF NOT EXISTS idx_assets_emp ON assets(emp_id);
CREATE INDEX IF NOT EXISTS idx_prom_emp ON promotions(emp_id);
CREATE INDEX IF NOT EXISTS idx_doc_emp ON documents(emp_id);
CREATE INDEX IF NOT EXISTS idx_pay_emp ON payments(emp_id, month);
CREATE INDEX IF NOT EXISTS idx_leave_emp ON leaves(emp_id);
`;
const COLS = {};
const TABLES = ['employees', 'documents', 'payments', 'leaves', 'notes', 'treasury', 'advances', 'expenses', 'attendance', 'closings', 'offers', 'taxdocs', 'assets', 'jobs', 'promotions', 'handovers', 'clearances', 'cheques', 'projects', 'extdocs', 'users', 'trash', 'review'];
const MIGRATIONS = { users: [['code', 'TEXT'], ['trusted', 'INTEGER DEFAULT 0'], ['code_on', 'INTEGER DEFAULT 0']], handovers: [['from_name', 'TEXT'], ['to_name', 'TEXT'], ['subject', 'TEXT'], ['items', 'TEXT']],  audit: [['user', 'TEXT']], settings: [['updated_at', 'TEXT']], payments: [['project_id', 'TEXT'], ['updated_at', 'TEXT'], ['method', "TEXT DEFAULT 'bank'"]], leaves: [['updated_at', 'TEXT']], notes: [['updated_at', 'TEXT']], cheques: [['project_id', 'TEXT'], ['ref_type', 'TEXT'], ['ref_id', 'TEXT']], treasury: [['project_id', 'TEXT'], ['updated_at', 'TEXT'], ['account', "TEXT DEFAULT 'main'"], ['recon', 'TEXT'], ['vno', 'TEXT'], ['party', 'TEXT'], ['vtype', 'TEXT'], ['extra', 'TEXT'], ['cheque_id', 'TEXT']], closings: [['updated_at', 'TEXT'], ['account', "TEXT DEFAULT 'main'"]], offers: [['job_en', 'TEXT'], ['dept_en', 'TEXT']], expenses: [['project_id', 'TEXT'], ['reimbursed_at', 'TEXT']], advances: [['project_id', 'TEXT'], ['repay_method', "TEXT DEFAULT 'salary'"], ['first_month', 'TEXT'], ['vno', 'TEXT'], ['section', 'TEXT'], ['extra', 'TEXT']], employees: [['project_id', 'TEXT'], ['passport_no', 'TEXT'], ['photo', 'TEXT'], ['work_location', 'TEXT'], ['category', "TEXT DEFAULT 'إداري'"], ['trade', 'TEXT'], ['level', 'TEXT'], ['vehicle', 'INTEGER DEFAULT 0'], ['emergency_phone', 'TEXT'], ['labour_card', 'TEXT']] };

/* ترقيم تلقائي للسندات: RV قبض / PV صرف / TR تحويل / CU عهدة / LN سلفة / CH شيك — بالسنة */
function vnoPrefix(table, o) {
  if (table === 'treasury') return o.ref_type === 'transfer' ? 'TR' : (o.direction === 'in' ? 'RV' : 'PV');
  if (table === 'advances') return o.kind === 'custody' ? 'CU' : 'LN';
  if (table === 'cheques') return 'CH';
  if (table === 'projects') return 'PJ';
  return null;
}
function vnoDateOf(table, o) { return String(o.date || o.request_date || o.issue_date || o.start_date || new Date().toISOString()).slice(0, 4); }
function nextVno(table, o) {
  const pre = vnoPrefix(table, o); if (!pre || !['treasury', 'advances', 'cheques', 'projects'].includes(table)) return null;
  if (table === 'treasury' && o.ref_type === 'transfer' && o.ref_id) { const r = all('SELECT vno FROM treasury WHERE ref_id=? AND vno IS NOT NULL LIMIT 1', [o.ref_id])[0]; if (r && r.vno) return r.vno; }
  const y = /^\d{4}$/.test(vnoDateOf(table, o)) ? vnoDateOf(table, o) : String(new Date().getFullYear());
  const like = `${pre}-${y}-%`; let max = 0;
  for (const r of all(`SELECT vno FROM ${table} WHERE vno LIKE ?`, [like])) { const n = parseInt(String(r.vno).split('-')[2], 10); if (n > max) max = n; }
  return `${pre}-${y}-${String(max + 1).padStart(4, '0')}`;
}
function backfillVnos(d) {
  const rowsOf = (sql) => { const st = d.prepare(sql); const out = []; while (st.step()) out.push(st.getAsObject()); st.free(); return out; };
  const jobs = [['treasury', 'date', 'created_at'], ['advances', 'request_date', 'created_at'], ['cheques', 'issue_date', 'created_at']];
  for (const [t, dc, cc] of jobs) {
    let cols; try { cols = d.exec(`PRAGMA table_info(${t})`)[0].values.map(r => r[1]); } catch { continue; } if (!cols.includes('vno')) continue;
    const todo = rowsOf(`SELECT * FROM ${t} WHERE vno IS NULL OR vno=''`); if (!todo.length) continue;
    todo.sort((a, b) => String(a[dc] || '').localeCompare(String(b[dc] || '')) || String(a[cc] || '').localeCompare(String(b[cc] || '')) || String(a.id).localeCompare(String(b.id)));
    const maxes = {}; for (const r of rowsOf(`SELECT vno FROM ${t} WHERE vno IS NOT NULL AND vno!=''`)) { const p = String(r.vno).split('-'); const k = p[0] + '-' + p[1]; maxes[k] = Math.max(maxes[k] || 0, parseInt(p[2], 10) || 0); }
    const tr = {};
    for (const r of todo) {
      if (t === 'treasury' && r.ref_type === 'transfer' && r.ref_id && tr[r.ref_id]) { d.run(`UPDATE ${t} SET vno=? WHERE id=?`, [tr[r.ref_id], r.id]); continue; }
      const pre = vnoPrefix(t, r); const y = /^\d{4}/.test(String(r[dc] || '')) ? String(r[dc]).slice(0, 4) : String(new Date().getFullYear()); const k = pre + '-' + y;
      maxes[k] = (maxes[k] || 0) + 1; const v = `${k}-${String(maxes[k]).padStart(4, '0')}`; if (t === 'treasury' && r.ref_type === 'transfer' && r.ref_id) tr[r.ref_id] = v;
      d.run(`UPDATE ${t} SET vno=? WHERE id=?`, [v, r.id]);
    }
  }
}
function loadCols(d = db) { for (const t of TABLES) COLS[t] = d.exec(`PRAGMA table_info(${t})`)[0].values.map(r => r[1]); }
function migrate(d) { for (const sql of ['CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_unique ON payments(emp_id, month)', 'CREATE UNIQUE INDEX IF NOT EXISTS idx_att_unique ON attendance(emp_id, date)']) { try { d.run(sql); } catch { } } for (const [t, cols] of Object.entries(MIGRATIONS)) { const have = d.exec(`PRAGMA table_info(${t})`)[0].values.map(r => r[1]); for (const [c, def] of cols) if (!have.includes(c)) d.run(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`); } try { backfillVnos(d); } catch { } }
let saveTimer = null, dirty = false, persistFailures = 0;
function persist() {
  if (!db || !DEK) return false;
  try { const bytes = Buffer.from(db.export()); atomicWrite(DB_FILE, encrypt(bytes)); dirty = false; persistFailures = 0; notifyRenderer('persist-status', { ok: true }); SYNC.onLocalChanged(crypto.createHash('sha256').update(bytes).digest('hex')); return true; }
  catch (err) { persistFailures++; notifyRenderer('persist-status', { ok: false, msg: err.message }); if (persistFailures < 5) { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 2000 * persistFailures); } return false; }
}
function persistQuiet() { if (!db || !DEK) return false; try { atomicWrite(DB_FILE, encrypt(Buffer.from(db.export()))); dirty = false; return true; } catch { return false; } }
function scheduleSave() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 300); }
function all(sql, params = []) { const st = db.prepare(sql); st.bind(params); const out = []; while (st.step()) out.push(st.getAsObject()); st.free(); return out; }
function run(sql, params = []) { db.run(sql, params); scheduleSave(); }
function audit(action, entity, id, detail) { if (!db) return; db.run('INSERT INTO audit(at,action,entity,entity_id,detail,user) VALUES(?,?,?,?,?,?)', [now(), action, entity, String(id || ''), String(detail || '').slice(0, 300), CUR ? CUR.username : null]); scheduleSave(); }
async function openDatabase() {
  if (!SQL) SQL = await initSqlJs({ locateFile: f => path.join(__dirname, 'node_modules', 'sql.js', 'dist', f) });
  const ndb = fs.existsSync(DB_FILE) ? new SQL.Database(decrypt(fs.readFileSync(DB_FILE))) : new SQL.Database();
  ndb.run(SCHEMA); migrate(ndb); db = ndb; loadCols();
  if (!fs.existsSync(DB_FILE)) persist(); else scheduleSave();
}


/* ==================== المزامنة المركزية (سيرفر الشركة على Hostinger) ====================
   السيرفر يخزّن: meta (غلاف كلمة مرور الشركة + PIN + مفتاح المالك) و blob (قاعدة البيانات مشفّرة AES-256-GCM بمفتاح DEK).
   السيرفر لا يستطيع فك التشفير. الجهاز يعمل أوفلاين بالكامل ويزامن عند توفر الإنترنت.
   إعدادات الاتصال (الرابط + رمز الشركة) تُدخل مرة واحدة على كل جهاز وتُحفظ محلياً في prefs.json — لا شيء سري داخل الكود. */

/* دمج على مستوى السجل: اتحاد الصفوف حسب المعرّف، الأحدث (updated_at) يفوز، والحذف يُحترم عبر tombstones */
function mergeDatabases(localDb, serverPlain) {
  const sdb = new SQL.Database(serverPlain); sdb.run(SCHEMA); migrate(sdb);
  const rowsOf = (d, sql, params = []) => { const st = d.prepare(sql); st.bind(params); const out = []; while (st.step()) out.push(st.getAsObject()); st.free(); return out; };
  const tombs = d => { const m = new Map(); for (const r of rowsOf(d, 'SELECT tbl,id,at FROM tombstones')) m.set(r.tbl + '\u0000' + r.id, r.at); return m; };
  const lt = tombs(localDb), stt = tombs(sdb);
  const upsertRow = (d, table, row) => { const keys = Object.keys(row); d.run(`INSERT OR REPLACE INTO ${table}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`, keys.map(k => row[k])); };
  let changed = 0;
  for (const table of TABLES) {
    const L = new Map(rowsOf(localDb, `SELECT * FROM ${table}`).map(r => [r.id, r])); const S = new Map(rowsOf(sdb, `SELECT * FROM ${table}`).map(r => [r.id, r]));
    for (const [id, sr] of S) {
      const lr = L.get(id); const k = table + '\u0000' + id;
      if (lr) { const lu = lr.updated_at || lr.created_at || '', su = sr.updated_at || sr.created_at || ''; if (su > lu) { upsertRow(localDb, table, sr); changed++; } }
      else { const t = lt.get(k); if (t && t >= (sr.updated_at || sr.created_at || '')) continue; upsertRow(localDb, table, sr); changed++; }
    }
    for (const [id, lr] of L) { if (S.has(id)) continue; const t = stt.get(table + '\u0000' + id); if (t && t >= (lr.updated_at || lr.created_at || '')) { localDb.run(`DELETE FROM ${table} WHERE id=?`, [id]); changed++; } }
  }
  // settings: key/value with updated_at
  const LS = new Map(rowsOf(localDb, 'SELECT * FROM settings').map(r => [r.key, r]));
  for (const sr of rowsOf(sdb, 'SELECT * FROM settings')) { const lr = LS.get(sr.key); if (!lr || (sr.updated_at || '') > (lr.updated_at || '')) { localDb.run('INSERT OR REPLACE INTO settings(key,value,updated_at) VALUES(?,?,?)', [sr.key, sr.value, sr.updated_at || null]); changed++; } }
  // tombstones: union
  for (const [k, at] of stt) { const [tbl, id] = k.split('\u0000'); const cur = lt.get(k); if (!cur || at > cur) localDb.run('INSERT OR REPLACE INTO tombstones(tbl,id,at) VALUES(?,?,?)', [tbl, id, at]); }
  // audit: append server entries missing locally (matched by content)
  const seen = new Set(rowsOf(localDb, 'SELECT at,action,entity,entity_id FROM audit').map(r => [r.at, r.action, r.entity, r.entity_id].join('|')));
  for (const r of rowsOf(sdb, 'SELECT at,action,entity,entity_id,detail FROM audit')) { const key = [r.at, r.action, r.entity, r.entity_id].join('|'); if (!seen.has(key)) { localDb.run('INSERT INTO audit(at,action,entity,entity_id,detail) VALUES(?,?,?,?,?)', [r.at, r.action, r.entity, r.entity_id, r.detail]); seen.add(key); } }
  sdb.close(); return changed;
}
const SYNC_FILE = path.join(DATA_DIR, 'sync.json');
const SYNC_DEFAULT_URL = 'https://hr-sync.hossam-mohamed101213.workers.dev';
const SYNC_DEFAULT_TOKEN = '3b6b8ac1ab467223927d85df71c1a64e718e5f1c8df92f8b';const SYNC = {
  st: null, timer: null, busy: false, pushWanted: false, metaWanted: false, lastErr: '', online: null, retryTimer: null,
  cfg() { const p = prefs(); let url = String(p.syncUrl || '').replace(/\/+$/, ''); if (!url || /api\.sevengates\.online/.test(url)) url = SYNC_DEFAULT_URL; const token = (url === SYNC_DEFAULT_URL) ? SYNC_DEFAULT_TOKEN : String(p.syncToken || ''); return { url, token, enabled: !!p.syncEnabled && !!token }; },
  enabled() { return this.cfg().enabled; },
  who() { return (os.hostname() + '/' + (process.env.USERNAME || process.env.USER || '')).slice(0, 80); },
  load() { if (!this.st) this.st = readJSON(SYNC_FILE, null) || { version: 0, lastSync: null, pending: false }; return this.st; },
  save() { try { writeJSON(SYNC_FILE, this.st); } catch { } },
  status() { const s = this.load(); const c = this.cfg(); return { enabled: c.enabled, url: c.url, hasToken: !!c.token, online: this.online, version: s.version, lastSync: s.lastSync, pending: !!s.pending || this.pushWanted || this.metaWanted, busy: this.busy, error: this.lastErr }; },
  emit() { notifyRenderer('sync:state', this.status()); },
  async api(pathname, opts = {}) {
    const c = this.cfg(); const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), opts.timeout || 12000);
    try {
      const r = await fetch(c.url + pathname, { method: opts.method || 'GET', headers: { Authorization: 'Bearer ' + c.token, 'Content-Type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctl.signal });
      const j = await r.json().catch(() => ({})); this.online = true; if (r.status === 401) throw new Error('unauthorized'); return { status: r.status, ...j };
    } catch (e) { if (String(e.message) !== 'unauthorized') this.online = false; throw e; } finally { clearTimeout(t); }
  },
  /* جهاز جديد بلا بيانات: إن كان للسيرفر meta، نكتبه محلياً ليطلب البرنامج "كلمة مرور الشركة" */
  async tryJoin() {
    try { const r = await this.api('/sync/pull'); if (r.ok && r.meta && r.meta.wrap) { writeJSON(META_FILE, r.meta); const s = this.load(); s.version = 0; this.save(); this.emit(); return true; } } catch (e) { this.lastErr = String(e.message || e).slice(0, 120); }
    return false;
  },
  /* فحص الاتصال بالإعدادات المعطاة قبل الحفظ */
  async test(url, token) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 10000);
    try { const r = await fetch(String(url).replace(/\/+$/, '') + '/sync/pull', { headers: { Authorization: 'Bearer ' + String(token) }, signal: ctl.signal }); if (r.status === 401) return { ok: false, why: 'token' }; const j = await r.json(); return j && j.ok ? { ok: true, empty: !!j.empty, version: j.version } : { ok: false, why: 'server' }; }
    catch { return { ok: false, why: 'network' }; } finally { clearTimeout(t); }
  },
  afterUnlock() { if (!this.enabled()) return; this.load(); this.schedule(500); },
  lastHash: null,
  onLocalChanged(hash) { if (!this.enabled()) return; if (hash && hash === this.lastHash) return; this.pushWanted = true; const s = this.load(); s.pending = true; this.save(); this.schedule(2500); },
  onMetaChanged() { if (!this.enabled()) return; this.metaWanted = true; this.schedule(500); },
  /* دفع غلاف كلمة المرور فوراً (تغيير كلمة المرور/الاسترداد/PIN) — مع الرجوع للجدولة عند انقطاع الاتصال */
  async pushMetaNow() { if (!this.enabled()) return { ok: false, why: 'disabled' }; try { const r = await this.api('/sync/meta', { method: 'POST', body: { meta: meta(), by: this.who() } }); if (r.ok) { this.metaWanted = false; const s = this.load(); s.version = r.version; s.lastSync = now(); this.save(); this.emit(); return { ok: true }; } } catch (e) { this.lastErr = String(e.message || e).slice(0, 120); } this.metaWanted = true; this.schedule(1000); return { ok: false, why: 'offline' }; },
  schedule(ms) { clearTimeout(this.timer); this.timer = setTimeout(() => this.run().catch(() => { }), ms); },
  async flush() { clearTimeout(this.timer); if (this.enabled() && (this.pushWanted || this.metaWanted)) { try { await this.run(); } catch { } } },
  run() { this.chain = (this.chain || Promise.resolve()).then(() => this._run()).catch(() => { }); return this.chain; },
  async _run() {
    if (!DEK || !db || !this.enabled()) return; this.busy = true; this.emit();
    try {
      const s = this.load();
      if (this.metaWanted) { const r = await this.api('/sync/meta', { method: 'POST', body: { meta: meta(), by: this.who() } }); if (r.ok) { this.metaWanted = false; s.version = r.version; } }
      const pull = await this.api('/sync/pull');
      if (!pull.ok) throw new Error('pull-failed');
      const localBlob = () => fs.readFileSync(DB_FILE).toString('base64');
      if (pull.empty) {
        if (dirty) persist();
        const r = await this.api('/sync/push', { method: 'POST', body: { expectedVersion: pull.version, meta: meta(), blob: localBlob(), by: this.who() }, timeout: 60000 });
        if (r.ok) { s.version = r.version; s.pending = false; this.pushWanted = false; s.lastSync = now(); this.lastHash = crypto.createHash('sha256').update(Buffer.from(db.export())).digest('hex'); this.save(); } else if (r.conflict) { this.pushWanted = true; }
      } else if (pull.version > s.version && !(s.pending || this.pushWanted)) {
        // السيرفر أحدث ولا توجد تعديلات محلية: خذ نسخة السيرفر كما هي
        await this.applyServer(pull);
        s.version = pull.version; s.pending = false; this.pushWanted = false; s.lastSync = now(); this.save();
        notifyRenderer('sync:reloaded', { by: pull.updatedBy || '', at: pull.updatedAt || '' });
      } else if (this.pushWanted || s.pending) {
        // توجد تعديلات محلية: ادمج مع السيرفر إن كان أحدث، ثم ارفع (حتى 3 محاولات عند التعارض)
        if (dirty) persist();
        let base = pull; let merged = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (base.version > s.version && base.blob) { try { doBackup(); } catch { } this.mergeServer(base); merged = true; s.version = base.version; }
          const r = await this.api('/sync/push', { method: 'POST', body: { expectedVersion: s.version, meta: meta(), blob: localBlob(), by: this.who() }, timeout: 60000 });
          if (r.ok) { s.version = r.version; s.pending = false; this.pushWanted = false; s.lastSync = now(); this.lastHash = crypto.createHash('sha256').update(Buffer.from(db.export())).digest('hex'); this.save(); if (merged) notifyRenderer('sync:reloaded', { by: base.updatedBy || '', at: base.updatedAt || '', merged: true }); break; }
          if (!r.conflict) throw new Error('push-failed'); base = await this.api('/sync/pull'); if (!base.ok) throw new Error('pull-failed');
        }
      } else { s.lastSync = now(); this.save(); }
      try { LIC.markCompany(); } catch { } // مزامنة ناجحة = جهاز شركة مرخّص تلقائياً
      this.lastErr = ''; clearTimeout(this.retryTimer);
    } catch (e) {
      this.lastErr = String(e && e.message || e).slice(0, 120);
      clearTimeout(this.retryTimer); this.retryTimer = setTimeout(() => this.run().catch(() => { }), 60000);
    } finally { this.busy = false; this.emit(); }
  },
  /* دمج نسخة السيرفر في القاعدة المحلية (بدون فقدان التعديلات المحلية) ثم حفظها */
  mergeServer(pull) {
    const buf = Buffer.from(pull.blob, 'base64'); let plain; try { plain = decrypt(buf); } catch { throw new Error('server-blob-key-mismatch'); }
    mergeDatabases(db, plain);
    if (pull.meta && pull.meta.wrap) { const cur = meta() || {}; if (JSON.stringify(pull.meta) !== JSON.stringify(cur)) writeJSON(META_FILE, pull.meta); }
    clearTimeout(saveTimer); dirty = true; persistQuiet();
  },
  async applyServer(pull) {
    const buf = Buffer.from(pull.blob, 'base64');
    let plain; try { plain = decrypt(buf); } catch { throw new Error('server-blob-key-mismatch'); }
    const ndb = new SQL.Database(plain); ndb.run(SCHEMA); migrate(ndb); ndb.exec('SELECT count(*) FROM employees');
    if (pull.meta && pull.meta.wrap) { const cur = meta() || {}; if (JSON.stringify(pull.meta) !== JSON.stringify(cur)) writeJSON(META_FILE, pull.meta); }
    atomicWrite(DB_FILE, buf); if (db) { try { db.close(); } catch { } } db = ndb; loadCols(); clearTimeout(saveTimer); dirty = false; this.lastHash = crypto.createHash('sha256').update(plain).digest('hex');
    if (CUR && CUR.role === 'employee') { const u = all('SELECT * FROM users WHERE id=?', [CUR.id])[0]; if (!u || u.status !== 'active') { notifyRenderer('session:revoked', {}); } else { try { CUR.perms = JSON.parse(u.perms || '[]'); } catch { } CUR.name = u.name; CUR.photo = u.photo; } }
  }
};
ipcMain.handle('sync:status', () => SYNC.status());
ipcMain.handle('sync:test', (e, url, token) => SYNC.test(url, token));
ipcMain.handle('sync:configure', (e, url, token, enabled) => {
  if (DEK && db) requireAdmin(); // قبل الفتح (الانضمام) مسموح؛ بعد الفتح للمدير فقط
  const cur = prefs(); const u = String(url || SYNC_DEFAULT_URL).trim(); if (!/^https:\/\/[\w.-]+/.test(u) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(u)) throw new Error('bad-url');
  writeJSON(PREFS_FILE, { ...cur, syncUrl: u, syncToken: String(token || '').trim(), syncEnabled: !!enabled });
  SYNC.st = null; if (DEK && db && SYNC.enabled()) { SYNC.pushWanted = true; SYNC.schedule(300); } SYNC.emit(); return SYNC.status();
});
ipcMain.handle('sync:now', async () => { requireUnlocked(); if (!SYNC.enabled()) throw new Error('sync-disabled'); SYNC.pushWanted = SYNC.pushWanted || !!SYNC.load().pending; await SYNC.run(); return SYNC.status(); });

/* ---------- auth ---------- */
let failedLogins = 0;
ipcMain.handle('auth:status', async () => {
  let joined = false;
  if (!meta() && !fs.existsSync(DB_FILE) && SYNC.enabled()) { joined = await SYNC.tryJoin(); } // جهاز جديد مُعدّ للمزامنة: اجلب غلاف كلمة مرور الشركة من السيرفر
  return { reg: regState(), hasPassword: !!meta() || fs.existsSync(DB_FILE), unlocked: !!DEK, dataDir: DATA_DIR, orphanDb: !meta() && fs.existsSync(DB_FILE), joined, sync: SYNC.status(), device: deviceStatus() };
});
ipcMain.handle('auth:setup', async (e, pw) => {
  if (meta() || fs.existsSync(DB_FILE)) throw new Error('exists');
  if (typeof pw !== 'string' || pw.length < 8) throw new Error('weak');
  const salt = crypto.randomBytes(16); const kek = deriveKEK(pw, salt); DEK = crypto.randomBytes(32);
  writeMeta(salt, KDF, encrypt(DEK, kek), { createdAt: now() });
  await openDatabase(); CUR = { id: 'admin', username: 'admin', name: 'المدير', role: 'admin', perms: SECTIONS.slice() }; audit('setup', 'app', '', ''); persist(); SYNC.afterUnlock(); setTimeout(() => devicePing(true), 2500); LOCALAPI.start(); return true;
});
async function refreshMetaLocked() { if (DEK || !SYNC.enabled()) return false; try { const r = await SYNC.api('/sync/pull'); if (r.ok && r.meta && r.meta.wrap) { const cur = meta() || {}; if (JSON.stringify(r.meta) !== JSON.stringify(cur)) { writeJSON(META_FILE, r.meta); return true; } } } catch { } return false; }
async function doLogin(pw, username, retried) {
  if (deviceStatus().status === 'killed') throw new Error('device-killed');
  const m = meta(); if (!m) throw new Error('no-setup');
  if (failedLogins > 0) await new Promise(r => setTimeout(r, Math.min(5000, 500 * failedLogins)));
  const uname = String(username || 'admin').trim().toLowerCase();
  if (uname === 'admin' || uname === '') {
    const key = unlockWith(pw, m); if (!key) { if (!retried && await refreshMetaLocked()) return doLogin(pw, username, true); failedLogins++; return false; }
    failedLogins = 0; DEK = key; await openDatabase(); CUR = { id: 'admin', username: 'admin', name: 'المدير', role: 'admin', perms: SECTIONS.slice() };
    if (!m.wrap) { const salt = crypto.randomBytes(16); writeMeta(salt, KDF, encrypt(DEK, deriveKEK(pw, salt)), { migratedAt: now() }); }
    mirrorUsersToMeta(); audit('login', 'app', '', 'admin'); SYNC.afterUnlock(); setTimeout(() => devicePing(true), 2500); LOCALAPI.start(); return true;
  }
  const retry = async () => (!retried && await refreshMetaLocked()) ? doLogin(pw, username, true) : null;
  const entry = (m.users || {})[uname]; if (!entry) { const r = await retry(); if (r !== null) return r; failedLogins++; return false; }
  if (entry.status !== 'active') { const r = await retry(); if (r !== null) return r; failedLogins++; return { ok: false, why: 'disabled' }; }
  let key = null; try { key = decrypt(Buffer.from(entry.wrap, 'base64'), deriveKEK(pw, Buffer.from(entry.salt, 'hex'))); } catch { key = null; }
  if (!key) { const r = await retry(); if (r !== null) return r; failedLogins++; return false; }
  const dev = machineId();
  if (entry.device_id && entry.device_id !== dev) { const r = await retry(); if (r !== null) return r; failedLogins++; return { ok: false, why: 'device', device: dev }; }
  failedLogins = 0; DEK = key; await openDatabase();
  let u = all('SELECT * FROM users WHERE lower(username)=?', [uname])[0];
  if (!u && SYNC.enabled()) { try { await SYNC.run(); } catch { } u = all('SELECT * FROM users WHERE lower(username)=?', [uname])[0]; } // جهاز جديد: اجلب قاعدة البيانات من السيرفر أولاً
  if (!u || u.status !== 'active') { DEK.fill(0); DEK = null; db.close(); db = null; return { ok: false, why: 'disabled' }; }
  if (u.role === 'viewer') { DEK.fill(0); DEK = null; db.close(); db = null; audit('login-viewer-denied', 'users', u.id, u.username); return { ok: false, why: 'viewer' }; }
  let perms = []; try { perms = JSON.parse(u.perms || '[]'); } catch { perms = []; }
  CUR = { id: u.id, username: u.username, name: u.name, role: 'employee', perms, emp_id: u.emp_id, photo: u.photo, trusted: !!u.trusted };
  if (!u.device_id) { run('UPDATE users SET device_id=?, device_name=?, updated_at=? WHERE id=?', [dev, os.hostname(), now(), u.id]); mirrorUsersToMeta(); SYNC.onMetaChanged(); }
  run('UPDATE users SET last_login=? WHERE id=?', [now(), u.id]);
  audit('login', 'app', u.id, u.username); SYNC.afterUnlock(); setTimeout(() => devicePing(true), 2500); return true;
}
ipcMain.handle('auth:login', (e, pw, username) => doLogin(pw, username, false));
ipcMain.handle('auth:session', () => sessionInfo());
ipcMain.handle('auth:lock', async () => { LOCALAPI.stop(); secOkUntil = 0; delOkUntil = 0; setOkUntil = 0; if (dirty) persist(); await SYNC.flush(); if (db) { db.close(); db = null; } if (DEK) { DEK.fill(0); DEK = null; } CUR = null; return true; });
/* رمز الاسترداد (للمدير فقط): يغلّف مفتاح البيانات DEK بمفتاح مشتق من رمز عشوائي طويل يُعرض مرة واحدة.
   لا يمكن استرجاع كلمة المرور من الإيميل/الهاتف لأن السيرفر لا يملك المفتاح (تشفير طرف-لطرف). */
function genRecoveryCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const b = crypto.randomBytes(24); let out = ''; for (let i = 0; i < 24; i++) { out += A[b[i] % A.length]; if (i % 4 === 3 && i < 23) out += '-'; } return out; }
const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
ipcMain.handle('auth:recoveryStatus', () => { const m = meta() || {}; return { set: !!m.recoveryWrap, at: m.recoveryAt || null }; });
ipcMain.handle('auth:recoveryCreate', async (e, password) => {
  requireAdmin(); requireSecPin(); const m = meta(); const k = unlockWith(password, m); if (!k || !k.equals(DEK)) return { ok: false, why: 'password' };
  const code = genRecoveryCode(); const salt = crypto.randomBytes(16); const kek = deriveKEK(normCode(code), salt);
  writeJSON(META_FILE, { ...m, recoverySalt: salt.toString('hex'), recoveryWrap: encrypt(DEK, kek).toString('base64'), recoveryAt: now() });
  audit('recovery-code-set', 'app', '', ''); SYNC.onMetaChanged(); return { ok: true, code };
});
let recoveryFails = 0;
ipcMain.handle('auth:recoveryReset', async (e, code, newPw) => {
  const m = meta(); if (!m || !m.recoveryWrap) return { ok: false, why: 'not-set' };
  if (typeof newPw !== 'string' || newPw.length < 8) return { ok: false, why: 'weak' };
  if (recoveryFails > 0) await new Promise(r => setTimeout(r, Math.min(8000, 1000 * recoveryFails)));
  let key = null; try { key = decrypt(Buffer.from(m.recoveryWrap, 'base64'), deriveKEK(normCode(code), Buffer.from(m.recoverySalt, 'hex'))); } catch { key = null; }
  if (!key) { recoveryFails++; return { ok: false, why: 'code' }; }
  recoveryFails = 0; DEK = key; await openDatabase(); CUR = { id: 'admin', username: 'admin', name: 'المدير', role: 'admin', perms: SECTIONS.slice() };
  const keep = {}; for (const k of ['createdAt', 'pinSalt', 'pinHash', 'ownerKey', 'recoverySalt', 'recoveryWrap', 'recoveryAt', 'recoveryEmail', 'secSalt', 'secHash', 'users']) if (m[k] !== undefined) keep[k] = m[k];
  const salt = crypto.randomBytes(16); writeMeta(salt, KDF, encrypt(DEK, deriveKEK(newPw, salt)), { ...keep, changedAt: now(), resetBy: 'recovery' });
  audit('password-reset-recovery', 'app', '', ''); const sy = await SYNC.pushMetaNow(); SYNC.afterUnlock(); return { ok: true, synced: sy.ok };
});
ipcMain.handle('auth:changePassword', async (e, oldPw, newPw) => {
  requireAdmin(); requireSecPin(); const m = meta(); if (typeof newPw !== 'string' || newPw.length < 8) throw new Error('weak');
  const k = unlockWith(oldPw, m); if (!k || !k.equals(DEK)) return false;
  const keep = {}; for (const k of ['createdAt', 'pinSalt', 'pinHash', 'ownerKey', 'recoverySalt', 'recoveryWrap', 'recoveryAt', 'recoveryEmail', 'secSalt', 'secHash', 'users']) if (m[k] !== undefined) keep[k] = m[k];
  const salt = crypto.randomBytes(16); writeMeta(salt, KDF, encrypt(DEK, deriveKEK(newPw, salt)), { ...keep, changedAt: now() }); // single atomic write, no data re-encryption
  audit('password-change', 'app', '', ''); const sy = await SYNC.pushMetaNow(); return { ok: true, synced: sy.ok };
});


/* ==================== إدارة المستخدمين (المدير فقط) ==================== */
function usersChanged() { clearTimeout(saveTimer); persist(); mirrorUsersToMeta(); if (SYNC.enabled()) { SYNC.metaWanted = true; SYNC.pushWanted = true; SYNC.schedule(200); } }
function userRow(id) { const u = all('SELECT id,emp_id,username,name,role,perms,photo,device_id,device_name,status,last_login,created_at,updated_at,code,trusted,code_on FROM users WHERE id=?', [id])[0]; if (u) { try { u.perms = JSON.parse(u.perms || '[]'); } catch { u.perms = []; } } return u; }
function validPerms(p) { return (Array.isArray(p) ? p : []).filter(x => SECTIONS.includes(x)); }
function validPhoto(ph) { if (!ph) return null; ph = String(ph); if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(ph) || ph.length > 300000) throw new Error('bad-photo'); return ph; }
ipcMain.handle('user:list', () => { requireAdmin(); ensureUserCodes(); return all('SELECT id,emp_id,username,name,role,perms,photo,device_id,device_name,status,last_login,created_at,code,trusted,code_on FROM users ORDER BY created_at').map(u => { try { u.perms = JSON.parse(u.perms || '[]'); } catch { u.perms = []; } return u; }); });
ipcMain.handle('user:create', (e, data) => {
  requireAdmin(); requireLicense(); if (!data || typeof data !== 'object') throw new Error('bad');
  const username = String(data.username || '').trim().toLowerCase(); if (!/^[a-z0-9._-]{3,30}$/.test(username) || username === 'admin') throw new Error('bad-username');
  if (all('SELECT id FROM users WHERE lower(username)=?', [username]).length) throw new Error('username-taken');
  if (data.emp_id) { safeId(data.emp_id); if (!all('SELECT id FROM employees WHERE id=?', [data.emp_id]).length) throw new Error('bad-id'); if (all('SELECT id FROM users WHERE emp_id=?', [data.emp_id]).length) throw new Error('employee-has-account'); }
  const name = String(data.name || '').trim().slice(0, 120); if (!name) throw new Error('bad-name');
  const role = data.role === 'viewer' ? 'viewer' : 'employee'; if (role === 'viewer') { data.emp_id = null; data.perms = []; }
  let pw; if (data.password !== undefined && data.password !== null && String(data.password) !== '') { pw = String(data.password); if (pw.length < 4) throw new Error('weak-password'); } else { pw = genPassword(); }
  const salt = crypto.randomBytes(16); const wrap = encrypt(DEK, deriveKEK(pw, salt)).toString('base64');
  const id = crypto.randomBytes(8).toString('hex');
  run('INSERT INTO users(id,emp_id,username,name,role,perms,photo,device_id,device_name,status,salt,wrap,created_at,updated_at,code) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [id, data.emp_id || null, username, name, role, JSON.stringify(validPerms(data.perms)), validPhoto(data.photo), null, null, 'active', salt.toString('hex'), wrap, now(), now(), genCode()]);
  mirrorUsersToMeta(); audit('user-create', 'users', id, username); usersChanged();
  return { user: userRow(id), password: pw };
});
ipcMain.handle('user:update', (e, id, data) => {
  requireAdmin(); safeId(id); const u = userRow(id); if (!u) throw new Error('bad-id'); if (!data || typeof data !== 'object') throw new Error('bad');
  const name = data.name !== undefined ? String(data.name).trim().slice(0, 120) : u.name; const perms = data.perms !== undefined ? validPerms(data.perms) : u.perms; const photo = data.photo !== undefined ? validPhoto(data.photo) : u.photo; const status = data.status !== undefined ? (['active', 'disabled'].includes(data.status) ? data.status : u.status) : u.status;
  let trusted = u.trusted ? 1 : 0; if (data.trusted !== undefined) { const t = data.trusted ? 1 : 0; if (t !== trusted) { if (u.role !== 'employee') throw new Error('bad-role'); requireSecPin(); trusted = t; audit(t ? 'user-trusted' : 'user-untrusted', 'users', id, u.username); } }
  let code_on = u.code_on ? 1 : 0; if (data.code_on !== undefined) { const c = data.code_on ? 1 : 0; if (c !== code_on) { if (u.role !== 'employee') throw new Error('bad-role'); code_on = c; audit(c ? 'user-code-locked' : 'user-code-active', 'users', id, u.username); } }
  let username = u.username;
  if (data.username !== undefined) { username = String(data.username).trim().toLowerCase(); if (username !== u.username) { if (!/^[a-z0-9._-]{3,30}$/.test(username) || username === 'admin') throw new Error('bad-username'); if (all('SELECT id FROM users WHERE lower(username)=? AND id<>?', [username, id]).length) throw new Error('username-taken'); } }
  run('UPDATE users SET username=?, name=?, perms=?, photo=?, status=?, trusted=?, code_on=?, updated_at=? WHERE id=?', [username, name, JSON.stringify(perms), photo, status, trusted, code_on, now(), id]);
  mirrorUsersToMeta(); audit('user-update', 'users', id, u.username + (status !== u.status ? ' ' + status : '')); usersChanged(); return userRow(id);
});
ipcMain.handle('user:resetPassword', (e, id, custom) => {
  requireAdmin(); safeId(id); const u = userRow(id); if (!u) throw new Error('bad-id');
  let pw; if (custom !== undefined && custom !== null && String(custom) !== '') { pw = String(custom); if (pw.length < 4) throw new Error('weak-password'); } else { pw = genPassword(); }
  const salt = crypto.randomBytes(16); const wrap = encrypt(DEK, deriveKEK(pw, salt)).toString('base64');
  run('UPDATE users SET salt=?, wrap=?, updated_at=? WHERE id=?', [salt.toString('hex'), wrap, now(), id]);
  mirrorUsersToMeta(); audit('user-reset-password', 'users', id, u.username); usersChanged(); return { password: pw };
});
ipcMain.handle('user:unbindDevice', (e, id) => { requireAdmin(); safeId(id); const u = userRow(id); if (!u) throw new Error('bad-id'); run('UPDATE users SET device_id=NULL, device_name=NULL, updated_at=? WHERE id=?', [now(), id]); mirrorUsersToMeta(); audit('user-unbind-device', 'users', id, u.username); usersChanged(); return userRow(id); });
ipcMain.handle('user:delete', (e, id) => { requireAdmin(); requireSecPin(); safeId(id); const u = userRow(id); if (!u) throw new Error('bad-id'); run('INSERT OR REPLACE INTO tombstones(tbl,id,at) VALUES(?,?,?)', ['users', id, now()]); run('DELETE FROM users WHERE id=?', [id]); mirrorUsersToMeta(); audit('user-delete', 'users', id, u.username); usersChanged(); return true; });
ipcMain.handle('app:device', () => ({ id: machineId(), name: os.hostname() }));

/* ==================== استرداد كلمة مرور المدير بالإيميل ==================== */
ipcMain.handle('auth:recoveryEmailStatus', async () => ({ enrolled: false, disabled: true }));
ipcMain.handle('auth:recoveryEmailEnroll', async () => ({ ok: false, why: 'disabled' }));
ipcMain.handle('auth:recoveryEmailRequest', async () => ({ ok: false, why: 'disabled' }));
ipcMain.handle('auth:recoveryEmailReset', async () => ({ ok: false, why: 'disabled' }));
/* ---------- رقم الأمان السري (قسم الأمان): يحدده المالك، لا يعرفه المدير ---------- */
let secFails = 0, secLockUntil = 0, secOkUntil = 0;
const secHashOf = (pin, salt) => crypto.scryptSync(String(pin), salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const secCheck = (pin) => { const m = meta() || {}; if (!m.secHash || !m.secSalt) return false; try { return crypto.timingSafeEqual(secHashOf(pin, Buffer.from(m.secSalt, 'hex')), Buffer.from(m.secHash, 'hex')); } catch { return false; } };
const requireSecPin = () => { const m = meta() || {}; if (!m.secHash) return; if (Date.now() > secOkUntil) throw new Error('secpin-required'); };
ipcMain.handle('secpin:status', () => { const m = meta() || {}; return { set: !!m.secHash, open: !m.secHash || Date.now() <= secOkUntil }; });
ipcMain.handle('secpin:verify', (e, pin) => {
  requireAdmin(); if (Date.now() < secLockUntil) return { ok: false, why: 'locked', wait: Math.ceil((secLockUntil - Date.now()) / 1000) };
  if (secCheck(pin)) { secFails = 0; secOkUntil = Date.now() + 10 * 60000; return { ok: true }; }
  if (++secFails >= 5) { secFails = 0; secLockUntil = Date.now() + 5 * 60000; audit('secpin-lockout', 'app', '', ''); }
  return { ok: false, why: 'wrong' };
});
/* نسيت الرقم السري: يُعاد ضبطه بكلمة مرور المدير الرئيسية (التي تفتح قاعدة البيانات أصلاً) — تُسجَّل العملية */
ipcMain.handle('secpin:reset', async (e, pw, newPin) => {
  requireAdmin(); const m = meta(); if (!m) throw new Error('no-setup'); if (!/^\d{4,12}$/.test(String(newPin))) return { ok: false, why: 'bad-pin' };
  if (secFails > 0) await new Promise(r => setTimeout(r, Math.min(5000, 700 * secFails)));
  const k = unlockWith(String(pw || ''), m); if (!k) { secFails++; audit('secpin-reset-fail', 'app', '', ''); return { ok: false, why: 'wrong-password' }; } try { k.fill(0); } catch { }
  const salt = crypto.randomBytes(16); writeJSON(META_FILE, { ...m, secSalt: salt.toString('hex'), secHash: secHashOf(newPin, salt).toString('hex') });
  secFails = 0; secOkUntil = Date.now() + 10 * 60000; audit('secpin-reset', 'app', '', 'by admin password'); SYNC.onMetaChanged(); return { ok: true };
});
ipcMain.handle('secpin:set', (e, newPin, oldPin) => {
  requireAdmin(); const m = meta(); if (!/^\d{4,12}$/.test(String(newPin))) return { ok: false, why: 'bad-pin' };
  if (m.secHash && !(Date.now() <= secOkUntil && secCheck(oldPin))) return { ok: false, why: 'wrong' };
  const salt = crypto.randomBytes(16); writeJSON(META_FILE, { ...m, secSalt: salt.toString('hex'), secHash: secHashOf(newPin, salt).toString('hex') });
  secOkUntil = Date.now() + 10 * 60000; audit('secpin-set', 'app', '', ''); SYNC.onMetaChanged(); return { ok: true };
});
/* ---------- manager PIN (stored hashed in meta.json) ---------- */
let pinFails = 0, pinToken = null, pinTokenAt = 0;
const pinOk = () => pinToken && (Date.now() - pinTokenAt) < 90000;
const requirePinFor = () => { if (isRestricted()) throw new Error('manager-only'); const m = meta() || {}; if (isGuarded()) { if (!(Date.now() <= delOkUntil && delUser === curName())) throw new Error('pin-required'); return; } if (!m.pinHash || isTrusted()) return; if (!pinOk()) throw new Error('pin-required'); };
ipcMain.handle('pin:status', () => { const m = meta() || {}; return { set: !!m.pinHash, trusted: isTrusted(), restricted: isRestricted(), guard: isGuarded(), guardOpen: isGuarded() && Date.now() <= delOkUntil && delUser === curName() }; });
ipcMain.handle('pin:set', async (e, password, pin) => {
  requireAdmin(); requireSecPin(); const m = meta(); if (!unlockWith(password, m)) return false; if (!/^\d{4,8}$/.test(String(pin))) throw new Error('bad-pin');
  const salt = crypto.randomBytes(16); const hash = crypto.scryptSync(String(pin), salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  writeJSON(META_FILE, { ...m, pinSalt: salt.toString('hex'), pinHash: hash.toString('hex') }); audit('pin-set', 'app', '', ''); SYNC.onMetaChanged(); return true;
});
ipcMain.handle('pin:verify', async (e, pin) => {
  requireUnlocked();
  const m = meta(); if (!m || !m.pinHash) return { ok: false, notSet: true };
  if (pinFails > 0) await new Promise(r => setTimeout(r, Math.min(8000, 700 * pinFails)));
  const hash = crypto.scryptSync(String(pin), Buffer.from(m.pinSalt, 'hex'), 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  const ok = crypto.timingSafeEqual(hash, Buffer.from(m.pinHash, 'hex')); if (!ok) { pinFails++; audit('pin-fail', 'app', '', ''); return { ok: false }; } pinFails = 0; pinToken = crypto.randomBytes(8).toString('hex'); pinTokenAt = Date.now(); return { ok: true };
});

/* ---------- license ---------- */
ipcMain.handle('lic:status', () => LIC.status());
/* بيانات البيع: ملف vendor.json المضمّن + تحديث اختياري من رابط عند توفر إنترنت */
let VENDOR = null;
function readVendor() { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'vendor.json'), 'utf8')); } catch { return {}; } }
ipcMain.handle('lic:vendor', async () => {
  if (VENDOR) return VENDOR; const v = readVendor(); VENDOR = v;
  if (v.remoteConfig && /^https:\/\//.test(v.remoteConfig)) { try { const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000); const r = await fetch(v.remoteConfig, { signal: ctl.signal }); clearTimeout(t); if (r.ok) { const j = await r.json(); if (j && typeof j === 'object') VENDOR = { ...v, ...j }; } } catch { } }
  return VENDOR;
});
ipcMain.handle('lic:claim', async () => {
  const v = VENDOR || readVendor(); if (!v.claimUrl || !/^https:\/\//.test(v.claimUrl)) return { ok: false, why: 'no-server' };
  try { const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000); const r = await fetch(v.claimUrl + '?machine=' + encodeURIComponent(machineId()), { signal: ctl.signal }); clearTimeout(t); const j = await r.json(); if (j && j.ok && j.key) { const a = LIC.activate(j.key); return a.ok ? { ok: true, lic: a.lic } : { ok: false, why: a.why }; } return { ok: false, why: (j && j.why) || 'unpaid' }; } catch { return { ok: false, why: 'offline' }; }
});
const SITE_HOSTS = ['sevencargo.co', 'www.sevencargo.co', 'sevencargo.com', 'www.sevencargo.com', 'sevencargo.online', 'www.sevencargo.online', 'sevengates.online', 'www.sevengates.online'];
const siteOk = u => { try { const x = new URL(u); return x.protocol === 'https:' && SITE_HOSTS.includes(x.hostname.toLowerCase()); } catch { return false; } };
const siteWins = new Map();
ipcMain.handle('site:open', (e, url) => {
  url = String(url || ''); if (!siteOk(url)) throw new Error('bad-url');
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  let w = siteWins.get(host); if (w && !w.isDestroyed()) { w.focus(); w.loadURL(url); return true; }
  w = new BrowserWindow({ width: 1200, height: 820, minWidth: 700, minHeight: 500, title: host, autoHideMenuBar: true, icon: path.join(__dirname, 'build', 'icon.png'), backgroundColor: '#ffffff', webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, devTools: false } });
  siteWins.set(host, w);
  w.webContents.setWindowOpenHandler(({ url: u }) => { if (siteOk(u)) { w.loadURL(u); } else if (/^https:/.test(u)) shell.openExternal(u); return { action: 'deny' }; });
  w.webContents.on('will-navigate', (ev, u) => { if (!siteOk(u)) { ev.preventDefault(); if (/^https:/.test(u)) shell.openExternal(u); } });
  w.webContents.session.setPermissionRequestHandler((wc, perm, cb) => cb(false));
  w.on('closed', () => siteWins.delete(host));
  w.loadURL(url).catch(() => { });
  w.webContents.on('did-fail-load', (ev, code, desc) => { if (code !== -3) w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<html dir="rtl"><body style="font-family:sans-serif;display:grid;place-items:center;height:100vh;color:#333"><div style="text-align:center"><h2>تعذّر فتح الموقع</h2><p>تأكد من اتصال الإنترنت ثم أعد المحاولة.</p><p dir="ltr" style="color:#888">${host}</p></div></body></html>`)); });
  return true;
});
ipcMain.handle('open:url', (e, url) => { url = String(url || ''); if (!/^https:\/\/(wa\.me|api\.whatsapp\.com|www\.sevengates\.online|sevengates\.online|www\.sevencargo\.online|sevencargo\.online|www\.sevencargo\.co|sevencargo\.co|www\.sevencargo\.com|sevencargo\.com|buy\.stripe\.com|checkout\.stripe\.com)\//.test(url)) throw new Error('bad-url'); return shell.openExternal(url); });
ipcMain.handle('lic:activate', (e, key) => { const r = LIC.activate(key); if (r.ok) audit('license-activate', 'app', '', (r.lic || {}).name || ''); return r; });
// تفعيل أونلاين بكود قصير: يطلب سيريالاً من سيرفر الشركة لهذا الجهاز ثم يفعّله تلقائياً
ipcMain.handle('lic:activateCode', async (e, code, name) => {
  const url = (SYNC.cfg().url || SYNC_DEFAULT_URL).replace(/\/+$/, '');
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
    const resp = await fetch(url + '/license/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: String(code || '').trim(), machine: machineId(), name: String(name || '') }), signal: ctl.signal });
    clearTimeout(t); const r = await resp.json();
    if (!r.ok) return { ok: false, why: r.why || 'server' };
    const v = LIC.activate(r.serial); if (!v.ok) return { ok: false, why: v.why || 'bad-serial' };
    audit('license-activate-code', 'app', '', (v.lic || {}).name || ''); return { ok: true, lic: v.lic };
  } catch (err) { return { ok: false, why: 'offline' }; }
});
ipcMain.handle('lic:deactivate', () => { if (DEK) requireAdmin(); LIC.deactivate(); return LIC.status(); });
const PLAN_MODS = { starter: ['employees', 'documents', 'leaves', 'letters', 'guide'], pro: ['employees', 'documents', 'leaves', 'letters', 'guide', 'payroll', 'offers', 'reports'], business: Object.keys(LIC_MODULES) };
ipcMain.handle('lic:keygen', (e, privB64, lic) => { requireAdmin();
  requireUnlocked(); if (!privB64) throw new Error('no-key');
  const priv = crypto.createPrivateKey({ key: Buffer.from(String(privB64).trim(), 'base64'), type: 'pkcs8', format: 'der' });
  const payload = Buffer.from(JSON.stringify({ name: String(lic.name || '').slice(0, 120), machine: lic.machine || 'ANY', expires: lic.expires || null, seats: +lic.seats || 1, plan: lic.plan || 'pro', ...(PLAN_MODS[lic.plan] ? { modules: PLAN_MODS[lic.plan] } : {}), issued: now().slice(0, 10), id: crypto.randomBytes(4).toString('hex').toUpperCase() }));
  const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const key = b64u(payload) + '.' + b64u(crypto.sign(null, payload, priv)); audit('license-issued', 'app', '', lic.name || ''); return key;
});
// المالك يدير أكواد التفعيل على السيرفر: كل طلب موقّع بمفتاح المالك الخاص (رمز الشركة وحده لا يكفي لأنه موجود في كل نسخة)
async function ownerCall(method, pth, body) {
  requireAdmin(); const cfg = SYNC.cfg(); const url = (cfg.url || SYNC_DEFAULT_URL).replace(/\/+$/, ''); if (!cfg.token) return { ok: false, why: 'no-token' };
  const m = meta(); if (!m || !m.ownerKey) return { ok: false, why: 'no-key' };
  let priv; try { priv = crypto.createPrivateKey({ key: Buffer.from(decrypt(Buffer.from(m.ownerKey, 'base64')).toString().trim(), 'base64'), type: 'pkcs8', format: 'der' }); } catch { return { ok: false, why: 'no-key' }; }
  const text = method === 'POST' ? JSON.stringify(body || {}) : ''; const ts = Date.now();
  const sig = Buffer.from(crypto.sign(null, Buffer.from(method + ' ' + pth + '\n' + ts + '\n' + text), priv)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
    const resp = await fetch(url + pth, { method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.token, 'X-Owner-Ts': String(ts), 'X-Owner-Sig': sig }, body: method === 'POST' ? text : undefined, signal: ctl.signal });
    clearTimeout(t); if (resp.status === 401) return { ok: false, why: 'unauthorized' }; if (resp.status === 403) return { ok: false, why: 'owner-only' }; if (resp.status === 429) return { ok: false, why: 'busy' };
    return await resp.json();
  } catch { return { ok: false, why: 'offline' }; }
}
ipcMain.handle('lic:newCode', async (e, opts) => {
  opts = opts || {}; const r = await ownerCall('POST', '/license/newcode', { name: String(opts.name || '').slice(0, 120), plan: opts.plan || null, modules: Array.isArray(opts.modules) ? opts.modules : undefined, max_uses: Math.max(1, +(opts.max_uses || 1)), valid_days: opts.valid_days ? +opts.valid_days : null, expires: opts.expires || null });
  if (r && r.ok) audit('license-code-new', 'app', '', r.code + ' ' + (r.plan || '') + ' ' + (r.name || '')); return r;
});
ipcMain.handle('lic:listCodes', () => ownerCall('GET', '/license/codes'));
ipcMain.handle('lic:revokeCode', async (e, code, revoked) => { const r = await ownerCall('POST', '/license/revoke', { code: String(code || ''), revoked: revoked !== false }); if (r && r.ok) audit(revoked === false ? 'license-code-restore' : 'license-code-revoke', 'app', '', String(code)); return r; });
ipcMain.handle('lic:plans', async () => {
  const url = (SYNC.cfg().url || SYNC_DEFAULT_URL).replace(/\/+$/, '');
  try { const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000); const r = await fetch(url + '/license/plans', { signal: ctl.signal }); clearTimeout(t); const j = await r.json(); if (j && j.ok) return j; } catch { }
  return { ok: true, offline: true, modules: Object.fromEntries(Object.entries(LIC_MODULES).map(([k, v]) => [k, { title: v }])), plans: { starter: { title: 'الأساسية', modules: ['employees', 'documents', 'leaves', 'letters', 'guide'] }, pro: { title: 'الاحترافية', modules: ['employees', 'documents', 'leaves', 'letters', 'guide', 'payroll', 'offers', 'reports'] }, business: { title: 'الكاملة', modules: Object.keys(LIC_MODULES) } } };
});
/* فحص الإلغاء: مرة يومياً عند وجود إنترنت وسيريال مرتبط بكود تفعيل. فشل الاتصال لا يغيّر شيئاً (العمل أوفلاين مضمون). */
async function checkLicenseRevocation() {
  try {
    const due = LIC.checkDue(); if (!due) return; const url = (SYNC.cfg().url || SYNC_DEFAULT_URL).replace(/\/+$/, '');
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    const resp = await fetch(url + '/license/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(due), signal: ctl.signal }); clearTimeout(t); const j = await resp.json();
    if (j && j.ok) { LIC.markChecked(); if (j.revoked) { LIC.revokeLocal(); try { audit('license-revoked', 'app', '', due.code); } catch { } notifyRenderer('lic:changed', LIC.status()); } }
  } catch { }
}

/* ---------- تسجيل العملاء الجدد: طلب ← موافقة المالك ← كود ← تجربة 14 يوم ← الشروط والأحكام ----------
   ينطبق على التثبيتات الجديدة فقط (لا meta.json بعد). التثبيتات القائمة والمنضمّة لشركة موجودة لا تتأثر. */
const REG_FILE = path.join(DATA_DIR, 'signup.json');
const SKIP_REG = !app.isPackaged && process.env.HRP_SKIP_SIGNUP === '1'; // اختبارات آلية فقط
const regRead = () => readJSON(REG_FILE, null);
function regState() {
  const r = regRead(); const fresh = !meta() && !fs.existsSync(DB_FILE);
  if (fresh && !SKIP_REG && !(r && r.verified)) return { stage: r && r.id ? 'wait' : 'form', id: r ? r.id : null, data: r ? r.data : null, machine: machineId() };
  return { stage: 'none', termsPending: !!(r && r.verified && !r.terms), data: r ? r.data : null, applied: !!(r && r.applied), machine: machineId() };
}
async function regPost(pth, body) {
  const url = (SYNC.cfg().url || SYNC_DEFAULT_URL).replace(/\/+$/, '');
  try { const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000); const resp = await fetch(url + pth, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal }); clearTimeout(t); if (resp.status === 429) return { ok: false, why: 'busy' }; return await resp.json(); } catch { return { ok: false, why: 'offline' }; }
}
const regClean = d => { d = d || {}; const c = (v, n) => String(v || '').trim().slice(0, n); return { company: c(d.company, 120), person: c(d.person, 120), activity: c(d.activity, 300), phone: c(d.phone, 40), username: c(d.username, 60), email: c(d.email, 120) }; };
ipcMain.handle('reg:submit', async (e, d) => {
  if (meta() || fs.existsSync(DB_FILE)) throw new Error('not-fresh'); const data = regClean(d);
  if (data.company.length < 2 || data.person.length < 2 || data.phone.length < 5 || !/^[A-Za-z0-9._-]{3,30}$/.test(data.username)) return { ok: false, why: 'bad-data' };
  const r = await regPost('/signup/request', { kind: 'trial', machine: machineId(), ...data }); if (!r.ok) return { ok: false, why: r.why || 'server' };
  writeJSON(REG_FILE, { id: r.id, machine: machineId(), data, verified: false, terms: null, applied: false }); return { ok: true, id: r.id };
});
ipcMain.handle('reg:poll', async () => { const r = regRead(); if (!r || !r.id) return { ok: false, why: 'none' }; const x = await regPost('/signup/status', { id: r.id, machine: r.machine }); return x.ok ? { ok: true, status: x.status } : { ok: false, why: x.why || 'offline' }; });
ipcMain.handle('reg:verify', async (e, code) => {
  const r = regRead(); if (!r || !r.id) return { ok: false, why: 'none' }; const x = await regPost('/signup/verify', { id: r.id, machine: r.machine, code: String(code || '') });
  if (!x.ok) return { ok: false, why: x.why || 'offline' }; r.verified = true; writeJSON(REG_FILE, r); LIC.startTrial(); return { ok: true, data: r.data };
});
ipcMain.handle('reg:reset', () => { if (meta() || fs.existsSync(DB_FILE)) throw new Error('not-fresh'); const r = regRead(); if (r && r.verified) return false; try { fs.unlinkSync(REG_FILE); } catch { } return true; });
ipcMain.handle('reg:data', () => { const r = regRead(); return r ? { data: r.data, verified: !!r.verified, terms: r.terms, applied: !!r.applied } : null; });
ipcMain.handle('reg:applied', () => { requireAdmin(); const r = regRead(); if (r) { r.applied = true; writeJSON(REG_FILE, r); } return true; });
ipcMain.handle('reg:terms', async (e, accepted) => {
  requireUnlocked(); const r = regRead(); if (!r || !r.verified) return { ok: false }; const x = await regPost('/signup/terms', { id: r.id, machine: r.machine, accepted: !!accepted });
  if (accepted) { r.terms = 'accepted'; r.termsAt = now(); writeJSON(REG_FILE, r); audit('terms-accepted', 'app', '', ''); return { ok: true }; }
  setTimeout(() => app.quit(), 600); return { ok: true, quit: true }; // الرفض = لا استخدام؛ لا يُحفظ محلياً فيُسأل مجدداً عند الفتح التالي
});
ipcMain.handle('reg:purchase', async (e, d) => { const data = regClean(d); if (data.company.length < 2 || data.person.length < 2 || data.phone.length < 5) return { ok: false, why: 'bad-data' }; const r = await regPost('/signup/request', { kind: 'purchase', machine: machineId(), ...data }); return r.ok ? { ok: true } : { ok: false, why: r.why || 'server' }; });
ipcMain.handle('reg:list', () => ownerCall('GET', '/signup/list'));
ipcMain.handle('reg:approve', async (e, id) => { const r = await ownerCall('POST', '/signup/approve', { id: String(id || '') }); if (r && r.ok) audit('signup-approve', 'app', '', String(id)); return r; });
ipcMain.handle('reg:reject', async (e, id, note) => { const r = await ownerCall('POST', '/signup/reject', { id: String(id || ''), note: String(note || '') }); if (r && r.ok) audit('signup-reject', 'app', '', String(id)); return r; });
ipcMain.handle('reg:done', async (e, id, note) => ownerCall('POST', '/signup/done', { id: String(id || ''), note: String(note || '') }));
ipcMain.handle('lic:checkNow', async () => { await checkLicenseRevocation(); return LIC.status(); });
/* ==================== 5.4.0: نبضة الجهاز + التعطيل عن بُعد + لوحة الأجهزة للمالك ==================== */
const DEVICE_FILE = path.join(DATA_DIR, 'device.json');
function deviceStatus() { const d = readJSON(DEVICE_FILE, {}) || {}; return { status: ['active', 'disabled', 'killed'].includes(d.status) ? d.status : 'active', message: d.message || null, at: d.at || null, lastPing: d.lastPing || null, machine: machineId() }; }
let pinging = false;
async function devicePing(force) {
  if (pinging) return deviceStatus(); const cur = readJSON(DEVICE_FILE, {}) || {}; if (!force && cur.lastPing && Date.now() - new Date(cur.lastPing).getTime() < 30 * 60000) return deviceStatus();
  pinging = true;
  try {
    const url = (SYNC.cfg().url || SYNC_DEFAULT_URL).replace(/\/+$/, ''); let lic = {}; try { const st = LIC.status(); lic = { state: st.state, name: st.lic && st.lic.name, plan: st.lic && st.lic.plan, expires: st.lic && st.lic.expires, code: st.lic && st.lic.code }; } catch { }
    let company = null; try { if (db) { const r = all('SELECT value FROM settings WHERE key=?', ['company'])[0]; if (r) company = JSON.parse(r.value); } } catch { }
    const body = { machine: machineId(), host: os.hostname(), version: app.getVersion(), os: process.platform + ' ' + os.release(), lic, company, trialStart: (() => { try { return LIC.read().trialStart || null; } catch { return null; } })() };
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    const resp = await fetch(url + '/device/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal }); clearTimeout(t); const j = await resp.json();
    if (j && j.ok && ['active', 'disabled', 'killed'].includes(j.status)) {
      const prev = cur.status || 'active'; writeJSON(DEVICE_FILE, { status: j.status, message: j.message || null, at: prev !== j.status ? now() : (cur.at || now()), lastPing: now() });
      if (prev !== j.status) { try { audit('device-status', 'app', machineId(), prev + ' -> ' + j.status); } catch { } notifyRenderer('device:changed', deviceStatus()); if (j.status === 'killed' && DEK) { try { if (dirty) persist(); } catch { } try { if (db) { db.close(); db = null; } } catch { } try { DEK.fill(0); } catch { } DEK = null; CUR = null; notifyRenderer('device:killed', deviceStatus()); } }
    }
  } catch { } finally { pinging = false; }
  return deviceStatus();
}
ipcMain.handle('dev:status', () => deviceStatus());
ipcMain.handle('dev:ping', () => devicePing(true));
ipcMain.handle('dev:list', async () => { requireAdmin(); requireSecPin(); return ownerCall('GET', '/admin/devices'); });
ipcMain.handle('dev:setStatus', async (e, machine, status, note) => { requireAdmin(); requireSecPin(); if (!['active', 'disabled', 'killed'].includes(status)) throw new Error('bad-status'); const r = await ownerCall('POST', '/admin/device/status', { machine: String(machine || '').toUpperCase(), status, note: String(note || '').slice(0, 300) }); if (r && r.ok) audit('device-' + status, 'app', String(machine), String(note || '')); return r; });
ipcMain.handle('owner:setKey', (e, privB64) => { requireAdmin(); const m = meta(); try { crypto.createPrivateKey({ key: Buffer.from(String(privB64).trim(), 'base64'), type: 'pkcs8', format: 'der' }); } catch { throw new Error('bad-key'); } writeJSON(META_FILE, { ...m, ownerKey: encrypt(Buffer.from(String(privB64).trim())).toString('base64') }); SYNC.onMetaChanged(); return true; });
ipcMain.handle('owner:getKey', () => { requireAdmin(); const m = meta(); if (!m || !m.ownerKey) return null; try { return decrypt(Buffer.from(m.ownerKey, 'base64')).toString(); } catch { return null; } });

/* ---------- data ---------- */
const ACCT_RE = /^(main|sub|cash|bank|bk_[a-z0-9]{3,24})$/;
const VALID = {
  extdocs: o => { if (!['stamp', 'signature', 'letterhead', 'invoice', 'cheque', 'statement', 'paper', 'other'].includes(o.kind || 'paper')) throw new Error('bad-kind'); if (o.file_id) safeId(o.file_id); if (o.date && !DATE_RE.test(o.date)) throw new Error('bad-date'); if (o.amount !== undefined && o.amount !== null && o.amount !== '' && !isFinite(+o.amount)) throw new Error('bad-amount'); },
  projects: o => { if (!String(o.name || '').trim()) throw new Error('bad-name'); if (o.status && !['active', 'completed', 'hold'].includes(o.status)) throw new Error('bad-status'); for (const k of ['start_date', 'end_date']) if (o[k] && !DATE_RE.test(o[k])) throw new Error('bad-date'); if (o.budget !== undefined && o.budget !== null && !(isFinite(+o.budget) && +o.budget >= 0)) throw new Error('bad-number'); },
  cheques: o => { if (!['in', 'out'].includes(o.kind)) throw new Error('bad-kind'); if (!(+o.amount > 0)) throw new Error('bad-amount'); if (!['held', 'deposited', 'cleared', 'bounced', 'deferred', 'cancelled'].includes(o.status || 'held')) throw new Error('bad-status'); for (const k of ['issue_date', 'due_date', 'cleared_at']) if (o[k] && !DATE_RE.test(o[k])) throw new Error('bad-date'); if (o.account && !ACCT_RE.test(o.account)) throw new Error('bad-account'); if (o.ref_id) safeId(o.ref_id); if (o.ref_type && !['payment', 'voucher', 'expense'].includes(o.ref_type)) throw new Error('bad-ref'); if (o.currency && !['AED', 'USD'].includes(o.currency)) throw new Error('bad-currency'); if (o.treasury_id) safeId(o.treasury_id); },
  employees: o => { if (o.hire_date && !DATE_RE.test(o.hire_date)) throw new Error('bad-date'); for (const k of ['end_date', 'birth_date']) if (o[k] && !DATE_RE.test(o[k])) throw new Error('bad-date'); if (o.currency && !['AED', 'USD'].includes(o.currency)) throw new Error('bad-currency'); if (o.status && !['active', 'inactive', 'probation'].includes(o.status)) throw new Error('bad-status'); },
  documents: o => { for (const k of ['issue_date', 'expiry_date']) if (o[k] && !DATE_RE.test(o[k])) throw new Error('bad-date'); if (o.file_id) safeId(o.file_id); },
  payments: o => { if (!MONTH_RE.test(o.month || '')) throw new Error('bad-month'); if (o.paid_at && !DATE_RE.test(o.paid_at)) throw new Error('bad-date'); if (o.currency && !['AED', 'USD'].includes(o.currency)) throw new Error('bad-currency'); },
  leaves: o => { if (!DATE_RE.test(o.start_date || '') || !DATE_RE.test(o.end_date || '')) throw new Error('bad-date'); if (!(+o.days > 0)) throw new Error('bad-days'); },
  notes: o => { if (o.date && !DATE_RE.test(o.date)) throw new Error('bad-date'); },
  treasury: o => { if (!DATE_RE.test(o.date || '')) throw new Error('bad-date'); if (!['in', 'out'].includes(o.direction)) throw new Error('bad-direction'); if (!(+o.amount > 0)) throw new Error('bad-amount'); if (o.file_id) safeId(o.file_id); if (o.ref_type && !['advance', 'custody', 'expense', 'repayment', 'custody_return', 'reimburse', 'invoice', 'payment', 'reversal', 'transfer', 'cheque'].includes(o.ref_type)) throw new Error('bad-ref'); if (o.account && !ACCT_RE.test(o.account)) throw new Error('bad-account'); if (o.ref_id) safeId(o.ref_id); if (o.cheque_id) safeId(o.cheque_id); if (o.extra && String(o.extra).length > 3000) throw new Error('too-big'); },
  advances: o => { if (!['loan', 'custody'].includes(o.kind)) throw new Error('bad-kind'); if (!(+o.amount > 0)) throw new Error('bad-amount'); for (const k of ['installments', 'installment_amount', 'remaining']) if (o[k] !== undefined && o[k] !== null && !(isFinite(+o[k]) && +o[k] >= 0)) throw new Error('bad-number'); if (o.remaining !== undefined && o.remaining !== null && +o.remaining > +o.amount + 0.01) throw new Error('bad-remaining'); if (!['pending', 'approved', 'rejected', 'disbursed', 'settled'].includes(o.status)) throw new Error('bad-status'); for (const k of ['request_date', 'approved_at', 'disbursed_at']) if (o[k] && !DATE_RE.test(o[k])) throw new Error('bad-date'); if (o.voucher_file_id) safeId(o.voucher_file_id); },
  expenses: o => { if (!DATE_RE.test(o.date || '')) throw new Error('bad-date'); if (!(+o.amount > 0)) throw new Error('bad-amount'); if (o.file_id) safeId(o.file_id); if (o.custody_id) safeId(o.custody_id); if (o.status && !['pending', 'approved', 'rejected'].includes(o.status)) throw new Error('bad-status'); if (o.paid_from && !(['custody', 'treasury', 'reimburse'].includes(o.paid_from) || ACCT_RE.test(o.paid_from))) throw new Error('bad-source'); if (o.reimbursed_at && !DATE_RE.test(o.reimbursed_at)) throw new Error('bad-date'); },
  attendance: o => { if (!DATE_RE.test(o.date || '')) throw new Error('bad-date'); if (!['present', 'field', 'leave', 'absent', 'sick', 'mission', 'off'].includes(o.status)) throw new Error('bad-status'); },
  handovers: o => { if (!DATE_RE.test(o.date || '')) throw new Error('bad-date'); if (o.from_emp) safeId(o.from_emp); if (o.to_emp) safeId(o.to_emp); if (!o.from_emp && !String(o.from_name || '').trim()) throw new Error('bad-party'); if (!o.to_emp && !String(o.to_name || '').trim()) throw new Error('bad-party'); if (o.items && String(o.items).length > 4000) throw new Error('too-big'); for (const k of ['expected', 'counted', 'diff', 'custody_open']) if (o[k] !== undefined && !isFinite(+o[k])) throw new Error('bad-number'); if (o.lines && String(o.lines).length > 4000) throw new Error('too-big'); },
  clearances: o => { if (!DATE_RE.test(o.date || '')) throw new Error('bad-date'); safeId(o.emp_id); if (o.status && !['open', 'done'].includes(o.status)) throw new Error('bad-status'); for (const k of ['custody_fin', 'loans', 'reimb', 'salary_due', 'eos', 'leave_cash', 'net']) if (o[k] !== undefined && !isFinite(+o[k])) throw new Error('bad-number'); if (o.lines && String(o.lines).length > 8000) throw new Error('too-big'); },
  closings: o => { if (o.account && !ACCT_RE.test(o.account)) throw new Error('bad-account'); if (!DATE_RE.test(o.date || '')) throw new Error('bad-date'); for (const k of ['system_balance', 'counted', 'variance']) if (!isFinite(+o[k])) throw new Error('bad-number'); },
  taxdocs: o => { if (!DATE_RE.test(o.date || '')) throw new Error('bad-date'); if (!['sale', 'purchase'].includes(o.kind)) throw new Error('bad-kind'); if (o.file_id) safeId(o.file_id); for (const k of ['net', 'vat', 'total']) if (o[k] !== undefined && o[k] !== null && !(isFinite(+o[k]) && +o[k] >= 0)) throw new Error('bad-number'); if (o.vat_rate !== undefined && ![0, 5].includes(+o.vat_rate)) throw new Error('bad-rate'); if (o.paid !== undefined && ![0, 1].includes(+o.paid)) throw new Error('bad-paid'); },
  assets: o => { if (o.emp_id) safeId(o.emp_id); if (!String(o.name || '').trim()) throw new Error('bad-name'); if (o.kind && !['عهدة', 'معدات'].includes(o.kind)) throw new Error('bad-kind'); if (o.status && !['with', 'returned'].includes(o.status)) throw new Error('bad-status'); for (const k of ['received_date', 'returned_date']) if (o[k] && !DATE_RE.test(o[k])) throw new Error('bad-date'); for (const k of ['qty', 'value']) if (o[k] !== undefined && o[k] !== null && !(isFinite(+o[k]) && +o[k] >= 0)) throw new Error('bad-number'); },
  jobs: o => { if (!String(o.title || '').trim()) throw new Error('bad-title'); if (o.category && !['إداري', 'ميداني'].includes(o.category)) throw new Error('bad-category'); for (const k of ['allowance']) if (o[k] !== undefined && o[k] !== null && !(isFinite(+o[k]) && +o[k] >= 0)) throw new Error('bad-number'); },
  promotions: o => { if (o.emp_id) safeId(o.emp_id); if (!DATE_RE.test(o.date || '')) throw new Error('bad-date'); if (!String(o.to_job || '').trim()) throw new Error('bad-title'); },
  offers: o => { for (const k of ['start_date', 'valid_until']) if (o[k] && !DATE_RE.test(o[k])) throw new Error('bad-date'); if (o.currency && !['AED', 'USD'].includes(o.currency)) throw new Error('bad-currency'); if (o.emp_id) safeId(o.emp_id); if (o.status && !['draft', 'sent', 'accepted', 'rejected', 'hired'].includes(o.status)) throw new Error('bad-status'); if (o.lang && !['ar', 'en', 'both'].includes(o.lang)) throw new Error('bad-lang'); for (const k of ['basic', 'housing', 'transport', 'other_allow']) if (o[k] !== undefined && o[k] !== null && !(isFinite(+o[k]) && +o[k] >= 0)) throw new Error('bad-number'); }
};
ipcMain.handle('db:load', () => {
  requireUnlocked();
  const settings = Object.fromEntries(all('SELECT key,value FROM settings').map(r => { try { return [r.key, JSON.parse(r.value)]; } catch { return [r.key, null]; } }));
  const out = { settings }; for (const t of TABLES) { if (t === 'trash' || t === 'review') { out[t] = []; continue; } if (t === 'users') { if (isAdmin()) ensureUserCodes(); out[t] = isAdmin() ? all('SELECT id,emp_id,username,name,role,perms,photo,device_id,device_name,status,last_login,created_at,code,trusted,code_on FROM users').map(u => { try { u.perms = JSON.parse(u.perms || '[]'); } catch { u.perms = []; } return u; }) : []; continue; } const sec = TABLE_SECTION[t]; out[t] = (!sec || canSection(sec) || (t === 'projects' && canSection('finance'))) ? all(`SELECT * FROM ${t}`) : []; } out.session = sessionInfo(); return out;
});
// بيانات الموظف نفسه فقط (بوابة «بياناتي») — تعمل مهما كانت صلاحيات الأقسام، ويرى الموظف سجلاته وحده
ipcMain.handle('self:data', () => {
  requireUnlocked();
  if (!CUR || !CUR.emp_id) return null;
  const id = CUR.emp_id; const q = (sql) => all(sql, [id]);
  return {
    employee: all('SELECT * FROM employees WHERE id=?', [id])[0] || null,
    payments: q('SELECT * FROM payments WHERE emp_id=?'),
    leaves: q('SELECT * FROM leaves WHERE emp_id=?'),
    advances: q('SELECT * FROM advances WHERE emp_id=?'),
    expenses: q('SELECT * FROM expenses WHERE emp_id=?'),
    treasury: q('SELECT * FROM treasury WHERE emp_id=?'),
    attendance: q('SELECT * FROM attendance WHERE emp_id=?')
  };
});
// تسجيل خروج يومي للموظف نفسه — يسجّل وقت انصرافه دون الحاجة لصلاحية الميدان
ipcMain.handle('self:checkout', () => {
  requireUnlocked(); requireLicense();
  if (!CUR || !CUR.emp_id) throw new Error('no-employee');
  const id = CUR.emp_id; const d = now().slice(0, 10); const t = new Date();
  const hhmm = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
  const ex = all('SELECT * FROM attendance WHERE emp_id=? AND date=?', [id, d])[0];
  if (ex) { run('UPDATE attendance SET check_out=?, updated_at=? WHERE id=?', [hhmm, now(), ex.id]); }
  else { run('INSERT INTO attendance(id,emp_id,date,status,check_out,created_at,updated_at) VALUES(?,?,?,?,?,?,?)', [crypto.randomBytes(8).toString('hex'), id, d, 'present', hhmm, now(), now()]); }
  audit('self-checkout', 'attendance', id, hhmm);
  return { ok: true, time: hhmm, date: d };
});
const tierAED = () => { try { const r = all('SELECT value FROM settings WHERE key=?', ['approvalTier'])[0]; return r ? (+JSON.parse(r.value) || 0) : 0; } catch { return 0; } };
const toAEDm = (amt, cur) => { amt = +amt || 0; if (cur && cur !== 'AED') { try { const r = all('SELECT value FROM settings WHERE key=?', ['rate'])[0]; const rate = r ? (+JSON.parse(r.value) || 3.6725) : 3.6725; return cur === 'USD' ? amt * rate : amt; } catch { return amt; } } return amt; };
/* فصل المهام: غير المدير لا يعتمد طلبه هو، ولا يصرف ما اعتمده بنفسه، وما فوق حد الاعتماد يعتمده المدير فقط */
function segregation(table, obj, prev) {
  if (isAdmin() || !CUR) return;
  const was = prev ? prev.status : (table === 'advances' ? 'pending' : null);
  if (table === 'advances' && was !== obj.status && ['approved', 'rejected', 'disbursed'].includes(obj.status)) {
    if (CUR.emp_id && obj.emp_id === CUR.emp_id) obj.__flag = 'اعتمد لنفسه';
    if (obj.status === 'disbursed' && prev && prev.approved_by && prev.approved_by === CUR.username) obj.__flag = (obj.__flag ? obj.__flag + ' · ' : '') + 'اعتمد وصرف بنفسه';
    const tier = tierAED(); if (obj.status === 'approved' && tier > 0 && toAEDm(obj.amount, obj.currency) > tier) obj.__flag = (obj.__flag ? obj.__flag + ' · ' : '') + 'فوق حد الموظف';
    if (obj.status === 'approved') obj.approved_by = CUR.username;
  }
  if (table === 'expenses' && obj.status === 'approved' && (!prev || prev.status !== 'approved')) {
    if (CUR.emp_id && obj.emp_id === CUR.emp_id) obj.__flag = 'اعتمد لنفسه';
    const tier = tierAED(); if (tier > 0 && toAEDm(obj.amount, obj.currency) > tier) obj.__flag = (obj.__flag ? obj.__flag + ' · ' : '') + 'فوق حد الموظف';
    obj.approved_by = CUR.username;
  }
}
const lockedUntil = () => { try { const r = all('SELECT value FROM settings WHERE key=?', ['booksLockedUntil'])[0]; return r ? String(JSON.parse(r.value) || '') : ''; } catch { return ''; } };
const LOCKED_TABLES = ['treasury', 'expenses'];
function checkPeriod(table, ...dates) { if (!LOCKED_TABLES.includes(table)) return; const L = lockedUntil(); if (!L) return; for (const d of dates) if (d && String(d).slice(0, 10) <= L) throw new Error('period-locked'); }
ipcMain.handle('treasury:recon', (e, ids, label) => {
  requireUnlocked(); requireLicense(); requireTable('treasury'); if (!Array.isArray(ids) || ids.length > 5000) throw new Error('bad-ids'); const lb = String(label || 'ok').slice(0, 60);
  for (const id of ids) { safeId(id); run('UPDATE treasury SET recon=?, updated_at=? WHERE id=?', [lb, now(), id]); } audit('recon', 'treasury', '', lb + ' x' + ids.length); return true;
});
ipcMain.handle('books:lock', (e, date) => {
  requireAdmin(); const cur = lockedUntil();
  if (date === '' || date === null) { requireSecPin(); run('INSERT OR REPLACE INTO settings(key,value,updated_at) VALUES(?,?,?)', ['booksLockedUntil', JSON.stringify(''), now()]); audit('books-unlock', 'settings', 'booksLockedUntil', cur); return { ok: true, until: '' }; }
  if (!DATE_RE.test(String(date))) throw new Error('bad-date');
  if (cur && String(date) < cur) requireSecPin(); else requirePinFor();
  run('INSERT OR REPLACE INTO settings(key,value,updated_at) VALUES(?,?,?)', ['booksLockedUntil', JSON.stringify(String(date)), now()]); audit('books-lock', 'settings', 'booksLockedUntil', String(date)); return { ok: true, until: String(date) };
});

/* ==================== 5.3.0: أكواد المسح الخماسية + سلة «الممسوح مؤخراً» + بوابة الإعدادات ==================== */
function genCode() { const used = new Set(all("SELECT code FROM users WHERE code IS NOT NULL AND code<>''").map(r => String(r.code))); for (let i = 0; i < 5000; i++) { const c = String(crypto.randomInt(10000, 100000)); if (!used.has(c)) return c; } throw new Error('no-code'); }
function ensureUserCodes() { let ch = false; for (const u of all("SELECT id FROM users WHERE code IS NULL")) { run('UPDATE users SET code=?, updated_at=? WHERE id=?', [genCode(), now(), u.id]); ch = true; } return ch; }
let delOkUntil = 0, delUser = null, setOkUntil = 0, setOkUser = null; const FAILS = {}; /* عدّادات المحاولات الخاطئة لكل مستخدم على حدة حتى لا يُقفل موظف المدير */
const fl = k => (FAILS[k + ':' + curName()] = FAILS[k + ':' + curName()] || { n: 0, until: 0 });
const curName = () => (CUR ? CUR.username : null);
function setUnlocked() { return !!CUR && Date.now() <= setOkUntil && setOkUser === CUR.username; }
function delNeedsCode() { if (isTrusted()) return false; const m = meta() || {}; return !(isAdmin() && !m.secHash && !m.pinHash); }
function requireDelAuth() { if (isRestricted()) throw new Error('manager-only'); if (!delNeedsCode()) return; if (!(Date.now() <= delOkUntil && delUser === curName())) throw new Error('delcode-required'); }
const trashLabel = (table, r) => { if (!r) return ''; const w = r.name || r.title || r.type || r.description || r.party || r.category || r.month || r.vno || r.kind || ''; return (String(w) + (r.amount !== undefined && r.amount !== null ? ' — ' + r.amount + ' ' + (r.currency || '') : '')).trim().slice(0, 160); };
ipcMain.handle('del:status', () => { requireUnlocked(); if (isRestricted()) return { open: false, restricted: true, admin: false, usesSec: false }; return { open: !delNeedsCode() || (Date.now() <= delOkUntil && delUser === curName()), admin: isAdmin(), usesSec: !!(meta() || {}).secHash }; });
ipcMain.handle('del:auth', (e, code) => {
  requireUnlocked(); if (!CUR) throw new Error('locked'); if (isRestricted()) return { ok: false, why: 'manager-only' }; if (!delNeedsCode()) return { ok: true };
  const F = fl('del'); if (Date.now() < F.until) return { ok: false, why: 'locked', wait: Math.ceil((F.until - Date.now()) / 1000) };
  let ok = false; const m = meta() || {}; code = String(code == null ? '' : code);
  if (isAdmin()) { if (m.secHash) ok = secCheck(code); else if (m.pinHash) { try { ok = crypto.timingSafeEqual(crypto.scryptSync(code, Buffer.from(m.pinSalt, 'hex'), 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }), Buffer.from(m.pinHash, 'hex')); } catch { ok = false; } } }
  else { const u = all('SELECT code FROM users WHERE id=?', [CUR.id])[0]; if (!u || !u.code) return { ok: false, why: 'no-code' }; ok = CODE5.test(code) && code === String(u.code); }
  if (ok) { F.n = 0; delOkUntil = Date.now() + 45000; delUser = curName(); audit('delcode-ok', 'users', CUR.id || 'admin', curName()); return { ok: true }; }
  audit('delcode-wrong', 'users', CUR.id || 'admin', curName() + ' (' + (CUR.name || '') + ')');
  if (++F.n >= 5) { F.n = 0; F.until = Date.now() + 5 * 60000; audit('delcode-lockout', 'users', CUR.id || 'admin', curName()); }
  return { ok: false, why: 'wrong' };
});
const CODE5 = /^\d{5}$/;
ipcMain.handle('user:setCode', (e, id, code) => {
  requireAdmin(); requireSecPin(); safeId(id); const u = userRow(id); if (!u) throw new Error('bad-id');
  let c; if (code === undefined || code === null || String(code) === '') c = genCode(); else { c = String(code); if (!CODE5.test(c)) throw new Error('bad-code'); if (all('SELECT id FROM users WHERE code=? AND id<>?', [c, id]).length) throw new Error('code-taken'); }
  run('UPDATE users SET code=?, updated_at=? WHERE id=?', [c, now(), id]); delete FAILS['del:' + u.username]; audit('user-code-set', 'users', id, u.username); usersChanged(); return userRow(id);
});
ipcMain.handle('user:clearCode', (e, id) => { requireAdmin(); requireSecPin(); safeId(id); const u = userRow(id); if (!u) throw new Error('bad-id'); run("UPDATE users SET code='', updated_at=? WHERE id=?", [now(), id]); audit('user-code-cleared', 'users', id, u.username); usersChanged(); return userRow(id); });
ipcMain.handle('set:status', () => { requireUnlocked(); const m = meta() || {}; return { admin: isAdmin(), secSet: !!m.secHash, open: isAdmin() || setUnlocked() }; });
ipcMain.handle('set:unlock', (e, pin) => {
  requireUnlocked(); if (!CUR) throw new Error('locked'); if (isAdmin()) return { ok: true };
  const F = fl('set'); if (Date.now() < F.until) return { ok: false, why: 'locked', wait: Math.ceil((F.until - Date.now()) / 1000) };
  if (!(meta() || {}).secHash) return { ok: false, why: 'not-set' };
  if (secCheck(pin)) { F.n = 0; setOkUntil = Date.now() + 10 * 60000; setOkUser = curName(); audit('settings-unlock', 'settings', '', curName()); return { ok: true }; }
  audit('settings-unlock-fail', 'settings', '', curName() + ' (' + (CUR.name || '') + ')');
  if (++F.n >= 5) { F.n = 0; F.until = Date.now() + 5 * 60000; audit('secpin-lockout', 'app', '', curName()); }
  return { ok: false, why: 'wrong' };
});
/* ==================== 5.7.0: المراجعة النهائية — كل ما يعمله الموظفون يُسجَّل هنا لاعتماد المدير برقمه السري ==================== */
const REVIEW_SKIP = new Set(['photo', 'file_id', 'file_name', 'voucher_file_id', 'voucher_file_name', 'updated_at', 'created_at', 'id', 'extra', 'snapshot']);
const SPEND_T = (table, row) => (table === 'treasury' && row.direction === 'out') || table === 'expenses' || table === 'payments' || (table === 'advances' && ['disbursed', 'approved'].includes(row.status)) || (table === 'cheques' && row.kind === 'out');
function reviewLog(action, table, row, prev, flag) {
  try {
    if (!row || !CUR || table === 'attendance' && action === 'edit' && prev && prev.status === row.status && prev.check_in === row.check_in && prev.check_out === row.check_out) return;
    if (action !== 'add' && prev) { let same = true; for (const k of Object.keys(row)) { if (REVIEW_SKIP.has(k)) continue; if (String(row[k] == null ? '' : row[k]) !== String(prev[k] == null ? '' : prev[k])) { same = false; break; } } if (same) return; }
    const act = SPEND_T(table, row) && (action === 'add' || (prev && !SPEND_T(table, prev))) ? 'spend' : action;
    const diff = {}; for (const k of Object.keys(row)) { if (REVIEW_SKIP.has(k)) continue; const a = prev ? prev[k] : undefined, b = row[k]; if (prev && String(a == null ? '' : a) === String(b == null ? '' : b)) continue; if (b === null || b === '' || b === undefined) { if (!prev) continue; } diff[k] = { from: prev ? (typeof a === 'string' ? a.slice(0, 120) : a) : undefined, to: typeof b === 'string' ? b.slice(0, 120) : b }; }
    const emp = row.emp_id ? (all('SELECT name FROM employees WHERE id=?', [row.emp_id])[0] || {}).name : '';
    const lbl = ((flag ? '⚠️ ' + flag + ' — ' : '') + (emp ? emp + ' — ' : '') + trashLabel(table, row)).slice(0, 200);
    run('INSERT INTO review(id,action,tbl,rec_id,label,detail,by_user,by_name,status,reviewed_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', [crypto.randomBytes(8).toString('hex'), act, table, row.id, lbl, JSON.stringify(diff).slice(0, 8000), CUR.username, CUR.name || '', 'pending', null, now(), now()]);
  } catch (err) { try { audit('review-log-error', table, row && row.id, String(err.message || err)); } catch { } }
}
/* 5.8.0: التعديلات السابقة على نفس السجل تُعتبر «غير مهمة» (superseded) — الأحدث فقط هو الحقيقي */
const REV_OLD = "(r.action='edit' AND EXISTS (SELECT 1 FROM review n WHERE n.action='edit' AND n.tbl=r.tbl AND n.rec_id=r.rec_id AND (n.created_at>r.created_at OR (n.created_at=r.created_at AND n.id>r.id))))";
ipcMain.handle('review:count', () => { requireUnlocked(); if (!isAdmin()) return 0; return all(`SELECT count(*) c FROM review r WHERE r.status='pending' AND NOT ${REV_OLD}`)[0].c + all("SELECT count(*) c FROM trash WHERE status='pending'")[0].c; });
ipcMain.handle('review:list', (e, status) => { requireAdmin(); const st = status === 'all' ? null : (status || 'pending'); return all(`SELECT r.id,r.action,r.tbl,r.rec_id,r.label,r.detail,r.by_user,r.by_name,r.status,r.reviewed_at,r.created_at, ${REV_OLD} AS old, (SELECT count(*) FROM review n WHERE r.action='edit' AND n.action='edit' AND n.tbl=r.tbl AND n.rec_id=r.rec_id AND n.id<>r.id) AS others FROM review r ${st ? 'WHERE r.status=?' : ''} ORDER BY r.created_at DESC LIMIT 1500`, st ? [st] : []).map(r => { let d = {}; try { d = JSON.parse(r.detail || '{}'); } catch { } r.detail = d; r.old = !!r.old; r.latest = r.action === 'edit' && !r.old; return r; }); });
ipcMain.handle('review:approve', (e, ids) => { requireAdmin(); requireSecPin(); if (!Array.isArray(ids)) throw new Error('bad'); let n = 0; for (const id of ids.slice(0, 2000)) { safeId(id); const r = all('SELECT id,status,action,tbl,rec_id,created_at FROM review WHERE id=?', [id])[0]; if (!r || r.status !== 'pending') continue; run('UPDATE review SET status=?, reviewed_at=?, updated_at=? WHERE id=?', ['approved', now(), now(), id]); n++; if (r.action === 'edit') { for (const o of all("SELECT id FROM review WHERE action='edit' AND tbl=? AND rec_id=? AND status='pending' AND id<>? AND (created_at<? OR (created_at=? AND id<?))", [r.tbl, r.rec_id, id, r.created_at, r.created_at, id])) { run('UPDATE review SET status=?, reviewed_at=?, updated_at=? WHERE id=?', ['approved', now(), now(), o.id]); } } } audit('review-approve', 'review', '', String(n)); return n; });
ipcMain.handle('review:remove', (e, ids) => { requireAdmin(); if (!Array.isArray(ids)) throw new Error('bad'); let n = 0; for (const id of ids.slice(0, 3000)) { safeId(id); const r = all(`SELECT r.id, ${REV_OLD} AS old FROM review r WHERE r.id=?`, [id])[0]; if (!r || !r.old) continue; run('INSERT OR REPLACE INTO tombstones(tbl,id,at) VALUES(?,?,?)', ['review', id, now()]); run('DELETE FROM review WHERE id=?', [id]); n++; } if (n) audit('review-remove-old', 'review', '', String(n)); return n; });
ipcMain.handle('review:prune', () => { requireAdmin(); const rows = all(`SELECT r.id FROM review r WHERE ${REV_OLD}`); let n = 0; for (const r of rows) { run('INSERT OR REPLACE INTO tombstones(tbl,id,at) VALUES(?,?,?)', ['review', r.id, now()]); run('DELETE FROM review WHERE id=?', [r.id]); n++; } if (n) audit('review-remove-old', 'review', '', String(n)); return n; });
ipcMain.handle('trash:count', () => { requireUnlocked(); if (!isAdmin()) return 0; return all("SELECT count(*) c FROM trash WHERE status='pending'")[0].c; });
ipcMain.handle('trash:list', () => {
  requireAdmin(); const out = [];
  for (const t of all('SELECT * FROM trash ORDER BY created_at DESC LIMIT 500')) {
    let snap = { rows: [] }; try { snap = JSON.parse(t.snapshot || '{}'); } catch { }
    const main = (snap.rows && snap.rows[0] && snap.rows[0].row) || {}; const det = {}; for (const [k, v] of Object.entries(main)) { if (['photo', 'file_id', 'file_name', 'updated_at', 'created_at', 'id'].includes(k)) continue; if (v === null || v === '') continue; det[k] = typeof v === 'string' ? v.slice(0, 120) : v; }
    out.push({ id: t.id, tbl: t.tbl, rec_id: t.rec_id, label: t.label, by_user: t.by_user, by_name: t.by_name, by_role: t.by_role, status: t.status, created_at: t.created_at, resolved_at: t.resolved_at, resolved_by: t.resolved_by, count: (snap.rows || []).length, detail: det, hasFiles: (() => { try { return JSON.parse(t.files || '[]').length > 0; } catch { return false; } })() });
  }
  return out;
});
ipcMain.handle('trash:confirm', (e, ids) => {
  requireAdmin(); requireSecPin(); if (!Array.isArray(ids)) throw new Error('bad'); let n = 0;
  for (const id of ids.slice(0, 500)) { safeId(id); const t = all('SELECT * FROM trash WHERE id=?', [id])[0]; if (!t || t.status !== 'pending') continue; try { for (const f of JSON.parse(t.files || '[]')) { try { fs.unlinkSync(filePathOf(f)); } catch { } } } catch { } run('UPDATE trash SET status=?, resolved_at=?, resolved_by=?, updated_at=? WHERE id=?', ['confirmed', now(), CUR.username, now(), id]); audit('trash-confirm', t.tbl, t.rec_id, t.label); n++; }
  return n;
});
ipcMain.handle('trash:restore', (e, id) => {
  requireAdmin(); requireSecPin(); safeId(id); const t = all('SELECT * FROM trash WHERE id=?', [id])[0]; if (!t) throw new Error('bad-id'); if (t.status === 'restored') throw new Error('already-restored');
  let snap; try { snap = JSON.parse(t.snapshot); } catch { throw new Error('bad-snapshot'); }
  const okTbl = x => COLS[x] && x !== 'users' && x !== 'trash' && x !== 'review';
  for (const { tbl, row } of snap.rows || []) { if (!okTbl(tbl) || !row) continue; if (tbl !== 'employees' && row.emp_id && !all('SELECT id FROM employees WHERE id=?', [row.emp_id]).length && !(snap.rows || []).some(x => x.tbl === 'employees' && x.row.id === row.emp_id)) throw new Error('parent-missing'); }
  for (const { tbl, row } of snap.rows || []) { if (!okTbl(tbl) || !row) continue; safeId(row.id); const o = {}; for (const k of Object.keys(row)) if (COLS[tbl].includes(k)) o[k] = row[k]; if (COLS[tbl].includes('updated_at')) o.updated_at = now(); const ks = Object.keys(o); run(`INSERT OR REPLACE INTO ${tbl}(${ks.join(',')}) VALUES(${ks.map(() => '?').join(',')})`, ks.map(k => o[k])); run('DELETE FROM tombstones WHERE tbl=? AND id=?', [tbl, o.id]); }
  for (const f of snap.fixes || []) { if (okTbl(f.tbl) && f.col === 'emp_id') { safeId(f.id); safeId(f.val); run(`UPDATE ${f.tbl} SET emp_id=?, updated_at=? WHERE id=?`, [f.val, now(), f.id]); } }
  run('UPDATE trash SET status=?, resolved_at=?, resolved_by=?, updated_at=? WHERE id=?', ['restored', now(), CUR.username, now(), id]); audit('trash-restore', t.tbl, t.rec_id, t.label); return true;
});

/* ==================== 5.7.0: واجهة API محلية للقراءة فقط (نسخة المدير) ====================
   http://127.0.0.1:8788/api/today — هيدر X-Api-Key — تعمل فقط والمدير مسجَّل دخوله، وتتوقف عند القفل/الإغلاق.
   لا تُرجع أي راتب أو آيبان أو هاتف أو إيميل: الاسم والوظيفة وحالة اليوم فقط. كل طلب يُسجَّل في سجل العمليات. */
const LOCALAPI = {
  port: 8788, srv: null,
  key() { const p = readJSON(PREFS_FILE, {}) || {}; if (typeof p.apiKey === 'string' && p.apiKey.length >= 32) return p.apiKey; return this.regen(false); },
  regen(log = true) { const k = 'hrp_' + crypto.randomBytes(24).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 40); const p = readJSON(PREFS_FILE, {}) || {}; writeJSON(PREFS_FILE, { ...p, apiKey: k }); if (log) { try { audit('api-key-regen', 'api', '', ''); } catch { } } return k; },
  running() { return !!this.srv; },
  settingOf(k, d) { try { const r = all('SELECT value FROM settings WHERE key=?', [k])[0]; return r ? JSON.parse(r.value) : d; } catch { return d; } },
  today() {
    const today = new Date(); const d = today.toISOString().slice(0, 10); const dow = today.getDay();
    const workStart = String(this.settingOf('workStart', '09:00') || '09:00'); const grace = Math.max(0, +this.settingOf('lateGrace', 0) || 0);
    const limit = (() => { const [h, m] = workStart.split(':').map(x => +x || 0); return h * 60 + m + grace; })();
    const emps = all("SELECT id, name, job FROM employees WHERE status='active' ORDER BY name");
    const att = new Map(all('SELECT emp_id, status, check_in FROM attendance WHERE date=?', [d]).map(r => [r.emp_id, r]));
    const onLeave = new Set(all('SELECT emp_id FROM leaves WHERE start_date<=? AND end_date>=?', [d, d]).map(r => r.emp_id));
    const toMin = t => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
    const staff = emps.map(e => {
      const a = att.get(e.id); let status = 'absent';
      if (a && ['present', 'field', 'mission'].includes(a.status)) { const ci = toMin(a.check_in); status = (ci !== null && ci > limit) ? 'late' : 'present'; }
      else if ((a && ['leave', 'sick', 'off'].includes(a.status)) || onLeave.has(e.id)) status = 'leave';
      else if (a && a.status === 'absent') status = 'absent';
      return { name: e.name, role: e.job || '', status };
    });
    const cnt = k => staff.filter(x => x.status === k).length;
    const leaveRequests = all("SELECT a.kind, a.installments, e.name FROM advances a JOIN employees e ON e.id=a.emp_id WHERE a.status='pending' ORDER BY a.request_date").map(r => ({ name: r.name, type: r.kind === 'custody' ? 'عهدة' : 'سلفة', days: +r.installments || 0 }));
    let payrollInDays = null; const days = all("SELECT pay_day FROM employees WHERE status='active' AND pay_day IS NOT NULL").map(r => +r.pay_day).filter(n => n >= 1 && n <= 31);
    if (days.length) { const dd = today.getDate(); let best = null; for (const pd of new Set(days)) { let diff = pd - dd; if (diff < 0) { const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(); diff = dim - dd + pd; } if (best === null || diff < best) best = diff; } payrollInDays = best; }
    return { employees: emps.length, present: cnt('present'), late: cnt('late'), absent: cnt('absent'), leaveRequests, payrollInDays, staff };
  },
  start() {
    if (this.srv || !isAdmin()) return; const key = this.key(); const self = this;
    const srv = http.createServer((req, res) => {
      const ip = req.socket.remoteAddress || '';
      const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(body || ''); };
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        if (!(req.method === 'GET' && u.pathname === '/api/today')) { audit('api-request', 'api', u.pathname, 'denied 404 ' + ip); return send(404, ''); }
        if (!isAdmin() || !db) { audit('api-request', 'api', u.pathname, 'denied locked ' + ip); return send(403, ''); }
        const given = String(req.headers['x-api-key'] || ''); const cur = self.key();
        const ok = given.length === cur.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(cur));
        if (!ok) { audit('api-request', 'api', u.pathname, 'denied 403 ' + ip); return send(403, ''); }
        const data = self.today(); audit('api-request', 'api', u.pathname, 'ok ' + ip + ' staff=' + data.staff.length); return send(200, JSON.stringify(data));
      } catch (e) { try { audit('api-request', 'api', req.url, 'error'); } catch { } return send(500, ''); }
    });
    srv.on('error', e => { console.error('local api error', e.message); self.srv = null; });
    srv.listen(this.port, '127.0.0.1', () => { try { audit('api-start', 'api', '', '127.0.0.1:' + self.port); } catch { } notifyRenderer('api:state', self.status()); });
    this.srv = srv;
  },
  stop() { if (!this.srv) return; try { this.srv.close(); } catch { } this.srv = null; try { if (db) audit('api-stop', 'api', '', ''); } catch { } notifyRenderer('api:state', this.status()); },
  status() { return { running: this.running(), url: 'http://127.0.0.1:' + this.port + '/api/today', port: this.port, workStart: db ? this.settingOf('workStart', '09:00') : '09:00', lateGrace: db ? (+this.settingOf('lateGrace', 0) || 0) : 0 }; }
};
ipcMain.handle('api:status', () => { requireAdmin(); return LOCALAPI.status(); });
ipcMain.handle('api:key', () => { requireAdmin(); requireSecPin(); return LOCALAPI.key(); });
ipcMain.handle('api:regen', () => { requireAdmin(); requireSecPin(); return LOCALAPI.regen(true); });
ipcMain.handle('api:preview', () => { requireAdmin(); return LOCALAPI.today(); });
app.on('before-quit', () => { try { LOCALAPI.stop(); } catch { } });
ipcMain.handle('db:upsert', (e, table, obj) => {
  requireUnlocked(); requireLicense(); const cols = COLS[table]; if (!cols || !obj || typeof obj !== 'object') throw new Error('bad-table'); requireTable(table);
  safeId(obj.id); if (obj.emp_id !== undefined && obj.emp_id !== null) safeId(obj.emp_id); if (obj.project_id) safeId(obj.project_id); VALID[table](obj);
  const exists = all(`SELECT id FROM ${table} WHERE id=?`, [obj.id]).length > 0;
  const prev = exists ? all(`SELECT * FROM ${table} WHERE id=?`, [obj.id])[0] : null;
  checkPeriod(table, obj.date, prev && prev.date);
  if (table === 'advances' && ((prev ? prev.status : 'pending') !== obj.status) && ['approved', 'rejected', 'disbursed'].includes(obj.status)) requirePinFor();
  segregation(table, obj, prev);
  if (table === 'treasury' && obj.direction === 'out' && !obj.ref_type) requirePinFor();
  if (table === 'expenses' && obj.status === 'approved' && (!prev || prev.status !== 'approved')) { const thr = (() => { try { return JSON.parse((all('SELECT value FROM settings WHERE key=?', ['expensePinAbove'])[0] || {}).value || '1000'); } catch { return 1000; } })(); if (+obj.amount > +thr) requirePinFor(); }
  if (!exists && !obj.vno) { const nv = nextVno(table, obj); if (nv) obj.vno = nv; }
  const o = {}; for (const k of Object.keys(obj)) if (cols.includes(k) && !(exists && k === 'created_at')) { const v = obj[k]; o[k] = (v === undefined) ? null : (typeof v === 'string' ? v.slice(0, 5000) : v); }
  if (cols.includes('updated_at')) o.updated_at = now(); if (!exists && cols.includes('created_at')) o.created_at = now();
  const keys = Object.keys(o);
  if (exists) run(`UPDATE ${table} SET ${keys.filter(k => k !== 'id').map(k => k + '=?').join(',')} WHERE id=?`, [...keys.filter(k => k !== 'id').map(k => o[k]), o.id]);
  else run(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`, keys.map(k => o[k]));
  audit(exists ? 'update' : 'create', table, obj.id, obj.name || obj.type || obj.month || (obj.amount !== undefined ? (obj.status || obj.category || obj.direction || '') + ' ' + obj.amount : '') || obj.status || '');
  const saved = all(`SELECT * FROM ${table} WHERE id=?`, [obj.id])[0];
  if (!isAdmin()) reviewLog(exists ? 'edit' : 'add', table, saved, prev, obj.__flag);
  return saved;
});
ipcMain.handle('db:delete', (e, table, id) => {
  requireUnlocked(); requireLicense(); if (!COLS[table]) throw new Error('bad-table'); requireTable(table); safeId(id); requireDelAuth();
  const FILES = []; const dropFile = f => { if (f && /^[A-Za-z0-9_-]{4,64}$/.test(String(f))) FILES.push(String(f)); };
  const row0 = all(`SELECT * FROM ${table} WHERE id=?`, [id])[0]; const snap = { rows: row0 ? [{ tbl: table, row: row0 }] : [], fixes: [] };
  if (table === 'employees') {
    const open = all("SELECT count(*) c FROM advances WHERE emp_id=? AND status IN ('pending','approved','disbursed')", [id])[0].c; if (open > 0) throw new Error('has-open-advances');
    for (const d of all('SELECT file_id FROM documents WHERE emp_id=?', [id])) if (d.file_id) dropFile(d.file_id)
    for (const d of all('SELECT voucher_file_id f FROM advances WHERE emp_id=?', [id])) if (d.f) dropFile(d.f)
    for (const d of all('SELECT file_id FROM expenses WHERE emp_id=?', [id])) if (d.file_id) dropFile(d.file_id)
    for (const t of ['documents', 'payments', 'leaves', 'notes', 'attendance', 'advances', 'expenses', 'assets', 'promotions', 'clearances']) { for (const r of all(`SELECT * FROM ${t} WHERE emp_id=?`, [id])) { snap.rows.push({ tbl: t, row: r }); } for (const r of all(`SELECT id FROM ${t} WHERE emp_id=?`, [id])) run('INSERT OR REPLACE INTO tombstones(tbl,id,at) VALUES(?,?,?)', [t, r.id, now()]); run(`DELETE FROM ${t} WHERE emp_id=?`, [id]); }
    for (const t of ['treasury', 'offers']) for (const r of all(`SELECT id FROM ${t} WHERE emp_id=?`, [id])) snap.fixes.push({ tbl: t, id: r.id, col: 'emp_id', val: id });
    run('UPDATE treasury SET emp_id=NULL WHERE emp_id=?', [id]); run('UPDATE offers SET emp_id=NULL WHERE emp_id=?', [id]);
  }
  if (table === 'treasury') requirePinFor();
  if (LOCKED_TABLES.includes(table)) { const r = all(`SELECT date FROM ${table} WHERE id=?`, [id])[0]; if (r) checkPeriod(table, r.date); }
  if (table === 'advances') { const a = all('SELECT status, kind, voucher_file_id FROM advances WHERE id=?', [id])[0]; if (a && !['pending', 'rejected'].includes(a.status)) { if (a.kind !== 'custody') throw new Error('advance-not-deletable'); requirePinFor(); if (all('SELECT id FROM expenses WHERE custody_id=?', [id]).length) throw new Error('custody-has-settlements'); } if (a && a.voucher_file_id) dropFile(a.voucher_file_id) }
  if (table === 'closings') requirePinFor();
  if (table === 'documents' || table === 'treasury' || table === 'expenses' || table === 'taxdocs' || table === 'extdocs') { const d = all(`SELECT file_id FROM ${table} WHERE id=?`, [id])[0]; if (d && d.file_id) dropFile(d.file_id) }
  if (table === 'advances') { const d = all('SELECT voucher_file_id FROM advances WHERE id=?', [id])[0]; if (d && d.voucher_file_id) dropFile(d.voucher_file_id) }
  run('INSERT OR REPLACE INTO tombstones(tbl,id,at) VALUES(?,?,?)', [table, id, now()]); run(`DELETE FROM ${table} WHERE id=?`, [id]); const adm = isAdmin(); const lbl = trashLabel(table, row0);
  if (row0) { run('INSERT INTO trash(id,tbl,rec_id,label,snapshot,files,by_user,by_name,by_role,status,resolved_at,resolved_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [crypto.randomBytes(8).toString('hex'), table, id, lbl, JSON.stringify(snap), JSON.stringify(FILES), CUR.username, CUR.name, CUR.role, adm ? 'confirmed' : 'pending', adm ? now() : null, adm ? CUR.username : null, now(), now()]); }
  if (adm) for (const f of FILES) { try { fs.unlinkSync(filePathOf(f)); } catch { } }
  audit('delete', table, id, (lbl + ' | بواسطة ' + (CUR.name || CUR.username)).slice(0, 280)); return true;
});
const LIST_KEYS = ['departments', 'trades', 'docTypes', 'companyDocTypes', 'leaveTypes', 'expenseCategories', 'treasuryInCats', 'treasuryOutCats', 'custodySections']; // قوائم يجوز لأي مستخدم إضافة بند لها (مرونة الإدخال)
ipcMain.handle('db:setSetting', (e, key, value) => { requireUnlocked(); if (String(key) === 'booksLockedUntil') throw new Error('use-books-lock'); if (!isAdmin() && !setUnlocked() && !/^ui_/.test(String(key)) && !LIST_KEYS.includes(String(key))) throw new Error('admin-only'); if (!/^[a-zA-Z_]{1,40}$/.test(String(key))) throw new Error('bad-key'); const s = JSON.stringify(value); if (s.length > 2_000_000) throw new Error('too-big'); run('INSERT OR REPLACE INTO settings(key,value,updated_at) VALUES(?,?,?)', [key, s, now()]); return true; });
ipcMain.handle('db:audit', (e, limit) => { requireUnlocked(); return all('SELECT * FROM audit ORDER BY id DESC LIMIT ?', [Math.min(1000, +limit || 200)]); });
ipcMain.handle('db:wipe', () => { requireAdmin(); requireSecPin(); const ndb = new SQL.Database(); ndb.run(SCHEMA); db.close(); db = ndb; loadCols(); for (const f of fs.readdirSync(FILES_DIR)) if (f.endsWith('.enc')) fs.unlinkSync(path.join(FILES_DIR, f)); audit('wipe', 'app', '', ''); persist(); return true; });

/* ---------- attachments (encrypted) ---------- */
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf' };
ipcMain.handle('file:save', (e, id, name, mime, arrayBuffer) => { requireUnlocked(); if (!Object.values(MIME).includes(mime)) throw new Error('bad-mime'); const data = Buffer.from(arrayBuffer); if (data.length > 15 * 1024 * 1024) throw new Error('too-big'); const payload = Buffer.concat([Buffer.from(JSON.stringify({ name: String(name).slice(0, 200), mime }) + '\n'), data]); atomicWrite(filePathOf(id), encrypt(payload)); return true; });
ipcMain.handle('file:get', (e, id) => { requireUnlocked(); const p = filePathOf(id); if (!fs.existsSync(p)) return null; const buf = decrypt(fs.readFileSync(p)); const nl = buf.indexOf(10); const head = JSON.parse(buf.subarray(0, nl).toString()); return { ...head, data: buf.subarray(nl + 1).toString('base64') }; });
ipcMain.handle('file:delete', (e, id) => { requireUnlocked(); try { fs.unlinkSync(filePathOf(id)); } catch { } return true; });
ipcMain.handle('file:pick', async (e, imagesOnly) => { const exts = imagesOnly ? ['png', 'jpg', 'jpeg'] : ['png', 'jpg', 'jpeg', 'webp', 'pdf']; const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: imagesOnly ? 'صورة' : 'صور و PDF', extensions: exts }] }); if (r.canceled) return null; const p = r.filePaths[0]; const ext = path.extname(p).slice(1).toLowerCase(); if (!exts.includes(ext)) throw new Error('bad-ext'); const size = fs.statSync(p).size; if (size > 15 * 1024 * 1024) throw new Error('too-big'); return { name: path.basename(p), mime: MIME[ext], data: fs.readFileSync(p).toString('base64'), size }; });
ipcMain.handle('file:pickSheet', async () => { requireUnlocked(); const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Excel / CSV', extensions: ['xlsx', 'csv', 'txt'] }] }); if (r.canceled) return null; const p = r.filePaths[0]; if (fs.statSync(p).size > 20 * 1024 * 1024) throw new Error('too-big'); const ext = path.extname(p).slice(1).toLowerCase(); if (ext === 'xlsx') return { name: path.basename(p), ext, b64: fs.readFileSync(p).toString('base64') }; return { name: path.basename(p), ext, text: fs.readFileSync(p, 'utf8') }; });
ipcMain.handle('file:pickText', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }] }); if (r.canceled) return null; const p = r.filePaths[0]; if (fs.statSync(p).size > 20 * 1024 * 1024) throw new Error('too-big'); return { name: path.basename(p), text: fs.readFileSync(p, 'utf8') }; });

/* ---------- backup / restore (binary container v3) ---------- */
const prefs = () => { const p = readJSON(PREFS_FILE, {}); return { extraBackupDir: typeof p.extraBackupDir === 'string' ? p.extraBackupDir : '', keep: Math.max(1, Math.min(365, +p.keep || 30)), autostart: !!p.autostart, syncUrl: typeof p.syncUrl === 'string' ? p.syncUrl : '', syncToken: typeof p.syncToken === 'string' ? p.syncToken : '', syncEnabled: !!p.syncEnabled }; };
ipcMain.handle('prefs:get', () => prefs());
ipcMain.handle('prefs:set', (e, p) => { requireAdmin(); if (!p || typeof p !== 'object') throw new Error('bad'); const cur = prefs(); const next = { ...cur }; if ('extraBackupDir' in p) { const d = typeof p.extraBackupDir === 'string' ? p.extraBackupDir : ''; if (d && !(path.isAbsolute(d) && fs.existsSync(d))) throw new Error('bad-dir'); next.extraBackupDir = d; } if ('keep' in p) next.keep = Math.max(1, Math.min(365, +p.keep || 30)); if ('autostart' in p) { next.autostart = !!p.autostart; if (process.platform === 'win32') app.setLoginItemSettings({ openAtLogin: next.autostart }); } writeJSON(PREFS_FILE, next); return next; });
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }
function makeBackupBuffer() {
  requireUnlocked(); if (dirty) persist();
  const dbBytes = Buffer.from(db.export());
  const files = []; const chunks = [];
  for (const f of fs.readdirSync(FILES_DIR)) { if (!f.endsWith('.enc') || !ID_RE.test(f.slice(0, -4))) continue; const b = fs.readFileSync(path.join(FILES_DIR, f)); files.push({ id: f.slice(0, -4), len: b.length }); chunks.push(b); }
  const hdr = Buffer.from(JSON.stringify({ app: 'hr_platform', version: 3, at: now(), dbLen: dbBytes.length, files }));
  const plain = Buffer.concat([u32(hdr.length), hdr, dbBytes, ...chunks]); // attachments stay in their encrypted form
  const m = meta(); const outer = Buffer.from(JSON.stringify({ salt: m.salt, kdf: m.kdf || KDF, wrap: m.wrap })); // lets a backup be restored on another machine with the password
  return Buffer.concat([Buffer.from('HRB3'), u32(outer.length), outer, encrypt(plain)]);
}
function backupName() { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `HR-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.hrbak`; }
function pruneBackups(dir, keep) { try { const fl = fs.readdirSync(dir).filter(f => /^HR-backup-.*\.hrbak$/.test(f)).sort(); while (fl.length > keep) fs.unlinkSync(path.join(dir, fl.shift())); } catch { } }
function doBackup(targetFile) {
  const buf = makeBackupBuffer(); const name = backupName(); const written = [], errors = [];
  const p = prefs(); const targets = targetFile ? [targetFile] : [path.join(BACKUP_DIR, name), ...(p.extraBackupDir ? [path.join(p.extraBackupDir, name)] : [])];
  for (const t of targets) { try { fs.mkdirSync(path.dirname(t), { recursive: true }); atomicWrite(t, buf); written.push(t); if (!targetFile) pruneBackups(path.dirname(t), p.keep); } catch (err) { errors.push(path.dirname(t) + ': ' + err.message); } }
  if (written.length) { run('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)', ['lastBackup', JSON.stringify(now())]); audit('backup', 'app', '', written.join(' | ')); }
  return { written, errors };
}
ipcMain.handle('backup:now', () => { requireAdmin(); return doBackup(); });
/* ---------- زر الطوارئ + حفظ تقدم الموظف (مسودات مشفّرة محلياً، غير مزامَنة) ---------- */
const DRAFT_FILE = path.join(DATA_DIR, 'drafts.bin');
function draftsLoad() { requireUnlocked(); try { if (!fs.existsSync(DRAFT_FILE)) return {}; return JSON.parse(decrypt(fs.readFileSync(DRAFT_FILE)).toString('utf8')) || {}; } catch { return {}; } }
function draftsSave(all) { const cut = Date.now() - 14 * 86400000; for (const u of Object.keys(all)) { for (const k of Object.keys(all[u])) if (!all[u][k] || all[u][k].at < cut) delete all[u][k]; const ks = Object.keys(all[u]).sort((a, b) => all[u][b].at - all[u][a].at); ks.slice(60).forEach(k => delete all[u][k]); if (!Object.keys(all[u]).length) delete all[u]; } atomicWrite(DRAFT_FILE, encrypt(Buffer.from(JSON.stringify(all), 'utf8'))); }
const draftUser = () => String((CUR && CUR.id) || 'admin');
ipcMain.handle('draft:get', (e, key) => { if (!DEK || !db) return null; const d = (draftsLoad()[draftUser()] || {})[String(key).slice(0, 200)]; return d || null; });
ipcMain.handle('draft:set', (e, key, fields, title) => { if (!DEK || !db) return { ok: false, why: 'locked' }; key = String(key).slice(0, 200); const txt = JSON.stringify(fields || {}); if (txt.length > 200000) return { ok: false, why: 'too-big' }; const all = draftsLoad(); const u = draftUser(); all[u] = all[u] || {}; all[u][key] = { fields: fields || {}, at: Date.now(), title: String(title || '').slice(0, 120) }; draftsSave(all); return { ok: true, at: all[u][key].at }; });
ipcMain.handle('draft:del', (e, key) => { if (!DEK || !db) return { ok: false }; const all = draftsLoad(); const u = draftUser(); if (all[u]) { delete all[u][String(key).slice(0, 200)]; draftsSave(all); } return { ok: true }; });
ipcMain.handle('draft:list', () => { if (!DEK || !db) return []; const m = draftsLoad()[draftUser()] || {}; return Object.entries(m).map(([key, v]) => ({ key, title: v.title || '', at: v.at })).sort((a, b) => b.at - a.at); });
ipcMain.handle('backup:emergency', () => { requireUnlocked(); try { if (dirty) persist(); } catch { } const r = doBackup(); audit('emergency-backup', 'app', '', (CUR && CUR.username) || ''); return { ok: r.written.length > 0, written: r.written.length, errors: r.errors, at: Date.now() }; });

ipcMain.handle('backup:saveAs', async () => { requireAdmin(); const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), backupName()), filters: [{ name: 'نسخة احتياطية', extensions: ['hrbak'] }] }); if (r.canceled) return null; return doBackup(r.filePath); });
ipcMain.handle('backup:list', () => { requireAdmin(); try { return fs.readdirSync(BACKUP_DIR).filter(f => /^HR-backup-.*\.hrbak$/.test(f)).sort().reverse().map(f => ({ name: f, size: fs.statSync(path.join(BACKUP_DIR, f)).size })); } catch { return []; } });
ipcMain.handle('backup:openFolder', () => shell.openPath(BACKUP_DIR));
ipcMain.handle('backup:chooseDir', async () => { requireAdmin(); const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] }); return r.canceled ? null : r.filePaths[0]; });
function parseBackup(buf, password) {
  if (buf.subarray(0, 4).toString() === 'HRB3') {
    const ol = buf.readUInt32LE(4); const outer = JSON.parse(buf.subarray(8, 8 + ol).toString()); const body = buf.subarray(8 + ol);
    let key = DEK; let plain = null;
    try { plain = decrypt(body, key); } catch { if (!password) return { needPassword: true }; key = unlockWith(password, outer); if (!key) return { error: 'كلمة المرور غير صحيحة لهذه النسخة' }; try { plain = decrypt(body, key); } catch { return { error: 'الملف تالف' }; } }
    const hl = plain.readUInt32LE(0); const hdr = JSON.parse(plain.subarray(4, 4 + hl).toString()); if (hdr.app !== 'hr_platform') return { error: 'ملف غير صالح' };
    let off = 4 + hl; const dbBytes = plain.subarray(off, off + hdr.dbLen); off += hdr.dbLen;
    const files = []; for (const f of hdr.files) { if (!ID_RE.test(f.id)) continue; let enc = plain.subarray(off, off + f.len); off += f.len; if (!key.equals(DEK)) enc = encrypt(decrypt(enc, key)); files.push({ id: f.id, enc }); }
    return { hdr, dbBytes, files };
  }
  // legacy v2 (JSON, encrypted with the old key = KEK)
  let key = DEK; let payload;
  try { payload = JSON.parse(decrypt(buf, key).toString()); } catch { if (!password) return { needPassword: true }; const m = meta(); key = deriveKEK(password, Buffer.from(m.salt, 'hex'), { N: 16384, r: 8, p: 1 }); try { payload = JSON.parse(decrypt(buf, key).toString()); } catch { return { error: 'كلمة المرور غير صحيحة أو الملف تالف' }; } }
  if (payload.app !== 'hr_platform') return { error: 'ملف غير صالح' };
  const files = []; for (const [id, b64] of Object.entries(payload.files || {})) if (ID_RE.test(id)) files.push({ id, enc: encrypt(Buffer.from(b64, 'base64')) });
  return { hdr: { at: payload.at || payload.exportedAt }, dbBytes: Buffer.from(payload.db, 'base64'), files };
}
ipcMain.handle('backup:restore', async (e, name, password) => {
  requireAdmin(); let filePath;
  if (name) { if (!/^HR-backup-[\w-]+\.hrbak$/.test(name)) throw new Error('bad-name'); filePath = path.join(BACKUP_DIR, name); }
  else { const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'نسخة احتياطية', extensions: ['hrbak'] }] }); if (r.canceled) return { ok: false, msg: 'cancel' }; filePath = r.filePaths[0]; }
  let parsed; try { parsed = parseBackup(fs.readFileSync(filePath), password); } catch (err) { return { ok: false, msg: 'الملف تالف أو غير صالح' }; }
  if (parsed.needPassword) return { ok: false, needPassword: true }; if (parsed.error) return { ok: false, msg: parsed.error };
  let ndb; try { ndb = new SQL.Database(parsed.dbBytes); ndb.run(SCHEMA); migrate(ndb); ndb.exec('SELECT count(*) FROM employees'); } catch { return { ok: false, msg: 'قاعدة البيانات داخل النسخة تالفة' }; }
  const safety = doBackup(); if (!safety.written.some(w => w.startsWith(BACKUP_DIR))) return { ok: false, msg: 'تعذر أخذ نسخة أمان قبل الاستعادة: ' + safety.errors.join('; ') };
  // stage files first, then swap
  const staging = path.join(DATA_DIR, 'files.restore'); fs.rmSync(staging, { recursive: true, force: true }); fs.mkdirSync(staging);
  for (const f of parsed.files) fs.writeFileSync(path.join(staging, f.id + '.enc'), f.enc);
  const old = path.join(DATA_DIR, 'files.old'); fs.rmSync(old, { recursive: true, force: true }); fs.renameSync(FILES_DIR, old); fs.renameSync(staging, FILES_DIR); fs.rmSync(old, { recursive: true, force: true });
  db.close(); db = ndb; loadCols(); audit('restore', 'app', '', path.basename(filePath)); persist(); return { ok: true, at: parsed.hdr.at };
});
// استرجاع عروض العمل المحذوفة من نسخة احتياطية دون المساس بأي بيانات أخرى
ipcMain.handle('offers:fromBackup', (e, name, password) => {
  requireAdmin();
  if (!/^HR-backup-[\w-]+\.hrbak$/.test(String(name || ''))) throw new Error('bad-name');
  const filePath = path.join(BACKUP_DIR, name);
  let parsed; try { parsed = parseBackup(fs.readFileSync(filePath), password); } catch { return { ok: false, msg: 'الملف تالف أو غير صالح' }; }
  if (parsed.needPassword) return { ok: false, needPassword: true }; if (parsed.error) return { ok: false, msg: parsed.error };
  let bdb; try { bdb = new SQL.Database(parsed.dbBytes); bdb.run(SCHEMA); migrate(bdb); } catch { return { ok: false, msg: 'قاعدة البيانات داخل النسخة تالفة' }; }
  const rowsOf = (d, sql) => { const st = d.prepare(sql); const out = []; while (st.step()) out.push(st.getAsObject()); st.free(); return out; };
  let bak; try { bak = rowsOf(bdb, 'SELECT * FROM offers'); } catch { bak = []; }
  const have = new Set(all('SELECT id FROM offers').map(r => r.id));
  const cols = COLS['offers']; let restored = 0; const names = [];
  for (const row of bak) {
    if (!row.id || have.has(row.id)) continue;
    const obj = {}; for (const c of cols) if (row[c] !== undefined) obj[c] = row[c];
    if (obj.updated_at === undefined) obj.updated_at = now();
    const keys = Object.keys(obj);
    run(`INSERT OR IGNORE INTO offers(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`, keys.map(k => obj[k]));
    run('DELETE FROM tombstones WHERE tbl=? AND id=?', ['offers', row.id]);
    restored++; names.push(row.name || row.candidate || row.id);
  }
  bdb.close();
  if (restored) { persist(); audit('offers-recover', 'offers', '', restored + ' من ' + name); if (SYNC.enabled()) { SYNC.pushWanted = true; SYNC.schedule(300); } }
  return { ok: true, restored, names, totalInBackup: bak.length };
});
ipcMain.handle('backup:exportPlain', async () => { requireAdmin();
  requireUnlocked(); const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), 'HR-export.json'), filters: [{ name: 'JSON', extensions: ['json'] }] }); if (r.canceled) return null;
  const data = {}; for (const t of [...TABLES, 'settings']) data[t] = all(`SELECT * FROM ${t}`);
  atomicWrite(r.filePath, Buffer.from(JSON.stringify(data, null, 2))); audit('export-plain', 'app', '', r.filePath); return r.filePath;
});

/* ---------- export / print / misc ---------- */
const safeName = n => String(n).replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').slice(0, 120);
ipcMain.handle('export:csv', async (e, name, csv) => { const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), safeName(name)), filters: [{ name: 'CSV (Excel)', extensions: ['csv'] }] }); if (r.canceled) return null; atomicWrite(r.filePath, Buffer.from('﻿' + String(csv), 'utf8')); return r.filePath; });
async function loadHtmlWindow(html) {
  const tmp = path.join(app.getPath('temp'), 'hrp-print-' + crypto.randomBytes(6).toString('hex') + '.html'); fs.writeFileSync(tmp, String(html), 'utf8');
  const w = new BrowserWindow({ show: false, width: 900, height: 1200, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: true, webSecurity: true } });
  w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  w.webContents.on('will-navigate', ev => ev.preventDefault());
  try { await w.loadFile(tmp); const n = await w.webContents.executeJavaScript('(function(){try{return window.paginate?window.paginate():1}catch(e){return -1}})()', true).catch(() => -1); if (n === -1) { await w.webContents.executeJavaScript('(function(){var s=document.getElementById("src");if(s){s.style.position="static";s.style.width="auto";}})()', true).catch(() => { }); } await new Promise(r => setTimeout(r, 250)); } finally { try { fs.unlinkSync(tmp); } catch { } }
  return w;
}
ipcMain.handle('print:pdf', async (e, html, name, opts) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), safeName(name)), filters: [{ name: 'PDF', extensions: ['pdf'] }] }); if (r.canceled) return null;
  const w = await loadHtmlWindow(html); try { const pdf = await w.webContents.printToPDF(opts && opts.css ? { printBackground: true, preferCSSPageSize: true } : { printBackground: true, pageSize: 'A4' }); atomicWrite(r.filePath, pdf); } finally { w.destroy(); } return r.filePath;
});
ipcMain.handle('print:html', async (e, html) => { const w = await loadHtmlWindow(html); await new Promise(res => w.webContents.print({ printBackground: true }, () => { w.destroy(); res(); })); return true; });
ipcMain.handle('notify', (e, title, body) => { if (Notification.isSupported()) { const n = new Notification({ title: String(title).slice(0, 100), body: String(body).slice(0, 400) }); n.on('click', () => { win && win.show(); }); n.show(); } return true; });
/* ---------- التحديث التلقائي (GitHub Releases) ---------- */
let UPD = { state: 'idle' };
function sendUpd() { try { win && win.webContents.send('upd:state', UPD); } catch { } }
function setupUpdater() {
  if (!app.isPackaged || process.platform === 'linux' && !process.env.APPIMAGE) return;
  let autoUpdater; try { ({ autoUpdater } = require('electron-updater')); } catch { return; }
  autoUpdater.autoDownload = true; autoUpdater.autoInstallOnAppQuit = true; autoUpdater.allowPrerelease = false; // تحديث تلقائي صامت: ينزّل لوحده ويثبّت عند إغلاق البرنامج
  autoUpdater.logger = null;
  autoUpdater.on('checking-for-update', () => { UPD = { state: 'checking' }; sendUpd(); });
  autoUpdater.on('update-available', i => { UPD = { state: 'available', version: i.version, notes: typeof i.releaseNotes === 'string' ? i.releaseNotes.slice(0, 2000) : '' }; sendUpd(); });
  autoUpdater.on('update-not-available', () => { UPD = { state: 'latest', version: app.getVersion() }; sendUpd(); });
  autoUpdater.on('download-progress', p => { UPD = { state: 'downloading', percent: Math.round(p.percent) }; sendUpd(); });
  autoUpdater.on('update-downloaded', i => { UPD = { state: 'ready', version: i.version }; sendUpd(); });
  autoUpdater.on('error', err => { UPD = { state: 'error', message: String(err && err.message || err).slice(0, 200) }; sendUpd(); });
  ipcMain.handle('upd:check', async () => { try { await autoUpdater.checkForUpdates(); } catch (e) { UPD = { state: 'error', message: String(e.message || e).slice(0, 200) }; } return UPD; });
  ipcMain.handle('upd:download', async () => { try { await autoUpdater.downloadUpdate(); } catch (e) { UPD = { state: 'error', message: String(e.message || e).slice(0, 200) }; } return UPD; });
  ipcMain.handle('upd:install', () => { if (dirty) persist(); setTimeout(() => autoUpdater.quitAndInstall(false, true), 300); return true; });
  setTimeout(() => { autoUpdater.checkForUpdates().catch(() => { }); }, 8000);
  setInterval(() => { autoUpdater.checkForUpdates().catch(() => { }); }, 3 * 60 * 60 * 1000); // فحص كل 3 ساعات للأجهزة التي تبقى مفتوحة طويلاً
}
ipcMain.handle('upd:state', () => UPD);
ipcMain.handle('app:info', () => ({ version: app.getVersion(), dataDir: DATA_DIR, backupDir: BACKUP_DIR, platform: process.platform, host: os.hostname(), machine: machineId() }));

/* ---------- نقل مجلد البيانات (بعيداً عن OneDrive) ---------- */
function copyDirSync(src, dst) { fs.mkdirSync(dst, { recursive: true }); for (const e of fs.readdirSync(src, { withFileTypes: true })) { if (['files.old', 'files.restore', 'error.log'].includes(e.name)) continue; const s = path.join(src, e.name), d = path.join(dst, e.name); if (e.isDirectory()) copyDirSync(s, d); else fs.copyFileSync(s, d); } }
ipcMain.handle('data:location', () => { requireAdmin(); return ({ dir: DATA_DIR, legacy: LEGACY_DATA_DIR, onedrive: /onedrive/i.test(DATA_DIR), custom: path.resolve(DATA_DIR) !== path.resolve(LEGACY_DATA_DIR) }); });
ipcMain.handle('data:chooseAndMove', async () => {
  requireAdmin();
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'], title: 'اختر مكاناً جديداً لحفظ البيانات (يُفضّل قرص C خارج OneDrive)' });
  if (r.canceled || !r.filePaths[0]) return { ok: false, why: 'canceled' };
  let target = r.filePaths[0];
  if (path.basename(target).toLowerCase() !== 'hr-platform-data') target = path.join(target, 'HR-Platform-Data');
  if (path.resolve(target) === path.resolve(DATA_DIR)) return { ok: false, why: 'same' };
  if (/onedrive/i.test(target)) return { ok: false, why: 'onedrive' };
  try { if (fs.existsSync(path.join(target, 'meta.json'))) return { ok: false, why: 'exists' }; } catch { }
  try { if (dirty) persist(); } catch { }
  try { copyDirSync(DATA_DIR, target); } catch (e) { return { ok: false, why: 'copy', msg: String(e.message || e).slice(0, 200) }; }
  // تحقّق أن الملفات الأساسية نُسخت فعلاً قبل تثبيت المكان الجديد
  try { if (fs.existsSync(META_FILE) && !fs.existsSync(path.join(target, 'meta.json'))) return { ok: false, why: 'verify' }; if (fs.existsSync(DB_FILE) && !fs.existsSync(path.join(target, 'hr.db.enc'))) return { ok: false, why: 'verify' }; } catch (e) { return { ok: false, why: 'verify', msg: String(e.message || e).slice(0, 200) }; }
  try { fs.mkdirSync(path.dirname(LOC_FILE), { recursive: true }); atomicWrite(LOC_FILE, Buffer.from(JSON.stringify({ dir: target }), 'utf8')); } catch (e) { return { ok: false, why: 'pointer', msg: String(e.message || e).slice(0, 200) }; }
  return { ok: true, dir: target, old: DATA_DIR };
});
ipcMain.handle('app:relaunch', () => { requireAdmin(); try { if (dirty) persist(); } catch { } app.relaunch(); app.exit(0); });

/* ---------- window ---------- */
function createWindow() {
  win = new BrowserWindow({ width: 1360, height: 860, minWidth: 980, minHeight: 640, title: 'منصة شؤون الموظفين', backgroundColor: '#f3f5f9', autoHideMenuBar: true, icon: path.join(__dirname, 'build', 'icon.png'), webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, devTools: !app.isPackaged } });
  Menu.setApplicationMenu(null);
  /* قائمة النقر اليمين: قص/نسخ/لصق/تحديد الكل (الماوس) */
  win.webContents.on('context-menu', (ev, p) => {
    const t = [];
    if (p.isEditable) t.push({ label: 'قص · Cut', role: 'cut', enabled: !!p.editFlags.canCut }, { label: 'نسخ · Copy', role: 'copy', enabled: !!p.editFlags.canCopy }, { label: 'لصق · Paste', role: 'paste', enabled: !!p.editFlags.canPaste }, { type: 'separator' }, { label: 'تحديد الكل · Select all', role: 'selectAll' });
    else if (p.selectionText) t.push({ label: 'نسخ · Copy', role: 'copy' }, { label: 'تحديد الكل · Select all', role: 'selectAll' });
    if (t.length) Menu.buildFromTemplate(t).popup({ window: win });
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', ev => ev.preventDefault());
  win.webContents.on('will-attach-webview', ev => ev.preventDefault());
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('close', () => { if (dirty) persist(); });
}
app.on('web-contents-created', (e, contents) => { contents.setWindowOpenHandler(() => ({ action: 'deny' })); contents.on('will-navigate', (ev, url) => { if (!url.startsWith('file://')) ev.preventDefault(); }); });
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit(); else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => { createWindow(); setupUpdater(); setTimeout(checkLicenseRevocation, 15000); setInterval(checkLicenseRevocation, 6 * 3600 * 1000); setTimeout(() => devicePing(true), 4000); setInterval(() => devicePing(true), 6 * 3600 * 1000); });
}
app.on('window-all-closed', () => { if (dirty) persist(); app.quit(); });
app.on('before-quit', () => { if (dirty) persist(); });
process.on('uncaughtException', err => { try { fs.appendFileSync(path.join(DATA_DIR, 'error.log'), now() + ' ' + (err.stack || err) + '\n'); } catch { } });

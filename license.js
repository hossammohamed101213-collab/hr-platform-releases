/* نظام الترخيص: تجربة 14 يوماً ثم سيريال موقّع (Ed25519). المفتاح الخاص عند المالك فقط. */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

let PUBLIC_KEY_B64 = 'MCowBQYDK2VwAyEA36gALdvIDexcU0U/wGx2YhV98HU7un0NZAQGplYsW7U=';
const TRIAL_DAYS = 14;
/* كتالوج الوحدات (مطابق لـ hr-sync/plans.js — للعرض فقط؛ الترخيص الموقّع يحمل قائمة الوحدات صراحةً) */
const MODULES = { employees: 'الموظفون', documents: 'المستندات', leaves: 'الإجازات', letters: 'الخطابات والنماذج', guide: 'دليل الإجراءات', payroll: 'الرواتب', offers: 'عروض العمل', reports: 'التقارير والتحليلات', finance: 'المالية والخزينة', projects: 'المشروعات', field: 'الميدان والحضور', taxes: 'الضرائب' };
const PLAN_TITLES = { starter: 'الأساسية', pro: 'الاحترافية', business: 'الكاملة', custom: 'مخصّصة', company: 'ترخيص الشركة', lifetime: 'مدى الحياة' };
/* قائمة الوحدات المسموحة من الترخيص؛ null = كل الوحدات (تجربة/ترخيص الشركة/سيريال قديم بلا modules) */
function modulesOf(lic) { if (!lic || !Array.isArray(lic.modules)) return null; const set = new Set(lic.modules.filter(m => MODULES[m])); set.add('employees'); return Object.keys(MODULES).filter(m => set.has(m)); }
const b64u = { enc: b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), dec: s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64') };

function machineId() {
  const raw = [os.hostname(), (os.cpus()[0] || {}).model || '', os.arch(), os.platform(), process.env.USERNAME || process.env.USER || ''].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16).toUpperCase().replace(/(.{4})/g, '$1-').slice(0, 19);
}
function verifyKey(key, pubB64 = PUBLIC_KEY_B64) {
  try {
    const [p, sig] = String(key).trim().split('.'); if (!p || !sig) return { ok: false, why: 'format' };
    const pub = crypto.createPublicKey({ key: Buffer.from(pubB64, 'base64'), type: 'spki', format: 'der' });
    if (!crypto.verify(null, b64u.dec(p), pub, b64u.dec(sig))) return { ok: false, why: 'signature' };
    const lic = JSON.parse(b64u.dec(p).toString('utf8'));
    if (lic.machine && lic.machine !== 'ANY' && lic.machine !== machineId()) return { ok: false, why: 'machine', lic };
    if (lic.expires && lic.expires < new Date().toISOString().slice(0, 10)) return { ok: false, why: 'expired', lic };
    return { ok: true, lic };
  } catch { return { ok: false, why: 'format' }; }
}
class Licensing {
  constructor(dataDir) { this.file = path.join(dataDir, 'license.json'); this.alt = path.join(os.homedir(), '.hrp-' + crypto.createHash('md5').update(dataDir).digest('hex').slice(0, 8)); }
  read() { const a = this._read(this.file), b = this._read(this.alt); const st = a || b || {}; if (!st.trialStart) { st.trialStart = new Date().toISOString().slice(0, 10); st.lastSeen = st.trialStart; this.write(st); } return st; }
  _read(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
  write(st) { for (const f of [this.file, this.alt]) { try { fs.writeFileSync(f, JSON.stringify(st)); } catch { } } }
  status() {
    const st = this.read(); const today = new Date().toISOString().slice(0, 10);
    if (st.lastSeen && today < st.lastSeen) return { state: 'clock', message: 'تم إرجاع ساعة الجهاز للخلف — صحّح التاريخ للمتابعة', machine: machineId() };
    if (st.lastSeen !== today) { st.lastSeen = today; this.write(st); }
    if (st.key) { const v = verifyKey(st.key); if (v.ok) return { state: 'licensed', lic: v.lic, modules: modulesOf(v.lic), machine: machineId(), daysLeft: v.lic.expires ? Math.ceil((new Date(v.lic.expires) - new Date(today)) / 86400000) : null }; return { state: 'invalid', why: v.why, machine: machineId(), lic: v.lic, modules: modulesOf(v.lic) }; }
    // ترخيص الشركة التلقائي: أي جهاز متصل بسيرفر الشركة (مزامنة ناجحة) يُفعَّل تلقائياً، ويظل مفعّلاً حتى 60 يوماً دون اتصال
    if (st.companyAt) { const days = Math.floor((new Date(today) - new Date(st.companyAt)) / 86400000); if (days <= 60) return { state: 'licensed', lic: { name: 'ترخيص الشركة', plan: 'company', via: 'sync' }, modules: null, machine: machineId(), daysLeft: null, company: true }; }
    if (st.revoked) return { state: 'expired', modules: null, daysLeft: 0, machine: machineId(), trialStart: st.trialStart, revoked: true }; // الترخيص أُلغي من الشركة: لا عودة للتجربة
    const used = Math.floor((new Date(today) - new Date(st.trialStart)) / 86400000); const left = TRIAL_DAYS - used;
    return { state: left > 0 ? 'trial' : 'expired', modules: null, daysLeft: Math.max(0, left), machine: machineId(), trialStart: st.trialStart, revoked: !!st.revoked };
  }
  startTrial() { const st = this.read(); const t = new Date().toISOString().slice(0, 10); st.trialStart = t; st.lastSeen = t; this.write(st); } // تبدأ الـ14 يوماً من لحظة موافقة المالك
  markCompany() { const st = this.read(); st.companyAt = new Date().toISOString().slice(0, 10); this.write(st); } // تُستدعى عند كل مزامنة ناجحة مع سيرفر الشركة
  activate(key) { const v = verifyKey(key); if (!v.ok) return v; const st = this.read(); st.key = String(key).trim(); delete st.revoked; this.write(st); return v; }
  /* فحص الإلغاء من السيرفر: يُستدعى بصمت؛ عند الإلغاء يُزال المفتاح محلياً (يعود البرنامج لوضع القراءة فقط) */
  checkDue() { const st = this.read(); if (!st.key) return null; const v = verifyKey(st.key); const code = v.lic && v.lic.code; if (!code) return null; const today = new Date().toISOString().slice(0, 10); if (st.lastCheck === today) return null; return { code, machine: machineId() }; }
  markChecked() { const st = this.read(); st.lastCheck = new Date().toISOString().slice(0, 10); this.write(st); }
  revokeLocal() { const st = this.read(); delete st.key; st.revoked = true; this.write(st); }
  deactivate() { const st = this.read(); delete st.key; delete st.companyAt; this.write(st); }
}
/* للاختبارات الآلية فقط: يُستدعى من main.js حصراً عند !app.isPackaged */
function setTestPublicKey(b64) { PUBLIC_KEY_B64 = String(b64); }
module.exports = { setTestPublicKey, Licensing, machineId, verifyKey, modulesOf, MODULES, PLAN_TITLES, TRIAL_DAYS };

/* خادم الترخيص التلقائي — يُنشر على Render. بلا قاعدة بيانات: يسأل Stripe هل هذا الجهاز دفع، ويولّد السيريال فوراً.
   متغيرات البيئة: STRIPE_SECRET_KEY, LICENSE_PRIVATE_KEY (محتوى license-private-key.txt), VENDOR_JSON (اختياري) */
const http = require('http'); const crypto = require('crypto'); const fs = require('fs'); const path = require('path');
const SK = process.env.STRIPE_SECRET_KEY || ''; const PRIV_B64 = (process.env.LICENSE_PRIVATE_KEY || '').trim();
const PORT = process.env.PORT || 3000;
const VENDOR = (() => { try { return JSON.parse(process.env.VENDOR_JSON || fs.readFileSync(path.join(__dirname, 'vendor.json'), 'utf8')); } catch { return {}; } })();
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const issued = new Map(); // machine -> key (ذاكرة مؤقتة)
function sign(lic) { const priv = crypto.createPrivateKey({ key: Buffer.from(PRIV_B64, 'base64'), type: 'pkcs8', format: 'der' }); const payload = Buffer.from(JSON.stringify(lic)); return b64u(payload) + '.' + b64u(crypto.sign(null, payload, priv)); }
async function stripe(p) { const r = await fetch('https://api.stripe.com/v1/' + p, { headers: { Authorization: 'Bearer ' + SK } }); if (!r.ok) throw new Error('stripe ' + r.status); return r.json(); }
async function findPaid(machine) {
  let after = ''; for (let i = 0; i < 20; i++) {
    const j = await stripe(`checkout/sessions?limit=100&status=complete${after ? '&starting_after=' + after : ''}`);
    for (const s of j.data) if (s.client_reference_id === machine && s.payment_status === 'paid') return s;
    if (!j.has_more) break; after = j.data[j.data.length - 1].id;
  } return null;
}
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname === '/config') return json(res, 200, VENDOR);
    if (u.pathname === '/license') {
      const machine = String(u.searchParams.get('machine') || '').toUpperCase().trim();
      if (!/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/.test(machine)) return json(res, 400, { ok: false, why: 'machine' });
      if (issued.has(machine)) return json(res, 200, { ok: true, key: issued.get(machine) });
      if (!SK || !PRIV_B64) return json(res, 500, { ok: false, why: 'server-config' });
      const s = await findPaid(machine); if (!s) return json(res, 200, { ok: false, why: 'unpaid' });
      const cd = s.customer_details || {}; const plan = (s.metadata && s.metadata.plan) || 'lifetime';
      const lic = { name: cd.name || cd.email || 'Customer', email: cd.email || '', machine, expires: plan === 'yearly' ? new Date(Date.now() + 366 * 86400000).toISOString().slice(0, 10) : null, seats: 1, plan: 'pro', issued: new Date().toISOString().slice(0, 10), id: s.id.slice(-8).toUpperCase(), stripe: s.id };
      const key = sign(lic); issued.set(machine, key); console.log('issued', machine, cd.email); return json(res, 200, { ok: true, key, lic });
    }
    if (u.pathname === '/health' || u.pathname === '/') return json(res, 200, { ok: true, service: 'hr-platform-license' });
    json(res, 404, { ok: false });
  } catch (e) { console.error(e); json(res, 500, { ok: false, why: 'error' }); }
}).listen(PORT, () => console.log('license server on', PORT));

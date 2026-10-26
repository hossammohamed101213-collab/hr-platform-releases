#!/usr/bin/env node
/* مولّد سيريالات — يعمل على جهاز المالك فقط. الاستخدام:
   node keygen.js --name "شركة النور" --machine XXXX-XXXX-XXXX-XXXX --expires 2027-12-31 --seats 1
   --machine ANY  => سيريال يعمل على أي جهاز.   بدون --expires => مدى الحياة. */
const crypto = require('crypto'); const fs = require('fs'); const path = require('path');
const args = Object.fromEntries(process.argv.slice(2).join(' ').split(/\s--/).filter(Boolean).map(s => { const [k, ...v] = s.replace(/^--/, '').split(' '); return [k, v.join(' ').replace(/^"|"$/g, '')]; }));
if (!args.name) { console.log('الاستخدام: node keygen.js --name "اسم العميل" [--machine XXXX-XXXX-XXXX-XXXX|ANY] [--expires 2027-12-31] [--seats 1] [--plan pro]'); process.exit(1); }
const priv = crypto.createPrivateKey({ key: Buffer.from(fs.readFileSync(path.join(__dirname, 'license-private-key.txt'), 'utf8').trim(), 'base64'), type: 'pkcs8', format: 'der' });
const lic = { name: args.name, machine: args.machine || 'ANY', expires: args.expires || null, seats: +(args.seats || 1), plan: args.plan || 'pro', issued: new Date().toISOString().slice(0, 10), id: crypto.randomBytes(4).toString('hex').toUpperCase() };
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const payload = Buffer.from(JSON.stringify(lic)); const sig = crypto.sign(null, payload, priv);
const key = b64u(payload) + '.' + b64u(sig);
console.log('\n=== سيريال العميل ===\n' + key + '\n');
console.log(JSON.stringify(lic, null, 2));
fs.appendFileSync(path.join(__dirname, 'issued-licenses.log'), JSON.stringify({ ...lic, key }) + '\n');

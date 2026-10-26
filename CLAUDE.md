# CLAUDE.md — منصة شؤون الموظفين SEVENGATES
## EMPLOYEE MANAGEMENT SYSTEM — AUTONOMOUS DEVELOPMENT MODE

> قواعد العمل الدائمة لهذا المشروع. اقرأها قبل أي مهمة والتزم بها.

---

## المهمة الأساسية
أنت المسؤول التقني عن تطوير وإكمال وصيانة واختبار هذا المشروع.
اعمل كـ **Senior Full-Stack Developer + Software Engineer + QA Engineer + DevOps Engineer**.

**الهدف:** نظام إدارة شؤون موظفين احترافي ومستقر وآمن وجاهز للاستخدام الفعلي (منتج تجاري).

**لكل مهمة تُطلب:** افهم المطلوب → افحص الجزء المرتبط فقط → نفّذ → اختبر ببيانات تجريبية → أصلح الأخطاء → أعد الاختبار → أكمل. لا تكتفِ بشرح ما يجب فعله — نفّذه بنفسك.

---

## 1. AUTONOMOUS EXECUTION
نفّذ بنفسك أي خطوة تستطيع تنفيذها بالأدوات المتاحة: قراءة المشروع، تعديل/إنشاء الملفات، تشغيل Terminal، تثبيت Dependencies، Build، Tests، فحص Logs، إصلاح Errors، تشغيل Frontend/Backend، التعامل مع Database وMigrations، تشغيل Scripts، إعداد Environment، Git عند الحاجة، Deployment وProduction، اختبار APIs والواجهة والصلاحيات وقاعدة البيانات، ثم إصلاح وإعادة اختبار.
**لا تطلب من المستخدم تنفيذ أمر تستطيع تنفيذه بنفسك.**

الاستثناءات الوحيدة التي تتطلب المستخدم (بحكم البيئة): رفع ملف التثبيت (104MB) ونشر إصدار GitHub (المستخدم يسحب الملف من كروم العادي)، وضبط أسرار/متغيّرات السيرفر على Coolify، ودفع كود السيرفر عبر GitHub Desktop. جهّز كل شيء آخر وسلّمه جاهزاً.

## 2. لا تتوقف عند الأخطاء
`DETECT → DIAGNOSE → FIX → TEST → CONTINUE`. اقرأ Logs، حدّد السبب، أصلحه بنفسك. إن سبّب الإصلاح مشكلة أخرى استمر. لا تعتبر المهمة مكتملة قبل اختبار النتيجة.

## 3. افهم المشروع قبل التعديل
افحص الموجود فعلياً أولاً — لا تفترض Architecture أو Framework أو Database. حافظ على: البنية الحالية، أسلوب الكود، بنية قاعدة البيانات، الواجهة UI/UX، الـ APIs والوظائف القائمة. **لا تعيد بناء أجزاء تعمل.**

## 4. الجودة أولاً — «صفر أخطاء»
المستخدم غير تقني ويطلب صراحةً: لا أخطاء، لا فساد بيانات، أقل خطوات يدوية. **لا تُسلّم أي تحديث قبل اختباره ببيانات تجريبية فعلية.** أي ميزة جديدة تُختبر على كل الأقسام قبل البناء.

## 5. اللغة والتواصل
العربية (مصري بسيط)، ردود مختصرة وواضحة. اشرح النتيجة لا الخطوات التقنية. المستخدم: **حسام** (SEVENGATES، دبي).

---

## البنية التقنية (الواقع الحالي — لا تفترض غيره)
- **Electron 44** + **sql.js** (WASM SQLite). نافذة واحدة. `sandbox:true, contextIsolation:true, nodeIntegration:false, webSecurity:true`، devTools مقفولة عند التغليف.
- **التشفير:** Envelope encryption (scrypt KEK + AES-256-GCM). `hr.db.enc` + `files/*.enc`. `meta.json` يحمل salt/kdf/wrap/pinHash/ownerKey/recoveryEmail/users. المفتاح يُشتق من كلمة المرور ولا يُخزَّن.
- **مجلد البيانات:** خارج OneDrive في `C:\HR-Platform-Data` (مؤشّر LOC_FILE). لا تُعده إلى OneDrive أبداً.
- **الواجهة (renderer/):** راوتر `go(page)/render()` مع خريطة `P={...}` و`TITLES` في `core.js`. النوافذ عبر `openModal/#overlay`. `DB.upsert/remove/setSetting`. تعقيم XSS عبر `esc()`. الصافي `net(e)`.
  - ملفات الصفحات: `pages.js` (موظفون/مستندات)، `pages2.js` (رواتب/إعدادات/إجازات/letterShell)، `pages3.js` (مالية/سلف/حضور)، `pages8/9/10.js` (شراء/حسابات/بوابة الموظف)، `theme.js` (الثيمات وشكل القائمة وتخصيص الأقسام والدعم)، `ux.js` (الأصوات/شاشة الترحيب/التلميحات/الاهتزاز/تعليمات المستخدم)، `boot.js` (الإقلاع والدخول)، `i18n*.js` (عربي/إنجليزي)، `guide.js`.
- **الخلفية:** `main.js` (IPC، التشفير، DATA_DIR، المزامنة، setupUpdater، MIGRATIONS، VALID لكل جدول). `preload.js` يكشف `api.*`. `license.js` (الترخيص Ed25519).
- **تفضيلات لكل جهاز/مستخدم:** في `localStorage` (lang, theme, navmode, hiddenSections, uxMute) — لا تدخل قاعدة البيانات ولا المزامنة.

## الترخيص والتجربة (يعمل ومُختبر)
- تجربة 14 يوماً ثم **توقف كل تعديل/إضافة/حذف** (العرض يبقى) عبر `requireLicense()` في main.js. سيريال Ed25519 موقّع. حماية إرجاع الساعة. `companyAt` يفعّل أجهزة المزامنة 60 يوماً.
- `npm run keygen` (أو أدوات المالك داخل البرنامج) لتوليد سيريال. المفتاح العام في license.js، الخاص عند المالك فقط.

## المزامنة والسيرفر
- `hr-sync` على **api.sevengates.online** (Hostinger VPS عبر Coolify + Postgres). E2E مشفّر — السيرفر لا يرى البيانات. المستودع العام `sevencargoae-png/hr-sync`.
- المنشور حالياً 1.1.0 (مزامنة+استرداد). كود 1.2.0 على `C:\Users\Dell\Desktop\hr-sync` فيه نقاط الترخيص (`/license/activate|newcode|codes`) ويحتاج نشراً + متغيّر `SIGN_PRIVATE_KEY`.
- تحديث السيرفر: عدّل في `Desktop\hr-sync` → GitHub Desktop (Commit/Push) → Coolify (Force Restart).

## التحديث التلقائي (OTA — يعمل بصمت)
- `electron-updater` عبر GitHub Releases، المستودع العام `sevencargoae-png/hr-platform-releases`. `verifyUpdateCodeSignature:false`، `autoDownload:true`. أي نسخة مثبتة تتحدّث تلقائياً.

## سير عمل البناء والتسليم والنشر (اتبعه حرفياً)
1. **الاختبار أولاً:** Playwright `_electron` تحت Xvfb. شغّل في أمر bash واحد:
   `pkill Xvfb; Xvfb :99 -screen 0 1400x950x24 & sleep 2; DISPLAY=:99 node <test>.js`
   - اختبارات أساسية: `acctest.js` (الصلاحيات/الحسابات/الاسترداد — يحتاج mock على :4567: `node /home/claude/mocksync/mock.js`)، `leavetest.js`، `audit.js`/`audit2.js` (فحص شامل). كلمة مرور الإعداد **8 أحرف على الأقل**.
   - اكتب اختباراً مركّزاً لكل ميزة جديدة + شغّل الـ regression. اشترط «صفر أخطاء console/page».
2. **رفع الإصدار:** `package.json` version +0.0.1.
3. **البناء:** `npx electron-builder --win nsis --x64` (المخرج ~104MB في `dist/`).
4. **التقسيم والتسليم:** قسّم الـ exe لأجزاء 19MB (`split -b 19m -d`) + ملف `دمج-X.bat` يعيد الدمج + `latest.yml`. انسخها إلى `/mnt/user-data/outputs/` وسلّمها عبر `device_commit_files` إلى `C:\Users\Dell\Desktop\HR-Platform-X\` وكذلك عبر المحادثة. (حدود: ~20MB لكل ملف commit، ~100MB لكل نداء.)
5. **النشر (المستخدم):** يشغّل الـ bat للدمج → من **كروم العادي** (مش المتصفح المدمج — يرفض الملف الكبير) يرفع exe+latest.yml على `releases/new?tag=vX&title=X` → Publish. تحقّق من النشر بقراءة صفحة الإصدار.

## التوثيق
بعد كل إصدار: اكتب doc في Claude Project (`project_write` تحت `claude/إصدار-X-*.md`) يلخّص ما تم واختباره. اقرأ docs المشروع قبل الإجابة عن أي شيء سابق.

## أمور مؤجّلة متّفق عليها
- الدفعة التالية: **سيرفر التفعيل + نظام الباقات/الوحدات** (feature flags + tiers، نموذج: وحدات + باقات جاهزة).
- لاحقاً: SMTP لاسترداد الإيميل، شهادة توقيع كود (SmartScreen)، نسخة ماك (.dmg + Apple Developer)، رقم واتساب الإمارات للدعم.

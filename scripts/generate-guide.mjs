// Generates ORDERAK_GUIDE.docx (English), ORDERAK_GUIDE_AR.docx (Arabic RTL),
// and ORDERAK_DEPLOY_AR.docx (Arabic RTL beginner cloud-deployment guide)
// in the project root.
// Usage: npm run guide
import { writeFile } from 'node:fs/promises';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

const BRAND = '1F9D63';
const CODE_BG = 'F5F5F4';
const HEAD_BG = 'ECFDF5';

// ---------- helpers (rtl-aware) ----------
function makeBuilder(rtl) {
  const align = rtl ? AlignmentType.RIGHT : AlignmentType.LEFT;
  const run = (text, opts = {}) =>
    new TextRun({ text, size: opts.size ?? 22, bold: !!opts.bold, color: opts.color, font: opts.font, rightToLeft: rtl });

  return {
    h1(text) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        bidirectional: rtl,
        spacing: { before: 320, after: 160 },
        children: [run(text, { bold: true, color: BRAND, size: 32 })],
      });
    },
    h2(text) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        bidirectional: rtl,
        spacing: { before: 260, after: 120 },
        children: [run(text, { bold: true, size: 26 })],
      });
    },
    h3(text) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        bidirectional: rtl,
        spacing: { before: 200, after: 100 },
        children: [run(text, { bold: true, size: 23 })],
      });
    },
    p(text, opts = {}) {
      return new Paragraph({
        spacing: { after: 120, line: 300 },
        alignment: opts.center ? AlignmentType.CENTER : align,
        bidirectional: rtl,
        children: [run(text)],
      });
    },
    lead(text) {
      return new Paragraph({
        spacing: { after: 140, line: 300 },
        alignment: align,
        bidirectional: rtl,
        children: [run(text, { color: '57534E', size: 22 })],
      });
    },
    bullet(text, level = 0) {
      return new Paragraph({
        bullet: { level },
        bidirectional: rtl,
        spacing: { after: 80, line: 290 },
        children: [run(text)],
      });
    },
    numbered(text) {
      return new Paragraph({
        numbering: { reference: 'steps', level: 0 },
        bidirectional: rtl,
        spacing: { after: 80, line: 290 },
        children: [run(text)],
      });
    },
    code(text) {
      // code is always LTR (commands)
      return new Paragraph({
        spacing: { after: 100, line: 280 },
        alignment: AlignmentType.LEFT,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: CODE_BG },
        border: {
          top: { style: BorderStyle.SINGLE, size: 2, color: 'E7E5E4' },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E7E5E4' },
          left: { style: BorderStyle.SINGLE, size: 2, color: 'E7E5E4' },
          right: { style: BorderStyle.SINGLE, size: 2, color: 'E7E5E4' },
        },
        children: [new TextRun({ text, font: 'Consolas', size: 20, color: '44403C' })],
      });
    },
    cell(text, opts = {}) {
      const runs = Array.isArray(text)
        ? text
        : [new TextRun({ text, size: 20, bold: !!opts.bold, rightToLeft: rtl })];
      return new TableCell({
        shading: opts.head ? { type: ShadingType.CLEAR, color: 'auto', fill: HEAD_BG } : undefined,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ spacing: { after: 0 }, bidirectional: rtl, children: runs })],
      });
    },
    table(headers, rows) {
      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ tableHeader: true, children: headers.map((h) => this.cell(h, { head: true, bold: true })) }),
          ...rows.map((r) => new TableRow({ children: r.map((c) => this.cell(c)) })),
        ],
      });
    },
  };
}

// ---------- English content ----------
function buildEnglish() {
  const b = makeBuilder(false);
  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60 },
      children: [new TextRun({ text: 'Orderak OS', bold: true, size: 56, color: BRAND })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: 'نظام كاشير وإدارة مطاعم', size: 28, color: '57534E' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'Offline-first POS for Sudanese restaurants — Setup & User Guide', size: 24, color: '57534E' })],
    }),
    b.p('This guide explains how to install Orderak OS on your own computer (development mode), how to deploy it to a server with Docker/Coolify, and how to use it every day as a cashier or manager. Version: 0.1.0.', { center: true }),
  );

  children.push(
    b.h1('1. What is Orderak OS?'),
    b.p('Orderak OS is a point-of-sale (POS) system for restaurants. It works even when the internet goes down: every action (opening a shift, creating an order, taking a payment, closing a shift) is saved on the device first, and synchronized to the server automatically when the connection comes back.'),
    b.h2('Main features'),
    b.bullet('Login with a 4–6 digit PIN (Admin and Cashier accounts).'),
    b.bullet('Shifts: open a shift with a cash float, close it with a counted-cash variance report.'),
    b.bullet('Orders: Dine-in (صالة), Takeaway (سفري), Delivery (توصيل) with customer name / phone / address.'),
    b.bullet('Payments: Cash (نقداً), Bank transfer (تحويل), E-wallet (محفظة), and ATEL credit (آجل — دين).'),
    b.bullet('Menu management (admin only): categories, items, prices, and bulk price adjustment (+5%…+20%).'),
    b.bullet('Dashboard with real sales, order count, average ticket, and net profit.'),
    b.bullet('Installable as a phone/tablet/desktop app (PWA), works fully offline.'),
    b.h2('Technology stack (for developers)'),
    b.bullet('Frontend: React + Vite + TypeScript + Tailwind (RTL, Arabic UI).'),
    b.bullet('Backend: Node.js + Express + TypeScript + Prisma + SQLite.'),
    b.bullet('Offline layer: IndexedDB (Dexie) + Service Worker (Workbox).'),
    b.bullet('Deployment: Docker Compose (API + nginx web) — ready for Coolify.'),
  );

  children.push(
    b.h1('2. System requirements'),
    b.bullet('A modern browser: Chrome, Edge, or Safari (iOS 16.4+ for installing the app).'),
    b.bullet('A computer/tablet/phone for the cashier station — no powerful hardware needed.'),
    b.bullet('Internet is only required for the first sync and for live menu updates; after that the program works offline.'),
    b.bullet('For development: Node.js 18 or newer and npm (included with Node.js).'),
    b.bullet('For deployment: a server (VPS) and optionally Coolify, or any Docker host.'),
  );

  children.push(
    b.h1('3. Installing on your computer (development)'),
    b.p('Use this when you want to try the program locally or develop it further.'),
    b.numbered('Install Node.js 18+ from https://nodejs.org (LTS version recommended).'),
    b.numbered('Open a terminal (Command Prompt / PowerShell / Git Bash) inside the project folder.'),
    b.numbered('Install all dependencies:'),
    b.code('npm install'),
    b.numbered('Create the database (SQLite file):'),
    b.code('npm run db:migrate'),
    b.numbered('Load the default users and sample menu:'),
    b.code('npm run db:seed'),
    b.numbered('Start the API and the web app together:'),
    b.code('npm run dev'),
    b.numbered('Open your browser at http://localhost:5173 and log in with a PIN from the table below.'),
    b.h3('Default accounts'),
    b.table(
      ['Role', 'PIN', 'Permissions'],
      [
        ['Admin (المدير)', '1234', 'Everything — menu management, dashboard, shifts, orders'],
        ['Cashier (الكاشير)', '0000', 'Shifts, orders, payments — no menu editing'],
      ],
    ),
    b.p('Security note: change these PINs before real use (see section 8).'),
  );

  children.push(
    b.h1('4. Deploying to a server (Docker / Coolify)'),
    b.p('Follow these steps to make the program available over the internet on your own domain.'),
    b.numbered('Put the project in a Git repository and push it to GitHub/GitLab:'),
    b.code('git init && git add . && git commit -m "Orderak OS"\ngit remote add origin <your-git-url>\ngit push'),
    b.numbered('In Coolify: click "+ New Resource" → "Docker Compose" → choose your repository.'),
    b.numbered('In the resource "Environment Variables" tab, set the variables below.'),
    b.h3('Environment variables'),
    b.table(
      ['Variable', 'Value', 'Required?'],
      [
        ['JWT_SECRET', 'A long random string (e.g. 32+ characters). The API will NOT start without it in production.', 'Yes'],
        ['WEB_PORT', '80 (or 8080 if Coolify proxies it)', 'Optional'],
        ['CORS_ORIGIN', 'Leave empty (same domain through nginx)', 'Optional'],
      ],
    ),
    b.numbered('Deploy. Coolify will build both images, create the database, seed it on first boot, and start the services.'),
    b.numbered('In the "Domains" tab, point your domain (e.g. pos.yourrestaurant.com) to the web service.'),
    b.numbered('Coolify automatically provisions HTTPS (Let\u2019s Encrypt) once the domain is set.'),
    b.h3('Persistent storage — important'),
    b.p('All data lives in the Docker volume "orderak-sqlite" mounted at /app/data/orderak.db. Never delete this volume — it contains your orders and shifts. Backups are explained in section 7.'),
  );

  children.push(
    b.h1('5. Using the program every day'),
    b.h2('5.1 Logging in'),
    b.p('The login screen shows 6 dots and a numeric keypad. Type the 4-digit PIN and press "دخول" (Login). After 5 wrong attempts the program blocks further tries for 15 minutes (security feature).'),
    b.h2('5.2 Opening a shift (الوردية)'),
    b.p('After login you are taken to the shift screen. Enter the cash float in the drawer (مبلغ العهدة) — for example the starting cash for the day — and press "فتح الوردية" (Open shift). A shift must be open before taking orders. Only one shift can be open at a time per cashier.'),
    b.h2('5.3 Creating an order (طلب)'),
    b.numbered('From the orders screen press "+ طلب جديد" (New order).'),
    b.numbered('Choose the order type: صالة (dine-in), سفري (takeaway), or توصيل (delivery).'),
    b.numbered('Tap menu items to add them; tap again to increase quantity. Use − / + to adjust.'),
    b.numbered('Optionally enter the customer name, phone, and (for delivery) the address.'),
    b.numbered('Press "حفظ ودفع" (Save & pay) to go straight to payment, or "حفظ + جديد" (Save & new) to save and start the next order.'),
    b.h2('5.4 Taking payment (الدفع)'),
    b.p('On the payment screen you see the items, the total, and how much is already paid. Choose a payment method:'),
    b.table(
      ['Method', 'When to use'],
      [
        ['نقداً (Cash)', 'Cash in the drawer — no reference needed.'],
        ['بنكك / تحويل (Transfer)', 'Bank transfer — enter the transfer reference number.'],
        ['محفظة إلكترونية (Wallet)', 'Mobile wallet (e.g. Bankak) — enter the reference number.'],
        ['آجل — دين (ATEL)', 'Credit / on-account — enter the reference number.'],
      ],
    ),
    b.p('Enter the amount (or press "المتبقي" to take the exact remaining balance) and press the pay button. Partial payments are allowed: pay part now and the rest later. When the total is fully paid, the order moves to PAID automatically.'),
    b.h2('5.5 Open orders and cancelling'),
    b.p('The orders screen shows all open orders with their elapsed time. Press "دفع" to take a payment, or "إلغاء" to cancel an order (you will be asked to confirm). A cancelled order never reaches the server, so it does not create ghost sales.'),
    b.h2('5.6 Closing a shift (إغلاق الوردية)'),
    b.numbered('On the shift screen, enter the actual cash counted in the drawer (النقد الفعلي في الدرج).'),
    b.numbered('The program calculates the expected cash (opening float + cash sales) and shows the variance:'),
    b.bullet('مطابق تماماً — exact match (green).'),
    b.bullet('عجز في النقد — cash deficit (red): drawer has less than expected.'),
    b.bullet('زيادة في النقد — cash surplus (amber): drawer has more than expected.'),
    b.numbered('Add an optional note and press "تأكيد إغلاق الوردية". The shift closes with its expected cash and variance.'),
    b.p('Tip: if you have open (unpaid) orders, the program warns you before closing — decide whether to continue or finish those orders first.'),
    b.h2('5.7 Managing the menu (admin only)'),
    b.p('The menu screen (القائمة) lets the admin manage categories and items, edit prices, toggle items active/inactive, delete items, and apply a bulk price change (+5%, +10%, +15%, +20%) to all items or just the selected category. Cashiers see a 403 error if they try — menu editing is admin-only.'),
    b.h2('5.8 Dashboard'),
    b.p('The dashboard (لوحة التحكم) shows real figures computed from the device\u2019s local data: total sales, number of paid orders, average ticket, and net profit (sales minus item costs).'),
    b.h2('5.9 Working offline'),
    b.p('Everything you do while offline is stored on the device (IndexedDB) with a "pending" status. The header shows a sync button with a counter of pending operations. When the internet returns, the program synchronizes automatically; you can also press the sync button (مزامنة) at any time. After a successful sync the counter returns to zero.'),
    b.h2('5.10 Installing as an app (PWA)'),
    b.p('While the site is open in Chrome/Edge, the header shows an install button (تثبيت). Press it to install Orderak OS as a full-screen app on the phone/tablet/desktop, like a native app.'),
  );

  children.push(
    b.h1('6. Troubleshooting'),
    b.table(
      ['Problem', 'Solution'],
      [
        ['API does not start in production ("JWT_SECRET environment variable is required")', 'Set a strong JWT_SECRET in the deployment environment variables (section 4) and redeploy. This is intentional — a known secret would let anyone forge login tokens.'],
        ['Login says "محاولات كثيرة" (too many attempts)', '5 wrong PIN attempts lock login for 15 minutes. Wait and try again — this protects against guessing your PIN.'],
        ['Sync counter never reaches zero', 'Make sure the device is online, then press the sync button. If it stays stuck, restart the browser.'],
        ['Menu is empty on first login', 'The menu is downloaded automatically right after login. Wait a moment or press the sync button.'],
        ['Order shows "..." instead of a number', 'The number is assigned by the server on first successful sync. It appears automatically once online.'],
        ['Forget a PIN or need a new user', 'In development, edit apps/api/prisma/seed.ts and re-run npm run db:seed (idempotent). On the server, update the User table in the database directly.'],
        ['Changed the database schema and something broke', 'Run npm run db:migrate for safe changes. Destructive changes require npm run db:reset — this wipes all data, so back up first (section 7).'],
        ['Menu editing fails for a cashier', 'That is correct — only the Admin role can edit the menu (by design).'],
      ],
    ),
  );

  children.push(
    b.h1('7. Backing up and restoring data'),
    b.h2('Docker / server (recommended)'),
    b.p('Backup (copy the SQLite file out of the volume):'),
    b.code('docker run --rm -v orderak-sqlite:/data -v $(pwd):/backup alpine cp /data/orderak.db /backup/'),
    b.p('Restore: stop the services, drop the saved orderak.db file into the volume, and start again.'),
    b.h2('Development'),
    b.p('The local database is the file apps/api/prisma/dev.db — simply copy it. (It is ignored by Git, so it is never committed accidentally.)'),
  );

  children.push(
    b.h1('8. Security checklist (before real use)'),
    b.bullet('Change the default PINs (1234 / 0000) — they are public knowledge.'),
    b.bullet('Set a long, random JWT_SECRET in production (the API refuses to start without it).'),
    b.bullet('Serve over HTTPS — Coolify does this automatically for your domain.'),
    b.bullet('Do not expose port 3001 publicly; access everything through the web app (port 80).'),
    b.bullet('Make regular database backups (section 7).'),
  );

  children.push(
    b.h1('9. Tests and project structure (for developers)'),
    b.h2('Running the tests'),
    b.code('npm test'),
    b.p('Runs vitest suites for the API (order numbers, login rate limiting, error handling) and the web (offline sync queue, cancellations).'),
    b.h2('Project layout'),
    b.code(
      'orderak-os/\n' +
        '\u251C\u2500 apps/\n' +
        '\u2502   \u251C\u2500 api/        Express + Prisma + SQLite server (port 3001)\n' +
        '\u2502   \u2514\u2500 web/        React + Vite PWA (port 5173 in dev)\n' +
        '\u251C\u2500 docker-compose.yml   Production deployment (api + nginx web)\n' +
        '\u251C\u2500 scripts/      Utility scripts (icons, this guide)\n' +
        '\u2514\u2500 AUDIT_REPORT.md  Security & bug audit (all fixed)',
    ),
    b.h2('Useful npm commands'),
    b.table(
      ['Command', 'What it does'],
      [
        ['npm run dev', 'Starts API (localhost:3001) and web (localhost:5173) together'],
        ['npm run dev:api / dev:web', 'Starts only the API or only the web app'],
        ['npm run build', 'Type-checks and builds both apps for production'],
        ['npm test', 'Runs all automated tests'],
        ['npm run db:migrate', 'Applies safe schema changes to the database'],
        ['npm run db:reset', 'Applies destructive schema changes (WIPES data — use carefully)'],
        ['npm run db:seed', 'Loads default users and sample menu'],
        ['npm run guide', 'Regenerates these Word documents'],
      ],
    ),
  );

  children.push(
    new Paragraph({
      spacing: { before: 300 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: '— End of guide —', size: 20, color: 'A8A29E', italics: true })],
    }),
  );

  return children;
}

// ---------- Arabic content ----------
function buildArabic() {
  const b = makeBuilder(true);
  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 200, after: 60 },
      children: [new TextRun({ text: 'Orderak OS', bold: true, size: 56, color: BRAND, rightToLeft: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 60 },
      children: [new TextRun({ text: 'نظام كاشير وإدارة مطاعم', size: 28, color: '57534E', rightToLeft: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'دليل التركيب والاستخدام — يعمل حتى بدون إنترنت', size: 24, color: '57534E', rightToLeft: true })],
    }),
    b.p('يشرح هذا الدليل طريقة تثبيت نظام أوردراك على جهازك (وضع التطوير)، وطريقة نشره على خادم عبر Docker / Coolify، وطريقة استخدامه يومياً ككاشير أو كمدير. الإصدار: 0.1.0.', { center: true }),
  );

  children.push(
    b.h1('١. ما هو نظام Orderak OS؟'),
    b.p('أوردراك نظام نقاط بيع (كاشير) للمطاعم. يعمل حتى عند انقطاع الإنترنت: كل عملية (فتح وردية، إنشاء طلب، تحصيل دفعة، إغلاق وردية) تُحفظ على الجهاز أولاً، ثم تُزامن تلقائياً مع الخادم عند عودة الاتصال.'),
    b.h2('أبرز المزايا'),
    b.bullet('تسجيل الدخول برمز PIN من 4 إلى 6 أرقام (حساب مدير وحساب كاشير).'),
    b.bullet('الورديات: فتح وردية بمبلغ عهدة، وإغلاقها مع تقرير الفرق بين النقد المتوقع والفعلي.'),
    b.bullet('الطلبات: صالة، سفري، توصيل — مع اسم الزبون ورقم الهاتف والعنوان.'),
    b.bullet('الدفع: نقداً، تحويل بنكي، محفظة إلكترونية، وآجل (دين).'),
    b.bullet('إدارة القائمة (للمدير فقط): الأقسام، الأصناف، الأسعار، وتعديل أسعار جماعي (+5% … +20%).'),
    b.bullet('لوحة تحكم بأرقام حقيقية: المبيعات، عدد الطلبات، متوسط الفاتورة، وصافي الربح.'),
    b.bullet('قابل للتثبيت كتطبيق على الهاتف أو الجهاز اللوحي أو الكمبيوتر (PWA) ويعمل بالكامل دون اتصال.'),
    b.h2('التقنيات المستخدمة (للمطورين)'),
    b.bullet('الواجهة: React + Vite + TypeScript + Tailwind (واجهة عربية RTL).'),
    b.bullet('الخادم: Node.js + Express + TypeScript + Prisma + SQLite.'),
    b.bullet('طبقة عدم الاتصال: IndexedDB (Dexie) + Service Worker (Workbox).'),
    b.bullet('النشر: Docker Compose (الخادم + nginx للواجهة) — جاهز لـ Coolify.'),
  );

  children.push(
    b.h1('٢. متطلبات النظام'),
    b.bullet('متصفح حديث: Chrome أو Edge أو Safari (iOS 16.4+ لتثبيت التطبيق).'),
    b.bullet('جهاز كمبيوتر أو لوحي أو هاتف لمحطة الكاشير — لا يتطلب أجهزة قوية.'),
    b.bullet('الإنترنت مطلوب فقط للمزامنة الأولى وتحديثات القائمة؛ بعد ذلك يعمل البرنامج دون اتصال.'),
    b.bullet('للتطوير: Node.js إصدار 18 أو أحدث و npm (مرفق مع Node.js).'),
    b.bullet('للنشر: خادم (VPS) واختيارياً Coolify أو أي مضيف يدعم Docker.'),
  );

  children.push(
    b.h1('٣. التثبيت على جهازك (وضع التطوير)'),
    b.p('استخدم هذا القسم لتجربة البرنامج محلياً أو لتطويره.'),
    b.numbered('ثبّت Node.js 18+ من https://nodejs.org (يُفضّل النسخة LTS).'),
    b.numbered('افتح الطرفية (Command Prompt / PowerShell / Git Bash) داخل مجلد المشروع.'),
    b.numbered('ثبّت جميع الاعتماديات:'),
    b.code('npm install'),
    b.numbered('أنشئ قاعدة البيانات (ملف SQLite):'),
    b.code('npm run db:migrate'),
    b.numbered('حمّل المستخدمين الافتراضيين والقائمة التجريبية:'),
    b.code('npm run db:seed'),
    b.numbered('شغّل الخادم والواجهة معاً:'),
    b.code('npm run dev'),
    b.numbered('افتح المتصفح على http://localhost:5173 وسجّل الدخول بأحد رموز PIN في الجدول أدناه.'),
    b.h3('الحسابات الافتراضية'),
    b.table(
      ['الدور', 'رمز PIN', 'الصلاحيات'],
      [
        ['مدير (Admin)', '1234', 'كل شيء — إدارة القائمة، لوحة التحكم، الورديات، الطلبات'],
        ['كاشير (Cashier)', '0000', 'الورديات والطلبات والدفع — بدون تعديل القائمة'],
      ],
    ),
    b.p('ملاحظة أمنية: غيّر رموز PIN هذه قبل الاستخدام الفعلي (انظر القسم ٨).'),
  );

  children.push(
    b.h1('٤. النشر على خادم (Docker / Coolify)'),
    b.p('اتبع هذه الخطوات ليعمل البرنامج عبر الإنترنت على نطاقك الخاص.'),
    b.numbered('ضع المشروع في مستودع Git وارفعه إلى GitHub/GitLab:'),
    b.code('git init && git add . && git commit -m "Orderak OS"\ngit remote add origin <your-git-url>\ngit push'),
    b.numbered('في Coolify: اضغط "+ New Resource" ← "Docker Compose" ← اختر مستودعك.'),
    b.numbered('في تبويب "Environment Variables" أدخل المتغيرات التالية.'),
    b.h3('متغيرات البيئة'),
    b.table(
      ['المتغير', 'القيمة', 'مطلوب؟'],
      [
        ['JWT_SECRET', 'سلسلة عشوائية طويلة (32 حرفاً أو أكثر). لن يعمل الخادم بدونه في بيئة الإنتاج.', 'نعم'],
        ['WEB_PORT', '80 (أو 8080 إذا كان Coolify يتولى البروكسي)', 'اختياري'],
        ['CORS_ORIGIN', 'اتركه فارغاً (نفس النطاق عبر nginx)', 'اختياري'],
      ],
    ),
    b.numbered('اضغط Deploy. سيبني Coolify الصورتين، وينشئ قاعدة البيانات، ويجهّزها عند أول تشغيل، ثم يبدأ الخدمات.'),
    b.numbered('في تبويب "Domains" وجّه نطاقك (مثال: pos.yourrestaurant.com) إلى خدمة الويب.'),
    b.numbered('يوفّر Coolify شهادة HTTPS تلقائياً (Let\u2019s Encrypt) بعد ضبط النطاق.'),
    b.h3('التخزين الدائم — مهم'),
    b.p('جميع البيانات في مجلد Docker المسمى "orderak-sqlite" والمثبت عند /app/data/orderak.db. لا تحذف هذا المجلد أبداً — فهو يحتوي على طلباتك ووردياتك. النسخ الاحتياطي موضح في القسم ٧.'),
  );

  children.push(
    b.h1('٥. الاستخدام اليومي'),
    b.h2('٥.١ تسجيل الدخول'),
    b.p('شاشة الدخول تعرض ٦ نقاط ولوحة أرقام. اكتب رمز PIN المكون من ٤ أرقام واضغط "دخول". بعد ٥ محاولات خاطئة يُقفل البرنامج محاولات الدخول لمدة ١٥ دقيقة (ميزة أمنية).'),
    b.h2('٥.٢ فتح الوردية'),
    b.p('بعد تسجيل الدخول ستنتقل إلى شاشة الوردية. أدخل مبلغ العهدة في الدرج — مثلاً النقدية الابتدائية لليوم — واضغط "فتح الوردية". يجب فتح وردية قبل استقبال الطلبات، ولا يمكن فتح أكثر من وردية واحدة لكل كاشير في نفس الوقت.'),
    b.h2('٥.٣ إنشاء طلب'),
    b.numbered('من شاشة الطلبات اضغط "+ طلب جديد".'),
    b.numbered('اختر نوع الطلب: صالة أو سفري أو توصيل.'),
    b.numbered('اضغط على الأصناف لإضافتها، واضغط مرة أخرى لزيادة الكمية. استخدم − / + للتعديل.'),
    b.numbered('أدخل اختيارياً اسم الزبون ورقم الهاتف، وعنوان التوصيل (لطلبات التوصيل).'),
    b.numbered('اضغط "حفظ ودفع" للانتقال مباشرة إلى الدفع، أو "حفظ + جديد" لحفظ الطلب والبدء بطلب آخر.'),
    b.h2('٥.٤ الدفع'),
    b.p('في شاشة الدفع ترى الأصناف والإجمالي والمبلغ المدفوع حتى الآن. اختر طريقة الدفع:'),
    b.table(
      ['الطريقة', 'متى تُستخدم'],
      [
        ['نقداً', 'النقدية في الدرج — بدون رقم مرجعي.'],
        ['بنكك / تحويل', 'التحويل البنكي — أدخل رقم المرجع.'],
        ['محفظة إلكترونية', 'المحفظة الرقمية (مثل بنكك) — أدخل رقم المرجع.'],
        ['آجل — دين (ATEL)', 'الدفع الآجل / على الحساب — أدخل رقم المرجع.'],
      ],
    ),
    b.p('أدخل المبلغ (أو اضغط "المتبقي" لتحصيل الباقي بالضبط) ثم اضغط زر الدفع. الدفع الجزئي مسموح: ادفع جزءاً الآن والباقي لاحقاً. عند اكتمال المبلغ ينتقل الطلب تلقائياً إلى حالة "مدفوع".'),
    b.h2('٥.٥ الطلبات المفتوحة والإلغاء'),
    b.p('شاشة الطلبات تعرض جميع الطلبات المفتوحة مع الوقت المنقضي. اضغط "دفع" لتحصيل دفعة، أو "إلغاء" لإلغاء الطلب (سيُطلب منك التأكيد). الطلب الملغى لا يصل إلى الخادم، فلا ينتج عنه مبيعات وهمية.'),
    b.h2('٥.٦ إغلاق الوردية'),
    b.numbered('في شاشة الوردية أدخل النقد الفعلي الموجود في الدرج.'),
    b.numbered('يحسب البرنامج النقد المتوقع (العهدة + مبيعات النقد) ويعرض الفرق:'),
    b.bullet('مطابق تماماً — الفرق صفر (أخضر).'),
    b.bullet('عجز في النقد — الدرج أقل من المتوقع (أحمر).'),
    b.bullet('زيادة في النقد — الدرج أكثر من المتوقع (كهرماني).'),
    b.numbered('أضف ملاحظة اختيارية واضغط "تأكيد إغلاق الوردية". تُغلق الوردية مع النقد المتوقع والفرق.'),
    b.p('نصيحة: إذا كانت لديك طلبات مفتوحة (غير مدفوعة) يحذّرك البرنامج قبل الإغلاق — قرر ما إذا كنت ستكملها أولاً.'),
    b.h2('٥.٧ إدارة القائمة (للمدير فقط)'),
    b.p('شاشة القائمة تتيح للمدير إدارة الأقسام والأصناف وتعديل الأسعار وتفعيل/تعطيل الأصناف وحذفها، وتطبيق تعديل أسعار جماعي (+5% و+10% و+15% و+20%) على كل الأصناف أو على القسم المحدد فقط. الكاشير سيحصل على خطأ 403 إذا حاول — تعديل القائمة للمدير فقط.'),
    b.h2('٥.٨ لوحة التحكم'),
    b.p('لوحة التحكم تعرض أرقاماً حقيقية محسوبة من بيانات الجهاز المحلية: إجمالي المبيعات، عدد الطلبات المدفوعة، متوسط الفاتورة، وصافي الربح (المبيعات مطروحاً منها تكلفة الأصناف).'),
    b.h2('٥.٩ العمل دون اتصال'),
    b.p('كل ما تفعله دون اتصال يُحفظ على الجهاز (IndexedDB) بحالة "قيد الانتظار". يعرض الشريط العلوي زر مزامنة مع عداد للعمليات المعلقة. عند عودة الإنترنت تُزامن البرنامج تلقائياً، ويمكنك أيضاً الضغط على زر "مزامنة" في أي وقت. بعد نجاح المزامنة يعود العداد إلى الصفر.'),
    b.h2('٥.١٠ تثبيت التطبيق (PWA)'),
    b.p('أثناء فتح الموقع في Chrome أو Edge يظهر في الشريط العلوي زر تثبيت. اضغط عليه لتثبيت أوردراك كتطبيق بملء الشاشة على الهاتف أو اللوحي أو الكمبيوتر، مثل التطبيقات الأصلية.'),
  );

  children.push(
    b.h1('٦. حل المشاكل'),
    b.table(
      ['المشكلة', 'الحل'],
      [
        ['الخادم لا يعمل في الإنتاج ("JWT_SECRET environment variable is required")', 'ضع قيمة JWT_SECRET قوية في متغيرات بيئة النشر (القسم ٤) وأعد النشر. هذا مقصود — سر معروف سيسمح لأي شخص بتزوير رموز الدخول.'],
        ['رسالة "محاولات كثيرة" عند الدخول', '٥ محاولات خاطئة تقفل الدخول لمدة ١٥ دقيقة. انتظر وأعد المحاولة — هذا يحمي رمز PIN من التخمين.'],
        ['عداد المزامنة لا يصل إلى الصفر', 'تأكد من اتصال الجهاز ثم اضغط زر المزامنة. إذا بقي عالقاً أعد تشغيل المتصفح.'],
        ['القائمة فارغة بعد أول تسجيل دخول', 'تُنزَّل القائمة تلقائياً بعد تسجيل الدخول. انتظر لحظة أو اضغط زر المزامنة.'],
        ['الطلب يعرض "..." بدلاً من الرقم', 'الرقم يُعطى من الخادم عند أول مزامنة ناجحة. يظهر تلقائياً عند الاتصال.'],
        ['نسيت رمز PIN أو تحتاج مستخدماً جديداً', 'في التطوير: عدّل apps/api/prisma/seed.ts وأعد تشغيل npm run db:seed (آمن للتكرار). على الخادم: حدّث جدول المستخدمين مباشرة في قاعدة البيانات.'],
        ['غيّرت بنية قاعدة البيانات وحدث خطأ', 'استخدم npm run db:migrate للتغييرات الآمنة. التغييرات المدمرة تتطلب npm run db:reset — وهي تمسح كل البيانات، فانسخ احتياطياً أولاً (القسم ٧).'],
        ['تعديل القائمة يفشل مع الكاشير', 'هذا صحيح — تعديل القائمة حصر على دور المدير (بالتصميم).'],
      ],
    ),
  );

  children.push(
    b.h1('٧. النسخ الاحتياطي واستعادة البيانات'),
    b.h2('Docker / الخادم (موصى به)'),
    b.p('نسخ احتياطي (نسخ ملف SQLite خارج المجلد):'),
    b.code('docker run --rm -v orderak-sqlite:/data -v $(pwd):/backup alpine cp /data/orderak.db /backup/'),
    b.p('الاستعادة: أوقف الخدمات، ضع ملف orderak.db المحفوظ داخل المجلد، ثم أعد التشغيل.'),
    b.h2('وضع التطوير'),
    b.p('قاعدة البيانات المحلية هي الملف apps/api/prisma/dev.db — فقط انسخه. (وهو مستثنى من Git فلا يُرفع بالخطأ.)'),
  );

  children.push(
    b.h1('٨. قائمة الأمان (قبل الاستخدام الفعلي)'),
    b.bullet('غيّر رموز PIN الافتراضية (1234 / 0000) — فهي معروفة للجميع.'),
    b.bullet('ضع JWT_SECRET عشوائياً طويلاً في الإنتاج (الخادم يرفض التشغيل بدونه).'),
    b.bullet('استخدم HTTPS — يوفرها Coolify تلقائياً لنطاقك.'),
    b.bullet('لا تعرض المنفذ 3001 للعموم؛ ادخل كل شيء عبر الواجهة (المنفذ 80).'),
    b.bullet('اعمل نسخاً احتياطية دورية لقاعدة البيانات (القسم ٧).'),
  );

  children.push(
    b.h1('٩. الاختبارات وبنية المشروع (للمطورين)'),
    b.h2('تشغيل الاختبارات'),
    b.code('npm test'),
    b.p('يشغّل اختبارات vitest للخادم (أرقام الطلبات، الحد من محاولات الدخول، معالجة الأخطاء) وللواجهة (قائمة المزامنة دون اتصال، الإلغاءات).'),
    b.h2('بنية المشروع'),
    b.code(
      'orderak-os/\n' +
        '\u251C\u2500 apps/\n' +
        '\u2502   \u251C\u2500 api/        خادم Express + Prisma + SQLite (المنفذ 3001)\n' +
        '\u2502   \u2514\u2500 web/        تطبيق React + Vite PWA (المنفذ 5173 في التطوير)\n' +
        '\u251C\u2500 docker-compose.yml   نشر الإنتاج (الخادم + nginx للواجهة)\n' +
        '\u251C\u2500 scripts/      سكربتات مساعدة (الأيقونات، هذا الدليل)\n' +
        '\u2514\u2500 AUDIT_REPORT.md  تقرير الأمان والأخطاء (تم إصلاحها جميعاً)',
    ),
    b.h2('أوامر npm المفيدة'),
    b.table(
      ['الأمر', 'الوظيفة'],
      [
        ['npm run dev', 'تشغيل الخادم (localhost:3001) والواجهة (localhost:5173) معاً'],
        ['npm run dev:api / dev:web', 'تشغيل الخادم أو الواجهة فقط'],
        ['npm run build', 'فحص وبناء التطبيقين للإنتاج'],
        ['npm test', 'تشغيل جميع الاختبارات الآلية'],
        ['npm run db:migrate', 'تطبيق تغييرات آمنة على قاعدة البيانات'],
        ['npm run db:reset', 'تغييرات مدمرة (تمسح البيانات — استخدم بحذر)'],
        ['npm run db:seed', 'تحميل المستخدمين الافتراضيين والقائمة'],
        ['npm run guide', 'إعادة توليد مستندات Word هذه'],
      ],
    ),
  );

  children.push(
    new Paragraph({
      spacing: { before: 300 },
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      children: [new TextRun({ text: '— نهاية الدليل —', size: 20, color: 'A8A29E', italics: true, rightToLeft: true })],
    }),
  );

  return children;
}

// ---------- Arabic deployment guide (beginners) ----------
function buildDeployArabic() {
  const b = makeBuilder(true);
  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 200, after: 60 },
      children: [new TextRun({ text: 'Orderak OS', bold: true, size: 56, color: BRAND, rightToLeft: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 60 },
      children: [new TextRun({ text: 'دليل النشر على الإنترنت خطوة بخطوة', size: 28, color: '57534E', rightToLeft: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'للمبتدئين تماماً — من شراء الخادم حتى أول طلب حقيقي', size: 24, color: '57534E', rightToLeft: true })],
    }),
    b.p('هذا الدليل مكمّل للدليل الرئيسي، مكتوب لمن ليس لديه خبرة سابقة بالخوادم. يأخذك خطوة بخطوة لنشر أوردراك على الإنترنت باستخدام VPS من Hostinger مع لوحة Coolify.', { center: true }),
  );

  children.push(
    b.h1('١. الفكرة في دقيقة واحدة'),
    b.p('برنامجك يتكون من واجهة (ما يراه الكاشير في المتصفح) وخادم (يحفظ الطلبات والبيانات). لتشغيله على الإنترنت تحتاج ثلاثة أشياء فقط:'),
    b.bullet('خادم VPS: كمبيوتر قوي تستأجره يعمل 24 ساعة (سنستخدم Hostinger).'),
    b.bullet('Coolify: لوحة تحكم مجانية تدير تشغيل البرنامج على الخادم بالضغط على الأزرار — لا تحتاج خبرة أوامر معقدة.'),
    b.bullet('نطاق (Domain): العنوان الذي يكتبه الكاشير مثل pos.matjar.com.'),
    b.p('ملاحظة مهمة: خطط الاستضافة المشتركة الرخيصة جداً في Hostinger لا تعمل مع هذا البرنامج — تحتاج خطط VPS تحديداً.'),
  );

  children.push(
    b.h1('٢. شراء الخادم من Hostinger'),
    b.numbered('ادخل إلى hostinger.com واختر قسم VPS Hosting.'),
    b.numbered('اختر خطة KVM 2 (معالجان وذاكرة 8GB) — تكفي عدة مطاعم معاً، ويمكن إضافة n8n للأتمتة لاحقاً على نفس الخادم.'),
    b.numbered('عند اختيار موقع الخادم اختر أوروبا (هولندا إن توفرت) — الأسرع استجابة من السودان.'),
    b.numbered('نظام التشغيل: Ubuntu 24.04 (أو 22.04).'),
    b.numbered('أكمل الشراء، ثم احتفظ برسالة الترحيب التي تحتوي على عنوان IP الخاص بالخادم وكلمة مرور root — هذه مفاتيح بيتك الجديد، لا تشاركها مع أحد.'),
    b.p('(الأسعار والخطاط تتغير — المهم: خطة KVM وليست استضافة مشتركة.)'),
  );

  children.push(
    b.h1('٣. الدخول إلى الخادم أول مرة'),
    b.numbered('من جهاز ويندوز افتح PowerShell (اضغط Start واكتب PowerShell).'),
    b.numbered('اتصل بالخادم بكتابة الأمر التالي بعد استبدال IP بعنوان خادمك:'),
    b.code('ssh root@IP'),
    b.numbered('أول مرة سيسألك هل تثق بالجهاز؟ اكتب yes ثم اضغط Enter، ثم أدخل كلمة المرور (لن ترى الأحرف أثناء الكتابة — هذا طبيعي).'),
    b.numbered('حدّث النظام بأمرين:'),
    b.code('apt update && apt upgrade -y'),
    b.p('تم — أنت الآن داخل الخادم. الخطوات القادمة كلها أوامر تنسخها وتلصقها هنا.'),
  );

  children.push(
    b.h1('٤. تثبيت Coolify'),
    b.numbered('الصق هذا الأمر الواحد وانتظر حتى ينتهي (دقائق قليلة):'),
    b.code('curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash'),
    b.numbered('في نهاية التثبيت ستظهر لك رسالة تحتوي رابط اللوحة (مثل http://IP:8000) وبيانات دخول مؤقتة — انسخها في مكان آمن فوراً.'),
    b.numbered('افتح الرابط في المتصفح وأنشئ حسابك الخاص، واحتفظ بكلمة المرور جيداً (استعادة كلمة المرور لاحقاً تتطلب إعدادات بريد، لذا الأفضل ألا تفقد أصلاً).'),
  );

  children.push(
    b.h1('٥. رفع المشروع إلى GitHub'),
    b.p('Coolify يسحب الكود من GitHub ويشغّله تلقائياً. تحتاج حساباً مجانياً ومستودعاً واحداً:'),
    b.numbered('أنشئ حساباً على github.com ثم مستودعاً جديداً باسم orderak-os واجعله Private.'),
    b.numbered('من نافذة PowerShell داخل مجلد المشروع على جهازك نفّذ:'),
    b.code('git init && git add . && git commit -m "Orderak OS"\ngit remote add origin https://github.com/USERNAME/orderak-os.git\ngit push -u origin master'),
    b.p('ملاحظة: عند الرفع قد يطلب GitHub اسم المستخدم ورمز وصول (Personal Access Token) بدل كلمة المرور — أنشئه من الإعدادات: Settings ← Developer settings ← Personal access tokens.'),
    b.p('قاعدة ذهبية من اليوم: أي تعديل مستقبلي على البرنامج = رفعه إلى GitHub ثم ضغطة Redeploy في Coolify.'),
  );

  children.push(
    b.h1('٦. إنشاء المشروع في Coolify'),
    b.numbered('في لوحة Coolify اضغط "+ New Resource" ← "Docker Compose" ← اختر مستودع orderak-os.'),
    b.numbered('في تبويب Environment Variables أضف متغيراً واحداً إلزامياً:'),
    b.table(
      ['المتغير', 'القيمة'],
      [
        ['JWT_SECRET', 'سلسلة عشوائية طويلة (32 حرفاً أو أكثر). ولّدها بأمر: openssl rand -base64 32 أو من مولّد كلمات مرور.'],
      ],
    ),
    b.numbered('اضغط Deploy وانتظر انتهاء البناء (أول مرة تستغرق عدة دقائق). عند الانتهاء سيبدأ البرنامج تلقائياً.'),
    b.p('تنبيه: لن يعمل الخادم بدون JWT_SECRET — هذا مقصود لحماية حسابات الدخول.'),
  );

  children.push(
    b.h1('٧. ربط النطاق (Domain)'),
    b.numbered('إذا لم تملك نطاقاً اشترِ واحداً (من Hostinger أو Namecheap) مثل orderak.com.'),
    b.numbered('في لوحة إدارة النطاق أضف سجل DNS نوع A لكل خدمة تريدها:'),
    b.table(
      ['السجل', 'الاسم (Host)', 'يشير إلى'],
      [
        ['A', 'pos', 'IP الخادم نفسه'],
        ['A', 'matjar2', 'IP الخادم نفسه (لكل مطعم جديد سجل جديد بنفس IP)'],
      ],
    ),
    b.numbered('ارجع إلى Coolify ← تبويب Domains ← ضع النطاق على خدمة web (وليس api)، مثال: https://pos.orderak.com'),
    b.numbered('سيصدر Coolify شهادة HTTPS تلقائياً خلال دقائق.'),
    b.numbered('انتظر انتشار DNS (من دقائق إلى ساعة) ثم افتح الموقع — يجب أن تظهر شاشة الدخول برمز PIN.'),
  );

  children.push(
    b.h1('٨. قائمة تجهيز أول مطعم (مهمة جداً)'),
    b.numbered('سجّل الدخول برمز المدير الافتراضي 1234.'),
    b.numbered('غيّر رموز PIN الافتراضية فوراً للمدير وللكاشير — فهي معروفة في الكود العام.'),
    b.numbered('احذف الأصناف التجريبية وأدخل قائمة المطعم الحقيقية: الأقسام والأصناف والأسعار والتكاليف.'),
    b.numbered('أنشئ حساب كاشير لكل موظف برمز خاص به.'),
    b.numbered('جرّب دورة كاملة قبل التسليم: فتح وردية ← طلب ← دفع ← إغلاق وردية.'),
    b.numbered('ثبّت التطبيق على أجهزة المحل بزر "تثبيت" (PWA) من Chrome/Edge.'),
    b.numbered('اعمل أول نسخة احتياطية (الأمر موجود في القسم السابع من الدليل الرئيسي).'),
  );

  children.push(
    b.h1('٩. الصيانة الدورية (بضع دقائق أسبوعياً)'),
    b.bullet('نسخة احتياطية أسبوعية على الأقل: نفّذ أمر النسخ من الدليل الرئيسي وانقل ملف قاعدة البيانات خارج الخادم (بريدك أو Google Drive).'),
    b.bullet('فعّل النسخ الاحتياطي التلقائي في لوحة Hostinger كطبقة أمان ثانية إن كانت خطتك تشمله.'),
    b.bullet('عند وجود تحديث جديد للبرنامج: ارفعه إلى GitHub ثم اضغط Redeploy في Coolify — بيانات العملاء لا تتأثر بالتحديث.'),
    b.bullet('راقب مساحة القرص والذاكرة من لوحة Hostinger مرة أسبوعياً.'),
  );

  children.push(
    b.h1('١٠. أتمتة اختيارية عبر n8n'),
    b.p('n8n منصة أتمتة مجانية يمكن تشغيلها على نفس الخادم دون أي تعارض مع أوردراك:'),
    b.numbered('في Coolify: "+ New Resource" ← اختر n8n من قائمة الخدمات الجاهزة (بنقرة واحدة).'),
    b.numbered('اربطها بالنطاق الفرعي مثل n8n.orderak.com.'),
    b.p('أفكار عملية للأتمتة: إرسال تقرير نهاية اليوم إلى واتساب أو تيليجرام، تنبيه عند وجود عجز نقدي في وردية، نسخ قاعدة البيانات تلقائياً كل ليلة. ليست ضرورية للتشغيل — أضفها متى استقر عملك.'),
  );

  children.push(
    b.h1('١١. أخطاء شائعة وحلولها'),
    b.table(
      ['المشكلة', 'الحل'],
      [
        ['صفحة فارغة أو صفحة nginx الترحيبية', 'النطاق موصول بخدمة خاطئة — تأكد أنه مربوط بـ web وليس api في تبويب Domains.'],
        ['الموقع لا يفتح بعد ربط النطاق', 'انتظر انتشار DNS حتى ساعة، وتأكد أن سجل A يشير إلى IP الخادم الصحيح.'],
        ['الخادم يبدأ ثم يتوقف فوراً', 'رسالة JWT_SECRET environment variable is required تعني أن المتغير غير مضبوط — أضفه في Environment Variables وأعد النشر.'],
        ['خطأ 502 Bad Gateway بعد الضغط Deploy', 'البناء لم ينته بعد — افتح Logs وتابع، أو انتظر دقيقتين وأعد تحميل الصفحة.'],
        ['نسيت كلمة مرور Coolify', 'استعادة كلمة المرور تحتاج إعداد بريد مسبقاً — لهذا احتفظ بها من البداية في مكان آمن.'],
      ],
    ),
  );

  children.push(
    new Paragraph({
      spacing: { before: 300 },
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      children: [new TextRun({ text: '— نهاية دليل النشر —', size: 20, color: 'A8A29E', italics: true, rightToLeft: true })],
    }),
  );

  return children;
}

// ---------- build & save ----------
function makeDoc(children) {
  return new Document({
    numbering: { config: [{ reference: 'steps', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }] }] },
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
    sections: [{ properties: {}, children }],
  });
}

const enBuffer = await Packer.toBuffer(makeDoc(buildEnglish()));
await writeFile('ORDERAK_GUIDE.docx', enBuffer);
console.log('Generated ORDERAK_GUIDE.docx (' + enBuffer.length + ' bytes)');

const arBuffer = await Packer.toBuffer(makeDoc(buildArabic()));
await writeFile('ORDERAK_GUIDE_AR.docx', arBuffer);
console.log('Generated ORDERAK_GUIDE_AR.docx (' + arBuffer.length + ' bytes)');

const deployBuffer = await Packer.toBuffer(makeDoc(buildDeployArabic()));
await writeFile('ORDERAK_DEPLOY_AR.docx', deployBuffer);
console.log('Generated ORDERAK_DEPLOY_AR.docx (' + deployBuffer.length + ' bytes)');

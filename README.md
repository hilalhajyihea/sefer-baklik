# ספר בקליק

אפליקציית קביעת תורים לספרים — כל ספר מקבל כתובת ייחודית (`/dani`) והלקוחות קובעים תור ישירות.

## הרצה מקומית

1. צרו קובץ `.env` לפי `.env.example`
2. התקינו והריצו:

```bash
npm install
npm run db:setup
npm run dev
```

פתחו [http://localhost:3000](http://localhost:3000)

- דף בית: `/`
- יומן דמו: `/dani`
- כניסת ספר: `/dani/login` (משתמש `dani` / סיסמת `DEMO_BARBER_PASSWORD`)
- מנהל מערכת: `/platform/login`

## SMS (019)

חשבון [019 SMS](https://019sms.co.il) אחד לכל הספרים — תשלום לפי הודעה.

1. צרו חשבון והפיקו API Token (הגדרות → ניהול טוקן API)
2. אשרו מזהה שולח (`source`, עד 11 תווים באנגלית/ספרות)
3. העתיקו ל-Environment ב-Render:
   - `SMS_019_USERNAME`
   - `SMS_019_TOKEN`
   - `SMS_019_SOURCE` (למשל `SaparBclick`)
4. בפאנל הספר → **הודעות SMS**: אישור תור, תזכורת, דקות לפני התור  
   בפאנל המערכת: הפעלת SMS / ביטול לקוח לכל ספר

בלי מפתחות 019 האפליקציה עובדת כרגיל וה-SMS מדולג (בלוג יופיע skip).

תיעוד: https://docs.019sms.co.il/

### תזכורות (Cron)

ב-Render צרו Cron Job (או השתמשו ב-Blueprint):

- Schedule: `*/5 * * * *` (כל 5 דקות)
- Command קורא ל: `POST/GET /api/cron/reminders` עם `Authorization: Bearer CRON_SECRET`
- משתנים: `APP_URL`, `CRON_SECRET` (אותו ערך כמו ב-Web Service)

## פריסה ל-Render + GitHub

1. Web Service `sefer-baklik` + מסד PostgreSQL נפרד (או Neon)
2. הגדירו: `DATABASE_URL`, `PLATFORM_PASSWORD`, מפתחות 019 (`SMS_019_*`), `CRON_SECRET`
3. ל-Cron: `APP_URL=https://YOUR-SERVICE.onrender.com` ואותו `CRON_SECRET`

### משתני סביבה

| משתנה | הסבר |
|--------|------|
| `DATABASE_URL` | חובה |
| `AUTH_SECRET` | סוד סשן |
| `PLATFORM_USERNAME` / `PLATFORM_PASSWORD` | מנהל מערכת |
| `SMS_019_USERNAME` / `SMS_019_TOKEN` / `SMS_019_SOURCE` | SMS via 019 |
| `CRON_SECRET` | הגנת endpoint תזכורות |
| `APP_URL` | כתובת האתר ל-Cron |
| `DEMO_BARBER_PASSWORD` | סיסמת ספר הדמו |

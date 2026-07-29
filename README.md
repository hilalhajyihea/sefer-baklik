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

## SMS (Twilio)

חשבון Twilio אחד לכל הספרים — תשלום לפי הודעה, לא לפי מספר ספרים.

1. צרו חשבון ב-[Twilio](https://www.twilio.com)
2. קנו / השתמשו במספר לשליחת SMS
3. העתיקו ל-Environment ב-Render:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER` (למשל `+1...`)
4. בפאנל הספר → **הודעות SMS**: אישור תור, תזכורת, דקות לפני התור

בלי מפתחות Twilio האפליקציה עובדת כרגיל וה-SMS מדולג (בלוג יופיע skip).

### תזכורות (Cron)

ב-Render צרו Cron Job (או השתמשו ב-Blueprint):

- Schedule: `*/5 * * * *` (כל 5 דקות)
- Command קורא ל: `POST/GET /api/cron/reminders` עם `Authorization: Bearer CRON_SECRET`
- משתנים: `APP_URL`, `CRON_SECRET` (אותו ערך כמו ב-Web Service)

## פריסה ל-Render + GitHub

1. Web Service `sefer-baklik` + מסד PostgreSQL נפרד (או Neon)
2. הגדירו: `DATABASE_URL`, `PLATFORM_PASSWORD`, מפתחות Twilio, `CRON_SECRET`
3. ל-Cron: `APP_URL=https://YOUR-SERVICE.onrender.com` ואותו `CRON_SECRET`

### משתני סביבה

| משתנה | הסבר |
|--------|------|
| `DATABASE_URL` | חובה |
| `AUTH_SECRET` | סוד סשן |
| `PLATFORM_USERNAME` / `PLATFORM_PASSWORD` | מנהל מערכת |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | SMS |
| `CRON_SECRET` | הגנת endpoint תזכורות |
| `APP_URL` | כתובת האתר ל-Cron |
| `DEMO_BARBER_PASSWORD` | סיסמת ספר הדמו |

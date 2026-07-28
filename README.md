# ספר בקליק

אפליקציית קביעת תורים לספרים — כל ספר מקבל כתובת ייחודית (`/dani`) והלקוחות קובעים תור ישירות.

## הרצה מקומית

1. צרו קובץ `.env`:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="change-me-to-a-long-random-string"
PLATFORM_USERNAME="admin"
PLATFORM_PASSWORD="choose-a-strong-password"
DEMO_BARBER_PASSWORD="barber123"
```

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

## פריסה ל-Render + GitHub

בתוכנית Free של Render אפשר **מסד נתונים אחד בלבד**.  
`render.yaml` יוצר רק Web Service; את `DATABASE_URL` מדביקים ידנית.

אפשר להשתמש באותו PostgreSQL של MoneyAndTax — הטבלאות של ספר בקליק לא מתנגשות בשמות (`Barber`, `Appointment` וכו').

1. ב-Render: פתחו את מסד הנתונים הקיים → העתיקו **External Database URL**
2. Blueprint / Web Service של `sefer-baklik`
3. הגדירו ידנית:
   - `DATABASE_URL` = ה-URL שהעתקתם
   - `PLATFORM_PASSWORD` = סיסמה חזקה
4. Deploy → `https://sefer-baklik.onrender.com`

### משתני סביבה

| משתנה | הסבר |
|--------|------|
| `DATABASE_URL` | **חובה** — External URL ממסד Render קיים (או Neon וכו') |
| `AUTH_SECRET` | סוד לסשן (נוצר אוטומטית ב-Blueprint) |
| `PLATFORM_USERNAME` | ברירת מחדל: `admin` |
| `PLATFORM_PASSWORD` | **חובה להגדיר ידנית** |
| `DEMO_BARBER_PASSWORD` | סיסמת ספר הדמו `dani` |

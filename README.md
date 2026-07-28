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

הקובץ `render.yaml` מגדיר Web Service + PostgreSQL נפרדים.

1. העלו את הקוד ל-GitHub
2. ב-Render: **New → Blueprint** → בחרו את ה-repo
3. הגדירו את `PLATFORM_PASSWORD` במשתני הסביבה
4. אחרי Deploy: `https://sefer-baklik.onrender.com`

### משתני סביבה

| משתנה | הסבר |
|--------|------|
| `DATABASE_URL` | מתמלא אוטומטית מ-Blueprint |
| `AUTH_SECRET` | סוד לסשן (נוצר אוטומטית) |
| `PLATFORM_USERNAME` | ברירת מחדל: `admin` |
| `PLATFORM_PASSWORD` | **חובה להגדיר ידנית** |
| `DEMO_BARBER_PASSWORD` | סיסמת ספר הדמו `dani` |

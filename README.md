# ניהול קהילה 2.0

פלטפורמה מלאה לניהול קהילה — Next.js 14, TypeScript, Tailwind CSS, Supabase, RTL עברית מלאה.

---

## מבנה הפרויקט

```
community-app/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (RTL, fonts, providers)
│   ├── page.tsx                # דף הבית / Landing page
│   ├── globals.css             # Global styles + Tailwind + Heebo font
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard layout (auth guard, sidebar, header)
│   │   └── page.tsx            # לוח בקרה ראשי
│   └── auth/
│       ├── login/page.tsx      # דף התחברות
│       └── register/page.tsx   # דף הרשמה
│
├── components/
│   ├── ui/                     # קומפוננטות UI בסיסיות
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Badge.tsx
│   ├── layout/                 # קומפוננטות Layout
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   └── providers/
│       └── SupabaseProvider.tsx  # Auth context
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   └── server.ts           # Server client (RSC)
│   └── utils.ts                # Helper functions (cn, formatDate, timeAgo...)
│
├── services/
│   ├── auth.ts                 # Auth operations (signIn, signUp, signOut...)
│   └── database.ts             # DB operations (getMembers, createMember...)
│
├── types/
│   ├── index.ts                # Application types
│   └── database.ts             # Supabase DB types
│
├── supabase/
│   └── schema.sql              # SQL לאתחול בסיס הנתונים
│
├── middleware.ts               # Auth middleware (route protection)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.local.example
```

---

## הוראות התקנה

### שלב 1 — דרישות מקדימות

- Node.js 18.17 או חדש יותר
- npm / yarn / pnpm
- חשבון Supabase (חינמי): https://supabase.com

---

### שלב 2 — הורדת הפרויקט

```bash
# העתק את תיקיית הפרויקט למקום הרצוי
cd /path/to/your/projects

# התקן תלויות
cd community-app
npm install
```

---

### שלב 3 — הגדרת Supabase

#### 3.1 — צור פרויקט חדש ב-Supabase
1. היכנס לכתובת: https://app.supabase.com
2. לחץ **"New project"**
3. בחר שם, סיסמה לבסיס הנתונים, ואזור (מומלץ: Frankfurt אירופה)
4. המתן עד שהפרויקט יהיה מוכן (~2 דקות)

#### 3.2 — אתחל את הסכמה
1. לחץ על **SQL Editor** בתפריט השמאלי
2. לחץ **"New query"**
3. העתק את תוכן `supabase/schema.sql` ולחץ **Run**

#### 3.3 — קבל את מפתחות ה-API
1. לחץ על **Project Settings** → **API**
2. העתק:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role secret** (`SUPABASE_SERVICE_ROLE_KEY`)

---

### שלב 4 — קובץ משתני סביבה

```bash
# צור קובץ .env.local מהדוגמה
cp .env.local.example .env.local
```

ערוך את `.env.local` והחלף את הערכים:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### שלב 5 — הגדרת Email Auth ב-Supabase

1. **Authentication** → **Providers** → ודא שـ**Email** מופעל
2. **Authentication** → **URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**`

---

## הרצה מקומית

```bash
# מצב פיתוח עם hot reload
npm run dev
```

הפרויקט יפתח בכתובת: **http://localhost:3000**

### פקודות נוספות

```bash
# בדיקת TypeScript
npm run type-check

# בדיקת Lint
npm run lint

# בניית Production build
npm run build

# הרצת Production build מקומית
npm run start
```

---

## הוספת סוגי TypeScript מ-Supabase (אוטומטי)

כדי לשמור על הסנכרון עם הסכמה של Supabase:

```bash
# התקן Supabase CLI
npm install -g supabase

# התחבר
supabase login

# ייצא טיפוסים
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  > types/database.ts
```

---

## פריסה ל-Production (Vercel)

```bash
# התקן Vercel CLI
npm install -g vercel

# פרוס
vercel

# הגדר משתני סביבה בדשבורד Vercel:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

לאחר הפריסה, עדכן ב-Supabase:
- **Authentication → URL Configuration → Site URL**: `https://your-domain.vercel.app`
- **Redirect URLs**: `https://your-domain.vercel.app/**`

---

## טיפים וטריקים

- **RTL**: כל HTML מוגדר עם `dir="rtl"` ו-`lang="he"` ב-`app/layout.tsx`
- **פונט Heebo**: נטען מ-Google Fonts, מותאם לעברית
- **Auth Guard**: ה-middleware מגן אוטומטית על כל ה-routes תחת `/dashboard`
- **Server Components**: `services/database.ts` רץ ב-Server Component בלבד
- **Client Components**: `services/auth.ts` רץ ב-Client Component בלבד

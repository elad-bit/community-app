# מערכת הצבעות וקיום פולים (Voting & Polling System)

מערכת הצבעות מלאה לאפליקציית ניהול קהילה עם תמיכה בהצבעות אנונימיות, מניעת הצבעות כפולות, וקטגוריות שונות.

## תיווך המערכת

### תכונות ראשיות

- **סוגי הצבעה**: אסיפה כללית (כל התושבים) או הצבעות ועד (מנהלים בלבד)
- **קטגוריות**: תקנון, תקציב, בחירות ועד, כללי
- **אנונימיות**: אפשרות להצבעה אנונימית או לא אנונימית
- **סטטוסים**: טיוטה, פתוח, סגור
- **מניעת הצבעות כפולות**: כל משתמש יכול להצביע פעם אחת בלבד בהצבעה
- **תוצאות בזמן אמת**: צפייה באחוזי וקול ביצוע הצבעה סגורה או כש מנהל

## קבצים שנוצרו

### 1. סוגי נתונים (Types)

**`/types/index.ts`** - נוספו סוגים חדשים:
- `PollType`: 'general_assembly' | 'committee'
- `PollStatus`: 'draft' | 'open' | 'closed'
- `PollCategory`: 'bylaw' | 'budget' | 'committee_election' | 'general'
- `PollOption`: אפשרות בודדת בהצבעה
- `Poll`: הצבעה עם כל הנתונים

### 2. API Routes

#### `GET /api/polls`
קבלת כל ההצבעות עבור הקהילה של המשתמש
- חוזר: מערך של Poll עם סימן has_voted ו-total_votes

#### `POST /api/polls`
יצירת הצבעה חדשה (מנהלים בלבד)
- דורש: title, options[], type, category, is_anonymous
- חוזר: הצבעה חדשה ב-status draft

#### `GET /api/polls/[id]`
קבלת הצבעה בודדת עם תוצאות מלאות
- חוזר: Poll עם options מפורטים, vote_count, voters (למנהלים בלבד אם אינו אנונימי)

#### `PUT /api/polls/[id]`
עדכון סטטוס הצבעה (מנהלים בלבד)
- דורש: status (open, closed)

#### `DELETE /api/polls/[id]`
מחיקת הצבעה (מנהלים בלבד, טיוטות בלבד)
- דורש: סטטוס = draft

#### `POST /api/polls/[id]/vote`
הצבעה בהצבעה
- דורש: option_id
- מנע כפילויות: בדוק poll_participants
- עבור committee polls: בדוק שהמשתמש הוא מנהל

### 3. דפי Dashboard

#### `app/dashboard/polls/page.tsx`
דף הצבעות ראשי (Server Component)
- מביא את כל ההצבעות של הקהילה
- מעביר ל-PollsClient עם initialPolls, isAdmin, userId

### 4. Components

#### `components/polls/PollsClient.tsx`
רכיב ניהול הצבעות עשיר (Client Component)
- **ממשק משתמש:**
  - Header עם כותרת "הצבעות" וכפתור "+ הצבעה חדשה"
  - טבים עבור סוגי הצבעה: אסיפה כללית | הצבעות ועד
  - תת-טבים עבור סטטוס: פתוחות | טיוטות | סגורות
  - כרטיסי הצבעה עם:
    - כותרת, תיאור, תגי קטגוריה וסטטוס
    - מספר קולות
    - אינדיקטור אנונימיות

- **פעולות admin:**
  - יצירת הצבעה חדשה
  - פתיחת טיוטות (draft → open)
  - סגירת הצבעות (open → closed)
  - מחיקת טיוטות

- **פעולות חברים:**
  - הצבעה בהצבעות פתוחות
  - צפייה בתוצאות (אם סגורה או כשהצביעו כבר)

- **מודלים:**
  - **VoteModal**: בחירת אפשרות והצבעה
  - **CreatePollModal**: יצירת הצבעה חדשה (מנהלים בלבד)
  - **ResultsModal**: צפייה בתוצאות עם גרפיקת עמודות

### 5. ניווט

#### `components/layout/Sidebar.tsx`
עדכן עם קישור "הצבעות" אחרי "משימות"

#### `components/layout/MobileNav.tsx`
עדכן עם קישור "הצבעות" בניווט נייד

### 6. Schema Database

#### `supabase/migrations/add_polls.sql`
יצור את הטבלאות הבאות:

- **polls**: הצבעה עם כל המטא-דטה
- **poll_options**: אפשרויות הצבעה
- **poll_votes**: הקולות (voter_id = null עבור הצבעות אנונימיות)
- **poll_participants**: מעקב אחרי מי הצביע (למניעת כפילויות)

RLS Policies מוטמעות להבטיח:
- משתמשים רואים הצבעות רק של הקהילה שלהם
- מנהלים בלבד יוצרים/עדכנים/מוחקים הצבעות
- כל משתמש יכול להצביע בהצבעות פתוחות

## זרימת משתמש

### מנהל - יצירת הצבעה

1. לחץ על "+ הצבעה חדשה"
2. מלא:
   - כותרת (חובה)
   - תיאור (אופציונלי)
   - סוג: אסיפה כללית או הצבעות ועד
   - קטגוריה: תקנון, תקציב, בחירות, או כללי
   - הצבעה אנונימית (checkbox)
   - אפשרויות (מינימום 2, הוסף/הסר כרצונך)
3. לחץ "יצור הצבעה"
4. הצבעה תיווצר ב-status draft

### מנהל - פתיחת הצבעה

1. מצא הצבעה ב-status draft
2. לחץ "פתח"
3. הצבעה תשתנה ל-status open וחברים יוכלו להצביע

### חבר - הצבעה בהצבעה

1. לחץ על הצבעה עם status open
2. בחר אפשרות מהרדיו בטונים
3. לחץ "הצבע"
4. הקול נשמר, תוצאות מתעדכנות

### כל אחד - צפייה בתוצאות

1. לחץ "תוצאות" על הצבעה סגורה או אם כבר הצבעת
2. צפה בגרפיקת עמודות עם אחוזים

## דוגמת API

### יצירת הצבעה
```bash
curl -X POST http://localhost:3000/api/polls \
  -H "Content-Type: application/json" \
  -d '{
    "title": "בחירות חברי ועד 2026",
    "description": "בחר 3 חברים לועד",
    "type": "committee",
    "category": "committee_election",
    "is_anonymous": true,
    "options": ["יוסי כהן", "מרים לוי", "דוד שמעוני", "שרה משה"]
  }'
```

### הצבעה
```bash
curl -X POST http://localhost:3000/api/polls/[poll-id]/vote \
  -H "Content-Type: application/json" \
  -d '{
    "option_id": "[option-id]"
  }'
```

### קבלת תוצאות
```bash
curl http://localhost:3000/api/polls/[poll-id]
```

## Security

### Double-Vote Prevention
- כל משתמש נשמר ב-poll_participants עם poll_id + user_id unique constraint
- בפוסט לאפשרות הצבעה, בדוק אם משתמש כבר ב-poll_participants
- אם כן, החזר 409 Conflict

### Anonymous Voting
- עבור הצבעות אנונימיות, poll_votes.voter_id = null
- עבור הצבעות לא אנונימיות, poll_votes.voter_id = auth.uid()
- מנהלים רואים voters רק להצבעות לא אנונימיות

### Committee-Only Polls
- הצבעה ב-committee poll דורשת role = admin (get_my_resident_role)
- אם לא admin, החזר 403 Forbidden

### RLS Policies
- משתמשים רואים הצבעות רק אם tenant_id שלהם תואם
- מנהלים בלבד יוצרים/עדכנים/מוחקים הצבעות

## תלויות

- TypeScript for type safety
- Next.js 14 App Router
- Tailwind CSS for styling (primary-*, secondary-* classes)
- Supabase for DB & auth
- clsx for className utilities

## HTML & Styling

- RTL (dir="rtl") בכל המודלים
- Tailwind colors: primary-600, secondary-200, etc.
- Card component מ-components/ui/Card
- Button component עם variants: primary, secondary, outline, danger
- Toast notifications עם useToast()

## בדיקות

1. בחן יצירת הצבעה כמנהל
2. בחן פתיחת הצבעה
3. בחן הצבעה כחבר (צריך לעבוד)
4. בחן הצבעה שנייה כחבר (צריך לכשל עם 409)
5. בחן עצירה של הצבעה ותצוגת תוצאות
6. בחן הצבעה אנונימית (voters אינו חושף שמות)
7. בחן הצבעה של ועד (רק מנהלים יכולים)

## הודעות שגיאה (Hebrew)

- "לא מחובר" - משתמש לא authenticated
- "לא משויך לקהילה" - משתמש ללא tenant
- "אין הרשאה" - משתמש אינו מנהל
- "הצבעה לא נמצאה" - poll לא קיים או לא לקהילה זו
- "ההצבעה אינה פתוחה" - status ≠ open
- "כבר הצבעת בהצבעה זו" - משתמש כבר ב-poll_participants
- "הצבעה זו מיועדת לחברי ועד בלבד" - committee poll, user ≠ admin
- "נדרש לבחור אפשרות" - option_id חסר
- "אפשרות לא תקינה" - option_id לא שייך ל-poll

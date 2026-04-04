#!/bin/bash
# ===================================================
# סקריפט העלאה ל-GitHub + Netlify
# הרץ אותו מתוך תיקיית community-app
# ===================================================

set -e

echo "🚀 מתחיל תהליך העלאה..."

# 1. נקה git קיים אם יש
rm -rf .git

# 2. אתחל git מחדש
git init
git branch -M main
git config user.email "elad@gaminglegend.co.il"
git config user.name "Elad"

# 3. הוסף את כל הקבצים
git add .

# 4. בצע commit ראשוני
git commit -m "Initial commit — ניהול קהילה 2.0

Next.js 14 + TypeScript + Tailwind + Supabase
RTL Hebrew community management SaaS"

echo ""
echo "✅ Git מוכן! עכשיו:"
echo ""
echo "1. צור repository חדש ב-GitHub:"
echo "   → https://github.com/new"
echo "   → שם: community-app"
echo "   → אל תסמן 'Initialize with README'"
echo ""
echo "2. חבר ודחוף (החלף YOUR_USERNAME):"
echo "   git remote add origin https://github.com/YOUR_USERNAME/community-app.git"
echo "   git push -u origin main"
echo ""
echo "3. פתח Netlify:"
echo "   → https://app.netlify.com"
echo "   → 'Add new site' → 'Import an existing project'"
echo "   → בחר GitHub → בחר community-app"
echo ""
echo "4. הגדרות Build ב-Netlify:"
echo "   Build command: npm run build"
echo "   Publish directory: .next"
echo ""
echo "5. הוסף Environment Variables ב-Netlify:"
echo "   NEXT_PUBLIC_SUPABASE_URL = (מתוך .env.local שלך)"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY = (מתוך .env.local שלך)"
echo "   SUPABASE_SERVICE_ROLE_KEY = (מתוך .env.local שלך)"
echo ""
echo "🎉 האתר שלך יהיה חי!"

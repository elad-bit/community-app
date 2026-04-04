import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <span className="inline-block bg-primary-100 text-primary-700 text-sm font-medium px-4 py-2 rounded-full mb-4">
              🚀 ניהול קהילה 2.0
            </span>
          </div>

          <h1 className="text-5xl font-bold text-secondary-900 mb-6 leading-tight">
            ברוכים הבאים לפלטפורמה
            <span className="text-primary-600 block mt-2">לניהול קהילה</span>
          </h1>

          <p className="text-xl text-secondary-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            הכלי המתקדם ביותר לניהול הקהילה שלך. חברים, תוכן, אנליטיקה — הכל
            במקום אחד.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" variant="primary">
                התחל בחינם
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline">
                התחברות
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full px-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-6 shadow-sm border border-secondary-100 hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-secondary-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

const features = [
  {
    icon: "👥",
    title: "ניהול חברים",
    description: "נהל את חברי הקהילה שלך בקלות עם כלים מתקדמים לסינון וסיווג.",
  },
  {
    icon: "📊",
    title: "אנליטיקה מתקדמת",
    description: "קבל תובנות עמוקות על הקהילה שלך עם דוחות ותרשימים בזמן אמת.",
  },
  {
    icon: "🔔",
    title: "התראות חכמות",
    description: "קבל עדכונים מיידיים על פעילות חשובה בקהילה שלך.",
  },
];

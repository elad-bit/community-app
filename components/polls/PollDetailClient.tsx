"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Poll, PollOption } from "@/types/index";

interface Props {
  poll: Poll;
  isAdmin: boolean;
  userId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  bylaw: "תקנון",
  budget: "תקציב",
  committee_election: "בחירות ועד",
  general: "כללי",
};

const TYPE_LABELS: Record<string, string> = {
  general_assembly: "אסיפה כללית",
  committee: "ועד",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "טיוטה",
  open: "פתוחה",
  closed: "סגורה",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  open: "bg-green-100 text-green-700",
  closed: "bg-red-100 text-red-700",
};

export function PollDetailClient({ poll: initialPoll, isAdmin, userId }: Props) {
  const router = useRouter();
  const [poll, setPoll] = useState<Poll>(initialPoll);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"vote" | "results" | "voters">(
    initialPoll.has_voted || initialPoll.status === "closed" ? "results" : "vote"
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canVote = poll.status === "open" && !poll.has_voted;
  const showResults = poll.has_voted || poll.status === "closed" || isAdmin;
  const maxVotes = Math.max(...(poll.options || []).map((o: PollOption) => o.vote_count || 0), 1);

  async function handleVote() {
    if (!selectedOption) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_id: selectedOption }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "שגיאה בהצבעה"); return; }
      setSuccess("הצבעתך נרשמה בהצלחה!");
      // Refresh poll data
      const refreshRes = await fetch(`/api/polls/${poll.id}`);
      const refreshJson = await refreshRes.json();
      if (refreshJson.data) setPoll(refreshJson.data);
      setActiveTab("results");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: "draft" | "open" | "closed") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/polls/${poll.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "שגיאה בעדכון סטטוס"); return; }
      setPoll(prev => ({ ...prev, status: newStatus }));
      setSuccess(`סטטוס עודכן ל-${STATUS_LABELS[newStatus]}`);
      setTimeout(() => setSuccess(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/polls/${poll.id}`, { method: "DELETE" });
      if (res.ok) router.push("/dashboard/polls");
      else setError("שגיאה במחיקה");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6" dir="rtl">
      {/* Back button */}
      <button
        onClick={() => router.push("/dashboard/polls")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        ← חזור להצבעות
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[poll.status]}`}>
                {poll.status === "open" ? "🟢" : poll.status === "draft" ? "⚪" : "🔴"} {STATUS_LABELS[poll.status]}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                {TYPE_LABELS[poll.type]}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                {CATEGORY_LABELS[poll.category]}
              </span>
              {poll.is_anonymous && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  🔒 אנונימית
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{poll.title}</h1>
            {poll.description && (
              <p className="text-gray-600 text-sm leading-relaxed">{poll.description}</p>
            )}
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div className="flex flex-col gap-2 items-end">
              {poll.status === "draft" && (
                <button
                  onClick={() => handleStatusChange("open")}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  🚀 פתח הצבעה
                </button>
              )}
              {poll.status === "open" && (
                <button
                  onClick={() => handleStatusChange("closed")}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  🔒 סגור הצבעה
                </button>
              )}
              {poll.status === "closed" && (
                <button
                  onClick={() => handleStatusChange("open")}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  🔓 פתח מחדש
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-white border border-red-300 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors"
              >
                🗑 מחק
              </button>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
          <span>🗳 <strong className="text-gray-900">{poll.total_votes || 0}</strong> הצביעו</span>
          {poll.starts_at && (
            <span>📅 נפתחה: <strong className="text-gray-900">{new Date(poll.starts_at).toLocaleDateString("he-IL")}</strong></span>
          )}
          {poll.ends_at && (
            <span>⏱ נסגרת: <strong className="text-gray-900">{new Date(poll.ends_at).toLocaleDateString("he-IL")}</strong></span>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
        {canVote && (
          <button
            onClick={() => setActiveTab("vote")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "vote" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🗳 הצבע
          </button>
        )}
        {showResults && (
          <button
            onClick={() => setActiveTab("results")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "results" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📊 תוצאות
          </button>
        )}
        {isAdmin && !poll.is_anonymous && (
          <button
            onClick={() => setActiveTab("voters")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "voters" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            👥 מצביעים
          </button>
        )}
      </div>

      {/* Vote tab */}
      {activeTab === "vote" && canVote && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-1">בחר את עמדתך</h2>
          <p className="text-xs text-gray-500 mb-4">
            {poll.is_anonymous ? "🔒 הצבעתך אנונימית — זהותך לא תישמר" : "👤 הצבעה גלויה — שמך יופיע ברשימת המצביעים"}
          </p>
          <div className="space-y-3 mb-6">
            {(poll.options || []).map((option: PollOption) => (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-right transition-all ${
                  selectedOption === option.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedOption === option.id ? "border-blue-500 bg-blue-500" : "border-gray-300"
                }`}>
                  {selectedOption === option.id && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className="font-medium text-gray-800 flex-1">{option.text}</span>
              </button>
            ))}
          </div>
          <button
            onClick={handleVote}
            disabled={!selectedOption || loading}
            className="w-full py-3.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "שולח הצבעה..." : "✓ שלח הצבעה"}
          </button>
        </div>
      )}

      {/* Already voted notice (if on vote tab and already voted) */}
      {activeTab === "vote" && !canVote && poll.status === "open" && poll.has_voted && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="font-bold text-green-700">כבר הצבעת בהצבעה זו</p>
          <p className="text-sm text-green-600 mt-1">ההצבעה נרשמה בהצלחה</p>
        </div>
      )}

      {/* Results tab */}
      {activeTab === "results" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-4">
            תוצאות {poll.status === "open" ? "(בזמן אמת)" : "סופיות"}
          </h2>
          {(poll.total_votes || 0) === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">🗳</div>
              <p className="text-sm">טרם הוגשו הצבעות</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(poll.options || []).map((option: PollOption) => {
                const count = option.vote_count || 0;
                const pct = poll.total_votes ? Math.round((count / poll.total_votes) * 100) : 0;
                const isWinner = count === maxVotes && count > 0;
                return (
                  <div key={option.id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-sm font-semibold ${isWinner ? "text-blue-700" : "text-gray-700"}`}>
                        {isWinner && "🏆 "}{option.text}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{count} ({pct}%)</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isWinner ? "bg-blue-500" : "bg-gray-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-3 border-t border-gray-100 text-sm text-gray-500 text-center">
                סה&quot;כ {poll.total_votes} הצבעות
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voters tab (admin, non-anonymous) */}
      {activeTab === "voters" && isAdmin && !poll.is_anonymous && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">רשימת מצביעים ({(poll.voters || []).length})</h2>
            <p className="text-xs text-gray-500 mt-0.5">הצבעה גלויה — רשימה נראית לאדמין בלבד</p>
          </div>
          {(poll.voters || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-2xl mb-2">👥</div>
              <p className="text-sm">טרם הוגשו הצבעות</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {(poll.voters || []).map((voter, idx) => (
                <div key={voter.user_id} className="flex items-center gap-3 px-6 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {voter.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{voter.name}</p>
                    <p className="text-xs text-gray-400">
                      {voter.voted_at ? new Date(voter.voted_at).toLocaleString("he-IL") : ""}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">#{idx + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 text-lg mb-2">מחק הצבעה</h3>
            <p className="text-gray-600 text-sm mb-6">
              האם למחוק את ההצבעה <strong>{poll.title}</strong>? פעולה זו אינה ניתנת לביטול.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                ביטול
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
              >
                {loading ? "מוחק..." : "מחק"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import type { Poll, PollOption, PollStatus, PollType, PollCategory } from "@/types/index";

interface PollsClientProps {
  initialPolls: Poll[];
  isAdmin: boolean;
  userId: string;
}

const POLL_TYPES: { value: PollType; label: string }[] = [
  { value: "general_assembly", label: "אסיפה כללית" },
  { value: "committee", label: "הצבעות ועד" },
];

const POLL_CATEGORIES: { value: PollCategory; label: string }[] = [
  { value: "bylaw", label: "תקנון" },
  { value: "budget", label: "תקציב" },
  { value: "committee_election", label: "בחירות ועד" },
  { value: "general", label: "כללי" },
];

const POLL_STATUSES: { value: PollStatus; label: string }[] = [
  { value: "draft", label: "טיוטה" },
  { value: "open", label: "פתוח" },
  { value: "closed", label: "סגור" },
];

function getCategoryLabel(category: PollCategory) {
  return POLL_CATEGORIES.find(c => c.value === category)?.label || category;
}

function getStatusLabel(status: PollStatus) {
  return POLL_STATUSES.find(s => s.value === status)?.label || status;
}

function getTypeLabel(type: PollType) {
  return POLL_TYPES.find(t => t.value === type)?.label || type;
}

function getCategoryColor(category: PollCategory) {
  const colors: Record<PollCategory, string> = {
    bylaw: "bg-blue-100 text-blue-700",
    budget: "bg-green-100 text-green-700",
    committee_election: "bg-purple-100 text-purple-700",
    general: "bg-gray-100 text-gray-700",
  };
  return colors[category];
}

function getStatusColor(status: PollStatus) {
  const colors: Record<PollStatus, string> = {
    draft: "bg-gray-100 text-gray-700",
    open: "bg-green-100 text-green-700",
    closed: "bg-red-100 text-red-700",
  };
  return colors[status];
}

function VoteModal({ poll, isOpen, onClose, userId }: {
  poll: Poll | null;
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}) {
  const toast = useToast();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = async () => {
    if (!poll || !selectedOption) {
      toast.error("נא בחר אפשרות");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_id: selectedOption }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה בהצבעה");

      toast.success("הצבעתך נשלחה בהצלחה!");
      onClose();
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה בהצבעה");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !poll) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-secondary-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-secondary-900">{poll.title}</h2>
          <button onClick={onClose} className="text-secondary-500 hover:text-secondary-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {poll.description && (
            <p className="text-sm text-secondary-600">{poll.description}</p>
          )}

          <div className="space-y-3">
            {(poll.options || []).map((option: PollOption) => (
              <label key={option.id} className="flex items-center gap-3 p-3 rounded-lg border-2 border-secondary-200 hover:border-primary-400 cursor-pointer transition-all">
                <input
                  type="radio"
                  name="poll-option"
                  value={option.id}
                  checked={selectedOption === option.id}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="w-5 h-5 text-primary-600"
                />
                <span className="flex-1 text-secondary-700 font-medium">{option.text}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-secondary-50 border-t border-secondary-200 p-6 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            ביטול
          </Button>
          <Button
            onClick={handleVote}
            isLoading={isLoading}
            disabled={!selectedOption || isLoading}
            className="flex-1"
          >
            הצבע
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreatePollModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PollType>("general_assembly");
  const [category, setCategory] = useState<PollCategory>("general");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [optionTexts, setOptionTexts] = useState(["", ""]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddOption = () => {
    setOptionTexts([...optionTexts, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (optionTexts.length > 2) {
      setOptionTexts(optionTexts.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...optionTexts];
    newOptions[index] = value;
    setOptionTexts(newOptions);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("כותרת חובה");
      return;
    }

    const validOptions = optionTexts.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast.error("נדרשות לפחות 2 אפשרויות");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          category,
          is_anonymous: isAnonymous,
          options: validOptions,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה ביצירת הצבעה");

      toast.success("הצבעה נוצרה בהצלחה!");
      onClose();
      window.location.reload();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה ביצירת הצבעה");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-secondary-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-secondary-900">הצבעה חדשה</h2>
          <button onClick={onClose} className="text-secondary-500 hover:text-secondary-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">כותרת</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="הזן כותרת הצבעה"
              className="w-full px-4 py-2 rounded-lg border border-secondary-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">תיאור (אופציונלי)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור ההצבעה"
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-secondary-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">סוג הצבעה</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PollType)}
                className="w-full px-4 py-2 rounded-lg border border-secondary-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {POLL_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">קטגוריה</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PollCategory)}
                className="w-full px-4 py-2 rounded-lg border border-secondary-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {POLL_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-secondary-200 cursor-pointer hover:border-primary-300 transition-all">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-5 h-5 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-secondary-700">הצבעה אנונימית</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-3">אפשרויות הצבעה</label>
            <div className="space-y-2">
              {optionTexts.map((text, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`אפשרות ${index + 1}`}
                    className="flex-1 px-4 py-2 rounded-lg border border-secondary-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {optionTexts.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleAddOption}
              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + הוסף אפשרות
            </button>
          </div>
        </div>

        <div className="sticky bottom-0 bg-secondary-50 border-t border-secondary-200 p-6 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={isLoading}
            className="flex-1"
          >
            יצור הצבעה
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResultsModal({ poll, isOpen, onClose }: {
  poll: Poll | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !poll) return null;

  const options = poll.options || [];
  const maxVotes = Math.max(...options.map((o: PollOption) => o.vote_count || 0), 1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-secondary-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-secondary-900">{poll.title}</h2>
            <p className="text-sm text-secondary-500 mt-1">סה&quot;כ קולות: {poll.total_votes}</p>
          </div>
          <button onClick={onClose} className="text-secondary-500 hover:text-secondary-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {options.map((option: PollOption) => {
            const percentage = poll.total_votes ? Math.round((option.vote_count || 0) / poll.total_votes * 100) : 0;
            return (
              <div key={option.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-secondary-900">{option.text}</span>
                  <span className="text-sm text-secondary-600">{option.vote_count || 0} קול ({percentage}%)</span>
                </div>
                <div className="w-full bg-secondary-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary-600 h-full transition-all duration-300"
                    style={{ width: `${(option.vote_count || 0) / maxVotes * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-secondary-50 border-t border-secondary-200 p-6">
          <Button onClick={onClose} variant="primary" className="w-full">
            סגור
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PollsClient({ initialPolls, isAdmin, userId }: PollsClientProps) {
  const toast = useToast();
  const router = useRouter();

  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [selectedType, setSelectedType] = useState<PollType>("general_assembly");
  const [selectedStatus, setSelectedStatus] = useState<PollStatus | "all">("open");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [voteModalOpen, setVoteModalOpen] = useState(false);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredPolls = polls.filter(p => {
    const matchType = p.type === selectedType;
    const matchStatus = selectedStatus === "all" || p.status === selectedStatus;
    return matchType && matchStatus;
  });

  const handleOpenPoll = async (pollId: string) => {
    setActionLoading(pollId);
    try {
      const res = await fetch(`/api/polls/${pollId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "open" }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה");

      setPolls(prev => prev.map(p => p.id === pollId ? { ...p, status: "open" } : p));
      toast.success("ההצבעה נפתחה בהצלחה");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    setActionLoading(pollId);
    try {
      const res = await fetch(`/api/polls/${pollId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה");

      setPolls(prev => prev.map(p => p.id === pollId ? { ...p, status: "closed" } : p));
      toast.success("ההצבעה סגורה בהצלחה");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק הצבעה זו?")) return;

    setActionLoading(pollId);
    try {
      const res = await fetch(`/api/polls/${pollId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה");

      setPolls(prev => prev.filter(p => p.id !== pollId));
      toast.success("ההצבעה נמחקה בהצלחה");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVote = (poll: Poll) => {
    setSelectedPoll(poll);
    setVoteModalOpen(true);
  };

  const handleViewResults = (poll: Poll) => {
    setSelectedPoll(poll);
    setResultsModalOpen(true);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">הצבעות</h1>
          <p className="text-sm text-secondary-500 mt-0.5">{polls.length} הצבעות סה&quot;כ</p>
        </div>
        {isAdmin && (
          <Button size="lg" onClick={() => setCreateModalOpen(true)} className="shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            הצבעה חדשה
          </Button>
        )}
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 border-b border-secondary-200">
        {POLL_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => { setSelectedType(t.value); setSelectedStatus("open"); }}
            className={clsx(
              "px-4 py-3 font-medium transition-all border-b-2",
              selectedType === t.value
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-secondary-600 hover:text-secondary-900"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedStatus("all")}
          className={clsx(
            "px-4 py-2 rounded-lg font-medium transition-all",
            selectedStatus === "all"
              ? "bg-primary-100 text-primary-700"
              : "text-secondary-600 hover:bg-secondary-100"
          )}
        >
          הכל
        </button>
        {["open", "draft", "closed"].map(status => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status as PollStatus)}
            className={clsx(
              "px-4 py-2 rounded-lg font-medium transition-all",
              selectedStatus === status
                ? "bg-primary-100 text-primary-700"
                : "text-secondary-600 hover:bg-secondary-100"
            )}
          >
            {getStatusLabel(status as PollStatus)}
          </button>
        ))}
      </div>

      {/* Poll cards */}
      <div className="grid gap-4">
        {filteredPolls.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-secondary-500">אין הצבעות בקטגוריה זו</p>
          </Card>
        ) : (
          filteredPolls.map(poll => (
            <Card key={poll.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h3
                    className="text-lg font-bold text-secondary-900 cursor-pointer hover:text-primary-600 transition-colors"
                    onClick={() => router.push(`/dashboard/polls/${poll.id}`)}
                  >{poll.title}</h3>
                  {poll.description && (
                    <p className="text-sm text-secondary-600 mt-1 line-clamp-2">{poll.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {poll.is_anonymous && (
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                      אנונימית
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", getCategoryColor(poll.category))}>
                  {getCategoryLabel(poll.category)}
                </span>
                <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", getStatusColor(poll.status))}>
                  {getStatusLabel(poll.status)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-secondary-600">
                  <span>🗳️ {poll.total_votes} קול</span>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/polls/${poll.id}`)}>
                    פרטים
                  </Button>
                  {poll.status === "open" && !poll.has_voted && (
                    <Button size="sm" onClick={() => handleVote(poll)}>
                      הצבע
                    </Button>
                  )}

                  {(poll.status === "open" || poll.status === "closed") && (
                    <Button size="sm" variant="outline" onClick={() => handleViewResults(poll)}>
                      תוצאות
                    </Button>
                  )}

                  {isAdmin && poll.status === "draft" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPoll(poll.id)}
                        isLoading={actionLoading === poll.id}
                      >
                        פתח
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeletePoll(poll.id)}
                        isLoading={actionLoading === poll.id}
                      >
                        מחק
                      </Button>
                    </>
                  )}

                  {isAdmin && poll.status === "open" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleClosePoll(poll.id)}
                      isLoading={actionLoading === poll.id}
                    >
                      סגור
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <VoteModal poll={selectedPoll} isOpen={voteModalOpen} onClose={() => setVoteModalOpen(false)} userId={userId} />
      <CreatePollModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      <ResultsModal poll={selectedPoll} isOpen={resultsModalOpen} onClose={() => setResultsModalOpen(false)} />
    </div>
  );
}

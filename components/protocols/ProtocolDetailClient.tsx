"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type {
  Protocol, ProtocolDecision, ProtocolSignature,
  ProtocolType, SignerRole
} from "@/types/index";
import { SignatureCanvas } from "./SignatureCanvas";

type TabId = "overview" | "decisions" | "signatures" | "file";

const TYPE_LABELS: Record<ProtocolType, string> = {
  committee: "ועד",
  general_assembly: "אסיפה כללית",
  association: "אגודה",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  processing: "bg-yellow-100 text-yellow-700",
  ready: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
};
const STATUS_LABELS: Record<string, string> = {
  draft: "טיוטה",
  processing: "מנתח...",
  ready: "מוכן לסקירה",
  approved: "מאושר",
};

const VOTE_RESULT_LABELS: Record<string, string> = {
  approved: "אושר",
  rejected: "נדחה",
  tabled: "נדחה לדיון",
};

const SIGNER_LABELS: Record<SignerRole, string> = {
  chairman: 'יו"ר הוועד',
  community_manager: "מנהל הקהילה",
  committee_seal: "חותמת הוועד",
};

interface ProtocolDetailClientProps {
  protocol: Protocol & {
    protocol_decisions: ProtocolDecision[];
    protocol_signatures: ProtocolSignature[];
  };
  canManage: boolean;
}

export function ProtocolDetailClient({ protocol: initial, canManage }: ProtocolDetailClientProps) {
  const router = useRouter();
  const [protocol, setProtocol] = useState(initial);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [decisionModal, setDecisionModal] = useState<ProtocolDecision | null>(null);

  const decisions = protocol.protocol_decisions ?? [];
  const signatures = protocol.protocol_signatures ?? [];
  const pending = decisions.filter((d) => d.status === "pending_review");
  const approved = decisions.filter((d) => d.status === "approved");
  const rejected = decisions.filter((d) => d.status === "rejected");

  const refresh = async () => {
    const res = await fetch(`/api/protocols/${protocol.id}`);
    const json = await res.json();
    if (json.data) setProtocol(json.data);
  };

  const handleUpload = async (file: File) => {
    setUploadLoading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/protocols/${protocol.id}/upload`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { setUploadError(json.error || "שגיאת העלאה"); return; }
      await refresh();
    } catch {
      setUploadError("שגיאת רשת");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const res = await fetch(`/api/protocols/${protocol.id}/analyze`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setAnalyzeError(json.error || "שגיאת ניתוח"); return; }
      await refresh();
      setActiveTab("decisions");
    } catch {
      setAnalyzeError("שגיאת רשת");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSign = async (signer_role: SignerRole, signature_data: string) => {
    const res = await fetch(`/api/protocols/${protocol.id}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signer_role, signature_data }),
    });
    if (res.ok) await refresh();
  };

  const handleClearSign = async (signer_role: SignerRole) => {
    await fetch(`/api/protocols/${protocol.id}/sign?role=${signer_role}`, { method: "DELETE" });
    await refresh();
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: "overview", label: "סקירה כללית" },
    { id: "decisions", label: "החלטות", badge: decisions.length },
    { id: "signatures", label: "חתימות", badge: signatures.length },
    { id: "file", label: "קובץ" },
  ];

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-secondary-100 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => router.push("/dashboard/protocols")}
                className="text-sm text-secondary-400 hover:text-secondary-600 transition-colors"
              >
                ← פרוטוקולים
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-secondary-900">{protocol.title}</h1>
              <span className="text-sm font-medium text-secondary-500 bg-secondary-100 px-2 py-0.5 rounded-full">
                {TYPE_LABELS[protocol.protocol_type]}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[protocol.status]}`}>
                {STATUS_LABELS[protocol.status]}
              </span>
            </div>
            <p className="text-sm text-secondary-500 mt-1">
              {formatDate(protocol.meeting_date)}
              {protocol.meeting_number && ` • ישיבה #${protocol.meeting_number}`}
              {protocol.association_name && ` • ${protocol.association_name}`}
            </p>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {protocol.raw_text && !protocol.ai_processed && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      מנתח...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      ניתוח AI
                    </>
                  )}
                </button>
              )}
              {protocol.ai_processed && protocol.raw_text && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="text-sm text-secondary-500 hover:text-secondary-700 underline"
                >
                  נתח מחדש
                </button>
              )}
            </div>
          )}
        </div>

        {analyzeError && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{analyzeError}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b border-secondary-100 -mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-secondary-500 hover:text-secondary-800"
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="mr-1.5 bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ── OVERVIEW TAB ─────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6 max-w-3xl">
            {/* Metadata card */}
            <div className="bg-white rounded-xl border border-secondary-100 p-5">
              <h3 className="font-semibold text-secondary-900 mb-4">פרטי הישיבה</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "תאריך", value: formatDate(protocol.meeting_date) },
                  { label: "מספר ישיבה", value: protocol.meeting_number ?? "—" },
                  { label: "סוג", value: TYPE_LABELS[protocol.protocol_type] },
                  { label: "מיקום", value: protocol.location ?? "—" },
                  { label: "שם האגודה", value: protocol.association_name ?? "—" },
                  { label: 'יו"ר ועד', value: protocol.chairman_name ?? "—" },
                  { label: "מנהל קהילה", value: protocol.community_manager_name ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-secondary-400 text-xs mb-0.5">{label}</dt>
                    <dd className="text-secondary-900 font-medium">{String(value)}</dd>
                  </div>
                ))}
              </div>
            </div>

            {/* Participants */}
            {(protocol.participants as string[]).length > 0 && (
              <div className="bg-white rounded-xl border border-secondary-100 p-5">
                <h3 className="font-semibold text-secondary-900 mb-3">משתתפים</h3>
                <div className="flex flex-wrap gap-2">
                  {(protocol.participants as string[]).map((name, i) => (
                    <span key={i} className="px-3 py-1 bg-green-50 text-green-800 text-sm rounded-full">{name}</span>
                  ))}
                </div>
              </div>
            )}

            {(protocol.absent as string[]).length > 0 && (
              <div className="bg-white rounded-xl border border-secondary-100 p-5">
                <h3 className="font-semibold text-secondary-900 mb-3">נעדרים</h3>
                <div className="flex flex-wrap gap-2">
                  {(protocol.absent as string[]).map((name, i) => (
                    <span key={i} className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full">{name}</span>
                  ))}
                </div>
              </div>
            )}

            {(protocol.guests as string[]).length > 0 && (
              <div className="bg-white rounded-xl border border-secondary-100 p-5">
                <h3 className="font-semibold text-secondary-900 mb-3">מוזמנים</h3>
                <div className="flex flex-wrap gap-2">
                  {(protocol.guests as string[]).map((name, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-800 text-sm rounded-full">{name}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Agenda */}
            {(protocol.agenda as any[]).length > 0 && (
              <div className="bg-white rounded-xl border border-secondary-100 p-5">
                <h3 className="font-semibold text-secondary-900 mb-3">סדר יום</h3>
                <ol className="space-y-2">
                  {(protocol.agenda as { number: number; topic: string }[]).map((item) => (
                    <li key={item.number} className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 h-5 w-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {item.number}
                      </span>
                      <span className="text-secondary-800">{item.topic}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "החלטות סה\"כ", value: decisions.length, color: "text-secondary-900" },
                { label: "ממתינות לאישור", value: pending.length, color: "text-orange-600" },
                { label: "אושרו", value: approved.length, color: "text-green-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl border border-secondary-100 p-4 text-center">
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-secondary-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DECISIONS TAB ────────────────────────────── */}
        {activeTab === "decisions" && (
          <div className="max-w-3xl space-y-3">
            {decisions.length === 0 ? (
              <div className="text-center py-16 text-secondary-400">
                <svg className="h-10 w-10 mx-auto mb-3 text-secondary-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p className="font-medium">אין החלטות עדיין</p>
                {canManage && protocol.raw_text && (
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="mt-3 text-sm text-primary-600 hover:underline"
                  >
                    {analyzing ? "מנתח..." : "הפעל ניתוח AI לחילוץ החלטות"}
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Pending */}
                {pending.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-orange-600 mb-2 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-orange-400 inline-block" />
                      ממתינות לאישור ({pending.length})
                    </h3>
                    {pending.map((d) => (
                      <DecisionCard key={d.id} decision={d} canManage={canManage}
                        onAction={() => setDecisionModal(d)} onRefresh={refresh} protocolId={protocol.id} />
                    ))}
                  </div>
                )}
                {/* Approved */}
                {approved.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
                      אושרו ({approved.length})
                    </h3>
                    {approved.map((d) => (
                      <DecisionCard key={d.id} decision={d} canManage={canManage}
                        onAction={() => setDecisionModal(d)} onRefresh={refresh} protocolId={protocol.id} />
                    ))}
                  </div>
                )}
                {/* Rejected */}
                {rejected.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-red-500 mb-2 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
                      נדחו ({rejected.length})
                    </h3>
                    {rejected.map((d) => (
                      <DecisionCard key={d.id} decision={d} canManage={canManage}
                        onAction={() => setDecisionModal(d)} onRefresh={refresh} protocolId={protocol.id} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── SIGNATURES TAB ───────────────────────────── */}
        {activeTab === "signatures" && (
          <div className="max-w-2xl space-y-4">
            <p className="text-sm text-secondary-500">
              {canManage
                ? "חתמו על הפרוטוקול. ניתן לחתום בכתב יד על המסך."
                : "חתימות הפרוטוקול."}
            </p>
            {(["chairman", "community_manager", "committee_seal"] as SignerRole[]).map((role) => {
              const existing = signatures.find((s) => s.signer_role === role);
              return (
                <SignatureCanvas
                  key={role}
                  label={SIGNER_LABELS[role]}
                  existingSignature={existing?.signature_data}
                  onSave={(data) => handleSign(role, data)}
                  onClear={() => handleClearSign(role)}
                  readOnly={!canManage}
                />
              );
            })}
          </div>
        )}

        {/* ── FILE TAB ─────────────────────────────────── */}
        {activeTab === "file" && (
          <div className="max-w-2xl space-y-4">
            {protocol.file_url ? (
              <div className="bg-white rounded-xl border border-secondary-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-secondary-900">קובץ מצורף</p>
                    <p className="text-xs text-secondary-400">{protocol.file_type?.toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={protocol.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    פתח קובץ
                  </a>
                  {canManage && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-secondary-200 text-secondary-600 text-sm rounded-lg hover:bg-secondary-50 transition-colors"
                    >
                      החלף קובץ
                    </button>
                  )}
                </div>
                {protocol.raw_text && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-secondary-700 mb-2">טקסט שחולץ</h4>
                    <div className="bg-secondary-50 rounded-lg p-3 text-xs text-secondary-600 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                      {protocol.raw_text}
                    </div>
                  </div>
                )}
              </div>
            ) : canManage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-secondary-200 hover:border-primary-300 rounded-xl p-10 text-center cursor-pointer transition-colors"
              >
                <svg className="h-10 w-10 mx-auto text-secondary-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm font-medium text-secondary-600">לחץ להעלאת קובץ פרוטוקול</p>
                <p className="text-xs text-secondary-400 mt-1">PDF, Word, תמונה — עד 50MB</p>
              </div>
            ) : (
              <p className="text-secondary-400 text-sm">אין קובץ מצורף</p>
            )}

            {uploadError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{uploadError}</p>
            )}
            {uploadLoading && (
              <p className="text-sm text-secondary-500 flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                מעלה קובץ...
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>

      {/* Decision Action Modal */}
      {decisionModal && (
        <DecisionActionModal
          decision={decisionModal}
          protocolId={protocol.id}
          onClose={() => setDecisionModal(null)}
          onDone={() => { setDecisionModal(null); refresh(); }}
        />
      )}
    </div>
  );
}

// ── Decision Card ─────────────────────────────────────────────────────────

interface DecisionCardProps {
  decision: ProtocolDecision;
  canManage: boolean;
  protocolId: string;
  onAction: () => void;
  onRefresh: () => void;
}

function DecisionCard({ decision, canManage, onAction }: DecisionCardProps) {
  const statusStyles: Record<string, string> = {
    pending_review: "border-orange-200 bg-orange-50/50",
    approved: "border-green-200 bg-green-50/50",
    rejected: "border-red-200 bg-red-50/50",
  };

  return (
    <div className={`border rounded-xl p-4 mb-2 ${statusStyles[decision.status] ?? "border-secondary-100 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {decision.topic_title && (
            <p className="text-xs font-semibold text-secondary-500 mb-1">
              {decision.topic_number && `סעיף ${decision.topic_number} — `}{decision.topic_title}
            </p>
          )}
          <p className="text-sm text-secondary-900 leading-relaxed">{decision.decision_text}</p>

          {/* Voting info */}
          {(decision.vote_for !== null || decision.vote_against !== null) && (
            <div className="flex items-center gap-3 mt-2 text-xs text-secondary-500">
              {decision.vote_for !== null && (
                <span className="flex items-center gap-1 text-green-600">
                  <span>👍</span> {decision.vote_for} בעד
                </span>
              )}
              {decision.vote_against !== null && (
                <span className="flex items-center gap-1 text-red-500">
                  <span>👎</span> {decision.vote_against} נגד
                </span>
              )}
              {decision.vote_abstain !== null && decision.vote_abstain > 0 && (
                <span className="flex items-center gap-1 text-secondary-400">
                  <span>✋</span> {decision.vote_abstain} נמנע
                </span>
              )}
              {decision.vote_result && (
                <span className={`font-medium ${decision.vote_result === "approved" ? "text-green-600" : "text-red-500"}`}>
                  ({VOTE_RESULT_LABELS[decision.vote_result]})
                </span>
              )}
            </div>
          )}

          {/* Linked task */}
          {decision.linked_task_id && (decision.tasks as any) && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-primary-600">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-6 9l2 2 4-4" />
              </svg>
              משימה: {(decision.tasks as any).title}
            </div>
          )}
        </div>

        {canManage && decision.status === "pending_review" && (
          <button
            onClick={onAction}
            className="flex-shrink-0 px-3 py-1.5 bg-white border border-secondary-200 hover:border-primary-300 text-secondary-700 text-xs font-medium rounded-lg transition-colors"
          >
            סקירה
          </button>
        )}
      </div>
    </div>
  );
}

// ── Decision Action Modal ─────────────────────────────────────────────────

interface DecisionActionModalProps {
  decision: ProtocolDecision;
  protocolId: string;
  onClose: () => void;
  onDone: () => void;
}

function DecisionActionModal({ decision, protocolId, onClose, onDone }: DecisionActionModalProps) {
  const [action, setAction] = useState<"approved" | "rejected">("approved");
  const [createTask, setCreateTask] = useState(true);
  const [taskTitle, setTaskTitle] = useState(
    decision.decision_text.length > 80
      ? decision.decision_text.substring(0, 80) + "..."
      : decision.decision_text
  );
  const [taskDesc, setTaskDesc] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/protocols/${protocolId}/decisions/${decision.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action,
          create_task: action === "approved" && createTask,
          task_title: taskTitle.trim(),
          task_description: taskDesc.trim() || null,
          due_date: dueDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "שגיאה"); return; }
      onDone();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-secondary-100">
          <h2 className="font-bold text-secondary-900 text-lg">סקירת החלטה</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary-50 text-secondary-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Decision text */}
          <div className="bg-secondary-50 rounded-xl p-4 text-sm text-secondary-800 leading-relaxed">
            {decision.topic_title && (
              <p className="text-xs font-semibold text-secondary-500 mb-1">
                {decision.topic_number && `סעיף ${decision.topic_number} — `}{decision.topic_title}
              </p>
            )}
            <p>{decision.decision_text}</p>
          </div>

          {/* Approve / Reject toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAction("approved")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                action === "approved"
                  ? "bg-green-600 text-white"
                  : "border border-secondary-200 text-secondary-600 hover:bg-secondary-50"
              }`}
            >
              ✓ אישור
            </button>
            <button
              type="button"
              onClick={() => setAction("rejected")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                action === "rejected"
                  ? "bg-red-500 text-white"
                  : "border border-secondary-200 text-secondary-600 hover:bg-secondary-50"
              }`}
            >
              ✗ דחייה
            </button>
          </div>

          {/* Create task options (only when approving) */}
          {action === "approved" && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createTask}
                  onChange={(e) => setCreateTask(e.target.checked)}
                  className="h-4 w-4 rounded text-primary-600"
                />
                <span className="text-sm font-medium text-secondary-700">צור משימה מהחלטה זו</span>
              </label>

              {createTask && (
                <div className="space-y-3 pr-6">
                  <div>
                    <label className="block text-xs font-medium text-secondary-600 mb-1">כותרת המשימה</label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full text-sm border border-secondary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary-600 mb-1">תיאור (אופציונלי)</label>
                    <textarea
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      rows={2}
                      className="w-full text-sm border border-secondary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary-600 mb-1">תאריך יעד</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full text-sm border border-secondary-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 font-medium rounded-xl text-sm transition-colors disabled:opacity-50 text-white ${
                action === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {loading ? "שומר..." : action === "approved" ? "אשר החלטה" : "דחה החלטה"}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-secondary-200 rounded-xl text-sm text-secondary-600 hover:bg-secondary-50 transition-colors">
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

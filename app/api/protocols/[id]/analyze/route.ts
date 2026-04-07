import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

interface ExtractedDecision {
  topic_number: number | null;
  topic_title: string | null;
  decision_text: string;
  vote_for: number | null;
  vote_against: number | null;
  vote_abstain: number | null;
  vote_result: "approved" | "rejected" | "tabled" | null;
}

interface AIExtractionResult {
  title?: string;
  meeting_date?: string;
  meeting_number?: number;
  association_name?: string;
  chairman_name?: string;
  community_manager_name?: string;
  participants?: string[];
  absent?: string[];
  guests?: string[];
  agenda?: { number: number; topic: string }[];
  decisions: ExtractedDecision[];
}

async function extractWithAI(text: string): Promise<AIExtractionResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY לא מוגדר בסביבה");
  }

  const prompt = `אתה מנתח פרוטוקולי ישיבות של קהילות ויישובים בישראל.
נתח את הפרוטוקול הבא וחלץ את המידע הבא בפורמט JSON בלבד (ללא טקסט נוסף, ללא markdown):

{
  "title": "כותרת הפרוטוקול",
  "meeting_date": "YYYY-MM-DD",
  "meeting_number": 1,
  "association_name": "שם האגודה/ועד",
  "chairman_name": "שם יו\"ר הוועד",
  "community_manager_name": "שם מנהל הקהילה (אם קיים)",
  "participants": ["שם1", "שם2"],
  "absent": ["שם1", "שם2"],
  "guests": ["שם1"],
  "agenda": [
    {"number": 1, "topic": "נושא הסעיף"}
  ],
  "decisions": [
    {
      "topic_number": 1,
      "topic_title": "כותרת הנושא",
      "decision_text": "טקסט ההחלטה המלא",
      "vote_for": 5,
      "vote_against": 0,
      "vote_abstain": 0,
      "vote_result": "approved"
    }
  ]
}

חשוב:
- חלץ את כל ההחלטות שהתקבלו, כולל החלטות ביניים
- אם אין נתוני הצבעה — השאר null
- vote_result: "approved" = אושר, "rejected" = נדחה, "tabled" = נדחה לדיון
- הכל בעברית
- החזר JSON בלבד ללא markdown ובלוק קוד

הפרוטוקול:
${text.substring(0, 12000)}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const result = await response.json();
  const content = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Strip markdown code fences if present
  const clean = content.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  return JSON.parse(clean) as AIExtractionResult;
}

// POST /api/protocols/[id]/analyze
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = (await createServerSupabaseClient()) as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id");
    const { data: role } = await supabase.rpc("get_my_resident_role");
    if (!["admin", "chairman"].includes(role)) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const adminSupabase = createServerSupabaseAdminClient();

    // Get the protocol
    const { data: protocol, error: fetchErr } = await adminSupabase
      .from("protocols")
      .select("*")
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchErr || !protocol) {
      return NextResponse.json({ error: "פרוטוקול לא נמצא" }, { status: 404 });
    }

    if (!protocol.raw_text) {
      return NextResponse.json({ error: "אין טקסט לניתוח — יש להעלות קובץ קודם" }, { status: 400 });
    }

    // Mark as processing
    await adminSupabase
      .from("protocols")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", params.id);

    // Run AI extraction
    const extracted = await extractWithAI(protocol.raw_text);

    // Update protocol metadata from AI
    const metaUpdate: Record<string, unknown> = {
      ai_processed: true,
      status: "ready",
      updated_at: new Date().toISOString(),
    };
    if (extracted.title && !protocol.title) metaUpdate.title = extracted.title;
    if (extracted.meeting_date && !protocol.meeting_date) metaUpdate.meeting_date = extracted.meeting_date;
    if (extracted.meeting_number && !protocol.meeting_number) metaUpdate.meeting_number = extracted.meeting_number;
    if (extracted.association_name) metaUpdate.association_name = extracted.association_name;
    if (extracted.chairman_name) metaUpdate.chairman_name = extracted.chairman_name;
    if (extracted.community_manager_name) metaUpdate.community_manager_name = extracted.community_manager_name;
    if (extracted.participants?.length) metaUpdate.participants = extracted.participants;
    if (extracted.absent?.length) metaUpdate.absent = extracted.absent;
    if (extracted.guests?.length) metaUpdate.guests = extracted.guests;
    if (extracted.agenda?.length) metaUpdate.agenda = extracted.agenda;

    await adminSupabase
      .from("protocols")
      .update(metaUpdate)
      .eq("id", params.id);

    // Delete existing pending decisions and re-insert from AI
    await adminSupabase
      .from("protocol_decisions")
      .delete()
      .eq("protocol_id", params.id)
      .eq("status", "pending_review");

    // Insert new decisions
    if (extracted.decisions?.length) {
      const decisionsToInsert = extracted.decisions.map((d, idx) => ({
        protocol_id: params.id,
        tenant_id: tenantId,
        topic_number: d.topic_number,
        topic_title: d.topic_title,
        decision_text: d.decision_text,
        vote_for: d.vote_for,
        vote_against: d.vote_against,
        vote_abstain: d.vote_abstain,
        vote_result: d.vote_result,
        status: "pending_review",
        order_index: idx,
      }));

      await adminSupabase.from("protocol_decisions").insert(decisionsToInsert);
    }

    return NextResponse.json({
      success: true,
      decisions_count: extracted.decisions?.length || 0,
      extracted,
    });
  } catch (err: unknown) {
    // Reset status on failure
    try {
      const adminSupabase = createServerSupabaseAdminClient();
      await adminSupabase
        .from("protocols")
        .update({ status: "ready", updated_at: new Date().toISOString() })
        .eq("id", params.id);
    } catch {}

    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

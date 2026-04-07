export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServerSupabaseAdminClient } from "@/lib/supabase/server";

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid edge runtime issues
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

// POST /api/protocols/[id]/upload
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "לא נמצא קובץ" }, { status: 400 });

    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "הקובץ גדול מדי (מקסימום 50MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mime = file.type;

    let file_type: "pdf" | "docx" | "image";
    let raw_text = "";

    if (mime === "application/pdf") {
      file_type = "pdf";
      try {
        raw_text = await extractTextFromPDF(buffer);
      } catch (e) {
        console.error("PDF extraction error:", e);
        raw_text = "";
      }
    } else if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mime === "application/msword"
    ) {
      file_type = "docx";
      try {
        raw_text = await extractTextFromDOCX(buffer);
      } catch (e) {
        console.error("DOCX extraction error:", e);
        raw_text = "";
      }
    } else if (mime.startsWith("image/")) {
      file_type = "image";
      // For images, AI vision will handle extraction during analyze step
      raw_text = "";
    } else {
      return NextResponse.json({ error: "סוג קובץ לא נתמך" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const ext = file.name.split(".").pop() || "bin";
    const storagePath = `${tenantId}/${params.id}/${Date.now()}.${ext}`;

    const adminSupabase = createServerSupabaseAdminClient();
    const { error: storageError } = await adminSupabase.storage
      .from("protocols")
      .upload(storagePath, buffer, {
        contentType: mime,
        upsert: true,
      });

    if (storageError) {
      return NextResponse.json({ error: `שגיאת העלאה: ${storageError.message}` }, { status: 500 });
    }

    // Get signed URL (valid 10 years)
    const { data: urlData } = adminSupabase.storage
      .from("protocols")
      .getPublicUrl(storagePath);

    // Update protocol record
    const { data, error: updateError } = await adminSupabase
      .from("protocols")
      .update({
        file_url: urlData.publicUrl,
        file_type,
        raw_text: raw_text || null,
        status: raw_text ? "ready" : "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      file_type,
      has_text: raw_text.length > 0,
      text_length: raw_text.length,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

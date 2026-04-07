-- ============================================================
-- פרוטוקולים — טבלאות ומדיניות RLS
-- הרץ ב-Supabase SQL Editor
-- ============================================================

-- טבלת פרוטוקולים ראשית
CREATE TABLE IF NOT EXISTS protocols (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  protocol_type          TEXT NOT NULL CHECK (protocol_type IN ('committee','general_assembly','association')),
  meeting_date           DATE NOT NULL,
  meeting_number         INTEGER,
  location               TEXT,
  association_name       TEXT,
  chairman_name          TEXT,
  community_manager_name TEXT,
  participants           JSONB NOT NULL DEFAULT '[]',
  absent                 JSONB NOT NULL DEFAULT '[]',
  guests                 JSONB NOT NULL DEFAULT '[]',
  agenda                 JSONB NOT NULL DEFAULT '[]',
  file_url               TEXT,
  file_type              TEXT CHECK (file_type IN ('pdf','docx','image')),
  raw_text               TEXT,
  status                 TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','processing','ready','approved')),
  ai_processed           BOOLEAN NOT NULL DEFAULT FALSE,
  created_by             UUID REFERENCES auth.users(id),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- טבלת החלטות שחולצו מהפרוטוקול
CREATE TABLE IF NOT EXISTS protocol_decisions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id    UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  topic_number   INTEGER,
  topic_title    TEXT,
  decision_text  TEXT NOT NULL,
  vote_for       INTEGER,
  vote_against   INTEGER,
  vote_abstain   INTEGER,
  vote_result    TEXT CHECK (vote_result IN ('approved','rejected','tabled')),
  linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','rejected')),
  order_index    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- טבלת חתימות
CREATE TABLE IF NOT EXISTS protocol_signatures (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id    UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  signer_role    TEXT NOT NULL CHECK (signer_role IN ('chairman','community_manager','committee_seal')),
  signature_data TEXT NOT NULL,
  signed_at      TIMESTAMPTZ DEFAULT NOW(),
  signed_by      UUID REFERENCES auth.users(id),
  UNIQUE (protocol_id, signer_role)
);

-- אינדקסים
CREATE INDEX IF NOT EXISTS protocols_tenant_id_idx ON protocols(tenant_id);
CREATE INDEX IF NOT EXISTS protocols_meeting_date_idx ON protocols(meeting_date DESC);
CREATE INDEX IF NOT EXISTS protocols_type_idx ON protocols(protocol_type);
CREATE INDEX IF NOT EXISTS protocol_decisions_protocol_id_idx ON protocol_decisions(protocol_id);
CREATE INDEX IF NOT EXISTS protocol_signatures_protocol_id_idx ON protocol_signatures(protocol_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_signatures ENABLE ROW LEVEL SECURITY;

-- protocols: קריאה — כולם לפי סוג; כתיבה — מנהל/יו"ר
DROP POLICY IF EXISTS "protocols_select" ON protocols;
CREATE POLICY "protocols_select" ON protocols
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
    AND (
      -- ועד: רק מנהל/יו"ר
      protocol_type != 'committee'
      OR (SELECT role FROM residents WHERE user_id = auth.uid() AND tenant_id = get_my_tenant_id() LIMIT 1)
            IN ('admin','chairman')
    )
  );

DROP POLICY IF EXISTS "protocols_insert" ON protocols;
CREATE POLICY "protocols_insert" ON protocols
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND (SELECT role FROM residents WHERE user_id = auth.uid() AND tenant_id = get_my_tenant_id() LIMIT 1)
          IN ('admin','chairman')
  );

DROP POLICY IF EXISTS "protocols_update" ON protocols;
CREATE POLICY "protocols_update" ON protocols
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
    AND (SELECT role FROM residents WHERE user_id = auth.uid() AND tenant_id = get_my_tenant_id() LIMIT 1)
          IN ('admin','chairman')
  );

DROP POLICY IF EXISTS "protocols_delete" ON protocols;
CREATE POLICY "protocols_delete" ON protocols
  FOR DELETE USING (
    tenant_id = get_my_tenant_id()
    AND (SELECT role FROM residents WHERE user_id = auth.uid() AND tenant_id = get_my_tenant_id() LIMIT 1)
          IN ('admin','chairman')
  );

-- protocol_decisions: קריאה — זהה לפרוטוקול; כתיבה — מנהל/יו"ר
DROP POLICY IF EXISTS "protocol_decisions_select" ON protocol_decisions;
CREATE POLICY "protocol_decisions_select" ON protocol_decisions
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
  );

DROP POLICY IF EXISTS "protocol_decisions_all" ON protocol_decisions;
CREATE POLICY "protocol_decisions_all" ON protocol_decisions
  FOR ALL USING (
    tenant_id = get_my_tenant_id()
    AND (SELECT role FROM residents WHERE user_id = auth.uid() AND tenant_id = get_my_tenant_id() LIMIT 1)
          IN ('admin','chairman')
  );

-- protocol_signatures
DROP POLICY IF EXISTS "protocol_signatures_select" ON protocol_signatures;
CREATE POLICY "protocol_signatures_select" ON protocol_signatures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_signatures.protocol_id
        AND p.tenant_id = get_my_tenant_id()
    )
  );

DROP POLICY IF EXISTS "protocol_signatures_all" ON protocol_signatures;
CREATE POLICY "protocol_signatures_all" ON protocol_signatures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_signatures.protocol_id
        AND p.tenant_id = get_my_tenant_id()
    )
    AND (SELECT role FROM residents WHERE user_id = auth.uid() AND tenant_id = get_my_tenant_id() LIMIT 1)
          IN ('admin','chairman')
  );

-- ============================================================
-- Storage bucket לקבצי פרוטוקולים
-- הרץ רק פעם אחת
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'protocols',
  'protocols',
  FALSE,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "protocols_storage_select" ON storage.objects;
CREATE POLICY "protocols_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'protocols'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "protocols_storage_insert" ON storage.objects;
CREATE POLICY "protocols_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'protocols'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "protocols_storage_delete" ON storage.objects;
CREATE POLICY "protocols_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'protocols'
    AND auth.role() = 'authenticated'
  );

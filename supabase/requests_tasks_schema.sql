-- ================================================
-- מודול פניות + משימות
-- הרץ ב: Supabase Dashboard -> SQL Editor
-- ================================================

-- ------------------------------------------------
-- ENUMs
-- ------------------------------------------------
DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('new', 'in_progress', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------
-- טבלת פניות (requests)
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requests (
  id            UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id     UUID          NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resident_id   UUID          REFERENCES public.residents(id) ON DELETE SET NULL,
  title         TEXT          NOT NULL,
  description   TEXT,
  status        request_status NOT NULL DEFAULT 'new',
  created_at    TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ,
  created_by    UUID          REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_tenant_id   ON public.requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_requests_resident_id ON public.requests(resident_id);
CREATE INDEX IF NOT EXISTS idx_requests_status      ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at  ON public.requests(created_at DESC);

CREATE OR REPLACE TRIGGER set_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------
-- RLS — requests
-- ------------------------------------------------
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- מנהל רואה הכל; תושב רואה רק שלו
CREATE POLICY "requests_select"
  ON public.requests FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_tenant_role() = 'admin'
      OR resident_id = (
        SELECT id FROM public.residents
        WHERE user_id = auth.uid()
          AND tenant_id = public.get_my_tenant_id()
        LIMIT 1
      )
    )
  );

-- תושב ומנהל יכולים לפתוח פנייה
CREATE POLICY "requests_insert"
  ON public.requests FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- רק מנהל משנה סטטוס / פרטים
CREATE POLICY "requests_update"
  ON public.requests FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_tenant_role() = 'admin'
  );

-- רק מנהל מוחק
CREATE POLICY "requests_delete"
  ON public.requests FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_tenant_role() = 'admin'
  );

-- ------------------------------------------------
-- טבלת משימות (tasks)
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id            UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id     UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  request_id    UUID        REFERENCES public.requests(id) ON DELETE SET NULL,
  title         TEXT        NOT NULL,
  description   TEXT,
  assigned_to   UUID        REFERENCES public.residents(id) ON DELETE SET NULL,
  status        task_status NOT NULL DEFAULT 'pending',
  due_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ,
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id   ON public.tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_request_id  ON public.tasks(request_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date    ON public.tasks(due_date);

CREATE OR REPLACE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------
-- RLS — tasks
-- ------------------------------------------------
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- מנהל רואה הכל; תושב רואה משימות שמשויכות אליו
CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_tenant_role() = 'admin'
      OR assigned_to = (
        SELECT id FROM public.residents
        WHERE user_id = auth.uid()
          AND tenant_id = public.get_my_tenant_id()
        LIMIT 1
      )
    )
  );

-- רק מנהל יוצר משימות
CREATE POLICY "tasks_insert"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_tenant_role() = 'admin'
  );

-- מנהל + אחראי יכולים לעדכן סטטוס
CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_tenant_role() = 'admin'
      OR assigned_to = (
        SELECT id FROM public.residents
        WHERE user_id = auth.uid()
          AND tenant_id = public.get_my_tenant_id()
        LIMIT 1
      )
    )
  );

-- רק מנהל מוחק
CREATE POLICY "tasks_delete"
  ON public.tasks FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_tenant_role() = 'admin'
  );

-- ================================================
-- Multi-Tenant Schema — ניהול קהילה 2.0
-- הרץ ב: Supabase Dashboard -> SQL Editor
-- ================================================

-- ------------------------------------------------
-- 1. טבלת tenants (קהילות/יישובים)
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT        NOT NULL,                        -- שם הקהילה
  slug        TEXT        NOT NULL UNIQUE,                 -- מזהה ייחודי לURL (e.g. "ramat-gan")
  logo_url    TEXT,
  city        TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ
);

CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);

-- ------------------------------------------------
-- 2. טבלת tenant_members — מי שייך לאיזו קהילה
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_members (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        resident_role NOT NULL DEFAULT 'resident',
  joined_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id   ON public.tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON public.tenant_members(tenant_id);

-- ------------------------------------------------
-- 3. הוסף tenant_id לטבלת residents
-- ------------------------------------------------
ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_residents_tenant_id ON public.residents(tenant_id);

-- ------------------------------------------------
-- 4. פונקציות עזר
-- ------------------------------------------------

-- מחזירה את ה-tenant_id של המשתמש הנוכחי
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id
  FROM   public.tenant_members
  WHERE  user_id = auth.uid()
  LIMIT  1;
$$;

-- מחזירה את התפקיד של המשתמש ב-tenant שלו
CREATE OR REPLACE FUNCTION public.get_my_tenant_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::TEXT
  FROM   public.tenant_members
  WHERE  user_id   = auth.uid()
    AND  tenant_id = public.get_my_tenant_id()
  LIMIT  1;
$$;

-- ------------------------------------------------
-- 5. עדכון RLS — tenants
-- ------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- כל משתמש רואה רק את ה-tenant שלו
CREATE POLICY "tenants_select"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (id = public.get_my_tenant_id());

-- ------------------------------------------------
-- 6. RLS — tenant_members
-- ------------------------------------------------
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- מנהל רואה את כל חברי ה-tenant שלו; תושב רואה רק את עצמו
CREATE POLICY "tenant_members_select"
  ON public.tenant_members FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_tenant_role() = 'admin'
      OR user_id = auth.uid()
    )
  );

-- ------------------------------------------------
-- 7. עדכון RLS על residents — הוסף tenant_id
-- ------------------------------------------------
DROP POLICY IF EXISTS "residents_select" ON public.residents;
DROP POLICY IF EXISTS "residents_insert" ON public.residents;
DROP POLICY IF EXISTS "residents_update" ON public.residents;
DROP POLICY IF EXISTS "residents_delete" ON public.residents;

CREATE POLICY "residents_select"
  ON public.residents FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (
      public.get_my_tenant_role() = 'admin'
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "residents_insert"
  ON public.residents FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_tenant_role() = 'admin'
  );

CREATE POLICY "residents_update"
  ON public.residents FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_tenant_role() = 'admin'
  );

CREATE POLICY "residents_delete"
  ON public.residents FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.get_my_tenant_role() = 'admin'
  );

-- ------------------------------------------------
-- 8. הגדרת הקהילה הראשונה + המנהל הראשון
--    שנה את הפרטים לפי הצורך
-- ------------------------------------------------
DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id   UUID;
BEGIN
  -- יצירת הקהילה
  INSERT INTO public.tenants (name, slug, city)
  VALUES ('קהילה לדוגמה', 'demo-community', 'תל אביב')
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'demo-community';
  END IF;

  -- שיוך המנהל הראשון לקהילה
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'elad.hason@gmail.com';

  IF v_user_id IS NOT NULL AND v_tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (v_tenant_id, v_user_id, 'admin')
    ON CONFLICT (tenant_id, user_id) DO NOTHING;

    -- עדכון רשומת התושב הקיימת עם tenant_id
    UPDATE public.residents
    SET    tenant_id = v_tenant_id
    WHERE  user_id = v_user_id;
  END IF;
END $$;

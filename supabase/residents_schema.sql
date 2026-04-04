-- ================================================
-- מודול תושבים - Residents Module
-- הרץ ב: Supabase Dashboard -> SQL Editor
-- ================================================

-- ENUM לתפקידים
CREATE TYPE IF NOT EXISTS resident_role AS ENUM ('admin', 'resident');

-- טבלת תושבים
CREATE TABLE IF NOT EXISTS public.residents (
  id          UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT         NOT NULL,
  phone       TEXT,
  address     TEXT,
  role        resident_role NOT NULL DEFAULT 'resident',
  balance     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ,
  created_by  UUID         REFERENCES auth.users(id) ON DELETE SET NULL
);

-- אינדקסים
CREATE INDEX IF NOT EXISTS idx_residents_user_id   ON public.residents(user_id);
CREATE INDEX IF NOT EXISTS idx_residents_role      ON public.residents(role);
CREATE INDEX IF NOT EXISTS idx_residents_created_at ON public.residents(created_at DESC);

-- טריגר updated_at (משתמש בפונקציה הקיימת)
CREATE TRIGGER set_residents_updated_at
  BEFORE UPDATE ON public.residents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ================================================
-- פונקציית עזר: מה התפקיד של המשתמש הנוכחי?
-- ================================================
CREATE OR REPLACE FUNCTION public.get_my_resident_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::TEXT
  FROM   public.residents
  WHERE  user_id = auth.uid()
  LIMIT  1;
$$;

-- ================================================
-- RLS
-- ================================================
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

-- SELECT: מנהל רואה הכל, תושב רואה רק את עצמו
CREATE POLICY "residents_select"
  ON public.residents FOR SELECT
  TO authenticated
  USING (
    public.get_my_resident_role() = 'admin'
    OR user_id = auth.uid()
  );

-- INSERT: רק מנהל
CREATE POLICY "residents_insert"
  ON public.residents FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_resident_role() = 'admin');

-- UPDATE: רק מנהל
CREATE POLICY "residents_update"
  ON public.residents FOR UPDATE
  TO authenticated
  USING (public.get_my_resident_role() = 'admin');

-- DELETE: רק מנהל
CREATE POLICY "residents_delete"
  ON public.residents FOR DELETE
  TO authenticated
  USING (public.get_my_resident_role() = 'admin');

-- ================================================
-- הגדרת המנהל הראשון  (החלף את האימייל שלך!)
-- הרץ רק אחרי שנכנסת לפחות פעם אחת עם Google Login
-- ================================================
-- INSERT INTO public.residents (user_id, name, phone, address, role, balance)
-- SELECT id, email, '', '', 'admin', 0
-- FROM   auth.users
-- WHERE  email = 'elad.hason@gmail.com'
-- ON CONFLICT DO NOTHING;

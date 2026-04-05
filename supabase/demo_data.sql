-- ================================================
-- Demo Community Data — ניהול קהילה 2.0
-- הרץ ב: Supabase Dashboard → SQL Editor
-- ================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_user_id   UUID;
  v_r1        UUID := uuid_generate_v4();
  v_r2        UUID := uuid_generate_v4();
  v_r3        UUID := uuid_generate_v4();
  v_r4        UUID := uuid_generate_v4();
  v_r5        UUID := uuid_generate_v4();
  v_req1      UUID := uuid_generate_v4();
  v_req2      UUID := uuid_generate_v4();
  v_req3      UUID := uuid_generate_v4();
  v_t1        UUID := uuid_generate_v4();
  v_t2        UUID := uuid_generate_v4();
BEGIN

  -- 1. וודא שהקהילה demo-community קיימת
  INSERT INTO public.tenants (name, slug, city, is_active)
  VALUES ('קהילת שמש', 'demo-community', 'תל אביב', true)
  ON CONFLICT (slug) DO UPDATE SET name = 'קהילת שמש', city = 'תל אביב'
  RETURNING id INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'demo-community';
  END IF;

  -- 2. שייך את המשתמש הראשון שמצוי ב-auth.users לקהילה זו
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (v_tenant_id, v_user_id, 'admin')
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'admin';
  END IF;

  -- 3. תושבים לדוגמה
  INSERT INTO public.residents (id, tenant_id, name, phone, address, role, balance, created_by)
  VALUES
    (v_r1, v_tenant_id, 'ישראל ישראלי',  '050-1111111', 'הרצל 1, תל אביב',   'admin',    0,    v_user_id),
    (v_r2, v_tenant_id, 'שרה כהן',        '052-2222222', 'ביאליק 5, תל אביב', 'resident', -200, v_user_id),
    (v_r3, v_tenant_id, 'דוד לוי',        '054-3333333', 'הנשיא 12, רמת גן',  'resident', 150,  v_user_id),
    (v_r4, v_tenant_id, 'מרים אבוטבול',   '058-4444444', 'ז׳בוטינסקי 8, בני ברק', 'resident', 0, v_user_id),
    (v_r5, v_tenant_id, 'יוסי פרץ',       '053-5555555', 'הרב קוק 3, פתח תקווה', 'resident', -50, v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- 4. פניות לדוגמה
  INSERT INTO public.requests (id, tenant_id, resident_id, title, description, status, created_by)
  VALUES
    (v_req1, v_tenant_id, v_r2, 'תיקון מנעול כניסה', 'המנעול בדלת הכניסה לבניין תקול ולא נסגר כראוי. צריך טכנאי דחוף.', 'new', v_user_id),
    (v_req2, v_tenant_id, v_r3, 'ניקיון חדר המדרגות', 'חדר המדרגות בקומה 2 לא נוקה כבר שבועיים.', 'in_progress', v_user_id),
    (v_req3, v_tenant_id, v_r4, 'תאורה בחניון', 'הנורות בחניון התחתון שרופות. קשה לראות בלילה.', 'closed', v_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- 5. משימות לדוגמה
  INSERT INTO public.tasks (id, tenant_id, request_id, title, description, assigned_to, status, due_date, created_by)
  VALUES
    (v_t1, v_tenant_id, v_req1, 'תיאום טכנאי מנעולן', 'ליצור קשר עם מנעולן ולתאם ביקור', v_r1, 'in_progress',
     (NOW() + INTERVAL '3 days')::DATE::TEXT, v_user_id),
    (v_t2, v_tenant_id, v_req2, 'הזמנת חברת ניקיון', 'ליצור קשר עם חברת הניקיון ולקבוע תאריך', v_r1, 'pending',
     (NOW() + INTERVAL '7 days')::DATE::TEXT, v_user_id)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Demo data created for tenant: %', v_tenant_id;
END $$;

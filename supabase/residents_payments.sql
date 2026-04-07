-- ============================================================
-- מודול דיירים ותשלומים — הרחבה לסכמה הקיימת
-- הרץ ב-Supabase SQL Editor
-- ============================================================

-- ── 1. UNITS (דירות / יחידות דיור) ──────────────────────────
CREATE TABLE IF NOT EXISTS units (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_number  TEXT NOT NULL,         -- "1א", "12", "גג"
  floor        INT,
  building     TEXT,
  area_sqm     NUMERIC(8,2),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, unit_number)
);

-- ── 2. קשר דירה ← דייר (מוסיפים unit_id לטבלה הקיימת) ──────
ALTER TABLE residents
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_residents_unit_id
  ON residents(unit_id) WHERE unit_id IS NOT NULL;

-- ── 3. FEE TEMPLATES (תבניות חיוב חוזרות) ───────────────────
CREATE TABLE IF NOT EXISTS fee_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,
  frequency      TEXT NOT NULL DEFAULT 'monthly'
                 CHECK (frequency IN ('monthly','quarterly','yearly','one_time')),
  applies_to     TEXT NOT NULL DEFAULT 'all'
                 CHECK (applies_to IN ('all','owners','tenants')),
  budget_item_id UUID REFERENCES budget_items(id) ON DELETE SET NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── 4. CHARGES (חיובים לדיירים) ─────────────────────────────
CREATE TABLE IF NOT EXISTS charges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id         UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  resident_id     UUID REFERENCES residents(id) ON DELETE SET NULL,
  fee_template_id UUID REFERENCES fee_templates(id) ON DELETE SET NULL,
  description     TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  due_date        DATE NOT NULL,
  period_month    INT  CHECK (period_month BETWEEN 1 AND 12),
  period_year     INT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','paid','partial','cancelled','overdue')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 5. PAYMENTS (תשלומים בפועל) ─────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  charge_id    UUID NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
  unit_id      UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  resident_id  UUID REFERENCES residents(id) ON DELETE SET NULL,
  amount       NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method       TEXT NOT NULL DEFAULT 'bank_transfer'
               CHECK (method IN ('bank_transfer','check','cash','bit','credit_card','other')),
  reference    TEXT,
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_units_tenant         ON units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_charges_unit         ON charges(unit_id);
CREATE INDEX IF NOT EXISTS idx_charges_status       ON charges(status);
CREATE INDEX IF NOT EXISTS idx_charges_due_date     ON charges(due_date);
CREATE INDEX IF NOT EXISTS idx_charges_tenant       ON charges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_charge      ON payments(charge_id);
CREATE INDEX IF NOT EXISTS idx_payments_unit        ON payments(unit_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant      ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_templates_tenant ON fee_templates(tenant_id);

-- ── AUTO updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_units_updated_at   ON units;
DROP TRIGGER IF EXISTS trg_charges_updated_at ON charges;

CREATE TRIGGER trg_units_updated_at
  BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_charges_updated_at
  BEFORE UPDATE ON charges FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── VIEW: יתרת חוב לפי דירה ─────────────────────────────────
CREATE OR REPLACE VIEW unit_balance AS
SELECT
  u.id              AS unit_id,
  u.tenant_id,
  u.unit_number,
  u.building,
  COALESCE(SUM(c.amount) FILTER (WHERE c.status != 'cancelled'), 0)  AS total_charged,
  COALESCE(SUM(p.amount), 0)                                          AS total_paid,
  COALESCE(SUM(c.amount) FILTER (WHERE c.status != 'cancelled'), 0)
    - COALESCE(SUM(p.amount), 0)                                      AS balance,
  COUNT(c.id) FILTER (WHERE c.status IN ('pending','overdue'))        AS open_charges_count
FROM units u
LEFT JOIN charges c  ON c.unit_id = u.id
LEFT JOIN payments p ON p.unit_id = u.id
GROUP BY u.id, u.tenant_id, u.unit_number, u.building;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE units          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;

-- units: כולם רואים, רק admin/chairman כותבים
CREATE POLICY "units_select" ON units FOR SELECT TO authenticated
  USING (tenant_id = get_my_tenant_id());
CREATE POLICY "units_insert" ON units FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_my_tenant_id() AND get_my_resident_role() IN ('admin','chairman'));
CREATE POLICY "units_update" ON units FOR UPDATE TO authenticated
  USING (tenant_id = get_my_tenant_id() AND get_my_resident_role() IN ('admin','chairman'));
CREATE POLICY "units_delete" ON units FOR DELETE TO authenticated
  USING (tenant_id = get_my_tenant_id() AND get_my_resident_role() IN ('admin','chairman'));

-- fee_templates: רק admin
CREATE POLICY "fee_templates_select" ON fee_templates FOR SELECT TO authenticated
  USING (tenant_id = get_my_tenant_id());
CREATE POLICY "fee_templates_write" ON fee_templates FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id() AND get_my_resident_role() IN ('admin','chairman'));

-- charges: admin רואה הכל, תושב רואה רק שלו
CREATE POLICY "charges_select" ON charges FOR SELECT TO authenticated
  USING (
    tenant_id = get_my_tenant_id()
    AND (
      get_my_resident_role() IN ('admin','chairman')
      OR resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "charges_write" ON charges FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id() AND get_my_resident_role() IN ('admin','chairman'));

-- payments: admin רואה הכל, תושב רואה רק שלו
CREATE POLICY "payments_select" ON payments FOR SELECT TO authenticated
  USING (
    tenant_id = get_my_tenant_id()
    AND (
      get_my_resident_role() IN ('admin','chairman')
      OR resident_id IN (SELECT id FROM residents WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "payments_write" ON payments FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id() AND get_my_resident_role() IN ('admin','chairman'));

-- ============================================================
-- קישור החלטות פרוטוקול לפריטי תקציב
-- הרץ ב-Supabase SQL Editor
-- ============================================================

-- הוסף עמודות לטבלת protocol_decisions
ALTER TABLE protocol_decisions
  ADD COLUMN IF NOT EXISTS linked_budget_item_id UUID REFERENCES budget_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(12,2);

-- הוסף עמודות לטבלת budget_transactions
ALTER TABLE budget_transactions
  ADD COLUMN IF NOT EXISTS protocol_decision_id UUID REFERENCES protocol_decisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- אינדקסים לביצועים
CREATE INDEX IF NOT EXISTS idx_decisions_budget_item
  ON protocol_decisions(linked_budget_item_id)
  WHERE linked_budget_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_decision
  ON budget_transactions(protocol_decision_id)
  WHERE protocol_decision_id IS NOT NULL;

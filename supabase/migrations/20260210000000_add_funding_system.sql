-- Session 12: Funding System
-- Chapter ledger for tracking all financial transactions

-- Chapter ledger: every money event affecting a chapter
CREATE TABLE IF NOT EXISTS chapter_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN (
    'monthly_debit',
    'member_donation',
    'cross_chapter_donation',
    'outside_donation',
    'punc_support',
    'adjustment'
  )),
  amount decimal(10,2) NOT NULL, -- positive = credit, negative = debit
  donor_id uuid REFERENCES public.users(id), -- null for monthly_debit, punc_support, adjustment
  donor_chapter_id uuid REFERENCES chapters(id), -- for cross_chapter_donation only
  attribution text CHECK (attribution IN ('anonymous', 'leader_only', 'chapter')),
  frequency text CHECK (frequency IN ('one_time', 'monthly')), -- intent only, no automation
  note text, -- for adjustments and outside_donation descriptions
  recorded_by uuid REFERENCES public.users(id), -- admin who recorded outside_donation or adjustment
  created_at timestamptz DEFAULT now(),
  period_month date -- the month this transaction applies to (1st of month)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ledger_chapter ON chapter_ledger(chapter_id);
CREATE INDEX IF NOT EXISTS idx_ledger_period ON chapter_ledger(period_month);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON chapter_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_ledger_donor ON chapter_ledger(donor_id) WHERE donor_id IS NOT NULL;

-- Add contributing member flag to memberships
ALTER TABLE chapter_memberships
  ADD COLUMN IF NOT EXISTS is_contributing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS became_contributing_at timestamptz;

-- View for chapter funding calculations
CREATE OR REPLACE VIEW chapter_funding AS
SELECT
  c.id as chapter_id,
  c.name as chapter_name,
  c.status,
  COALESCE(SUM(l.amount), 0) as current_balance,
  COALESCE(SUM(l.amount) FILTER (WHERE l.transaction_type = 'punc_support'), 0) as lifetime_punc_support,
  COALESCE(SUM(l.amount) FILTER (WHERE l.transaction_type IN ('member_donation', 'cross_chapter_donation', 'outside_donation')), 0) as lifetime_contributions,
  COALESCE(SUM(l.amount) FILTER (WHERE l.transaction_type IN ('member_donation', 'cross_chapter_donation', 'outside_donation')), 0) -
    ABS(COALESCE(SUM(l.amount) FILTER (WHERE l.transaction_type = 'punc_support'), 0)) as punc_relationship
FROM chapters c
LEFT JOIN chapter_ledger l ON l.chapter_id = c.id
GROUP BY c.id, c.name, c.status;

-- View for current month funding status
CREATE OR REPLACE VIEW chapter_funding_current_month AS
SELECT
  c.id as chapter_id,
  c.name as chapter_name,
  date_trunc('month', now())::date as period_month,
  55.00 as monthly_cost,
  COALESCE(SUM(l.amount) FILTER (WHERE l.transaction_type = 'monthly_debit'), 0) as monthly_debit,
  COALESCE(SUM(l.amount) FILTER (WHERE l.transaction_type IN ('member_donation', 'cross_chapter_donation', 'outside_donation')), 0) as contributions_this_month,
  COALESCE(SUM(l.amount) FILTER (WHERE l.transaction_type = 'punc_support'), 0) as punc_support_this_month,
  COALESCE(SUM(l.amount), 0) as balance_this_month
FROM chapters c
LEFT JOIN chapter_ledger l ON l.chapter_id = c.id
  AND l.period_month = date_trunc('month', now())::date
WHERE c.status = 'open'
GROUP BY c.id, c.name;

-- Comments for documentation
COMMENT ON TABLE chapter_ledger IS 'Soft accounting ledger tracking all financial transactions for chapters';
COMMENT ON COLUMN chapter_ledger.amount IS 'Positive = credit (money in), Negative = debit (money out)';
COMMENT ON COLUMN chapter_ledger.attribution IS 'How donor name is shown: anonymous, leader_only (leader sees name), or chapter (everyone sees)';
COMMENT ON COLUMN chapter_ledger.frequency IS 'Intent only - one_time or monthly donation plan';
COMMENT ON COLUMN chapter_ledger.period_month IS 'The month this transaction applies to (1st day of month)';
COMMENT ON VIEW chapter_funding IS 'Lifetime funding summary per chapter';
COMMENT ON VIEW chapter_funding_current_month IS 'Current month funding status per open chapter';

// Session 12: Funding System Types

// Transaction Types
export type TransactionType =
  | 'monthly_debit'
  | 'member_donation'
  | 'cross_chapter_donation'
  | 'outside_donation'
  | 'punc_support'
  | 'adjustment';

export type Attribution = 'anonymous' | 'leader_only' | 'chapter';

export type Frequency = 'one_time' | 'monthly';

// Chapter Ledger Entry
export interface ChapterLedgerEntry {
  id: string;
  chapter_id: string;
  transaction_type: TransactionType;
  amount: number; // positive = credit, negative = debit
  donor_id: string | null;
  donor_chapter_id: string | null;
  attribution: Attribution | null;
  frequency: Frequency | null;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
  period_month: string; // ISO date string (YYYY-MM-01)
}

// Ledger Entry with Relations
export interface ChapterLedgerEntryWithRelations extends ChapterLedgerEntry {
  donor?: {
    id: string;
    name: string;
  };
  donor_chapter?: {
    id: string;
    name: string;
  };
  recorded_by_user?: {
    id: string;
    name: string;
  };
}

// Chapter Funding Summary (from view)
export interface ChapterFunding {
  chapter_id: string;
  chapter_name: string;
  status: string;
  current_balance: number;
  lifetime_punc_support: number;
  lifetime_contributions: number;
  punc_relationship: number; // positive = net giver, negative = net taker
}

// Current Month Funding (from view)
export interface ChapterFundingCurrentMonth {
  chapter_id: string;
  chapter_name: string;
  period_month: string;
  monthly_cost: number; // always 55.00
  monthly_debit: number;
  contributions_this_month: number;
  punc_support_this_month: number;
  balance_this_month: number;
}

// API Request/Response Types

export interface RecordDonationPayload {
  chapter_id: string;
  amount: number;
  attribution?: Attribution;
  frequency?: Frequency;
  note?: string;
}

export interface RecordCrossChapterDonationPayload {
  from_chapter_id: string;
  to_chapter_id: string;
  donor_id: string;
  amount: number;
  attribution?: Attribution;
  frequency?: Frequency;
}

export interface RecordOutsideDonationPayload {
  chapter_id: string;
  amount: number;
  note: string;
  donor_name?: string;
}

export interface RecordPuncSupportPayload {
  chapter_id: string;
  amount: number;
  period_month: string;
  note?: string;
}

export interface RecordAdjustmentPayload {
  chapter_id: string;
  amount: number;
  note: string;
  period_month?: string;
}

export interface RecordMonthlyDebitPayload {
  chapter_id: string;
  period_month: string;
  amount?: number; // defaults to -55.00
}

// UI Helper Types

export interface FundingDashboardData {
  chapter: {
    id: string;
    name: string;
  };
  current_month: ChapterFundingCurrentMonth;
  lifetime: ChapterFunding;
  recent_transactions: ChapterLedgerEntryWithRelations[];
  contributing_members_count: number;
  is_user_contributing: boolean;
}

export interface AdminFundingOverview {
  total_chapters: number;
  total_balance: number;
  total_punc_support_this_month: number;
  total_contributions_this_month: number;
  chapters_needing_support: ChapterFundingCurrentMonth[];
  net_givers: ChapterFunding[];
  net_takers: ChapterFunding[];
}

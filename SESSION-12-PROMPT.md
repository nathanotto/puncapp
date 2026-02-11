# PUNCapp Session 12: Funding System

## Context

Session 9 built Admin foundation. Session 10 built Curriculum and Meeting Validation. Session 11 (Chapter Splitting) was deferred — Chapter Formation is the priority, and splitting can wait until chapters actually grow to need it. Now we build the funding system — the soft accounting that tracks how chapters are supported.

**Session 12 scope:** Chapter ledger, contributing member flow, donation flows, funding dashboards (member + admin), PUNC support reconciliation.

**NOT in Session 12:** Stripe/payment processing (record intent only), recurring payment automation, external donor portal (permanently out of scope — handled by Direct Outcomes).

## The Funding Model

Each chapter costs $55/month. This is "soft accounting" — tracked transparently but not enforced.

**Sources of funding:**
- Member donations (contributing members → their chapter)
- Cross-chapter donations (contributing members → another chapter)
- Outside donations (recorded by Admin, payment via Direct Outcomes)
- PUNC support (backstop — PUNC covers any gap at month-end)

**The insight:** If money doesn't come from supporters, it comes from PUNC. Transparency without shame.

**Lifetime relationship:** Each chapter has a running relationship with PUNC:
- Net taker = received more PUNC support than contributed
- Net giver = contributed more than received
- Some chapters are charitable by design (PUNC allocates expense)
- Some chapters grow into self-sustaining or net givers

## Primary References

1. **TOD-SPECIFICATION.md** — Flow 5: Chapter Funding
2. **SESSION-9-PROMPT.md** — Admin foundation

---

## Step 1: Database Schema

```sql
-- Chapter ledger: every money event affecting a chapter
CREATE TABLE chapter_ledger (
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

CREATE INDEX idx_ledger_chapter ON chapter_ledger(chapter_id);
CREATE INDEX idx_ledger_period ON chapter_ledger(period_month);
CREATE INDEX idx_ledger_type ON chapter_ledger(transaction_type);

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
```

---

## Step 2: Contributing Member Flow

### Leader Invites Member to Become Contributing

**`/app/chapter/[chapterId]/members/[memberId]/page.tsx`**

Add to member detail (Leader view only):

If member is not contributing:
- Button: "Invite as Contributing Member"
- Creates pending task for member

If member is contributing:
- Badge: "✓ Contributing Member since [date]"

**API: POST `/api/chapters/[chapterId]/members/[memberId]/invite-contributing`**

```typescript
// Create pending task
await supabase.from('pending_tasks').insert({
  task_type: 'become_contributing_member',
  assigned_to: memberId,
  related_entity_type: 'chapter',
  related_entity_id: chapterId,
});
```

### Member Accepts/Declines

**`/app/tasks/become-contributing/[taskId]/page.tsx`**

Task screen shows:
- "Become a Contributing Member"
- "Contributing members can see chapter funding status and support the chapter financially."
- "There's no obligation to donate."
- [Accept] [Decline]

**On Accept:**
```typescript
await supabase.from('chapter_memberships').update({
  is_contributing: true,
  became_contributing_at: new Date().toISOString(),
}).eq('chapter_id', chapterId).eq('user_id', userId);

// Mark task complete
await supabase.from('pending_tasks').update({
  status: 'completed',
  completed_at: new Date().toISOString(),
}).eq('id', taskId);
```

**On Decline:** Just mark task complete, no membership change.

---

## Step 3: Chapter Funding Dashboard (Member View)

**`/components/chapter/FundingCard.tsx`**

Only visible to Leaders and Contributing Members.

### Card Content

```
Chapter Funding
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This Month: $35 of $55          [███████░░░] 64%

Covered by:
  Members: $25
  Outside: $10
  PUNC: $0 (so far)

[Support Our Chapter]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Our PUNC Relationship
  Lifetime support received: $420
  Lifetime contributions: $280
  Balance: -$140 (we owe PUNC)
```

**Funding status badges:**
- "Fully Funded" (green) — contributions >= $55
- "Partially Funded" (yellow) — contributions > $0 but < $55
- "Needs Support" (orange) — contributions = $0

---

## Step 4: Donate to Chapter Flow

**`/app/chapter/[chapterId]/support/page.tsx`**

Accessible from Funding Card "Support Our Chapter" button.

### Form

```
Support [Chapter Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current need: $20 to reach full funding

Amount:
  [$5] [$10] [$20] [Custom: $___]

Frequency:
  (•) One-time  ( ) Monthly

Attribution:
  ( ) Anonymous
  (•) Show to Leader only
  ( ) Show to Chapter

[Donate]
```

**On Submit:**
```typescript
await supabase.from('chapter_ledger').insert({
  chapter_id: chapterId,
  transaction_type: 'member_donation',
  amount: amount, // positive
  donor_id: userId,
  attribution: attribution,
  frequency: frequency,
  period_month: startOfMonth(new Date()),
});
```

**Confirmation:**
- "Thank you. Your chapter is now [X]% funded this month."
- If monthly: "This is recorded as a monthly intent. You'll be reminded each month."

**Note:** No payment processing. This records the donation intent. Actual payment happens outside the app for now.

---

## Step 5: Support Other Chapters Flow

**`/app/support-chapters/page.tsx`**

For Contributing Members who want to help other chapters.

### Layout

```
Support a Chapter in Need
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Filters: Needs Support | Forming | Near Me]

┌─────────────────────────────────┐
│ Pine Chapter                    │
│ Denver, CO                      │
│ Needs: $35 this month           │
│ [Support This Chapter]          │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Elm Chapter                     │
│ Boulder, CO                     │
│ Needs: $55 this month (forming) │
│ [Support This Chapter]          │
└─────────────────────────────────┘
```

**Query:**
```typescript
const { data: chaptersInNeed } = await supabase
  .from('chapter_funding_current_month')
  .select('*')
  .lt('contributions_this_month', 55)
  .order('contributions_this_month', { ascending: true });
```

### Donate Flow

Same form as own chapter, but:
- `transaction_type: 'cross_chapter_donation'`
- `donor_chapter_id: usersPrimaryChapterId`

**Confirmation:**
- "Thank you for supporting [Chapter Name]."
- "The chapter leader has been notified."

Notify leader if attribution is not anonymous.

---

## Step 6: Admin Funding Dashboard Widget

**`/app/admin/page.tsx`** — Add funding widget to dashboard

### Widget: Organization Funding Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Funding This Month                              February 2026│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Expected: $1,100 (20 active chapters × $55)                │
│                                                             │
│  ████████████████████████░░░░░░░░░░░░░░░░  $740 covered     │
│                                                             │
│  Breakdown:                                                 │
│    Members:     $520  ████████████████                      │
│    Cross-chapter: $80  ███                                  │
│    Outside:     $140  █████                                 │
│    PUNC (est):  $360  ░░░░░░░░░░░░                          │
│                                                             │
│  [View Details →]                                           │
└─────────────────────────────────────────────────────────────┘
```

**Query:**
```typescript
// Get all active chapters
const { count: activeChapters } = await supabase
  .from('chapters')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'open');

const expectedMonthly = activeChapters * 55;

// Get current month totals by type
const { data: monthTotals } = await supabase
  .from('chapter_ledger')
  .select('transaction_type, amount')
  .eq('period_month', startOfMonth(new Date()));

// Sum by type
const memberDonations = sum where type in ('member_donation');
const crossChapter = sum where type = 'cross_chapter_donation';
const outside = sum where type = 'outside_donation';
const covered = memberDonations + crossChapter + outside;
const puncEstimate = expectedMonthly - covered;
```

---

## Step 7: Admin Funding Page

**`/app/admin/funding/page.tsx`**

Enable the previously disabled Funding link in admin sidebar.

### Header
- Title: "Funding"
- Subtitle: "February 2026" (current month)
- Month selector (dropdown to view previous months)

### Summary Cards Row
| Expected | Covered | PUNC Support | Coverage Rate |
|----------|---------|--------------|---------------|
| $1,100 | $740 | $360 | 67% |

### Chapter Breakdown Table

| Chapter | Status | This Month | Members | Cross | Outside | PUNC | Lifetime PUNC | Relationship |
|---------|--------|------------|---------|-------|---------|------|---------------|--------------|
| Oak | ✓ Funded | $55 | $45 | $10 | $0 | $0 | $120 | -$40 |
| Pine | Partial | $35 | $20 | $0 | $15 | — | $280 | -$180 |
| Elm | Needs | $0 | $0 | $0 | $0 | — | $110 | -$110 |

- Status badges: "✓ Funded" (green), "Partial" (yellow), "Needs" (red)
- PUNC column shows "—" until month-end reconciliation
- Relationship: negative = owes PUNC, positive = gave to PUNC
- Click row → chapter funding detail

### Actions
- [Record Outside Donation] → modal
- [Run Month-End Reconciliation] → creates punc_support entries
- [Export CSV]

---

## Step 8: Record Outside Donation (Admin)

**`/components/admin/RecordOutsideDonationModal.tsx`**

Modal form:

```
Record Outside Donation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Chapter: [Dropdown - select chapter]

Amount: $[___]

Donor Name/Reference: [___________]
(For your records only)

Note: [___________________________]

Period: [February 2026 ▼]

[Cancel] [Record Donation]
```

**On Submit:**
```typescript
await supabase.from('chapter_ledger').insert({
  chapter_id: selectedChapterId,
  transaction_type: 'outside_donation',
  amount: amount,
  note: `${donorReference}: ${note}`,
  recorded_by: adminUserId,
  period_month: selectedPeriod,
});
```

---

## Step 9: Monthly Debit Job

**`/app/api/admin/funding/monthly-debit/route.ts`**

Creates the -$55 debit for each active chapter. Run on 1st of month (manually or via cron).

```typescript
export async function POST(request: Request) {
  // Verify admin
  
  const periodMonth = startOfMonth(new Date());
  
  // Check if already run this month
  const { count } = await supabase
    .from('chapter_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('transaction_type', 'monthly_debit')
    .eq('period_month', periodMonth);
  
  if (count > 0) {
    return Response.json({ error: 'Monthly debit already run for this period' }, { status: 400 });
  }
  
  // Get active chapters
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id')
    .eq('status', 'open');
  
  // Create debit entries
  const entries = chapters.map(c => ({
    chapter_id: c.id,
    transaction_type: 'monthly_debit',
    amount: -55.00,
    period_month: periodMonth,
  }));
  
  await supabase.from('chapter_ledger').insert(entries);
  
  return Response.json({ created: entries.length });
}
```

---

## Step 10: Month-End Reconciliation

**`/app/api/admin/funding/reconcile/route.ts`**

Creates `punc_support` entries to zero out each chapter's balance for the month.

```typescript
export async function POST(request: Request) {
  // Verify admin
  
  const periodMonth = startOfMonth(new Date());
  
  // Get each chapter's balance for this month
  const { data: chapters } = await supabase
    .from('chapter_funding_current_month')
    .select('*');
  
  const puncEntries = [];
  
  for (const chapter of chapters) {
    if (chapter.balance_this_month < 0) {
      // Chapter has deficit, PUNC covers it
      puncEntries.push({
        chapter_id: chapter.chapter_id,
        transaction_type: 'punc_support',
        amount: Math.abs(chapter.balance_this_month), // positive to offset
        period_month: periodMonth,
        note: 'Month-end reconciliation',
      });
    }
  }
  
  if (puncEntries.length > 0) {
    await supabase.from('chapter_ledger').insert(puncEntries);
  }
  
  return Response.json({ 
    reconciled: puncEntries.length,
    total_punc_support: puncEntries.reduce((sum, e) => sum + e.amount, 0),
  });
}
```

---

## Step 11: Chapter Funding Detail (Admin)

**`/app/admin/funding/chapters/[chapterId]/page.tsx`**

### Header
- Back link: "← Back to Funding"
- Title: Chapter name
- Badges: Funding status, relationship status

### Summary Cards
| Lifetime PUNC Support | Lifetime Contributions | Relationship |
|-----------------------|------------------------|--------------|
| $420 received | $280 given | -$140 (owes PUNC) |

### Monthly History Table

| Month | Debit | Members | Cross | Outside | PUNC | Balance |
|-------|-------|---------|-------|---------|------|---------|
| Feb 2026 | -$55 | $25 | $0 | $10 | — | -$20 |
| Jan 2026 | -$55 | $40 | $5 | $0 | $10 | $0 |
| Dec 2025 | -$55 | $30 | $0 | $0 | $25 | $0 |

### Transaction Log
Full ledger entries for this chapter, newest first.

| Date | Type | Amount | Donor | Note |
|------|------|--------|-------|------|
| Feb 10 | member_donation | +$25 | Dave M. | — |
| Feb 1 | monthly_debit | -$55 | — | — |

---

## Step 12: API Routes Summary

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chapters/[id]/members/[id]/invite-contributing` | POST | Leader invites member |
| `/api/tasks/become-contributing/[id]` | POST | Accept/decline contributing |
| `/api/chapters/[id]/donate` | POST | Member donates to chapter |
| `/api/chapters/[id]/cross-donate` | POST | Member donates to other chapter |
| `/api/admin/funding/outside-donation` | POST | Record outside donation |
| `/api/admin/funding/monthly-debit` | POST | Run monthly debit |
| `/api/admin/funding/reconcile` | POST | Run month-end PUNC reconciliation |
| `/api/admin/funding/adjustment` | POST | Record admin adjustment |

---

## Step 13: Update Admin Sidebar

Enable the Funding link:
- 💰 Funding → /admin/funding (now enabled)

---

## Step 14: Seed Data

Add to seed states for testing:

```typescript
// Create ledger entries for Oak Chapter
const oakLedger = [
  // January
  { chapter_id: OAK_ID, transaction_type: 'monthly_debit', amount: -55, period_month: '2026-01-01' },
  { chapter_id: OAK_ID, transaction_type: 'member_donation', amount: 40, donor_id: NATHAN_ID, period_month: '2026-01-01' },
  { chapter_id: OAK_ID, transaction_type: 'punc_support', amount: 15, period_month: '2026-01-01' },
  // February (current, not reconciled)
  { chapter_id: OAK_ID, transaction_type: 'monthly_debit', amount: -55, period_month: '2026-02-01' },
  { chapter_id: OAK_ID, transaction_type: 'member_donation', amount: 25, donor_id: NATHAN_ID, period_month: '2026-02-01' },
];

// Mark some members as contributing
await supabase.from('chapter_memberships').update({
  is_contributing: true,
  became_contributing_at: '2025-06-01',
}).eq('user_id', NATHAN_ID);
```

---

## Session 12 Success Criteria

**Database:**
- [ ] `chapter_ledger` table created with all transaction types
- [ ] `is_contributing` field on chapter_memberships
- [ ] `chapter_funding` view calculates balances correctly
- [ ] `chapter_funding_current_month` view works

**Contributing Member Flow:**
- [ ] Leader can invite member to become contributing
- [ ] Member sees task to accept/decline
- [ ] Accepting updates membership and shows funding card
- [ ] Declining just completes task

**Member Donation Flow:**
- [ ] Contributing members see funding card on chapter dashboard
- [ ] Funding card shows this month progress and PUNC relationship
- [ ] "Support Our Chapter" opens donation form
- [ ] Donation recorded in ledger with attribution

**Cross-Chapter Donation:**
- [ ] Contributing members can browse chapters in need
- [ ] Can donate to other chapters
- [ ] Cross-chapter donation recorded correctly
- [ ] Recipient leader notified (if not anonymous)

**Admin Dashboard Widget:**
- [ ] Shows expected monthly revenue
- [ ] Shows covered amount with breakdown
- [ ] Shows estimated PUNC support needed
- [ ] Links to funding detail page

**Admin Funding Page:**
- [ ] Summary cards show organization totals
- [ ] Chapter table shows per-chapter breakdown
- [ ] Can filter/sort chapters
- [ ] Can record outside donations
- [ ] Can run monthly debit (with duplicate protection)
- [ ] Can run month-end reconciliation

**Chapter Funding Detail:**
- [ ] Shows lifetime PUNC relationship
- [ ] Shows monthly history
- [ ] Shows full transaction log

---

## File Structure

```
/app/
  /chapter/[chapterId]/
    /support/page.tsx                    # Donate to own chapter
    /members/[memberId]/page.tsx         # Add invite-contributing button
  /support-chapters/page.tsx             # Browse and support other chapters
  /tasks/
    /become-contributing/[taskId]/page.tsx

/app/admin/
  /funding/
    page.tsx                             # Funding overview
    /chapters/[chapterId]/page.tsx       # Chapter funding detail

/components/
  /chapter/
    FundingCard.tsx                      # Member-facing funding display
  /admin/
    FundingWidget.tsx                    # Dashboard widget
    RecordOutsideDonationModal.tsx
    FundingChapterTable.tsx

/app/api/
  /chapters/[chapterId]/
    donate/route.ts
    cross-donate/route.ts
    /members/[memberId]/
      invite-contributing/route.ts
  /tasks/
    /become-contributing/[taskId]/route.ts
  /admin/funding/
    outside-donation/route.ts
    monthly-debit/route.ts
    reconcile/route.ts
    adjustment/route.ts
```

---

## Notes for Future

**Not in Session 12:**
- Stripe integration (donations are recorded, payment is external)
- Recurring payment automation (monthly intent recorded, reminder could be a future task)
- External donor portal (handled by Direct Outcomes, permanently out of scope)

**Possible future enhancements:**
- Donation reminders for monthly intent donors
- Donor recognition (badges, thank you messages)
- Chapter funding goals beyond $55 (special projects)
- PUNC-allocated chapters (charitable designation)

---

**Track the money. Show the truth. No shame.**
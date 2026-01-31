// Core Database Types for PUNC Chapter Management App
// Based on Technical Specification v1.0

export type UserStatus = 'unassigned' | 'assigned' | 'inactive'
export type DisplayPreference = 'real_name' | 'username'
export type MemberType = 'regular' | 'contributing'
export type ChapterStatus = 'forming' | 'open' | 'closed'
export type MeetingFrequency = 'weekly' | 'biweekly' | 'monthly'
export type MeetingStatus = 'scheduled' | 'cancelled' | 'completed' | 'validated'
export type RoleType = 'Chapter Leader' | 'Backup Leader' | 'Outreach Leader' | 'Program Leader'
export type RSVPStatus = 'yes' | 'no' | 'maybe' | 'no_response'
export type AttendanceType = 'in_person' | 'video' | 'absent'
export type FundingStatus = 'fully_funded' | 'partially_funded' | 'deficit' | 'surplus'

// ===== Core Entities =====

export interface Address {
  street: string
  city: string
  state: string
  zip: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface RecurringSchedule {
  frequency: MeetingFrequency
  day_of_week: number // 0-6
  time: string // HH:MM format
  location: Address
}

export interface User {
  id: string
  name: string
  phone: string
  email: string
  address: string // Will be expanded to Address type later
  username: string
  display_preference: DisplayPreference
  status: UserStatus
  leader_certified: boolean
  leader_certification_date: string | null
  leader_certification_expiry: string | null
  created_at: string
  updated_at: string
}

export interface Chapter {
  id: string
  name: string
  status: ChapterStatus
  max_members: number // default 12
  meeting_schedule: RecurringSchedule
  next_meeting_location: Address
  monthly_cost: number // default $55
  current_balance: number
  funding_status: FundingStatus
  funding_visibility: boolean
  created_at: string
  updated_at: string
}

export interface ChapterMembership {
  id: string
  chapter_id: string
  user_id: string
  joined_at: string
  left_at: string | null
  is_active: boolean
}

export interface ChapterRole {
  id: string
  chapter_id: string
  user_id: string
  role_type: RoleType | string // custom roles allowed
  assigned_at: string
  assigned_by: string
}

export interface ChapterMemberType {
  id: string
  chapter_id: string
  user_id: string
  member_type: MemberType
  upgraded_at: string | null
}

export interface Meeting {
  id: string
  chapter_id: string
  scheduled_datetime: string
  actual_datetime: string | null
  location: Address
  duration_minutes: number | null
  topic: string | null
  curriculum_module_id: string | null
  status: MeetingStatus
  validated_by: string | null
  validated_at: string | null
  audio_recording_url: string | null
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  meeting_id: string
  user_id: string
  rsvp_status: RSVPStatus
  attendance_type: AttendanceType
  checked_in_at: string | null
  created_at: string
  updated_at: string
}

export interface MeetingFeedback {
  id: string
  meeting_id: string
  user_id: string
  value_rating: number // 1-10
  additional_data: Record<string, unknown>
  submitted_at: string
}

// ===== Curriculum & Badges (Phase 3) =====

export interface CurriculumModule {
  id: string
  title: string
  description: string
  category: string
  exercises: Record<string, unknown>
  assignments: Record<string, unknown>
  commitment_prompts: Record<string, unknown>
  order_index: number
  punc_managed: boolean
  created_at: string
  updated_at: string
}

export interface Badge {
  id: string
  user_id: string
  module_id: string
  awarded_at: string
}

// ===== Commitments (Phase 2) =====

export type CommitmentType = 'stretch_goal' | 'to_member' | 'volunteer_activity' | 'help_favor'
export type CommitmentStatus = 'pending' | 'completed' | 'abandoned'

export interface Commitment {
  id: string
  chapter_id: string
  made_by: string
  made_at_meeting: string | null
  commitment_type: CommitmentType
  description: string
  recipient_id: string | null
  deadline: string | null
  status: CommitmentStatus
  self_reported_status: CommitmentStatus
  recipient_reported_status: CommitmentStatus | null
  discrepancy_flagged: boolean
  created_at: string
  updated_at: string
}

// ===== Chapter Formation (Phase 4) =====

export type FormationRequestStatus = 'waitlist' | 'matched' | 'formed' | 'cancelled'

export interface ChapterFormationRequest {
  id: string
  user_id: string
  requested_location: Address
  status: FormationRequestStatus
  matched_chapter_id: string | null
  created_at: string
  updated_at: string
}

// ===== Funding & Donations (Phase 5) =====

export type TransactionType = 'monthly_debit' | 'member_contribution' | 'external_donor' | 'adjustment'
export type SourceType = 'chapter_member' | 'external_donor' | 'system' | 'punc_admin'
export type Attribution = 'anonymous' | 'attributed'
export type DonationFrequency = 'one_time' | 'monthly_recurring'
export type DonationAttribution = 'anonymous' | 'show_to_leader' | 'show_to_chapter'

export interface ChapterLedger {
  id: string
  chapter_id: string
  transaction_type: TransactionType
  amount: number
  source_user_id: string | null
  source_type: SourceType
  attribution: Attribution
  notes: string | null
  transaction_date: string
  created_at: string
}

export interface Donation {
  id: string
  donor_user_id: string
  recipient_chapter_id: string
  amount: number
  frequency: DonationFrequency
  attribution: DonationAttribution
  is_active: boolean
  next_charge_date: string | null
  started_at: string
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

// ===== PUNC Admin (Phase 5) =====

export interface LeaderAbsenceFlag {
  id: string
  chapter_id: string
  leader_id: string
  absence_count: number
  total_meetings: number
  flagged_at: string
  resolved: boolean
}

export interface MeetingValidationQueue {
  id: string
  meeting_id: string
  chapter_id: string
  submitted_at: string
  validated_for_donor: boolean
  transferred_to_direct_outcomes: boolean
  transferred_at: string | null
}

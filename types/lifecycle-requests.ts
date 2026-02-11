// Chapter Lifecycle Request Types
// Session 11: Formation, Split, and Dissolution requests

// Request Types
export type RequestType = 'formation' | 'split' | 'dissolution';

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

// Opt-In Types
export type OptInType = 'formation' | 'split_existing' | 'split_new';

export type OptInStatus = 'pending' | 'confirmed' | 'declined';

export type ChapterAssignment = 'original' | 'new' | 'both';

// Formation Request Data
export interface FormationRequestData {
  proposed_name: string;
  proposed_location: string;
  meeting_day: string;  // Monday, Tuesday, etc.
  meeting_time: string; // HH:MM
  meeting_frequency: 'weekly' | 'biweekly' | 'monthly';
  founding_member_ids: string[];  // user IDs
  leader_statement: string;  // Why I want to lead this chapter
}

// Split Request Data
export interface SplitRequestData {
  reason: string;

  // New chapter details
  new_chapter_name: string;
  new_chapter_location: string;
  new_chapter_meeting_day?: string;  // defaults to same as original
  new_chapter_meeting_time?: string;

  // Member assignments (existing chapter members)
  original_chapter_member_ids: string[];
  new_chapter_member_ids: string[];
  dual_membership_member_ids: string[];  // in both

  // NEW members joining (now that there's room)
  new_member_ids: string[];
  new_members_target: Record<string, 'original' | 'new'>;  // which chapter each joins

  // Leadership for new chapter
  new_chapter_leader_id: string;
  new_chapter_backup_leader_id?: string;
}

// Dissolution Request Data
export interface DissolutionRequestData {
  reason: string;
  what_happened: string;  // narrative of chapter's journey
  member_notes: Record<string, string>;  // user_id -> preference/notes
}

// Union type for all request data
export type LifecycleRequestData =
  | FormationRequestData
  | SplitRequestData
  | DissolutionRequestData;

// Main Lifecycle Request
export interface LifecycleRequest {
  id: string;
  request_type: RequestType;
  status: RequestStatus;

  // Who submitted
  submitted_by: string;
  submitted_at: string | null;

  // For split/dissolution: which chapter
  chapter_id: string | null;

  // Request data (varies by type)
  request_data: LifecycleRequestData;

  // Review
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;

  created_at: string;
  updated_at: string;
}

// Lifecycle Request with Relations
export interface LifecycleRequestWithRelations extends LifecycleRequest {
  submitter?: {
    id: string;
    name: string;
    email: string;
  };
  chapter?: {
    id: string;
    name: string;
    status: string;
  };
  reviewer?: {
    id: string;
    name: string;
  };
  opt_ins?: MemberOptIn[];
  messages?: LifecycleRequestMessage[];
}

// Lifecycle Request Message
export interface LifecycleRequestMessage {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender?: {
    id: string;
    name: string;
  };
}

// Member Opt-In
export interface MemberOptIn {
  id: string;
  request_id: string;
  user_id: string;

  // Type of opt-in
  opt_in_type: OptInType;

  // For split: which chapter assignment
  proposed_assignment: ChapterAssignment | null;

  // Response
  status: OptInStatus;
  confirmed_assignment: ChapterAssignment | null;

  // Confirmed contact info
  confirmed_address: string | null;
  confirmed_phone: string | null;

  // Timestamps
  notified_at: string | null;
  responded_at: string | null;
  created_at: string;

  // Relations
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

// API Request/Response Types

export interface CreateRequestPayload {
  request_type: RequestType;
  chapter_id?: string;
  request_data: LifecycleRequestData;
}

export interface UpdateRequestPayload {
  request_data?: LifecycleRequestData;
  status?: RequestStatus;
}

export interface SubmitRequestPayload {
  // No additional data needed - just changes status
}

export interface OptInResponsePayload {
  response: 'confirm' | 'decline' | 'request_change';
  confirmed_assignment?: ChapterAssignment;
  address?: string;
  phone?: string;
  change_request?: string;
}

export interface ApproveRequestPayload {
  review_notes?: string;
}

export interface RejectRequestPayload {
  review_notes: string;  // Required for rejection
}

export interface AddMessagePayload {
  message: string;
}

// UI Helper Types

export interface OptInStatusSummary {
  total: number;
  confirmed: number;
  declined: number;
  pending: number;
  hasDeclined: boolean;
  allConfirmed: boolean;
}

export interface ValidationCheckItem {
  label: string;
  checked: boolean;
  required: boolean;
}

export interface RequestValidation {
  checks: ValidationCheckItem[];
  isValid: boolean;
  canApprove: boolean;
}

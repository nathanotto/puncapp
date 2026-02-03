-- ============================================================================
-- COMPLETE DATABASE SCHEMA SNAPSHOT
-- Generated: 2026-02-01
-- Source: Compiled from all migration files
-- ============================================================================
-- This file represents the complete database schema and can be used to
-- recreate the entire database structure from scratch.
-- ============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA public;

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

-- Add monthly_support field to chapters table
ALTER TABLE chapters ADD COLUMN monthly_support DECIMAL(10,2) NOT NULL DEFAULT 55.00;

-- Create chapter_funding table to track donations
CREATE TABLE chapter_funding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  funding_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_chapter_funding_chapter ON chapter_funding(chapter_id);
CREATE INDEX idx_chapter_funding_user ON chapter_funding(user_id);
CREATE INDEX idx_chapter_funding_date ON chapter_funding(funding_date);

-- Enable RLS
ALTER TABLE chapter_funding ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapter_funding
-- Users can view funding for their own chapters
CREATE POLICY "Users can view funding for their chapters"
  ON chapter_funding FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can create funding records for any chapter
CREATE POLICY "Users can create funding records"
  ON chapter_funding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create chapter_updates table for message board
CREATE TABLE chapter_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_chapter_updates_chapter ON chapter_updates(chapter_id);
CREATE INDEX idx_chapter_updates_created ON chapter_updates(created_at DESC);

-- Enable RLS
ALTER TABLE chapter_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chapter_updates
-- Members can view updates for their chapters
CREATE POLICY "Members can view chapter updates"
  ON chapter_updates FOR SELECT
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Members can create updates for their chapters
CREATE POLICY "Members can create chapter updates"
  ON chapter_updates FOR INSERT
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
-- Add admin role to users table
-- PUNC Admins are completely separate from chapter members
-- but use the same Supabase Auth for simplicity

ALTER TABLE users
ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster admin queries
CREATE INDEX idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

-- RLS Policy: Admins can view all users
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );

-- RLS Policy: Admins can update all users
CREATE POLICY "Admins can update all users"
  ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.is_admin = true
    )
  );
-- Add RLS policies for chapter_roles table
-- These were missing from the initial schema

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON chapter_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view roles of members in their chapters
CREATE POLICY "Users can view chapter members' roles"
  ON chapter_roles
  FOR SELECT
  USING (
    chapter_id IN (SELECT user_chapters())
  );

-- Leaders can insert roles for their chapter
CREATE POLICY "Leaders can assign roles"
  ON chapter_roles
  FOR INSERT
  WITH CHECK (
    chapter_id IN (
      SELECT chapter_id FROM chapter_roles
      WHERE user_id = auth.uid()
      AND role_type IN ('Chapter Leader', 'Backup Leader')
    )
  );

-- Leaders can update roles in their chapter
CREATE POLICY "Leaders can update roles"
  ON chapter_roles
  FOR UPDATE
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_roles
      WHERE user_id = auth.uid()
      AND role_type IN ('Chapter Leader', 'Backup Leader')
    )
  );

-- Leaders can delete roles in their chapter
CREATE POLICY "Leaders can delete roles"
  ON chapter_roles
  FOR DELETE
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_roles
      WHERE user_id = auth.uid()
      AND role_type IN ('Chapter Leader', 'Backup Leader')
    )
  );
-- Add completion comment field to commitments table

ALTER TABLE commitments
ADD COLUMN completion_comment TEXT;

-- Add completion date field
ALTER TABLE commitments
ADD COLUMN completed_at TIMESTAMPTZ;
-- Create commitments table for tracking member commitments

CREATE TABLE commitments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  made_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  made_at_meeting UUID REFERENCES meetings(id) ON DELETE SET NULL,
  commitment_type TEXT NOT NULL CHECK (commitment_type IN ('stretch_goal', 'to_member', 'volunteer_activity', 'help_favor')),
  description TEXT NOT NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'abandoned')),
  self_reported_status TEXT NOT NULL DEFAULT 'pending' CHECK (self_reported_status IN ('pending', 'completed', 'abandoned')),
  recipient_reported_status TEXT CHECK (recipient_reported_status IN ('pending', 'completed', 'abandoned')),
  discrepancy_flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_commitments_chapter_id ON commitments(chapter_id);
CREATE INDEX idx_commitments_made_by ON commitments(made_by);
CREATE INDEX idx_commitments_recipient_id ON commitments(recipient_id);
CREATE INDEX idx_commitments_status ON commitments(status);
CREATE INDEX idx_commitments_discrepancy_flagged ON commitments(discrepancy_flagged);

-- Update timestamp trigger
CREATE TRIGGER update_commitments_updated_at
  BEFORE UPDATE ON commitments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view commitments they made
CREATE POLICY "Users can view their own commitments"
  ON commitments
  FOR SELECT
  USING (made_by = auth.uid());

-- Users can view commitments made to them
CREATE POLICY "Users can view commitments made to them"
  ON commitments
  FOR SELECT
  USING (recipient_id = auth.uid());

-- Users can view all commitments in their chapters
CREATE POLICY "Users can view commitments in their chapters"
  ON commitments
  FOR SELECT
  USING (chapter_id IN (SELECT user_chapters()));

-- Users can create commitments in their chapters
CREATE POLICY "Users can create commitments in their chapters"
  ON commitments
  FOR INSERT
  WITH CHECK (
    chapter_id IN (SELECT user_chapters())
    AND made_by = auth.uid()
  );

-- Users can update their own commitment status
CREATE POLICY "Users can update their own commitments"
  ON commitments
  FOR UPDATE
  USING (made_by = auth.uid())
  WITH CHECK (made_by = auth.uid());

-- Recipients can update recipient_reported_status
CREATE POLICY "Recipients can update status"
  ON commitments
  FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Leaders can update all commitments in their chapters
CREATE POLICY "Leaders can update commitments in their chapters"
  ON commitments
  FOR UPDATE
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_roles
      WHERE user_id = auth.uid()
      AND role_type IN ('Chapter Leader', 'Backup Leader')
    )
  );

-- Leaders can delete commitments in their chapters
CREATE POLICY "Leaders can delete commitments"
  ON commitments
  FOR DELETE
  USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_roles
      WHERE user_id = auth.uid()
      AND role_type IN ('Chapter Leader', 'Backup Leader')
    )
  );
-- Create curriculum_modules table for PUNC official content and custom modules

CREATE TABLE curriculum_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- e.g., "relationship", "fear", "addiction", "emotion", "purpose", "leadership"
  exercises JSONB DEFAULT '[]'::jsonb,
  assignments JSONB DEFAULT '[]'::jsonb,
  commitment_prompts JSONB DEFAULT '[]'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  punc_managed BOOLEAN NOT NULL DEFAULT false, -- true for official PUNC curriculum
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_curriculum_modules_category ON curriculum_modules(category);
CREATE INDEX idx_curriculum_modules_punc_managed ON curriculum_modules(punc_managed);
CREATE INDEX idx_curriculum_modules_order_index ON curriculum_modules(order_index);

-- Update timestamp trigger
CREATE TRIGGER update_curriculum_modules_updated_at
  BEFORE UPDATE ON curriculum_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE curriculum_modules ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Everyone can view curriculum modules (they're public content)
CREATE POLICY "Anyone can view curriculum modules"
  ON curriculum_modules
  FOR SELECT
  USING (true);

-- Only PUNC admins can create/update/delete modules (for now, we'll allow all authenticated for testing)
-- In production, this would check for admin role
CREATE POLICY "Authenticated users can manage custom modules"
  ON curriculum_modules
  FOR ALL
  USING (punc_managed = false)
  WITH CHECK (punc_managed = false);

-- PUNC-managed modules can only be modified by admins (blocked for now)
-- When we add admin roles, we'll update this policy
-- Create a better exec_sql function that returns proper JSON results

DROP FUNCTION IF EXISTS exec_sql(text);

CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- For SELECT queries, return results as JSONB array
  IF lower(trim(sql_query)) LIKE 'select%' THEN
    EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', sql_query) INTO result;
    RETURN COALESCE(result, '[]'::jsonb);
  ELSE
    -- For INSERT/UPDATE/DELETE, execute and return success message
    EXECUTE sql_query;
    RETURN jsonb_build_object('success', true, 'message', 'Query executed successfully');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql TO service_role, authenticated, anon;
-- Create a function to handle user profile creation that bypasses RLS
-- This is called during signup when the session might not be fully established

CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  user_email TEXT,
  user_address TEXT,
  user_username TEXT,
  user_display_preference TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    name,
    phone,
    email,
    address,
    username,
    display_preference,
    status,
    leader_certified
  ) VALUES (
    user_id,
    user_name,
    user_phone,
    user_email,
    user_address,
    user_username,
    user_display_preference::display_preference,
    'unassigned'::user_status,
    false
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated, anon;
-- Fix infinite recursion in chapter_memberships policy
-- The original policy was checking chapter_memberships within itself

DROP POLICY IF EXISTS "Members can view chapter memberships" ON chapter_memberships;

-- Much simpler policy: users can view their own memberships and memberships in their chapters
-- We'll use a stored function to avoid recursion
CREATE OR REPLACE FUNCTION user_chapters()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT chapter_id
  FROM chapter_memberships
  WHERE user_id = auth.uid() AND is_active = true;
$$;

CREATE POLICY "Members can view chapter memberships" ON chapter_memberships
  FOR SELECT
  USING (
    chapter_id IN (SELECT user_chapters())
    OR user_id = auth.uid()
  );
-- Fix RLS policy to allow new user profile creation during signup

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can create own profile on signup" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
-- Add a more permissive SELECT policy for authenticated users
-- This ensures users can always read their own profile when authenticated

DROP POLICY IF EXISTS "Users can view own profile" ON users;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Also allow anon users to select their own profile (for signup flow)
CREATE POLICY "Anon users can view own profile during signup" ON users
  FOR SELECT
  TO anon
  USING (auth.uid() = id);
-- PUNC Chapter Management App - Initial Database Schema
-- Phase 1: Core Chapter Management (MVP)
-- Date: 2026-01-31

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CUSTOM TYPES (ENUMS)
-- =====================================================

CREATE TYPE user_status AS ENUM ('unassigned', 'assigned', 'inactive');
CREATE TYPE display_preference AS ENUM ('real_name', 'username');
CREATE TYPE member_type AS ENUM ('regular', 'contributing');
CREATE TYPE chapter_status AS ENUM ('forming', 'open', 'closed');
CREATE TYPE meeting_frequency AS ENUM ('weekly', 'biweekly', 'monthly');
CREATE TYPE meeting_status AS ENUM ('scheduled', 'cancelled', 'completed', 'validated');
CREATE TYPE rsvp_status AS ENUM ('yes', 'no', 'maybe', 'no_response');
CREATE TYPE attendance_type AS ENUM ('in_person', 'video', 'absent');
CREATE TYPE funding_status AS ENUM ('fully_funded', 'partially_funded', 'deficit', 'surplus');

-- =====================================================
-- TABLES
-- =====================================================

-- Users Table (extends Supabase auth.users)
-- This stores additional user profile information beyond auth
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL, -- Will be expanded to JSONB Address type later
  username TEXT UNIQUE NOT NULL,
  display_preference display_preference NOT NULL DEFAULT 'real_name',
  status user_status NOT NULL DEFAULT 'unassigned',
  leader_certified BOOLEAN NOT NULL DEFAULT false,
  leader_certification_date TIMESTAMPTZ,
  leader_certification_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT username_min_length CHECK (char_length(username) >= 2),
  CONSTRAINT phone_not_empty CHECK (char_length(phone) >= 10)
);

-- Chapters Table
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status chapter_status NOT NULL DEFAULT 'forming',
  max_members INTEGER NOT NULL DEFAULT 12,
  meeting_schedule JSONB NOT NULL, -- RecurringSchedule object
  next_meeting_location JSONB NOT NULL, -- Address object
  monthly_cost DECIMAL(10, 2) NOT NULL DEFAULT 55.00,
  current_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  funding_status funding_status NOT NULL DEFAULT 'deficit',
  funding_visibility BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT max_members_valid CHECK (max_members >= 5 AND max_members <= 12),
  CONSTRAINT name_not_empty CHECK (char_length(name) >= 3)
);

-- Chapter Membership Table (tracks which users are in which chapters)
CREATE TABLE chapter_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(chapter_id, user_id),
  CONSTRAINT left_after_joined CHECK (left_at IS NULL OR left_at > joined_at)
);

-- Chapter Roles Table (leader, backup leader, outreach leader, program leader)
CREATE TABLE chapter_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL, -- 'Chapter Leader', 'Backup Leader', 'Outreach Leader', 'Program Leader', or custom
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(chapter_id, user_id, role_type),
  CONSTRAINT role_type_not_empty CHECK (char_length(role_type) >= 2)
);

-- Chapter Member Type Table (regular vs contributing member)
CREATE TABLE chapter_member_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_type member_type NOT NULL DEFAULT 'regular',
  upgraded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(chapter_id, user_id)
);

-- Meetings Table
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  scheduled_datetime TIMESTAMPTZ NOT NULL,
  actual_datetime TIMESTAMPTZ,
  location JSONB NOT NULL, -- Address object
  duration_minutes INTEGER,
  topic TEXT,
  curriculum_module_id UUID, -- Will be foreign key in Phase 3
  status meeting_status NOT NULL DEFAULT 'scheduled',
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMPTZ,
  audio_recording_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT duration_positive CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

-- Attendance Table (tracks RSVPs and actual attendance)
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rsvp_status rsvp_status NOT NULL DEFAULT 'no_response',
  attendance_type attendance_type NOT NULL DEFAULT 'absent',
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(meeting_id, user_id)
);

-- Meeting Feedback Table (member ratings after meetings)
CREATE TABLE meeting_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value_rating INTEGER NOT NULL,
  additional_data JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(meeting_id, user_id),
  CONSTRAINT rating_valid CHECK (value_rating >= 1 AND value_rating <= 10)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_leader_certified ON users(leader_certified);

-- Chapters indexes
CREATE INDEX idx_chapters_status ON chapters(status);
CREATE INDEX idx_chapters_funding_status ON chapters(funding_status);

-- Chapter Memberships indexes
CREATE INDEX idx_chapter_memberships_chapter_id ON chapter_memberships(chapter_id);
CREATE INDEX idx_chapter_memberships_user_id ON chapter_memberships(user_id);
CREATE INDEX idx_chapter_memberships_is_active ON chapter_memberships(is_active);

-- Chapter Roles indexes
CREATE INDEX idx_chapter_roles_chapter_id ON chapter_roles(chapter_id);
CREATE INDEX idx_chapter_roles_user_id ON chapter_roles(user_id);
CREATE INDEX idx_chapter_roles_role_type ON chapter_roles(role_type);

-- Meetings indexes
CREATE INDEX idx_meetings_chapter_id ON meetings(chapter_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_scheduled_datetime ON meetings(scheduled_datetime);

-- Attendance indexes
CREATE INDEX idx_attendance_meeting_id ON attendance(meeting_id);
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_rsvp_status ON attendance(rsvp_status);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapter_memberships_updated_at BEFORE UPDATE ON chapter_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapter_member_types_updated_at BEFORE UPDATE ON chapter_member_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check max active chapters per user (limit: 2)
CREATE OR REPLACE FUNCTION check_max_active_chapters()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO active_count
  FROM chapter_memberships
  WHERE user_id = NEW.user_id
    AND is_active = true
    AND id != COALESCE(NEW.id, uuid_generate_v4());

  IF active_count >= 2 THEN
    RAISE EXCEPTION 'User cannot be in more than 2 active chapters';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_user_max_chapters BEFORE INSERT OR UPDATE ON chapter_memberships
  FOR EACH ROW EXECUTE FUNCTION check_max_active_chapters();

-- Function to check max leaders per user (limit: 2)
CREATE OR REPLACE FUNCTION check_max_leader_roles()
RETURNS TRIGGER AS $$
DECLARE
  leader_count INTEGER;
BEGIN
  -- Only check for Chapter Leader and Backup Leader roles
  IF NEW.role_type IN ('Chapter Leader', 'Backup Leader') THEN
    SELECT COUNT(*)
    INTO leader_count
    FROM chapter_roles cr
    JOIN chapter_memberships cm ON cr.chapter_id = cm.chapter_id AND cr.user_id = cm.user_id
    WHERE cr.user_id = NEW.user_id
      AND cr.role_type IN ('Chapter Leader', 'Backup Leader')
      AND cm.is_active = true
      AND cr.id != COALESCE(NEW.id, uuid_generate_v4());

    IF leader_count >= 2 THEN
      RAISE EXCEPTION 'User cannot be a leader in more than 2 chapters';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_user_max_leaders BEFORE INSERT OR UPDATE ON chapter_roles
  FOR EACH ROW EXECUTE FUNCTION check_max_leader_roles();

-- Function to require leader certification for Chapter Leader role
CREATE OR REPLACE FUNCTION check_leader_certification()
RETURNS TRIGGER AS $$
DECLARE
  is_certified BOOLEAN;
BEGIN
  IF NEW.role_type = 'Chapter Leader' THEN
    SELECT leader_certified
    INTO is_certified
    FROM users
    WHERE id = NEW.user_id;

    IF NOT is_certified THEN
      RAISE EXCEPTION 'User must be leader certified to be assigned as Chapter Leader';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_leader_cert BEFORE INSERT OR UPDATE ON chapter_roles
  FOR EACH ROW EXECUTE FUNCTION check_leader_certification();

-- Function to update user status when joining/leaving chapters
CREATE OR REPLACE FUNCTION update_user_status_on_membership_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If joining a chapter (new record or reactivated)
  IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR
     (TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false) THEN
    UPDATE users SET status = 'assigned' WHERE id = NEW.user_id;
  END IF;

  -- If leaving all chapters (deactivated)
  IF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
    -- Check if user has any other active memberships
    IF NOT EXISTS (
      SELECT 1 FROM chapter_memberships
      WHERE user_id = NEW.user_id AND is_active = true AND id != NEW.id
    ) THEN
      UPDATE users SET status = 'unassigned' WHERE id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_status AFTER INSERT OR UPDATE ON chapter_memberships
  FOR EACH ROW EXECUTE FUNCTION update_user_status_on_membership_change();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_member_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_feedback ENABLE ROW LEVEL SECURITY;

-- Users: Can read own profile, update own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users: Can view profiles of members in same chapter
CREATE POLICY "Users can view chapter members' profiles" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chapter_memberships cm1
      JOIN chapter_memberships cm2 ON cm1.chapter_id = cm2.chapter_id
      WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = users.id
        AND cm1.is_active = true
        AND cm2.is_active = true
    )
  );

-- Chapters: Members can view their chapters
CREATE POLICY "Members can view their chapters" ON chapters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chapter_memberships
      WHERE chapter_id = chapters.id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

-- Chapters: Leaders can update their chapters
CREATE POLICY "Leaders can update their chapters" ON chapters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chapter_roles
      WHERE chapter_id = chapters.id
        AND user_id = auth.uid()
        AND role_type IN ('Chapter Leader', 'Backup Leader')
    )
  );

-- Chapter Memberships: Members can view memberships in their chapters
CREATE POLICY "Members can view chapter memberships" ON chapter_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chapter_memberships cm
      WHERE cm.chapter_id = chapter_memberships.chapter_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

-- Meetings: Members can view meetings in their chapters
CREATE POLICY "Members can view chapter meetings" ON meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chapter_memberships
      WHERE chapter_id = meetings.chapter_id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

-- Meetings: Leaders can create/update meetings in their chapters
CREATE POLICY "Leaders can manage meetings" ON meetings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chapter_roles
      WHERE chapter_id = meetings.chapter_id
        AND user_id = auth.uid()
        AND role_type IN ('Chapter Leader', 'Backup Leader')
    )
  );

-- Attendance: Members can view and update their own attendance
CREATE POLICY "Members can manage own attendance" ON attendance
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM chapter_roles cr
      JOIN meetings m ON cr.chapter_id = m.chapter_id
      WHERE m.id = attendance.meeting_id
        AND cr.user_id = auth.uid()
        AND cr.role_type IN ('Chapter Leader', 'Backup Leader')
    )
  );

-- Meeting Feedback: Members can submit their own feedback
CREATE POLICY "Members can manage own feedback" ON meeting_feedback
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- SEED DATA (Optional - for development/testing)
-- =====================================================

-- Note: Run this section only in development, not production
-- Uncomment to add seed data after creating your first auth user

/*
-- Insert a test user (replace with actual auth.users ID)
INSERT INTO users (id, name, phone, email, address, username, display_preference, status, leader_certified)
VALUES
  ('your-auth-user-id-here', 'Test Leader', '555-0100', 'leader@test.com', '123 Main St, Austin, TX 78701', 'testleader', 'real_name', 'assigned', true);

-- Insert a test chapter
INSERT INTO chapters (id, name, status, meeting_schedule, next_meeting_location)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'The Oak Chapter', 'open',
   '{"frequency": "biweekly", "day_of_week": 6, "time": "10:00", "location": {"street": "123 Main St", "city": "Austin", "state": "TX", "zip": "78701"}}'::jsonb,
   '{"street": "123 Main St", "city": "Austin", "state": "TX", "zip": "78701"}'::jsonb);
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- ============================================================================
-- END OF SCHEMA SNAPSHOT
-- ============================================================================
-- To restore this schema to a fresh database:
-- 1. Create a new Supabase project
-- 2. Run: psql <connection_string> < schema-snapshot-2026-02-01.sql
-- ============================================================================


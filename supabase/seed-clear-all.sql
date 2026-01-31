-- Clear all data (except auth.users which is managed by Supabase Auth)
-- Run this before reseeding

-- Delete in reverse order of dependencies
DELETE FROM meeting_feedback WHERE id IS NOT NULL;
DELETE FROM attendance WHERE id IS NOT NULL;
DELETE FROM commitments WHERE id IS NOT NULL;
DELETE FROM meetings WHERE id IS NOT NULL;
DELETE FROM chapter_roles WHERE id IS NOT NULL;
DELETE FROM chapter_member_types WHERE id IS NOT NULL;
DELETE FROM chapter_memberships WHERE id IS NOT NULL;
DELETE FROM chapters WHERE id IS NOT NULL;

-- Delete users except the one we're keeping (Nathan)
DELETE FROM users WHERE email != 'notto@nathanotto.com';

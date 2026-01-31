-- Comprehensive seed data for PUNC Chapter Management App
-- Creates realistic data for testing and demo

-- =====================================================
-- 1. CURRICULUM MODULES (Official PUNC Content)
-- =====================================================

INSERT INTO curriculum_modules (id, title, description, category, punc_managed, order_index) VALUES
('a1111111-1111-1111-1111-111111111111', 'Fear of Men', 'Exploring how the fear of other men''s judgment holds us back from authentic connection and vulnerability.', 'fear', true, 1),
('a2222222-2222-2222-2222-222222222222', 'Addiction and Compulsive Behavior', 'Understanding the roots of addiction and building practices for freedom and self-control.', 'addiction', true, 2),
('a3333333-3333-3333-3333-333333333333', 'Relationships and Intimacy', 'Building deeper connections with partners, friends, and family through honest communication.', 'relationship', true, 3),
('a4444444-4444-4444-4444-444444444444', 'Anger and Rage', 'Unpacking anger, learning to feel it without causing harm, and channeling it constructively.', 'emotion', true, 4),
('a5555555-5555-5555-5555-555555555555', 'Purpose and Calling', 'Discovering what you''re meant to do and building a life around it.', 'purpose', true, 5),
('a6666666-6666-6666-6666-666666666666', 'Grief and Loss', 'Processing loss, honoring what was, and moving forward with integrity.', 'emotion', true, 6),
('a7777777-7777-7777-7777-777777777777', 'Shame and Vulnerability', 'Naming shame, practicing vulnerability, and building shame resilience.', 'emotion', true, 7),
('a8888888-8888-8888-8888-888888888888', 'Leadership and Responsibility', 'Taking ownership of your life and leading others with strength and humility.', 'leadership', true, 8);

-- =====================================================
-- 2. CREATE USERS (35 memorable names + Nathan)
-- =====================================================

-- Nathan already exists, just update to ensure he's assigned
UPDATE users SET status = 'assigned', leader_certified = true, leader_certification_date = NOW() - INTERVAL '6 months'
WHERE email = 'notto@nathanotto.com';

-- Create 35 additional members with memorable names and Denver addresses
INSERT INTO users (id, name, username, phone, email, address, display_preference, status, leader_certified, leader_certification_date) VALUES
-- The Oak Chapter members (11 members + Nathan = 12)
('b0000001-0001-0001-0001-000000000001', 'Marcus Stone', 'StoneWarrior', '720-555-0101', 'marcus.stone@example.com', '1234 Oak Street, Denver, CO 80202', 'real_name', 'assigned', true, NOW() - INTERVAL '1 year'),
('b0000002-0002-0002-0002-000000000002', 'David Rivers', 'RiverRun', '720-555-0102', 'david.rivers@example.com', '2345 Pine Avenue, Denver, CO 80203', 'username', 'assigned', false, NULL),
('b0000003-0003-0003-0003-000000000003', 'James Thunder', 'ThunderJim', '720-555-0103', 'james.thunder@example.com', '3456 Maple Drive, Denver, CO 80204', 'real_name', 'assigned', false, NULL),
('b0000004-0004-0004-0004-000000000004', 'Robert Wolf', 'LoneWolf', '720-555-0104', 'robert.wolf@example.com', '4567 Elm Street, Denver, CO 80205', 'username', 'assigned', false, NULL),
('b0000005-0005-0005-0005-000000000005', 'Michael Bear', 'BearMike', '720-555-0105', 'michael.bear@example.com', '5678 Cedar Lane, Denver, CO 80206', 'real_name', 'assigned', false, NULL),
('b0000006-0006-0006-0006-000000000006', 'Christopher Hawk', 'HawkEye', '720-555-0106', 'chris.hawk@example.com', '6789 Birch Road, Denver, CO 80207', 'username', 'assigned', false, NULL),
('b0000007-0007-0007-0007-000000000007', 'Daniel Mountain', 'MountainDan', '720-555-0107', 'daniel.mountain@example.com', '7890 Spruce Court, Denver, CO 80208', 'real_name', 'assigned', false, NULL),
('b0000008-0008-0008-0008-000000000008', 'Matthew Forge', 'TheForge', '720-555-0108', 'matt.forge@example.com', '8901 Aspen Way, Denver, CO 80209', 'username', 'assigned', false, NULL),
('b0000009-0009-0009-0009-000000000009', 'Andrew Storm', 'Stormbringer', '720-555-0109', 'andrew.storm@example.com', '9012 Willow Place, Denver, CO 80210', 'real_name', 'assigned', false, NULL),
('b0000010-0010-0010-0010-000000000010', 'Joshua Flint', 'FlintStone', '720-555-0110', 'josh.flint@example.com', '1123 Cherry Street, Denver, CO 80211', 'username', 'assigned', false, NULL),
('b0000011-0011-0011-0011-000000000011', 'Ryan Blaze', 'BlazeRunner', '720-555-0111', 'ryan.blaze@example.com', '2234 Poplar Avenue, Denver, CO 80212', 'real_name', 'assigned', false, NULL),

-- The Six Chapter members (6 members)
('b0000012-0012-0012-0012-000000000012', 'Thomas Steel', 'SteelThomas', '720-555-0112', 'thomas.steel@example.com', '3345 Chestnut Drive, Denver, CO 80213', 'real_name', 'assigned', true, NOW() - INTERVAL '8 months'),
('b0000013-0013-0013-0013-000000000013', 'Kevin Frost', 'FrostBite', '720-555-0113', 'kevin.frost@example.com', '4456 Walnut Lane, Denver, CO 80214', 'username', 'assigned', false, NULL),
('b0000014-0014-0014-0014-000000000014', 'Brian Canyon', 'CanyonBrian', '720-555-0114', 'brian.canyon@example.com', '5567 Hickory Road, Denver, CO 80215', 'real_name', 'assigned', false, NULL),
('b0000015-0015-0015-0015-000000000015', 'Steven Ridge', 'RidgeRunner', '720-555-0115', 'steven.ridge@example.com', '6678 Sycamore Court, Denver, CO 80216', 'username', 'assigned', false, NULL),
('b0000016-0016-0016-0016-000000000016', 'Eric Boulder', 'BoulderEric', '720-555-0116', 'eric.boulder@example.com', '7789 Magnolia Way, Denver, CO 80217', 'real_name', 'assigned', false, NULL),

-- The Iron Brotherhood (12 members)
('b0000017-0017-0017-0017-000000000017', 'Paul Anvil', 'AnvilPaul', '720-555-0117', 'paul.anvil@example.com', '8890 Dogwood Place, Denver, CO 80218', 'username', 'assigned', true, NOW() - INTERVAL '10 months'),
('b0000018-0018-0018-0018-000000000018', 'Mark Hammer', 'TheHammer', '720-555-0118', 'mark.hammer@example.com', '9901 Redwood Street, Denver, CO 80219', 'real_name', 'assigned', false, NULL),
('b0000019-0019-0019-0019-000000000019', 'Jason Blade', 'BladeMaster', '720-555-0119', 'jason.blade@example.com', '1012 Ironwood Avenue, Denver, CO 80220', 'username', 'assigned', false, NULL),
('b0000020-0020-0020-0020-000000000020', 'Scott Shield', 'ShieldBearer', '720-555-0120', 'scott.shield@example.com', '2123 Oakwood Drive, Denver, CO 80221', 'real_name', 'assigned', false, NULL),
('b0000021-0021-0021-0021-000000000021', 'Adam Forge', 'ForgeAdam', '720-555-0121', 'adam.forge@example.com', '3234 Pinewood Lane, Denver, CO 80222', 'username', 'assigned', false, NULL),
('b0000022-0022-0022-0022-000000000022', 'Nathan Chain', 'Chainlink', '720-555-0122', 'nathan.chain@example.com', '4345 Maplewood Road, Denver, CO 80223', 'real_name', 'assigned', false, NULL),
('b0000023-0023-0023-0023-000000000023', 'Peter Steel', 'SteelPete', '720-555-0123', 'peter.steel@example.com', '5456 Elmwood Court, Denver, CO 80224', 'username', 'assigned', false, NULL),
('b0000024-0024-0024-0024-000000000024', 'Benjamin Iron', 'IronBen', '720-555-0124', 'ben.iron@example.com', '6567 Cedarwood Way, Denver, CO 80225', 'real_name', 'assigned', false, NULL),
('b0000025-0025-0025-0025-000000000025', 'Samuel Bronze', 'BronzeSam', '720-555-0125', 'sam.bronze@example.com', '7678 Birchwood Place, Denver, CO 80226', 'username', 'assigned', false, NULL),
('b0000026-0026-0026-0026-000000000026', 'Jacob Copper', 'CopperJake', '720-555-0126', 'jacob.copper@example.com', '8789 Sprucewood Street, Denver, CO 80227', 'real_name', 'assigned', false, NULL),
('b0000027-0027-0027-0027-000000000027', 'Nicholas Titan', 'TitanNick', '720-555-0127', 'nick.titan@example.com', '9890 Aspenwood Avenue, Denver, CO 80228', 'username', 'assigned', false, NULL),
('b0000028-0028-0028-0028-000000000028', 'Aaron Sword', 'Swordsman', '720-555-0128', 'aaron.sword@example.com', '1901 Willowwood Drive, Denver, CO 80229', 'real_name', 'assigned', false, NULL),

-- The Mountain Chapter (8 members)
('b0000029-0029-0029-0029-000000000029', 'Ethan Peak', 'PeakEthan', '720-555-0129', 'ethan.peak@example.com', '2012 Summit Lane, Denver, CO 80230', 'real_name', 'assigned', true, NOW() - INTERVAL '5 months'),
('b0000030-0030-0030-0030-000000000030', 'Tyler Cliff', 'CliffDiver', '720-555-0130', 'tyler.cliff@example.com', '3123 Highland Road, Denver, CO 80231', 'username', 'assigned', false, NULL),
('b0000031-0031-0031-0031-000000000031', 'Brandon Summit', 'SummitBrandon', '720-555-0131', 'brandon.summit@example.com', '4234 Alpine Court, Denver, CO 80232', 'real_name', 'assigned', false, NULL),
('b0000032-0032-0032-0032-000000000032', 'Justin Ridge', 'RidgeWalker', '720-555-0132', 'justin.ridge@example.com', '5345 Timberline Way, Denver, CO 80233', 'username', 'assigned', false, NULL),
('b0000033-0033-0033-0033-000000000033', 'Austin Valley', 'ValleyAustin', '720-555-0133', 'austin.valley@example.com', '6456 Foothill Place, Denver, CO 80234', 'real_name', 'assigned', false, NULL),
('b0000034-0034-0034-0034-000000000034', 'Kyle Mesa', 'MesaRunner', '720-555-0134', 'kyle.mesa@example.com', '7567 Cliffside Street, Denver, CO 80235', 'username', 'assigned', false, NULL),
('b0000035-0035-0035-0035-000000000035', 'Dylan Crag', 'CragClimber', '720-555-0135', 'dylan.crag@example.com', '8678 Ridgeline Avenue, Denver, CO 80236', 'real_name', 'assigned', false, NULL),

-- Fresh chapters (forming/new) get fewer members
-- The Phoenix Rising (5 members)
('c0000001-0001-0001-0001-000000000001', 'Logan Ash', 'PhoenixLogan', '720-555-0201', 'logan.ash@example.com', '9789 Ember Drive, Lakewood, CO 80226', 'username', 'assigned', true, NOW() - INTERVAL '2 months'),
('c0000002-0002-0002-0002-000000000002', 'Connor Flame', 'FlameKeeper', '720-555-0202', 'connor.flame@example.com', '1890 Firebird Lane, Lakewood, CO 80227', 'real_name', 'assigned', false, NULL),
('c0000003-0003-0003-0003-000000000003', 'Wyatt Ember', 'EmberWyatt', '720-555-0203', 'wyatt.ember@example.com', '2901 Phoenix Road, Lakewood, CO 80228', 'username', 'assigned', false, NULL),
('c0000004-0004-0004-0004-000000000004', 'Blake Spark', 'SparkBlake', '720-555-0204', 'blake.spark@example.com', '3012 Cinder Court, Lakewood, CO 80229', 'real_name', 'assigned', false, NULL),

-- The Forge (forming - 4 members)
('c0000005-0005-0005-0005-000000000005', 'Cameron Fire', 'Firesmith', '720-555-0205', 'cameron.fire@example.com', '4123 Foundry Way, Aurora, CO 80010', 'username', 'assigned', true, NOW() - INTERVAL '1 month'),
('c0000006-0006-0006-0006-000000000006', 'Mason Coal', 'CoalMason', '720-555-0206', 'mason.coal@example.com', '5234 Smelter Place, Aurora, CO 80011', 'real_name', 'assigned', false, NULL),
('c0000007-0007-0007-0007-000000000007', 'Hunter Kiln', 'KilnHunter', '720-555-0207', 'hunter.kiln@example.com', '6345 Crucible Street, Aurora, CO 80012', 'username', 'assigned', false, NULL),

-- The Wildwood (forming - 4 members)
('c0000008-0008-0008-0008-000000000008', 'Zachary Oak', 'OakZach', '720-555-0208', 'zach.oak@example.com', '7456 Forest Avenue, Arvada, CO 80001', 'real_name', 'assigned', true, NOW() - INTERVAL '3 weeks'),
('c0000009-0009-0009-0009-000000000009', 'Caleb Pine', 'PineCaleb', '720-555-0209', 'caleb.pine@example.com', '8567 Woodland Drive, Arvada, CO 80002', 'username', 'assigned', false, NULL),
('c0000010-0010-0010-0010-000000000010', 'Isaac Birch', 'BirchIsaac', '720-555-0210', 'isaac.birch@example.com', '9678 Grove Lane, Arvada, CO 80003', 'real_name', 'assigned', false, NULL);

-- =====================================================
-- 3. CREATE WAITLIST USERS (Fresh1-Fresh23)
-- =====================================================

INSERT INTO users (name, username, phone, email, address, display_preference, status) VALUES
('Fresh User 1', 'Fresh1', '720-555-1001', 'fresh1@example.com', '1111 Park Street, Denver, CO 80202', 'username', 'unassigned'),
('Fresh User 2', 'Fresh2', '720-555-1002', 'fresh2@example.com', '2222 Lake Avenue, Denver, CO 80203', 'username', 'unassigned'),
('Fresh User 3', 'Fresh3', '720-555-1003', 'fresh3@example.com', '3333 River Drive, Denver, CO 80204', 'username', 'unassigned'),
('Fresh User 4', 'Fresh4', '720-555-1004', 'fresh4@example.com', '4444 Creek Lane, Denver, CO 80205', 'username', 'unassigned'),
('Fresh User 5', 'Fresh5', '720-555-1005', 'fresh5@example.com', '5555 Stream Road, Denver, CO 80206', 'username', 'unassigned'),
('Fresh User 6', 'Fresh6', '720-555-1006', 'fresh6@example.com', '6666 Brook Court, Denver, CO 80207', 'username', 'unassigned'),
('Fresh User 7', 'Fresh7', '720-555-1007', 'fresh7@example.com', '7777 Spring Way, Denver, CO 80208', 'username', 'unassigned'),
('Fresh User 8', 'Fresh8', '720-555-1008', 'fresh8@example.com', '8888 Falls Place, Denver, CO 80209', 'username', 'unassigned'),
('Fresh User 9', 'Fresh9', '720-555-1009', 'fresh9@example.com', '9999 Rapids Street, Denver, CO 80210', 'username', 'unassigned'),
('Fresh User 10', 'Fresh10', '720-555-1010', 'fresh10@example.com', '1010 Valley Avenue, Denver, CO 80211', 'username', 'unassigned'),
('Fresh User 11', 'Fresh11', '720-555-1011', 'fresh11@example.com', '1111 Ridge Drive, Denver, CO 80212', 'username', 'unassigned'),
('Fresh User 12', 'Fresh12', '720-555-1012', 'fresh12@example.com', '1212 Bluff Lane, Denver, CO 80213', 'username', 'unassigned'),
('Fresh User 13', 'Fresh13', '720-555-1013', 'fresh13@example.com', '1313 Mesa Road, Denver, CO 80214', 'username', 'unassigned'),
('Fresh User 14', 'Fresh14', '720-555-1014', 'fresh14@example.com', '1414 Butte Court, Denver, CO 80215', 'username', 'unassigned'),
('Fresh User 15', 'Fresh15', '720-555-1015', 'fresh15@example.com', '1515 Canyon Way, Denver, CO 80216', 'username', 'unassigned'),
('Fresh User 16', 'Fresh16', '720-555-1016', 'fresh16@example.com', '1616 Gorge Place, Denver, CO 80217', 'username', 'unassigned'),
('Fresh User 17', 'Fresh17', '720-555-1017', 'fresh17@example.com', '1717 Ravine Street, Denver, CO 80218', 'username', 'unassigned'),
('Fresh User 18', 'Fresh18', '720-555-1018', 'fresh18@example.com', '1818 Gully Avenue, Denver, CO 80219', 'username', 'unassigned'),
('Fresh User 19', 'Fresh19', '720-555-1019', 'fresh19@example.com', '1919 Hollow Drive, Denver, CO 80220', 'username', 'unassigned'),
('Fresh User 20', 'Fresh20', '720-555-1020', 'fresh20@example.com', '2020 Dell Lane, Denver, CO 80221', 'username', 'unassigned'),
('Fresh User 21', 'Fresh21', '720-555-1021', 'fresh21@example.com', '2121 Glen Road, Denver, CO 80222', 'username', 'unassigned'),
('Fresh User 22', 'Fresh22', '720-555-1022', 'fresh22@example.com', '2222 Vale Court, Denver, CO 80223', 'username', 'unassigned'),
('Fresh User 23', 'Fresh23', '720-555-1023', 'fresh23@example.com', '2323 Basin Way, Denver, CO 80224', 'username', 'unassigned');

-- =====================================================
-- 4. CREATE CHAPTERS
-- =====================================================

INSERT INTO chapters (id, name, status, max_members) VALUES
('11111111-1111-1111-1111-111111111111', 'The Oak Chapter', 'open', 12),
('22222222-2222-2222-2222-222222222222', 'The Six Chapter', 'open', 12),
('33333333-3333-3333-3333-333333333333', 'The Iron Brotherhood', 'open', 12),
('44444444-4444-4444-4444-444444444444', 'The Mountain Chapter', 'open', 12),
('55555555-5555-5555-5555-555555555555', 'The Phoenix Rising', 'open', 12),
('66666666-6666-6666-6666-666666666666', 'The Forge', 'forming', 12),
('77777777-7777-7777-7777-777777777777', 'The Wildwood', 'forming', 12);

-- =====================================================
-- 5. CREATE CHAPTER MEMBERSHIPS
-- =====================================================

-- Get Nathan's ID for use in memberships
DO $$
DECLARE
  nathan_id UUID;
BEGIN
  SELECT id INTO nathan_id FROM users WHERE email = 'notto@nathanotto.com';

  -- The Oak Chapter (12 members including Nathan)
  INSERT INTO chapter_memberships (chapter_id, user_id, joined_at, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', nathan_id, NOW() - INTERVAL '10 months', true),
  ('11111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', NOW() - INTERVAL '10 months', true),
  ('11111111-1111-1111-1111-111111111111', 'b0000002-0002-0002-0002-000000000002', NOW() - INTERVAL '10 months', true),
  ('11111111-1111-1111-1111-111111111111', 'b0000003-0003-0003-0003-000000000003', NOW() - INTERVAL '9 months', true),
  ('11111111-1111-1111-1111-111111111111', 'b0000004-0004-0004-0004-000000000004', NOW() - INTERVAL '9 months', true),
  ('11111111-1111-1111-1111-111111111111', 'b0000005-0005-0005-0005-000000000005', NOW() - INTERVAL '8 months', true),
  ('11111111-1111-1111-1111-111111111111', 'b0000006-0006-0006-0006-000000000006', NOW() - INTERVAL '8 months', true),
  ('11111111-1111-1111-1111-111111111111', 'b0000007-0007-0007-0007-000000000007', NOW() - INTERVAL '7 months', true),
  ('11111111-1111-1111-1111-111111111111', 'b0000008-0008-0008-0008-000000000008', NOW() - INTERVAL '6 months', true),
  ('11111111-1111-1111-1111-111111111111', 'b0000009-0009-0009-0009-000000000009', NOW() - INTERVAL '5 months', true),
  ('11111111-1111-1111-1111-111111111111', 'b0000010-0010-0010-0010-000000000010', NOW() - INTERVAL '4 months', true),
  ('11111111-1111-1111-1111-111111111111', 'b0000011-0011-0011-0011-000000000011', NOW() - INTERVAL '3 months', true);

  -- The Six Chapter (6 members including Nathan)
  INSERT INTO chapter_memberships (chapter_id, user_id, joined_at, is_active) VALUES
  ('22222222-2222-2222-2222-222222222222', nathan_id, NOW() - INTERVAL '9 months', true),
  ('22222222-2222-2222-2222-222222222222', 'b0000012-0012-0012-0012-000000000012', NOW() - INTERVAL '9 months', true),
  ('22222222-2222-2222-2222-222222222222', 'b0000013-0013-0013-0013-000000000013', NOW() - INTERVAL '8 months', true),
  ('22222222-2222-2222-2222-222222222222', 'b0000014-0014-0014-0014-000000000014', NOW() - INTERVAL '7 months', true),
  ('22222222-2222-2222-2222-222222222222', 'b0000015-0015-0015-0015-000000000015', NOW() - INTERVAL '6 months', true),
  ('22222222-2222-2222-2222-222222222222', 'b0000016-0016-0016-0016-000000000016', NOW() - INTERVAL '5 months', true);

  -- The Iron Brotherhood (12 members)
  INSERT INTO chapter_memberships (chapter_id, user_id, joined_at, is_active) VALUES
  ('33333333-3333-3333-3333-333333333333', 'b0000017-0017-0017-0017-000000000017', NOW() - INTERVAL '11 months', true),
  ('33333333-3333-3333-3333-333333333333', 'b0000018-0018-0018-0018-000000000018', NOW() - INTERVAL '11 months', true),
  ('33333333-3333-3333-3333-333333333333', 'b0000019-0019-0019-0019-000000000019', NOW() - INTERVAL '10 months', true),
  ('33333333-3333-3333-3333-333333333333', 'b0000020-0020-0020-0020-000000000020', NOW() - INTERVAL '10 months', true),
  ('33333333-3333-3333-3333-333333333333', 'b0000021-0021-0021-0021-000000000021', NOW() - INTERVAL '9 months', true),
  ('33333333-3333-3333-3333-333333333333', 'b0000022-0022-0022-0022-000000000022', NOW() - INTERVAL '9 months', true),
  ('33333333-3333-3333-3333-333333333333', 'b0000023-0023-0023-0023-000000000023', NOW() - INTERVAL '8 months', true),
  ('33333333-3333-3333-3333-333333333333', 'b0000024-0024-0024-0024-000000000024', NOW() - INTERVAL '7 months', true),
  ('33333333-3333-3333-3333-333333333333', 'b0000025-0025-0025-0025-000000000025', NOW() - INTERVAL '6 months', true),
  ('33333333-3333-3333-3333-333333333333', 'b0000026-0026-0026-0026-000000000026', NOW() - INTERVAL '5 months', true),
  ('33333333-3333-3333-3333-333333333333', 'b0000027-0027-0027-0027-000000000027', NOW() - INTERVAL '4 months', true),
  ('33333333-3333-3333-3333-333333333333', 'b0000028-0028-0028-0028-000000000028', NOW() - INTERVAL '3 months', true);

  -- The Mountain Chapter (8 members)
  INSERT INTO chapter_memberships (chapter_id, user_id, joined_at, is_active) VALUES
  ('44444444-4444-4444-4444-444444444444', 'b0000029-0029-0029-0029-000000000029', NOW() - INTERVAL '6 months', true),
  ('44444444-4444-4444-4444-444444444444', 'b0000030-0030-0030-0030-000000000030', NOW() - INTERVAL '6 months', true),
  ('44444444-4444-4444-4444-444444444444', 'b0000031-0031-0031-0031-000000000031', NOW() - INTERVAL '5 months', true),
  ('44444444-4444-4444-4444-444444444444', 'b0000032-0032-0032-0032-000000000032', NOW() - INTERVAL '5 months', true),
  ('44444444-4444-4444-4444-444444444444', 'b0000033-0033-0033-0033-000000000033', NOW() - INTERVAL '4 months', true),
  ('44444444-4444-4444-4444-444444444444', 'b0000034-0034-0034-0034-000000000034', NOW() - INTERVAL '4 months', true),
  ('44444444-4444-4444-4444-444444444444', 'b0000035-0035-0035-0035-000000000035', NOW() - INTERVAL '3 months', true),
  ('44444444-4444-4444-4444-444444444444', 'c0000010-0010-0010-0010-000000000010', NOW() - INTERVAL '2 months', true);

  -- The Phoenix Rising (5 members)
  INSERT INTO chapter_memberships (chapter_id, user_id, joined_at, is_active) VALUES
  ('55555555-5555-5555-5555-555555555555', 'c0000001-0001-0001-0001-000000000001', NOW() - INTERVAL '3 months', true),
  ('55555555-5555-5555-5555-555555555555', 'c0000002-0002-0002-0002-000000000002', NOW() - INTERVAL '3 months', true),
  ('55555555-5555-5555-5555-555555555555', 'c0000003-0003-0003-0003-000000000003', NOW() - INTERVAL '2 months', true),
  ('55555555-5555-5555-5555-555555555555', 'c0000004-0004-0004-0004-000000000004', NOW() - INTERVAL '2 months', true),
  ('55555555-5555-5555-5555-555555555555', 'b0000035-0035-0035-0035-000000000035', NOW() - INTERVAL '1 month', true);

  -- The Forge (4 members - forming)
  INSERT INTO chapter_memberships (chapter_id, user_id, joined_at, is_active) VALUES
  ('66666666-6666-6666-6666-666666666666', 'c0000005-0005-0005-0005-000000000005', NOW() - INTERVAL '5 weeks', true),
  ('66666666-6666-6666-6666-666666666666', 'c0000006-0006-0006-0006-000000000006', NOW() - INTERVAL '4 weeks', true),
  ('66666666-6666-6666-6666-666666666666', 'c0000007-0007-0007-0007-000000000007', NOW() - INTERVAL '3 weeks', true),
  ('66666666-6666-6666-6666-666666666666', 'b0000034-0034-0034-0034-000000000034', NOW() - INTERVAL '2 weeks', true);

  -- The Wildwood (4 members - forming)
  INSERT INTO chapter_memberships (chapter_id, user_id, joined_at, is_active) VALUES
  ('77777777-7777-7777-7777-777777777777', 'c0000008-0008-0008-0008-000000000008', NOW() - INTERVAL '4 weeks', true),
  ('77777777-7777-7777-7777-777777777777', 'c0000009-0009-0009-0009-000000000009', NOW() - INTERVAL '3 weeks', true),
  ('77777777-7777-7777-7777-777777777777', 'c0000010-0010-0010-0010-000000000010', NOW() - INTERVAL '2 weeks', true),
  ('77777777-7777-7777-7777-777777777777', 'b0000033-0033-0033-0033-000000000033', NOW() - INTERVAL '1 week', true);
END $$;

-- =====================================================
-- 6. CREATE CHAPTER ROLES
-- =====================================================

DO $$
DECLARE
  nathan_id UUID;
BEGIN
  SELECT id INTO nathan_id FROM users WHERE email = 'notto@nathanotto.com';

  INSERT INTO chapter_roles (chapter_id, user_id, role_type, assigned_at) VALUES
  -- The Oak Chapter - Nathan is Leader
  ('11111111-1111-1111-1111-111111111111', nathan_id, 'Chapter Leader', NOW() - INTERVAL '10 months'),
  ('11111111-1111-1111-1111-111111111111', 'b0000001-0001-0001-0001-000000000001', 'Backup Leader', NOW() - INTERVAL '9 months'),
  ('11111111-1111-1111-1111-111111111111', 'b0000002-0002-0002-0002-000000000002', 'Program Leader', NOW() - INTERVAL '8 months'),
  ('11111111-1111-1111-1111-111111111111', 'b0000003-0003-0003-0003-000000000003', 'Outreach Leader', NOW() - INTERVAL '7 months'),

  -- The Six Chapter - Nathan is Backup Leader
  ('22222222-2222-2222-2222-222222222222', 'b0000012-0012-0012-0012-000000000012', 'Chapter Leader', NOW() - INTERVAL '9 months'),
  ('22222222-2222-2222-2222-222222222222', nathan_id, 'Backup Leader', NOW() - INTERVAL '9 months'),
  ('22222222-2222-2222-2222-222222222222', 'b0000013-0013-0013-0013-000000000013', 'Program Leader', NOW() - INTERVAL '7 months'),

  -- The Iron Brotherhood
  ('33333333-3333-3333-3333-333333333333', 'b0000017-0017-0017-0017-000000000017', 'Chapter Leader', NOW() - INTERVAL '11 months'),
  ('33333333-3333-3333-3333-333333333333', 'b0000018-0018-0018-0018-000000000018', 'Backup Leader', NOW() - INTERVAL '10 months'),
  ('33333333-3333-3333-3333-333333333333', 'b0000019-0019-0019-0019-000000000019', 'Program Leader', NOW() - INTERVAL '9 months'),
  ('33333333-3333-3333-3333-333333333333', 'b0000020-0020-0020-0020-000000000020', 'Outreach Leader', NOW() - INTERVAL '8 months'),

  -- The Mountain Chapter
  ('44444444-4444-4444-4444-444444444444', 'b0000029-0029-0029-0029-000000000029', 'Chapter Leader', NOW() - INTERVAL '6 months'),
  ('44444444-4444-4444-4444-444444444444', 'b0000030-0030-0030-0030-000000000030', 'Backup Leader', NOW() - INTERVAL '5 months'),
  ('44444444-4444-4444-4444-444444444444', 'b0000031-0031-0031-0031-000000000031', 'Program Leader', NOW() - INTERVAL '4 months'),

  -- The Phoenix Rising
  ('55555555-5555-5555-5555-555555555555', 'c0000001-0001-0001-0001-000000000001', 'Chapter Leader', NOW() - INTERVAL '3 months'),
  ('55555555-5555-5555-5555-555555555555', 'c0000002-0002-0002-0002-000000000002', 'Backup Leader', NOW() - INTERVAL '2 months'),

  -- The Forge (forming)
  ('66666666-6666-6666-6666-666666666666', 'c0000005-0005-0005-0005-000000000005', 'Chapter Leader', NOW() - INTERVAL '5 weeks'),

  -- The Wildwood (forming)
  ('77777777-7777-7777-7777-777777777777', 'c0000008-0008-0008-0008-000000000008', 'Chapter Leader', NOW() - INTERVAL '4 weeks');
END $$;

-- NOTE: Continuing in next part due to length...
-- This seed file will be split into Part 2 for meetings and commitments

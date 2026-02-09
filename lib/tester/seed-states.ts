import { SupabaseClient } from '@supabase/supabase-js';

// Nathan's user ID - always preserved
const NATHAN_ID = '78d0b1d5-08a6-4923-8bef-49d804cafa73';

// Curriculum IDs (consistent UUIDs)
const CURRICULUM_IDS = {
  SEQ_FOUNDATIONS: 'aaaaaaaa-bbbb-cccc-dddd-000000000001',
  MOD_PRESENCE: 'aaaaaaaa-bbbb-cccc-dddd-000000000011',
  MOD_HURT: 'aaaaaaaa-bbbb-cccc-dddd-000000000012',
  MOD_DANGEROUS: 'aaaaaaaa-bbbb-cccc-dddd-000000000013',
};

// Test user data with Greek mythology names (using valid UUIDs)
const TEST_USERS = [
  // Oak Chapter (8 members) - Nathan is leader
  { id: '11111111-1111-1111-1111-000000000001', name: 'Apollo Sunbrook', email: 'apollo@test.punc', chapter: 'oak', role: 'backup_leader' },
  { id: '11111111-1111-1111-1111-000000000002', name: 'Atlas Stronghold', email: 'atlas@test.punc', chapter: 'oak', role: 'member' },
  { id: '11111111-1111-1111-1111-000000000003', name: 'Ares Ironfist', email: 'ares@test.punc', chapter: 'oak', role: 'member' },
  { id: '11111111-1111-1111-1111-000000000004', name: 'Hermes Swift', email: 'hermes@test.punc', chapter: 'oak', role: 'member' },
  { id: '11111111-1111-1111-1111-000000000005', name: 'Hades Deepwell', email: 'hades@test.punc', chapter: 'oak', role: 'member' },
  { id: '11111111-1111-1111-1111-000000000006', name: 'Zeus Thunderstone', email: 'zeus@test.punc', chapter: 'oak', role: 'member' },
  { id: '11111111-1111-1111-1111-000000000007', name: 'Poseidon Wavecrest', email: 'poseidon@test.punc', chapter: 'oak', role: 'member' },

  // Pine Chapter (11 members) - at capacity
  { id: '22222222-2222-2222-2222-000000000001', name: 'Orion Starfield', email: 'orion@test.punc', chapter: 'pine', role: 'leader' },
  { id: '22222222-2222-2222-2222-000000000002', name: 'Phoenix Ashborn', email: 'phoenix@test.punc', chapter: 'pine', role: 'backup_leader' },
  { id: '22222222-2222-2222-2222-000000000003', name: 'Titan Mountainheart', email: 'titan@test.punc', chapter: 'pine', role: 'member' },
  { id: '22222222-2222-2222-2222-000000000004', name: 'Chronos Timekeep', email: 'chronos@test.punc', chapter: 'pine', role: 'member' },
  { id: '22222222-2222-2222-2222-000000000005', name: 'Helios Dawnbringer', email: 'helios@test.punc', chapter: 'pine', role: 'member' },
  { id: '22222222-2222-2222-2222-000000000006', name: 'Pan Wildwood', email: 'pan@test.punc', chapter: 'pine', role: 'member' },
  { id: '22222222-2222-2222-2222-000000000007', name: 'Morpheus Dreamweaver', email: 'morpheus@test.punc', chapter: 'pine', role: 'member' },
  { id: '22222222-2222-2222-2222-000000000008', name: 'Eros Heartstring', email: 'eros@test.punc', chapter: 'pine', role: 'member' },
  { id: '22222222-2222-2222-2222-000000000009', name: 'Dionysus Vineheart', email: 'dionysus@test.punc', chapter: 'pine', role: 'member' },
  { id: '22222222-2222-2222-2222-000000000010', name: 'Hephaestus Forgefire', email: 'hephaestus@test.punc', chapter: 'pine', role: 'member' },
  { id: '22222222-2222-2222-2222-000000000011', name: 'Apollo Brightbow', email: 'apollo2@test.punc', chapter: 'pine', role: 'member' },

  // Elm Chapter (5 members) - newly formed
  { id: '33333333-3333-3333-3333-000000000001', name: 'Prometheus Lightbringer', email: 'prometheus@test.punc', chapter: 'elm', role: 'leader' },
  { id: '33333333-3333-3333-3333-000000000002', name: 'Icarus Skydancer', email: 'icarus@test.punc', chapter: 'elm', role: 'backup_leader' },
  { id: '33333333-3333-3333-3333-000000000003', name: 'Theseus Labyrinth', email: 'theseus@test.punc', chapter: 'elm', role: 'member' },
  { id: '33333333-3333-3333-3333-000000000004', name: 'Perseus Shieldbearer', email: 'perseus@test.punc', chapter: 'elm', role: 'member' },
  { id: '33333333-3333-3333-3333-000000000005', name: 'Achilles Swiftfoot', email: 'achilles@test.punc', chapter: 'elm', role: 'member' },

  // Unassigned (for onboarding queue) - 10 users
  { id: '44444444-4444-4444-4444-000000000001', name: 'Hercules Strongarm', email: 'hercules@test.punc', chapter: null, role: null },
  { id: '44444444-4444-4444-4444-000000000002', name: 'Odysseus Wanderer', email: 'odysseus@test.punc', chapter: null, role: null },
  { id: '44444444-4444-4444-4444-000000000003', name: 'Ajax Greatshield', email: 'ajax@test.punc', chapter: null, role: null },
  { id: '44444444-4444-4444-4444-000000000004', name: 'Jason Goldenfleece', email: 'jason@test.punc', chapter: null, role: null },
  { id: '44444444-4444-4444-4444-000000000005', name: 'Minos Crownbearer', email: 'minos@test.punc', chapter: null, role: null },
  { id: '44444444-4444-4444-4444-000000000006', name: 'Orpheus Songweaver', email: 'orpheus@test.punc', chapter: null, role: null },
  { id: '44444444-4444-4444-4444-000000000007', name: 'Daedalus Craftmaster', email: 'daedalus@test.punc', chapter: null, role: null },
  { id: '44444444-4444-4444-4444-000000000008', name: 'Narcissus Clearwater', email: 'narcissus@test.punc', chapter: null, role: null },
  { id: '44444444-4444-4444-4444-000000000009', name: 'Adonis Fairfield', email: 'adonis@test.punc', chapter: null, role: null },
  { id: '44444444-4444-4444-4444-000000000010', name: 'Castor Twinstar', email: 'castor@test.punc', chapter: null, role: null },
];

// Denver area addresses
const DENVER_ADDRESSES = [
  '1600 Broadway, Denver, CO 80202',
  '2000 E 16th Ave, Denver, CO 80206',
  '3300 E 1st Ave, Denver, CO 80206',
  '1701 Champa St, Denver, CO 80202',
  '500 16th St, Denver, CO 80202',
  '1550 Court Pl, Denver, CO 80202',
  '1801 California St, Denver, CO 80202',
  '1660 Lincoln St, Denver, CO 80264',
  '1901 Wazee St, Denver, CO 80202',
  '2500 Lawrence St, Denver, CO 80205',
];

// Chapter IDs
const CHAPTER_IDS = {
  OAK: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
  PINE: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002',
  ELM: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003',
};

// Meeting IDs
const MEETING_IDS = {
  OAK_UPCOMING: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
  OAK_NOW: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002',
};

const CHAPTERS = [
  {
    id: CHAPTER_IDS.OAK,
    name: 'The Oak Chapter',
    location: '1600 Broadway, Denver, CO 80202',
    meeting_day_of_week: 2, // Tuesday
    meeting_time: '19:00:00',
  },
  {
    id: CHAPTER_IDS.PINE,
    name: 'The Pine Chapter',
    location: '2000 E 16th Ave, Denver, CO 80206',
    meeting_day_of_week: 3, // Wednesday
    meeting_time: '19:30:00',
  },
  {
    id: CHAPTER_IDS.ELM,
    name: 'The Elm Chapter',
    location: '3300 E 1st Ave, Denver, CO 80206',
    meeting_day_of_week: 4, // Thursday
    meeting_time: '18:30:00',
  },
];

export async function runSeedState(supabase: SupabaseClient, state: string) {
  console.log(`Running seed state: ${state}`);

  // Clear existing data (except Nathan's auth)
  console.log('Clearing database...');
  await clearDatabase(supabase);
  console.log('Database cleared');

  // Base setup for all states
  console.log('Seeding base data...');
  await seedBaseData(supabase);
  console.log('Base data seeded');

  // State-specific setup
  console.log('Running state-specific setup...');
  switch (state) {
    case 'three-chapters':
      await seedThreeChapters(supabase);
      break;
    case 'rsvp-one-week-oak':
      await seedThreeChapters(supabase);
      await seedRsvpOneWeekOak(supabase);
      break;
    case 'rsvp-one-day-oak':
      await seedThreeChapters(supabase);
      await seedRsvpOneDayOak(supabase);
      break;
    case 'pre-meeting-oak':
      await seedThreeChapters(supabase);
      await seedPreMeetingOak(supabase);
      break;
    case 'mostly-checked-in-oak':
      await seedThreeChapters(supabase);
      await seedMostlyCheckedInOak(supabase);
      break;
    case 'mid-meeting-oak':
      await seedThreeChapters(supabase);
      await seedMidMeetingOak(supabase);
      break;
    case 'post-meeting-oak':
      await seedThreeChapters(supabase);
      await seedPostMeetingOak(supabase);
      break;
    case 'onboarding-queue':
      await seedThreeChapters(supabase);
      await seedOnboardingQueue(supabase);
      break;
    case 'admin-overview':
      await seedAdminOverview(supabase);
      break;
    default:
      throw new Error(`Unknown seed state: ${state}`);
  }

  console.log(`Seed state ${state} completed successfully`);
}

async function clearDatabase(supabase: SupabaseClient) {
  // Delete in order respecting foreign keys
  console.log('Deleting meeting_feedback...');
  await supabase.from('meeting_feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting meeting_recordings...');
  await supabase.from('meeting_recordings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting curriculum_responses...');
  await supabase.from('curriculum_responses').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting chapter_curriculum_history...');
  await supabase.from('chapter_curriculum_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting meeting_time_log...');
  await supabase.from('meeting_time_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting commitments...');
  await supabase.from('commitments').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting pending_tasks...');
  await supabase.from('pending_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting notification_log...');
  await supabase.from('notification_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting leadership_log...');
  await supabase.from('leadership_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting attendance...');
  await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting meetings...');
  await supabase.from('meetings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting curriculum_modules...');
  await supabase.from('curriculum_modules').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting curriculum_sequences...');
  await supabase.from('curriculum_sequences').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting chapter_memberships...');
  await supabase.from('chapter_memberships').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting chapters...');
  await supabase.from('chapters').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Deleting tester_state...');
  await supabase.from('tester_state').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');

  // Delete test users from auth (cascades to public.users)
  console.log('Deleting test users from auth...');
  const { data: testUsers } = await supabase
    .from('users')
    .select('id')
    .neq('id', NATHAN_ID);

  if (testUsers && testUsers.length > 0) {
    for (const user of testUsers) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  }

  console.log('Database clear complete');
}

async function seedBaseData(supabase: SupabaseClient) {
  // Ensure Nathan has tester, admin flags, and leader certification
  const now = new Date();
  const certExpiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

  await supabase
    .from('users')
    .update({
      is_tester: true,
      is_punc_admin: true,
      name: 'Nathan Otto',
      username: 'notto',
      is_leader_certified: true,
      leader_certified_at: now.toISOString(),
      leader_certification_expires_at: certExpiry.toISOString(),
    })
    .eq('id', NATHAN_ID);

  // Seed curriculum (needed for all states)
  await seedCurriculum(supabase);
}

async function seedCurriculum(supabase: SupabaseClient) {
  // Create sequence
  console.log('Creating curriculum sequence...');
  const { error: seqError } = await supabase.from('curriculum_sequences').insert({
    id: CURRICULUM_IDS.SEQ_FOUNDATIONS,
    title: 'Foundations of Brotherhood',
    description: 'Core principles for PUNC members',
    order_index: 1,
  });

  if (seqError) {
    console.error('Error creating curriculum sequence:', seqError);
    throw new Error(`Failed to create curriculum sequence: ${seqError.message}`);
  }

  // Create modules
  console.log('Creating curriculum modules...');
  const modules = [
    {
      id: CURRICULUM_IDS.MOD_PRESENCE,
      title: 'The Power of Presence',
      principle: 'Be in brotherhood',
      description: 'Brotherhood begins with showing up—physically, emotionally, mentally.',
      reflective_question: 'When was the last time you felt truly seen by another man?',
      exercise: 'Pair up. For 2 minutes each, simply look at each other without speaking.',
      sequence_id: CURRICULUM_IDS.SEQ_FOUNDATIONS,
      order_in_sequence: 1,
    },
    {
      id: CURRICULUM_IDS.MOD_HURT,
      title: 'Fighting Hurt',
      principle: 'Fight hurt',
      description: 'We fight hurt—in ourselves and in others.',
      reflective_question: 'What hurt are you currently carrying that you have not shared?',
      exercise: 'Write down one hurt. Share it with the group in one sentence.',
      sequence_id: CURRICULUM_IDS.SEQ_FOUNDATIONS,
      order_in_sequence: 2,
    },
    {
      id: CURRICULUM_IDS.MOD_DANGEROUS,
      title: 'Dangerous Safety',
      principle: 'Be dangerous, but not a danger',
      description: 'A man in his power is dangerous. The key is channeling that power with wisdom.',
      reflective_question: 'In what area have you been playing it too safe?',
      exercise: 'Stand up. Take up space. Let a sound come from your chest.',
      sequence_id: CURRICULUM_IDS.SEQ_FOUNDATIONS,
      order_in_sequence: 3,
    },
  ];

  const { error: modulesError } = await supabase.from('curriculum_modules').insert(modules);

  if (modulesError) {
    console.error('Error creating curriculum modules:', modulesError);
    throw new Error(`Failed to create curriculum modules: ${modulesError.message}`);
  }

  console.log('Completed creating curriculum');
}

async function seedTestUsers(supabase: SupabaseClient) {
  // Create test users using auth admin API
  // Mutates TEST_USERS array to update IDs with actual auth IDs

  for (const user of TEST_USERS) {
    // Create auth user first
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'testpass123', // All test users have same password
      email_confirm: true,
      user_metadata: {
        name: user.name,
      },
    });

    if (authError) {
      console.error('Error creating auth user:', user.name, authError);
      throw new Error(`Failed to create auth user ${user.name}: ${authError.message}`);
    }

    // Update the public.users record (created by trigger) with additional fields
    const { error: updateError } = await supabase
      .from('users')
      .update({
        name: user.name,
        username: user.name.split(' ')[0].toLowerCase(),
        is_tester: false,
        is_punc_admin: false,
      })
      .eq('id', authUser.user.id);

    if (updateError) {
      console.error('Error updating user record:', user.name, updateError);
      throw new Error(`Failed to update user ${user.name}: ${updateError.message}`);
    }

    // Update TEST_USERS array with actual auth ID (mutable)
    (user as any).id = authUser.user.id;
  }
}

async function seedThreeChapters(supabase: SupabaseClient) {
  console.log('Starting seedTestUsers...');
  await seedTestUsers(supabase);
  console.log('Completed seedTestUsers');

  // Certify chapter leaders
  console.log('Certifying chapter leaders...');
  const now = new Date();
  const certExpiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

  const orion = TEST_USERS.find(u => u.name === 'Orion Starfield');
  const prometheus = TEST_USERS.find(u => u.name === 'Prometheus Lightbringer');

  if (orion) {
    await supabase
      .from('users')
      .update({
        is_leader_certified: true,
        leader_certified_at: now.toISOString(),
        leader_certification_expires_at: certExpiry.toISOString(),
      })
      .eq('id', orion.id);
  }

  if (prometheus) {
    await supabase
      .from('users')
      .update({
        is_leader_certified: true,
        leader_certified_at: now.toISOString(),
        leader_certification_expires_at: certExpiry.toISOString(),
      })
      .eq('id', prometheus.id);
  }
  console.log('Completed certifying leaders');

  // Create chapters
  console.log('Creating chapters...');
  for (const chapter of CHAPTERS) {
    const { error } = await supabase.from('chapters').insert({
      id: chapter.id,
      name: chapter.name,
      status: 'open',
      meeting_location: chapter.location,
      meeting_day_of_week: chapter.meeting_day_of_week,
      meeting_time: chapter.meeting_time,
      meeting_frequency: 'biweekly',
    });

    if (error) {
      console.error('Error inserting chapter:', chapter.name, error);
      throw new Error(`Failed to insert chapter ${chapter.name}: ${error.message}`);
    }
  }
  console.log('Completed creating chapters');

  // Nathan is leader of Oak, backup_leader of Pine
  console.log('Adding Nathan memberships...');
  const { error: nathanError } = await supabase.from('chapter_memberships').insert([
    { chapter_id: CHAPTER_IDS.OAK, user_id: NATHAN_ID, role: 'leader', is_active: true },
    { chapter_id: CHAPTER_IDS.PINE, user_id: NATHAN_ID, role: 'backup_leader', is_active: true },
  ]);

  if (nathanError) {
    console.error('Error adding Nathan memberships:', nathanError);
    throw new Error(`Failed to add Nathan memberships: ${nathanError.message}`);
  }

  // Add test users to their chapters
  console.log('Adding test user memberships...');
  for (const user of TEST_USERS) {
    if (user.chapter) {
      const chapterId = user.chapter === 'oak' ? CHAPTER_IDS.OAK : user.chapter === 'pine' ? CHAPTER_IDS.PINE : CHAPTER_IDS.ELM;
      const { error } = await supabase.from('chapter_memberships').insert({
        chapter_id: chapterId,
        user_id: user.id,
        role: user.role,
        is_active: true,
      });

      if (error) {
        console.error('Error adding membership for:', user.name, error);
        throw new Error(`Failed to add membership for ${user.name}: ${error.message}`);
      }
    }
  }
  console.log('Completed adding memberships');
}

async function seedRsvpOneWeekOak(supabase: SupabaseClient) {
  // Create meeting 7 days from now
  const meetingDate = new Date();
  meetingDate.setDate(meetingDate.getDate() + 7);

  const meetingId = MEETING_IDS.OAK_UPCOMING;

  await supabase.from('meetings').insert({
    id: meetingId,
    chapter_id: CHAPTER_IDS.OAK,
    scheduled_date: meetingDate.toISOString().split('T')[0],
    scheduled_time: '19:00',
    location: '1600 Broadway, Denver, CO 80202',
    status: 'scheduled',
    rsvp_deadline: new Date(meetingDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Create RSVP tasks for all Oak members (no responses yet)
  const oakMembers = TEST_USERS.filter(u => u.chapter === 'oak').map(u => u.id);
  oakMembers.push(NATHAN_ID);

  for (const userId of oakMembers) {
    await supabase.from('pending_tasks').insert({
      task_type: 'respond_to_rsvp',
      assigned_to: userId,
      related_entity_type: 'meeting',
      related_entity_id: meetingId,
      due_date: new Date(meetingDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await supabase.from('attendance').insert({
      meeting_id: meetingId,
      user_id: userId,
      rsvp_status: 'no_response',
    });
  }
}

async function seedRsvpOneDayOak(supabase: SupabaseClient) {
  // Create meeting 1 day from now
  const meetingDate = new Date();
  meetingDate.setDate(meetingDate.getDate() + 1);

  const meetingId = MEETING_IDS.OAK_UPCOMING;

  await supabase.from('meetings').insert({
    id: meetingId,
    chapter_id: CHAPTER_IDS.OAK,
    scheduled_date: meetingDate.toISOString().split('T')[0],
    scheduled_time: '19:00',
    location: '1600 Broadway, Denver, CO 80202',
    status: 'scheduled',
    rsvp_deadline: new Date().toISOString().split('T')[0], // Deadline is now
  });

  const oakMembers = TEST_USERS.filter(u => u.chapter === 'oak');

  // Most have responded, 2 have not - Atlas (index 1) and Ares (index 2)
  const unresponsiveMemberIds = [oakMembers[1].id, oakMembers[2].id]; // Atlas and Ares
  const unresponsiveMembers = [oakMembers[1], oakMembers[2]]; // Keep full objects for names

  // Nathan responded yes
  await supabase.from('attendance').insert({
    meeting_id: meetingId,
    user_id: NATHAN_ID,
    rsvp_status: 'yes',
  });

  for (let i = 0; i < oakMembers.length; i++) {
    const member = oakMembers[i];
    const userId = member.id;
    const isUnresponsive = unresponsiveMemberIds.includes(userId);

    const { data: attendanceRecord, error: insertError } = await supabase.from('attendance').insert({
      meeting_id: meetingId,
      user_id: userId,
      rsvp_status: isUnresponsive ? 'no_response' : (i % 3 === 0 ? 'no' : 'yes'),
      rsvp_reason: i % 3 === 0 && !isUnresponsive ? 'Family commitment' : null,
      reminder_sent_at: isUnresponsive ? new Date().toISOString() : null,
    }).select('id').single();

    if (insertError) {
      console.error('Error inserting attendance for', member.name, insertError);
    }

    // Create leader outreach task for unresponsive
    if (isUnresponsive && attendanceRecord) {
      const { error: taskError } = await supabase.from('pending_tasks').insert({
        task_type: 'contact_unresponsive_member',
        assigned_to: NATHAN_ID,
        related_entity_type: 'attendance',
        related_entity_id: attendanceRecord.id,
        metadata: {
          member_id: userId,
          member_name: member.name
        },
      });

      if (taskError) {
        console.error('Error creating task for', member.name, taskError);
      } else {
        console.log('Created contact task for', member.name, 'with attendance ID:', attendanceRecord.id);
      }

      // Create leadership log entry for unresponsive member
      await supabase.from('leadership_log').insert({
        chapter_id: CHAPTER_IDS.OAK,
        meeting_id: meetingId,
        user_id: userId,
        log_type: 'member_not_contacted',
        description: `${member.name} did not respond to RSVP by deadline`,
        metadata: { member_name: member.name },
        is_resolved: false,
      });
    }
  }
}

async function seedPreMeetingOak(supabase: SupabaseClient) {
  // Create meeting for right now
  const now = new Date();

  const meetingId = MEETING_IDS.OAK_NOW;

  await supabase.from('meetings').insert({
    id: meetingId,
    chapter_id: CHAPTER_IDS.OAK,
    scheduled_date: now.toISOString().split('T')[0],
    scheduled_time: now.toTimeString().slice(0, 5),
    location: '1600 Broadway, Denver, CO 80202',
    status: 'scheduled',
    rsvp_deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    selected_curriculum_id: CURRICULUM_IDS.MOD_PRESENCE,
  });

  const oakMembers = TEST_USERS.filter(u => u.chapter === 'oak').map(u => u.id);
  oakMembers.push(NATHAN_ID);

  // All have RSVP'd yes
  for (const userId of oakMembers) {
    await supabase.from('attendance').insert({
      meeting_id: meetingId,
      user_id: userId,
      rsvp_status: 'yes',
    });
  }
}

async function seedMostlyCheckedInOak(supabase: SupabaseClient) {
  await seedPreMeetingOak(supabase);

  const meetingId = MEETING_IDS.OAK_NOW;
  const now = new Date();

  // Start the meeting
  await supabase
    .from('meetings')
    .update({
      status: 'in_progress',
      actual_start_time: now.toISOString(),
      current_section: 'opening_meditation',
      scribe_id: TEST_USERS.find(u => u.name === 'Apollo Sunbrook')?.id, // Apollo is scribe
    })
    .eq('id', meetingId);

  const oakMembers = TEST_USERS.filter(u => u.chapter === 'oak').map(u => u.id);

  // Nathan and all but one member checked in
  await supabase
    .from('attendance')
    .update({
      checked_in_at: now.toISOString(),
      attendance_type: 'in_person'
    })
    .eq('meeting_id', meetingId)
    .eq('user_id', NATHAN_ID);

  for (let i = 0; i < oakMembers.length - 1; i++) {
    await supabase
      .from('attendance')
      .update({
        checked_in_at: now.toISOString(),
        attendance_type: i % 4 === 0 ? 'video' : 'in_person'
      })
      .eq('meeting_id', meetingId)
      .eq('user_id', oakMembers[i]);
  }
  // Last member (Poseidon) has not checked in
}

async function seedMidMeetingOak(supabase: SupabaseClient) {
  await seedMostlyCheckedInOak(supabase);

  const meetingId = MEETING_IDS.OAK_NOW;
  const now = new Date();

  // Check in the last person
  const poseidonId = TEST_USERS.find(u => u.name === 'Poseidon Wavecrest')?.id;
  await supabase
    .from('attendance')
    .update({
      checked_in_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
      attendance_type: 'in_person',
      checked_in_late: true
    })
    .eq('meeting_id', meetingId)
    .eq('user_id', poseidonId);

  // Create leadership log entry for late check-in
  if (poseidonId) {
    await supabase.from('leadership_log').insert({
      chapter_id: CHAPTER_IDS.OAK,
      meeting_id: meetingId,
      user_id: poseidonId,
      log_type: 'member_checked_in_late',
      description: 'Poseidon Wavecrest checked in 5 minutes late',
      metadata: { minutes_late: 5 },
      is_resolved: false,
    });
  }

  // Complete opening
  await supabase.from('meeting_time_log').insert([
    { meeting_id: meetingId, section: 'opening_meditation', start_time: now.toISOString(), end_time: new Date(now.getTime() + 5 * 60 * 1000).toISOString() },
    { meeting_id: meetingId, section: 'opening_ethos', start_time: new Date(now.getTime() + 5 * 60 * 1000).toISOString(), end_time: new Date(now.getTime() + 8 * 60 * 1000).toISOString() },
  ]);

  // Complete lightning round with realistic data
  const oakMembers = TEST_USERS.filter(u => u.chapter === 'oak').map(u => u.id);
  oakMembers.unshift(NATHAN_ID);

  let timeOffset = 8 * 60 * 1000;
  for (let i = 0; i < oakMembers.length; i++) {
    const duration = 45 + Math.floor(Math.random() * 30); // 45-75 seconds
    const startTime = new Date(now.getTime() + timeOffset);
    const endTime = new Date(startTime.getTime() + duration * 1000);

    await supabase.from('meeting_time_log').insert({
      meeting_id: meetingId,
      section: 'lightning_round',
      user_id: oakMembers[i],
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_seconds: duration,
      overtime_seconds: Math.max(0, duration - 60),
      priority: i < 3 ? 1 : 2, // First 3 are P1
      skipped: false,
    });

    timeOffset += duration * 1000 + 5000; // 5 sec between
  }

  // Update meeting section
  await supabase
    .from('meetings')
    .update({ current_section: 'full_checkins' })
    .eq('id', meetingId);
}

async function seedPostMeetingOak(supabase: SupabaseClient) {
  await seedMidMeetingOak(supabase);

  const meetingId = MEETING_IDS.OAK_NOW;
  const now = new Date();

  // Complete full check-ins
  const oakMembers = TEST_USERS.filter(u => u.chapter === 'oak').map(u => u.id);
  oakMembers.unshift(NATHAN_ID);

  let timeOffset = 30 * 60 * 1000; // Start after lightning
  for (let i = 0; i < oakMembers.length; i++) {
    const duration = 300 + Math.floor(Math.random() * 300); // 5-10 minutes
    const startTime = new Date(now.getTime() + timeOffset);
    const endTime = new Date(startTime.getTime() + duration * 1000);

    await supabase.from('meeting_time_log').insert({
      meeting_id: meetingId,
      section: 'full_checkins',
      user_id: oakMembers[i],
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_seconds: duration,
      overtime_seconds: Math.max(0, duration - 420),
      stretch_goal_action: i % 3 === 0 ? 'new' : i % 3 === 1 ? 'kept' : 'completed',
      requested_support: i === 2, // Ares requested support
      skipped: false,
    });

    timeOffset += duration * 1000 + 5000;
  }

  // Create some commitments
  await supabase.from('commitments').insert([
    {
      committer_id: NATHAN_ID,
      commitment_type: 'stretch_goal',
      description: 'Have one difficult conversation this week',
      status: 'active',
      created_at_meeting_id: meetingId,
    },
    {
      committer_id: TEST_USERS.find(u => u.name === 'Apollo Sunbrook')?.id,
      receiver_id: TEST_USERS.find(u => u.name === 'Ares Ironfist')?.id,
      commitment_type: 'support_a_man',
      description: 'Call Ares Wednesday to check in about job search',
      status: 'active',
      created_at_meeting_id: meetingId,
      due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  ]);

  // Curriculum responses
  for (const userId of oakMembers) {
    await supabase.from('curriculum_responses').insert({
      user_id: userId,
      meeting_id: meetingId,
      module_id: CURRICULUM_IDS.MOD_PRESENCE,
      response: `Test response from ${userId} about presence and being seen.`,
    });
  }

  // Meeting feedback
  for (let i = 0; i < oakMembers.length; i++) {
    const userId = oakMembers[i];
    const otherMembers = oakMembers.filter(m => m !== userId);

    await supabase.from('meeting_feedback').insert({
      meeting_id: meetingId,
      user_id: userId,
      value_rating: 7 + Math.floor(Math.random() * 3), // 7-9
      most_value_user_id: otherMembers[Math.floor(Math.random() * otherMembers.length)],
    });
  }

  // Complete meeting
  await supabase
    .from('meetings')
    .update({
      status: 'completed',
      current_section: 'ended',
      completed_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', meetingId);
}

async function seedOnboardingQueue(supabase: SupabaseClient) {
  // Unassigned users are already created in seedTestUsers
  // Just make sure they have Denver addresses
  const unassigned = TEST_USERS.filter(u => u.chapter === null);

  for (let i = 0; i < unassigned.length; i++) {
    await supabase
      .from('users')
      .update({
        address: DENVER_ADDRESSES[i % DENVER_ADDRESSES.length]
      })
      .eq('id', unassigned[i].id);
  }
}

async function seedAdminOverview(supabase: SupabaseClient) {
  await seedThreeChapters(supabase);

  // Flag Pine chapter for attention
  await supabase
    .from('chapters')
    .update({
      needs_attention: true,
      attention_reason: 'Multiple members missing meetings, needs leader intervention',
    })
    .eq('id', CHAPTER_IDS.PINE);

  // Create 3 completed meetings and 2 scheduled for each chapter
  const chapters = [CHAPTER_IDS.OAK, CHAPTER_IDS.PINE, CHAPTER_IDS.ELM];
  const now = new Date();

  for (const chapterId of chapters) {
    const chapterMembers = TEST_USERS.filter(u => {
      const ch = u.chapter === 'oak' ? CHAPTER_IDS.OAK : u.chapter === 'pine' ? CHAPTER_IDS.PINE : u.chapter === 'elm' ? CHAPTER_IDS.ELM : null;
      return ch === chapterId;
    }).map(u => u.id);

    if (chapterId === CHAPTER_IDS.OAK) chapterMembers.push(NATHAN_ID);

    // 3 past meetings
    for (let i = 1; i <= 3; i++) {
      const meetingDate = new Date(now.getTime() - i * 14 * 24 * 60 * 60 * 1000); // 2 weeks apart

      const { data: newMeeting } = await supabase.from('meetings').insert({
        chapter_id: chapterId,
        scheduled_date: meetingDate.toISOString().split('T')[0],
        scheduled_time: '19:00',
        location: CHAPTERS.find(c => c.id === chapterId)?.location,
        status: 'completed',
        actual_start_time: meetingDate.toISOString(),
        completed_at: new Date(meetingDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        current_section: 'ended',
        started_late: i === 2, // One meeting started late
      }).select().single();

      const meetingId = newMeeting?.id;
      if (!meetingId) continue;

      // Attendance
      for (let j = 0; j < chapterMembers.length; j++) {
        const attended = j < chapterMembers.length - (i === 3 ? 2 : 0); // Some absences in oldest meeting

        await supabase.from('attendance').insert({
          meeting_id: meetingId,
          user_id: chapterMembers[j],
          rsvp_status: attended ? 'yes' : 'no',
          attendance_type: attended ? 'in_person' : null,
          checked_in_at: attended ? meetingDate.toISOString() : null,
        });
      }

      // Leadership log entries for issues
      if (i === 2) {
        await supabase.from('leadership_log').insert({
          chapter_id: chapterId,
          meeting_id: meetingId,
          log_type: 'meeting_started_late',
          description: 'Meeting started 12 minutes late',
          metadata: { minutes_late: 12 },
          is_resolved: false, // Unresolved issue
        });
      }

      // Add some member check-in late issues
      if (i === 1 && chapterId === CHAPTER_IDS.PINE) {
        const lateMember = chapterMembers[2]; // Third member
        await supabase.from('leadership_log').insert({
          chapter_id: chapterId,
          meeting_id: meetingId,
          user_id: lateMember,
          log_type: 'member_checked_in_late',
          description: 'Member checked in 8 minutes late',
          metadata: { minutes_late: 8 },
          is_resolved: false,
        });
      }

      // Add member not contacted issue
      if (i === 3 && chapterId === CHAPTER_IDS.OAK) {
        const missingMember = chapterMembers[chapterMembers.length - 1];
        await supabase.from('leadership_log').insert({
          chapter_id: chapterId,
          meeting_id: meetingId,
          user_id: missingMember,
          log_type: 'member_not_contacted',
          description: 'Member did not RSVP and was not contacted before deadline',
          metadata: {},
          is_resolved: false,
        });
      }
    }

    // 2 future meetings
    for (let i = 1; i <= 2; i++) {
      const meetingDate = new Date(now.getTime() + i * 14 * 24 * 60 * 60 * 1000);

      await supabase.from('meetings').insert({
        chapter_id: chapterId,
        scheduled_date: meetingDate.toISOString().split('T')[0],
        scheduled_time: '19:00',
        location: CHAPTERS.find(c => c.id === chapterId)?.location,
        status: 'scheduled',
        rsvp_deadline: new Date(meetingDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    }
  }
}

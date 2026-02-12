#!/usr/bin/env tsx
/**
 * PUNCapp Simulation Engine
 *
 * Generates 6 months of realistic chapter life across 5 chapters and 40+ members.
 * Run with: npx tsx scripts/simulate.ts
 * Dry run: npx tsx scripts/simulate.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
const envPath = join(process.cwd(), '.env.local');
const envConfig = dotenv.parse(readFileSync(envPath));

const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse CLI args
const isDryRun = process.argv.includes('--dry-run');

// Simulation time range
const SIM_START = new Date('2025-08-11'); // 6 months before today
const SIM_END = new Date(); // today

// Global state
let preservedUsers: any[] = [];
let preservedCurriculum: any = { modules: [], sequences: [], junction: [] };
let allMembers: any[] = [];
let allChapters: any[] = [];
let errorLog: string[] = [];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(message: string) {
  console.log(message);
}

function error(message: string, context?: any) {
  const errorMsg = `❌ ${message}${context ? ': ' + JSON.stringify(context) : ''}`;
  console.error(errorMsg);
  errorLog.push(errorMsg);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSample<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(date: Date): string {
  return date.toISOString().split('T')[1].substring(0, 8);
}

/**
 * Creates a user with both auth and public records.
 * Uses Supabase Admin API with service role key.
 */
async function createUserWithAuth(userData: {
  email: string;
  name: string;
  username?: string;
  address?: string;
  phone?: string;
  is_leader_certified?: boolean;
  is_punc_admin?: boolean;
}) {
  let authUserId: string;

  // Try to create auth user with Admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: 'simulation123',
    email_confirm: true,
    user_metadata: {
      name: userData.name,
    },
  });

  if (authError) {
    // If email already exists, try to find and delete the existing auth user
    if (authError.message?.includes('email_exists') || authError.code === 'email_exists') {
      // List all users and find by email
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const existingUser = usersData?.users.find(u => u.email === userData.email);

      if (existingUser) {
        // Delete the existing auth user
        await supabase.auth.admin.deleteUser(existingUser.id);

        // Try creating again
        const { data: retryAuthData, error: retryError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: 'simulation123',
          email_confirm: true,
          user_metadata: {
            name: userData.name,
          },
        });

        if (retryError || !retryAuthData.user) {
          error('Failed to create auth user after retry', retryError);
          throw retryError;
        }

        authUserId = retryAuthData.user.id;
      } else {
        throw authError;
      }
    } else {
      error('Failed to create auth user', authError);
      throw authError;
    }
  } else {
    authUserId = authData!.user.id;
  }

  // Update public.users record (created automatically by trigger)
  const { data, error: userError } = await supabase
    .from('users')
    .update({
      email: userData.email,
      name: userData.name,
      username: userData.username || null,
      address: userData.address || null,
      phone: userData.phone || null,
      is_leader_certified: userData.is_leader_certified || false,
      is_punc_admin: userData.is_punc_admin || false,
    })
    .eq('id', authUserId)
    .select()
    .single();

  if (userError) {
    error('Failed to update public.users record', userError);
    throw userError;
  }

  return data;
}

async function logActivity(params: {
  actorId?: string | null;
  actorType?: 'user' | 'system' | 'admin' | 'cron';
  action: string;
  entityType: string;
  entityId: string;
  chapterId?: string | null;
  summary: string;
  details?: Record<string, any>;
}) {
  if (isDryRun) return;

  await supabase.from('activity_log').insert({
    actor_id: params.actorId || null,
    actor_type: params.actorType || 'system',
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    chapter_id: params.chapterId || null,
    summary: params.summary,
    details: params.details || {},
  });
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function daysBetween(date1: Date, date2: Date): number {
  const diff = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ============================================================================
// CONTENT POOLS
// ============================================================================

const STRETCH_GOALS = [
  "Call my dad and have a real conversation",
  "Go to the gym at least 3 times this week",
  "Have the hard conversation with my boss about the promotion",
  "Write in my journal every morning for two weeks",
  "Take my wife on a date — no phones",
  "Volunteer at the food bank this Saturday",
  "Read 50 pages of the book I've been putting off",
  "Wake up at 5:30 AM every day this week",
  "Apologize to my brother for what I said at Thanksgiving",
  "Spend one hour on my business plan",
  "Cook dinner for the family three nights this week",
  "Go for a solo hike and just think",
  "Set up that doctor's appointment I've been avoiding",
  "Say no to one thing that doesn't serve me",
  "Reach out to an old friend I've lost touch with",
  "Meditate for 10 minutes every day",
  "Finish the garage cleanup I started two months ago",
  "Have a real talk with my teenager about what's going on",
  "Cut out social media for a full week",
  "Write a letter to my younger self",
  "Sign up for that class I've been thinking about",
  "Practice guitar for 30 minutes every day",
  "Tell my wife what I'm actually feeling, not just 'fine'",
  "Spend a full day with my kids — no work, no distractions",
  "Start the budget spreadsheet and actually look at the numbers",
  "Run a 5K — doesn't matter how slow",
  "Show up 10 minutes early to everything this week",
  "Ask for help with something I've been struggling with alone",
  "Forgive myself for the mistake I keep replaying",
  "Write down three things I'm grateful for every night",
  "Fix the thing in the house that's been broken for months",
  "Have lunch with someone outside my usual circle",
  "Go 48 hours without complaining",
  "Tackle the pile of paperwork on my desk",
  "Text the guys in the chapter mid-week just to check in",
  "Do something that scares me a little",
  "Take a cold shower every morning for a week",
  "Sit with my anger instead of stuffing it down",
  "Plan something fun — just for me, nobody else",
  "Be fully present for one conversation every day",
];

const TO_MEMBER_COMMITMENTS = [
  "Help {recipient} move this weekend",
  "Check in on {recipient} mid-week — he's going through it",
  "Grab coffee with {recipient} and hear about his new job",
  "Help {recipient} with his resume",
  "Spot {recipient} at the gym on Saturday",
  "Drive {recipient} to his appointment on Thursday",
  "Bring {recipient} dinner — his wife just had a baby",
  "Review {recipient}'s business plan and give honest feedback",
  "Go for a hike with {recipient} this weekend",
  "Help {recipient} prep for his job interview",
];

const REFLECTIVE_RESPONSES = [
  "This hit close to home. I've been avoiding exactly this kind of honesty with myself.",
  "I realized I do this all the time — pretend everything's fine when it's not.",
  "The exercise made me think about my relationship with my father.",
  "I struggle with this one. Being vulnerable doesn't come naturally to me.",
  "This principle is easy to understand but hard to live. I'm working on it.",
  "Hearing the other guys share made me feel less alone in this.",
  "I need to sit with this more. It brought up some stuff I haven't dealt with.",
  "This connected to what I'm going through at work right now.",
  "The question about authenticity really got me. Am I being real, or performing?",
  "I appreciated the exercise. It gave me a concrete way to practice this.",
  "This reminded me why I joined PUNC in the first place.",
  "I want to bring this principle into how I parent. I can do better.",
  "Honestly, I resisted this at first. But by the end I understood why it matters.",
  "The group discussion helped me see a blind spot I didn't know I had.",
  "Simple but powerful. I wrote this one down to remember.",
  "This principle challenges the way I was raised. That's uncomfortable but good.",
  "I think I've been hiding behind busyness to avoid dealing with this.",
  "Sharing this out loud was harder than I expected. But I'm glad I did.",
  "I see how this connects to the commitment I made last meeting.",
  "This is the work. Not easy, but it's why we're here.",
];

const DECLINE_REASONS = [
  "Work travel this week",
  "Family commitment",
  "Daughter's soccer game",
  "Not feeling well",
  "Prior commitment I can't move",
  "Wife's birthday",
  "Working late this week",
  "Out of town visiting family",
  "Doctor's appointment",
  "Kid's school event",
];

const FIRST_NAMES = [
  "James", "Michael", "David", "Robert", "John", "William", "Richard", "Joseph",
  "Thomas", "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald",
  "Steven", "Andrew", "Joshua", "Kenneth", "Kevin", "Brian", "George", "Timothy",
  "Ronald", "Edward", "Jason", "Jeffrey", "Ryan", "Jacob", "Gary", "Nicholas",
  "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon", "Benjamin",
  "Samuel", "Raymond", "Gregory", "Alexander", "Patrick", "Frank", "Dennis", "Jerry",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White",
  "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
  "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green",
  "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter",
];

const DENVER_AREAS = [
  "Denver", "Lakewood", "Aurora", "Boulder", "Fort Collins", "Castle Rock",
  "Parker", "Littleton", "Englewood", "Arvada", "Westminster", "Thornton",
  "Centennial", "Highlands Ranch", "Broomfield", "Longmont",
];

// ============================================================================
// MAIN SIMULATION
// ============================================================================

async function main() {
  console.log('🏗️  PUNCapp Simulation Engine');
  console.log(`📅 Simulating ${formatDate(SIM_START)} → ${formatDate(SIM_END)} (${daysBetween(SIM_START, SIM_END)} days)`);

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No database changes will be made\n');
  }

  // Step 1: Read preserved data
  await preserveData();

  // Step 2: Wipe tables
  await wipeTables();

  // Step 3: Generate members
  await generateMembers();

  // Step 4: Main simulation loop (chapters created during timeline)
  await simulateTimeline();

  // Step 6: Summary
  printSummary();
}

async function preserveData() {
  log('\n🧹 Preserving data...');

  // Preserve Nathan's user
  const { data: nattoUser } = await supabase
    .from('users')
    .select('*')
    .eq('username', 'notto')
    .single();

  if (nattoUser) {
    preservedUsers.push(nattoUser);
    log(`   ✓ Preserved user: notto (id: ${nattoUser.id})`);
  } else {
    error('Nathan (notto) user not found! This should not happen.');
  }

  // Check for Traver's user
  const { data: traverUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'traver@traverboehm.com')
    .single();

  if (traverUser) {
    // Ensure Traver has a username and is_punc_admin set
    if (!traverUser.username || !traverUser.is_punc_admin) {
      const { data: updatedTraver } = await supabase
        .from('users')
        .update({
          username: 'traver',
          is_punc_admin: true,
          is_leader_certified: true
        })
        .eq('id', traverUser.id)
        .select()
        .single();

      if (updatedTraver) {
        preservedUsers.push(updatedTraver);
      } else {
        preservedUsers.push({
          ...traverUser,
          username: 'traver',
          is_punc_admin: true,
          is_leader_certified: true
        });
      }
    } else {
      preservedUsers.push(traverUser);
    }
    log(`   ✓ Preserved user: traver (id: ${traverUser.id})`);
  }

  // Preserve curriculum
  const { data: modules } = await supabase
    .from('curriculum_modules')
    .select('*');

  const { data: sequences } = await supabase
    .from('curriculum_sequences')
    .select('*');

  const { data: junction } = await supabase
    .from('curriculum_module_sequences')
    .select('*');

  preservedCurriculum = {
    modules: modules || [],
    sequences: sequences || [],
    junction: junction || [],
  };

  log(`   ✓ Preserved ${preservedCurriculum.modules.length} curriculum modules, ${preservedCurriculum.sequences.length} sequences`);
}

async function wipeTables() {
  if (isDryRun) {
    log('\n🔍 DRY RUN: Would wipe tables (skipping)');
    return;
  }

  log('\n🧹 Wiping tables...');

  const tablesToWipe = [
    'activity_log',
    'meeting_feedback',
    'meeting_recordings',
    'meeting_time_log',
    'curriculum_responses',
    'chapter_curriculum_history',
    'commitments',
    'attendance',
    'pending_tasks',
    'notification_log',
    'meeting_agenda_items',
    'leadership_log',
    'chapter_lifecycle_requests',
    'member_opt_ins',
    'lifecycle_request_messages',
    'chapter_ledger',
    'meetings',
    'chapter_memberships',
    'chapters',
  ];

  for (const table of tablesToWipe) {
    const { error: wipeError } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (wipeError) {
      error(`Failed to wipe ${table}`, wipeError);
    }
  }

  // Wipe users except preserved ones
  const preservedIds = preservedUsers.map(u => u.id);
  if (preservedIds.length > 0) {
    // Delete users where id is NOT in the preserved list
    const { data: allUsers } = await supabase.from('users').select('id');
    const usersToDelete = allUsers?.filter(u => !preservedIds.includes(u.id)) || [];

    for (const user of usersToDelete) {
      // Delete public.users record
      const { error: delError } = await supabase.from('users').delete().eq('id', user.id);
      if (delError) {
        error('Failed to delete public user', delError);
      }

      // Delete auth.users record using admin API
      const { error: authDelError } = await supabase.auth.admin.deleteUser(user.id);
      if (authDelError) {
        error('Failed to delete auth user', authDelError);
      }
    }
  }

  log('   ✓ Tables wiped');
}

async function generateMembers() {
  log('\n👥 Creating members...');

  if (isDryRun) {
    log('   🔍 DRY RUN: Would create members (skipping)');
    return;
  }

  // Nathan already exists - add to allMembers
  const notto = preservedUsers.find(u => u.username === 'notto');
  if (notto) {
    allMembers.push(notto);
  }

  // Create or use Traver
  let traver = preservedUsers.find(u => u.email === 'traver@traverboehm.com');
  if (!traver) {
    try {
      traver = await createUserWithAuth({
        email: 'traver@traverboehm.com',
        username: 'traver',
        name: 'Traver Boehm',
        is_leader_certified: true,
        is_punc_admin: true,
        address: '123 Boulder St, Boulder, CO 80302',
        phone: '303-555-0001',
      });
      allMembers.push(traver);
    } catch (err) {
      error('Failed to create Traver', err);
    }
  } else {
    allMembers.push(traver);
  }

  // Create other named members
  const namedMembers = [
    { name: 'David Boyd', username: 'dboyd', email: 'david.boyd@example.com', area: 'Aurora' },
    { name: 'Joseph Sheehey', username: 'jsheehey', email: 'joseph.sheehey@example.com', area: 'Denver' },
    { name: 'Andrew Fraser', username: 'afraser', email: 'andrew.fraser@example.com', area: 'Lakewood' },
  ];

  for (const member of namedMembers) {
    try {
      const data = await createUserWithAuth({
        email: member.email,
        username: member.username,
        name: member.name,
        address: `${randomInt(100, 999)} ${randomChoice(['Main', 'Oak', 'Pine', 'Elm'])} St, ${member.area}, CO ${randomInt(80000, 80999)}`,
        phone: `${randomChoice(['303', '720'])}-555-${String(randomInt(1000, 9999)).padStart(4, '0')}`,
      });
      allMembers.push(data);
    } catch (err) {
      error(`Failed to create ${member.name}`, err);
    }
  }

  // Generate 35 additional members
  const usedNames = new Set(allMembers.map(m => m.name));

  for (let i = 0; i < 35; i++) {
    let firstName, lastName, name, username;

    // Generate unique name
    do {
      firstName = randomChoice(FIRST_NAMES);
      lastName = randomChoice(LAST_NAMES);
      name = `${firstName} ${lastName}`;
      username = `${firstName[0].toLowerCase()}${lastName.toLowerCase()}`;
    } while (usedNames.has(name));

    usedNames.add(name);

    const area = randomChoice(DENVER_AREAS);
    try {
      const data = await createUserWithAuth({
        email: `${username}@example.com`,
        username: username,
        name: name,
        address: `${randomInt(100, 999)} ${randomChoice(['Main', 'Oak', 'Pine', 'Elm', 'Maple', 'Cedar'])} ${randomChoice(['St', 'Ave', 'Dr', 'Ln'])}, ${area}, CO ${randomInt(80000, 80999)}`,
        phone: `${randomChoice(['303', '720'])}-555-${String(randomInt(1000, 9999)).padStart(4, '0')}`,
      });
      allMembers.push(data);
    } catch (err) {
      error(`Failed to create generated member ${name}`, err);
    }
  }

  log(`   ✓ ${allMembers.length} members created (${namedMembers.length + 2} named, ${allMembers.length - namedMembers.length - 2} generated)`);
}

async function createInitialChapters() {
  // Note: This creates the chapter definitions
  // Actual chapter creation happens during timeline simulation
  // This is just for reference

  return [
    {
      name: 'Oak Chapter',
      startMonth: 1,
      location: 'Lakewood, CO',
      frequency: 'biweekly',
      dayOfWeek: 2, // Tuesday
      time: '19:00:00',
      leaderUsername: 'notto',
      personality: 'strong',
    },
    {
      name: 'Pine Chapter',
      startMonth: 1,
      location: 'Aurora, CO',
      frequency: 'weekly',
      dayOfWeek: 4, // Thursday
      time: '18:30:00',
      leaderUsername: 'traver',
      personality: 'strong',
    },
    {
      name: 'Elm Chapter',
      startMonth: 2,
      location: 'Boulder, CO',
      frequency: 'threeweekly',
      dayOfWeek: 3, // Wednesday
      time: '19:00:00',
      leaderUsername: null, // Will assign
      personality: 'moderate',
    },
    {
      name: 'Aspen Chapter',
      startMonth: 3,
      location: 'Castle Rock, CO',
      frequency: 'biweekly',
      dayOfWeek: 1, // Monday
      time: '18:00:00',
      leaderUsername: null,
      personality: 'struggling',
    },
  ];
}

// ============================================================================
// TIMELINE SIMULATION
// ============================================================================

interface SimChapter {
  id: string;
  name: string;
  location: string;
  frequency: string;
  dayOfWeek: number;
  time: string;
  leaderId: string;
  memberIds: string[];
  createdDate: Date;
  lastMeetingDate: Date | null;
  personality: string;
  status: string;
}

const simChapters: SimChapter[] = [];
const simMeetings: any[] = [];
const waitingList: string[] = [];

async function simulateTimeline() {
  log('\n📅 Simulating day by day...\n');

  const chapterDefs = await createInitialChapters();
  let currentDay = new Date(SIM_START);
  let currentMonth = 0; // Start at 0 so month 1 can be triggered
  let lastLoggedMonth = '';

  // Initialize waiting list with first batch of members
  const unassignedMembers = allMembers.filter(m =>
    m.username !== 'notto' && m.username !== 'traver'
  );
  waitingList.push(...randomSample(unassignedMembers.map(m => m.id), 8));

  while (currentDay <= SIM_END) {
    const monthName = currentDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (monthName !== lastLoggedMonth) {
      log(`\n--- ${monthName} ---`);
      lastLoggedMonth = monthName;
    }

    // Check for new chapter formations
    const monthsSinceStart = Math.floor(daysBetween(SIM_START, currentDay) / 30);
    const targetMonth = monthsSinceStart + 1; // Month 1 is first 30 days, Month 2 is days 30-60, etc.

    if (targetMonth > currentMonth) {
      currentMonth = targetMonth;

      // Form chapters for this month
      for (const def of chapterDefs) {
        if (def.startMonth === currentMonth) {
          await formChapter(def, currentDay);
        }
      }
    }

    // Check for Oak split (month 5, early December)
    if (currentDay >= new Date('2025-12-01') && currentDay <= new Date('2025-12-02')) {
      const oakChapter = simChapters.find(c => c.name === 'Oak Chapter' && c.status === 'open');
      if (oakChapter) {
        await executeOakSplit(oakChapter, currentDay);
      }
    }

    // Monthly funding (first of month)
    if (currentDay.getDate() === 1) {
      await processMonthlyFunding(currentDay);
    }

    // Check for scheduled meetings today
    for (const chapter of simChapters.filter(c => c.status === 'open')) {
      if (shouldMeetToday(chapter, currentDay)) {
        await simulateMeeting(chapter, currentDay);
      }
    }

    // Resolve commitments (check daily)
    await resolveCommitments(currentDay);

    // Advance day
    currentDay.setDate(currentDay.getDate() + 1);
  }

  log('');
}

async function formChapter(def: any, date: Date) {
  if (isDryRun) return;

  // Get leader
  const leader = def.leaderUsername
    ? allMembers.find(m => m.username === def.leaderUsername)
    : randomChoice(allMembers.filter(m =>
        !simChapters.some(c => c.memberIds.includes(m.id)) &&
        !waitingList.includes(m.id)
      ));

  if (!leader) {
    error(`No leader available for ${def.name}`);
    return;
  }

  // Create chapter in database
  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .insert({
      name: def.name,
      status: 'open',
      meeting_frequency: def.frequency,
      meeting_day_of_week: def.dayOfWeek,
      meeting_time: def.time,
      meeting_location: def.location,
    })
    .select()
    .single();

  if (chapterError) {
    error(`Failed to create ${def.name}`, chapterError);
    return;
  }

  // Certify leader if not already
  if (!leader.is_leader_certified) {
    await supabase
      .from('users')
      .update({ is_leader_certified: true })
      .eq('id', leader.id);
  }

  // Add leader as member
  await supabase
    .from('chapter_memberships')
    .insert({
      chapter_id: chapter.id,
      user_id: leader.id,
      role: 'leader',
      is_active: true,
      joined_at: date.toISOString(),
    });

  // Initial members from waiting list
  const initialCount = def.name.includes('Oak') || def.name.includes('Pine') ? 5 : 4;
  const newMemberIds = waitingList.splice(0, initialCount);

  for (const memberId of newMemberIds) {
    await supabase
      .from('chapter_memberships')
      .insert({
        chapter_id: chapter.id,
        user_id: memberId,
        role: 'member',
        is_active: true,
        joined_at: date.toISOString(),
      });
  }

  // Track in sim state
  const simChapter = {
    id: chapter.id,
    name: def.name,
    location: def.location,
    frequency: def.frequency,
    dayOfWeek: def.dayOfWeek,
    time: def.time,
    leaderId: leader.id,
    memberIds: [leader.id, ...newMemberIds],
    createdDate: new Date(date), // Clone the date to prevent mutation
    lastMeetingDate: null,
    personality: def.personality,
    status: 'open',
  };

  simChapters.push(simChapter);

  allChapters.push(chapter);

  // Log chapter creation
  await logActivity({
    actorId: leader.id,
    actorType: 'admin',
    action: 'admin.chapter_created',
    entityType: 'chapter',
    entityId: chapter.id,
    chapterId: chapter.id,
    summary: `${def.name} formed with ${newMemberIds.length + 1} members`,
    details: {
      leader_name: leader.name,
      location: def.location,
      initial_members: newMemberIds.length + 1,
    },
  });

  log(`   ${formatDate(date)}: ${def.name} formed (${newMemberIds.length + 1} members, Leader: ${leader.username})`);
}

function shouldMeetToday(chapter: SimChapter, date: Date): boolean {
  // Check day of week matches
  const todayDay = date.getDay();
  if (todayDay !== chapter.dayOfWeek) {
    return false;
  }

  // Check if it's been long enough since last meeting
  if (!chapter.lastMeetingDate) {
    // First meeting should be about a week after formation
    const daysSinceCreation = daysBetween(chapter.createdDate, date);
    return daysSinceCreation >= 7 && daysSinceCreation <= 14;
  }

  const daysSinceLast = daysBetween(chapter.lastMeetingDate, date);

  switch (chapter.frequency) {
    case 'weekly':
      return daysSinceLast >= 7;
    case 'biweekly':
      return daysSinceLast >= 14;
    case 'threeweekly':
      return daysSinceLast >= 21;
    default:
      return false;
  }
}

async function simulateMeeting(chapter: SimChapter, date: Date) {
  if (isDryRun) return;

  // Create meeting 7 days before
  // For simulation purposes, we'll create it "just in time"

  const [hours, minutes] = chapter.time.split(':');
  const startTime = new Date(date);
  startTime.setHours(parseInt(hours), parseInt(minutes), 0);

  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({
      chapter_id: chapter.id,
      scheduled_date: formatDate(date),
      scheduled_time: chapter.time,
      status: 'completed', // Simulate as already completed
      scribe_id: chapter.leaderId, // Scribe is typically the leader
      actual_start_time: startTime.toISOString(),
      completed_at: addMinutes(startTime, randomInt(90, 150)).toISOString(),
      current_section: 'ended',
    })
    .select()
    .single();

  if (meetingError) {
    error(`Failed to create meeting for ${chapter.name}`, meetingError);
    return;
  }

  // Simulate attendance
  const attendeeIds = randomSample(
    chapter.memberIds,
    Math.floor(chapter.memberIds.length * (chapter.personality === 'strong' ? 0.95 : chapter.personality === 'moderate' ? 0.80 : 0.65))
  );

  for (const memberId of chapter.memberIds) {
    await supabase
      .from('attendance')
      .insert({
        meeting_id: meeting.id,
        user_id: memberId,
        attendance_type: attendeeIds.includes(memberId) ? (Math.random() > 0.15 ? 'in_person' : 'video') : 'absent',
        checked_in_at: attendeeIds.includes(memberId) ? startTime.toISOString() : null,
      });
  }

  // Create commitments for attendees
  for (const memberId of attendeeIds) {
    const stretchGoal = randomChoice(STRETCH_GOALS);
    await supabase.from('commitments').insert({
      meeting_id: meeting.id,
      user_id: memberId,
      stretch_goal: stretchGoal,
      status: 'pending',
    });
  }

  // Simulate curriculum response (if chapter has curriculum)
  if (preservedCurriculum.modules.length > 0) {
    const module = randomChoice(preservedCurriculum.modules);

    for (const memberId of attendeeIds) {
      const response = randomChoice(REFLECTIVE_RESPONSES);
      await supabase.from('curriculum_responses').insert({
        meeting_id: meeting.id,
        user_id: memberId,
        module_id: module.id,
        response_text: response,
      });
    }
  }

  // Create meeting feedback (ratings and most value votes)
  for (const memberId of attendeeIds) {
    const rating = randomInt(7, 10); // Most meetings are rated 7-10
    const otherAttendees = attendeeIds.filter(id => id !== memberId);
    const mostValueUserId = otherAttendees.length > 0 ? randomChoice(otherAttendees) : null;

    await supabase.from('meeting_feedback').insert({
      meeting_id: meeting.id,
      user_id: memberId,
      value_rating: rating,
      most_value_user_id: mostValueUserId,
    });
  }

  // Create time logs for attendees
  const meetingDuration = randomInt(90, 150); // minutes
  let currentSpeakerTime = 0;

  for (const memberId of attendeeIds) {
    const speakingTime = randomInt(5, 15); // 5-15 minutes per person
    await supabase.from('meeting_time_log').insert({
      meeting_id: meeting.id,
      user_id: memberId,
      started_at: addMinutes(startTime, currentSpeakerTime).toISOString(),
      ended_at: addMinutes(startTime, currentSpeakerTime + speakingTime).toISOString(),
    });
    currentSpeakerTime += speakingTime;
  }

  // Simulate meeting recording (80% of meetings have recordings)
  if (Math.random() > 0.2) {
    await supabase.from('meeting_recordings').insert({
      meeting_id: meeting.id,
      storage_path: `recordings/${chapter.id}/${meeting.id}.mp3`,
      duration_seconds: meetingDuration * 60,
      file_size_bytes: randomInt(50000000, 150000000), // 50-150 MB
      uploaded_by: chapter.leaderId,
    });
  }

  // Update chapter
  chapter.lastMeetingDate = new Date(date); // Clone the date to prevent mutation
  simMeetings.push(meeting);

  // Log meeting completion
  const leaderName = allMembers.find(m => m.id === chapter.leaderId)?.name || 'Leader';
  await logActivity({
    actorId: chapter.leaderId,
    action: 'meeting.closed',
    entityType: 'meeting',
    entityId: meeting.id,
    chapterId: chapter.id,
    summary: `${leaderName} closed ${chapter.name} meeting`,
    details: {
      scheduled_date: formatDate(date),
      attendance: attendeeIds.length,
      total_members: chapter.memberIds.length,
    },
  });

  log(`   ${formatDate(date)}: 📋 ${chapter.name} meeting — ${attendeeIds.length} attended, ${chapter.memberIds.length - attendeeIds.length} absent`);
}

async function resolveCommitments(date: Date) {
  if (isDryRun) return;

  // Find commitments from meetings more than 3 days ago that are still pending
  const threeDaysAgo = new Date(date);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: pendingCommitments } = await supabase
    .from('commitments')
    .select('*, meetings!inner(scheduled_date)')
    .eq('status', 'pending')
    .lte('meetings.scheduled_date', formatDate(threeDaysAgo));

  if (pendingCommitments && pendingCommitments.length > 0) {
    // Resolve some commitments (70% success rate)
    for (const commitment of pendingCommitments) {
      if (Math.random() < 0.7) {
        // Mark as completed
        await supabase
          .from('commitments')
          .update({
            status: 'completed',
            completed_at: date.toISOString(),
          })
          .eq('id', commitment.id);
      } else if (Math.random() < 0.3) {
        // Mark as incomplete (didn't do it)
        await supabase
          .from('commitments')
          .update({ status: 'incomplete' })
          .eq('id', commitment.id);
      }
      // Remaining 30% stay pending (still working on it)
    }
  }
}

async function executeOakSplit(oakChapter: SimChapter, date: Date) {
  if (isDryRun) return;

  log(`   ${formatDate(date)}: 🔀 Oak Chapter split → Oak North + Oak South`);

  // Mark Oak as split
  await supabase
    .from('chapters')
    .update({ status: 'closed' })
    .eq('id', oakChapter.id);

  oakChapter.status = 'closed';

  // Create Oak North (Nathan leads)
  const notto = allMembers.find(m => m.username === 'notto');
  const northMemberIds = [notto!.id, ...randomSample(
    oakChapter.memberIds.filter(id => id !== notto!.id),
    4
  )];

  const { data: oakNorth } = await supabase
    .from('chapters')
    .insert({
      name: 'Oak North',
      status: 'open',
      meeting_frequency: 'biweekly',
      meeting_day_of_week: 2,
      meeting_time: '19:00:00',
      meeting_location: 'Lakewood, CO',
    })
    .select()
    .single();

  for (const memberId of northMemberIds) {
    await supabase
      .from('chapter_memberships')
      .insert({
        chapter_id: oakNorth!.id,
        user_id: memberId,
        role: memberId === notto!.id ? 'leader' : 'member',
        is_active: true,
        joined_at: date.toISOString(),
      });
  }

  simChapters.push({
    id: oakNorth!.id,
    name: 'Oak North',
    location: 'Lakewood, CO',
    frequency: 'biweekly',
    dayOfWeek: 2,
    time: '19:00:00',
    leaderId: notto!.id,
    memberIds: northMemberIds,
    createdDate: date,
    lastMeetingDate: null,
    personality: 'strong',
    status: 'open',
  });

  // Create Oak South (promoted leader)
  const southMemberIds = oakChapter.memberIds.filter(id => !northMemberIds.includes(id));
  const southLeader = southMemberIds[0];

  const { data: oakSouth } = await supabase
    .from('chapters')
    .insert({
      name: 'Oak South',
      status: 'open',
      meeting_frequency: 'biweekly',
      meeting_day_of_week: 6, // Saturday
      meeting_time: '09:00:00',
      meeting_location: 'Littleton, CO',
    })
    .select()
    .single();

  for (const memberId of southMemberIds) {
    await supabase
      .from('chapter_memberships')
      .insert({
        chapter_id: oakSouth!.id,
        user_id: memberId,
        role: memberId === southLeader ? 'leader' : 'member',
        is_active: true,
        joined_at: date.toISOString(),
      });
  }

  // Certify new leader
  await supabase
    .from('users')
    .update({ is_leader_certified: true })
    .eq('id', southLeader);

  simChapters.push({
    id: oakSouth!.id,
    name: 'Oak South',
    location: 'Littleton, CO',
    frequency: 'biweekly',
    dayOfWeek: 6,
    time: '09:00:00',
    leaderId: southLeader,
    memberIds: southMemberIds,
    createdDate: date,
    lastMeetingDate: null,
    personality: 'strong',
    status: 'open',
  });
}

async function processMonthlyFunding(date: Date) {
  if (isDryRun) return;

  const periodMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  // Post monthly debits for all open chapters
  for (const chapter of simChapters.filter(c => c.status === 'open')) {
    // 1. Post monthly debit
    await supabase
      .from('chapter_ledger')
      .insert({
        chapter_id: chapter.id,
        transaction_type: 'monthly_debit',
        amount: -55.00,
        period_month: periodMonth,
      });

    await logActivity({
      actorType: 'system',
      action: 'funding.monthly_debit_posted',
      entityType: 'funding',
      entityId: chapter.id,
      chapterId: chapter.id,
      summary: `Monthly $55 debit posted to ${chapter.name}`,
      details: { amount: -55.00, period_month: periodMonth },
    });

    // 2. Simulate member donations (60-90% of members contribute)
    const contributingMembers = randomSample(
      chapter.memberIds,
      Math.floor(chapter.memberIds.length * randomInt(60, 90) / 100)
    );

    let totalDonations = 0;
    for (const memberId of contributingMembers) {
      // Donations range from $10 to $25
      const donationAmount = randomInt(10, 25);
      const attribution = randomChoice(['anonymous', 'leader_only', 'chapter']);

      await supabase.from('chapter_ledger').insert({
        chapter_id: chapter.id,
        user_id: memberId,
        transaction_type: 'donation',
        amount: donationAmount,
        period_month: periodMonth,
        attribution_level: attribution,
      });

      totalDonations += donationAmount;

      // Mark user as contributing if not already
      await supabase
        .from('chapter_memberships')
        .update({
          is_contributing: true,
          became_contributing_at: date.toISOString()
        })
        .eq('chapter_id', chapter.id)
        .eq('user_id', memberId);

      // Log donation if not anonymous
      if (attribution !== 'anonymous') {
        const donor = allMembers.find(m => m.id === memberId);
        await logActivity({
          actorId: memberId,
          action: 'funding.donation_received',
          entityType: 'funding',
          entityId: chapter.id,
          chapterId: chapter.id,
          summary: `${donor?.name} donated $${donationAmount} to ${chapter.name}`,
          details: { amount: donationAmount, attribution },
        });
      }
    }

    // 3. Calculate and post PUNC support to cover deficit
    const deficit = 55 - totalDonations;
    if (deficit > 0) {
      await supabase.from('chapter_ledger').insert({
        chapter_id: chapter.id,
        transaction_type: 'punc_support',
        amount: deficit,
        period_month: periodMonth,
        description: `PUNC covers ${Math.round((deficit / 55) * 100)}% gap`,
      });

      await logActivity({
        actorType: 'system',
        action: 'funding.punc_support_posted',
        entityType: 'funding',
        entityId: chapter.id,
        chapterId: chapter.id,
        summary: `PUNC contributed $${deficit.toFixed(2)} to ${chapter.name}`,
        details: { amount: deficit, coverage_percent: Math.round((deficit / 55) * 100) },
      });
    }
  }
}

function printSummary() {
  log('\n✅ Simulation complete!\n');

  if (errorLog.length > 0) {
    log(`⚠️  ${errorLog.length} errors occurred during simulation:\n`);
    errorLog.forEach(err => log(`   ${err}`));
  }

  const activeChapters = simChapters.filter(c => c.status === 'open').length;
  const closedChapters = simChapters.filter(c => c.status === 'closed').length;
  const totalMembers = allMembers.length;
  const assignedMembers = simChapters.reduce((sum, c) => sum + c.memberIds.length, 0);

  log('\n📊 Summary:');
  log(`   Chapters: ${simChapters.length} (${activeChapters} active, ${closedChapters} closed/split)`);
  log(`   Members: ${totalMembers} total (${assignedMembers} assigned, ${waitingList.length} waiting list)`);
  log(`   Meetings: ${simMeetings.length} completed`);
  log(`   Simulation period: ${formatDate(SIM_START)} to ${formatDate(SIM_END)}`);
}

// Run the simulation
main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});

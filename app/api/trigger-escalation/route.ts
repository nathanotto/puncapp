import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { sendNotification } from '@/lib/notifications';

export async function POST() {
  try {
    const supabase = await createClient();
    const now = new Date();

    console.log('🚀 Running RSVP escalation logic...');

    // ============================================
    // STEP A: Find meetings 3 days away
    // Send reminders to non-responders
    // ============================================

    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysDate = threeDaysFromNow.toISOString().split('T')[0];

    console.log(`Looking for meetings on ${threeDaysDate} (3 days from now)...`);

    // Get meetings happening in 3 days
    const { data: meetingsIn3Days } = await supabase
      .from('meetings')
      .select(`
        id,
        scheduled_date,
        scheduled_time,
        location,
        chapters!inner (
          id,
          name
        )
      `)
      .eq('scheduled_date', threeDaysDate)
      .eq('status', 'scheduled');

    console.log(`Found ${meetingsIn3Days?.length || 0} meetings in 3 days`);

    for (const meeting of meetingsIn3Days || []) {
      const chapter = normalizeJoin(meeting.chapters);

      // Find non-responders who haven't been reminded yet
      const { data: nonResponders } = await supabase
        .from('attendance')
        .select('id, user_id')
        .eq('meeting_id', meeting.id)
        .eq('rsvp_status', 'no_response')
        .is('reminder_sent_at', null);

      console.log(`  Meeting ${chapter?.name}: ${nonResponders?.length || 0} non-responders need reminders`);

      for (const attendance of nonResponders || []) {
        // Send simulated notifications
        await sendNotification({
          recipientUserId: attendance.user_id,
          type: 'email',
          purpose: 'rsvp_reminder',
          subject: `RSVP needed: ${chapter?.name} meeting on ${meeting.scheduled_date}`,
          content: `Hey brother, you haven't RSVPed for the upcoming ${chapter?.name} meeting on ${meeting.scheduled_date} at ${meeting.scheduled_time}. Please respond so we know if you'll be there. - PUNC`,
          relatedEntityType: 'meeting',
          relatedEntityId: meeting.id,
        });

        await sendNotification({
          recipientUserId: attendance.user_id,
          type: 'sms',
          purpose: 'rsvp_reminder',
          content: `PUNC: You haven't RSVPed for ${chapter?.name} on ${meeting.scheduled_date}. Please respond!`,
          relatedEntityType: 'meeting',
          relatedEntityId: meeting.id,
        });

        // Mark reminder sent
        await supabase
          .from('attendance')
          .update({ reminder_sent_at: now.toISOString() })
          .eq('id', attendance.id);

        // Update pending task urgency to 'reminded'
        await supabase
          .from('pending_tasks')
          .update({ urgency: 'reminded' })
          .eq('task_type', 'respond_to_rsvp')
          .eq('assigned_to', attendance.user_id)
          .eq('related_entity_id', meeting.id)
          .is('completed_at', null);

        console.log(`    ✅ Sent reminders to user ${attendance.user_id}`);
      }
    }

    // ============================================
    // STEP B: Find meetings 2 days away
    // Create contact tasks for Leader/Backup
    // ============================================

    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const twoDaysDate = twoDaysFromNow.toISOString().split('T')[0];

    console.log(`Looking for meetings on ${twoDaysDate} (2 days from now)...`);

    // Get meetings happening in 2 days
    const { data: meetingsIn2Days } = await supabase
      .from('meetings')
      .select(`
        id,
        scheduled_date,
        chapter_id,
        chapters!inner (
          id,
          name
        )
      `)
      .eq('scheduled_date', twoDaysDate)
      .eq('status', 'scheduled');

    console.log(`Found ${meetingsIn2Days?.length || 0} meetings in 2 days`);

    for (const meeting of meetingsIn2Days || []) {
      const chapter = normalizeJoin(meeting.chapters);

      // Find non-responders (still no response after reminder)
      const { data: stillNoResponse } = await supabase
        .from('attendance')
        .select(`
          id,
          user_id,
          users!inner (
            id,
            name,
            username,
            phone
          )
        `)
        .eq('meeting_id', meeting.id)
        .eq('rsvp_status', 'no_response')
        .is('leader_outreach_logged_at', null);

      if (!stillNoResponse?.length) {
        console.log(`  Meeting ${chapter?.name}: No unresponsive members`);
        continue;
      }

      console.log(`  Meeting ${chapter?.name}: ${stillNoResponse.length} still unresponsive, creating leader tasks...`);

      // Get Leader and Backup Leader for this chapter
      const { data: leaders } = await supabase
        .from('chapter_memberships')
        .select('user_id')
        .eq('chapter_id', meeting.chapter_id)
        .in('role', ['leader', 'backup_leader']);

      // For each non-responder, create task for leaders
      for (const attendance of stillNoResponse) {
        const user = normalizeJoin(attendance.users);
        const memberName = user?.username || user?.name;

        // Update member's pending task urgency to 'escalated'
        await supabase
          .from('pending_tasks')
          .update({ urgency: 'escalated' })
          .eq('task_type', 'respond_to_rsvp')
          .eq('assigned_to', attendance.user_id)
          .eq('related_entity_id', meeting.id)
          .is('completed_at', null);

        // Create contact task for each leader
        for (const leader of leaders || []) {
          // Check if task already exists
          const { data: existingTask } = await supabase
            .from('pending_tasks')
            .select('id')
            .eq('task_type', 'contact_unresponsive_member')
            .eq('assigned_to', leader.user_id)
            .eq('related_entity_id', attendance.id) // Link to attendance record
            .is('completed_at', null)
            .single();

          if (!existingTask) {
            await supabase.from('pending_tasks').insert({
              task_type: 'contact_unresponsive_member',
              assigned_to: leader.user_id,
              related_entity_type: 'attendance',
              related_entity_id: attendance.id,
              metadata: {
                member_user_id: attendance.user_id,
                member_name: memberName,
                member_phone: user?.phone,
                meeting_id: meeting.id,
                meeting_date: meeting.scheduled_date,
                chapter_name: chapter?.name,
              },
              due_at: meeting.scheduled_date, // Due by meeting day
            });

            // Log simulated notification to leader
            await sendNotification({
              recipientUserId: leader.user_id,
              type: 'email',
              purpose: 'task_created',
              subject: `Action needed: Contact ${memberName} about RSVP`,
              content: `${memberName} hasn't responded to the RSVP for ${chapter?.name} on ${meeting.scheduled_date}. Please reach out to check in with them.`,
              relatedEntityType: 'attendance',
              relatedEntityId: attendance.id,
            });

            console.log(`    ✅ Created contact task for leader ${leader.user_id}`);
          }
        }
      }
    }

    console.log('✅ Escalation complete!');

    return NextResponse.json({
      success: true,
      message: 'Escalation logic executed successfully',
      meetingsIn3Days: meetingsIn3Days?.length || 0,
      meetingsIn2Days: meetingsIn2Days?.length || 0,
    });
  } catch (error: any) {
    console.error('❌ RSVP escalation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

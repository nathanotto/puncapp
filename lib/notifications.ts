import { createClient } from '@/lib/supabase/server';

interface SendNotificationParams {
  recipientUserId: string;
  type: 'email' | 'sms';
  purpose: string;
  subject?: string; // for email
  content: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export async function sendNotification(params: SendNotificationParams) {
  const supabase = await createClient();

  // TODO: Replace with actual Resend (email) or Twilio (sms) call
  // For now, we just log to notification_log with status 'simulated'

  // Example future implementation for email:
  // if (params.type === 'email') {
  //   const { data, error } = await resend.emails.send({
  //     from: 'PUNC <noreply@punchapters.org>',
  //     to: recipientEmail,
  //     subject: params.subject,
  //     text: params.content,
  //   });
  //   if (error) {
  //     // Log as failed
  //   } else {
  //     // Log as sent with external_id = data.id
  //   }
  // }

  // Example future implementation for SMS:
  // if (params.type === 'sms') {
  //   const message = await twilioClient.messages.create({
  //     body: params.content,
  //     to: recipientPhone,
  //     from: process.env.TWILIO_PHONE_NUMBER,
  //   });
  //   // Log with external_id = message.sid
  // }

  // For now: simulate
  const { data, error } = await supabase
    .from('notification_log')
    .insert({
      recipient_user_id: params.recipientUserId,
      notification_type: params.type,
      purpose: params.purpose,
      status: 'simulated',
      subject: params.subject,
      content: params.content,
      related_entity_type: params.relatedEntityType,
      related_entity_id: params.relatedEntityId,
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[SIMULATED ${params.type.toUpperCase()}] To: ${params.recipientUserId}`);
  console.log(`Purpose: ${params.purpose}`);
  console.log(`Content: ${params.content}`);

  return data;
}

export async function sendRsvpReminder(
  userId: string,
  meetingId: string,
  meetingDetails: {
    chapterName: string;
    date: string;
    time: string;
    location: string;
  }
) {
  const content = `Hey brother, you haven't RSVPed for the upcoming ${meetingDetails.chapterName} meeting on ${meetingDetails.date} at ${meetingDetails.time}. Please respond so we know if you'll be there. - PUNC`;

  // Send both email and SMS
  await sendNotification({
    recipientUserId: userId,
    type: 'email',
    purpose: 'rsvp_reminder',
    subject: `RSVP needed: ${meetingDetails.chapterName} meeting on ${meetingDetails.date}`,
    content,
    relatedEntityType: 'meeting',
    relatedEntityId: meetingId,
  });

  await sendNotification({
    recipientUserId: userId,
    type: 'sms',
    purpose: 'rsvp_reminder',
    content: `PUNC: You haven't RSVPed for ${meetingDetails.chapterName} on ${meetingDetails.date}. Please respond!`,
    relatedEntityType: 'meeting',
    relatedEntityId: meetingId,
  });
}

export async function sendTaskCreatedNotification(
  userId: string,
  taskType: string,
  taskDetails: {
    title: string;
    description: string;
    dueDate?: string;
  },
  relatedEntityId?: string
) {
  const content = `${taskDetails.title}\n\n${taskDetails.description}${
    taskDetails.dueDate ? `\n\nDue: ${taskDetails.dueDate}` : ''
  }\n\nLog in to PUNCapp to view and complete this task.`;

  await sendNotification({
    recipientUserId: userId,
    type: 'email',
    purpose: 'task_created',
    subject: `New task: ${taskDetails.title}`,
    content,
    relatedEntityType: 'task',
    relatedEntityId: relatedEntityId,
  });
}

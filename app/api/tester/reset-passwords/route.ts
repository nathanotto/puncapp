import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is tester
  const { data: userData } = await supabase
    .from('users')
    .select('is_tester')
    .eq('id', user.id)
    .single();

  if (!userData?.is_tester) {
    return NextResponse.json({ error: 'Not a tester' }, { status: 403 });
  }

  try {
    // Use service role client to update passwords
    const serviceRoleClient = createServiceRoleClient();

    // Get all users except Nathan
    const { data: allUsers } = await serviceRoleClient
      .from('users')
      .select('id, email, name')
      .neq('id', '78d0b1d5-08a6-4923-8bef-49d804cafa73'); // Nathan's ID

    if (!allUsers || allUsers.length === 0) {
      return NextResponse.json({ message: 'No test users found to update' });
    }

    console.log(`Resetting passwords for ${allUsers.length} users...`);

    let successCount = 0;
    let errorCount = 0;

    // Update each user's password
    for (const testUser of allUsers) {
      const { error } = await serviceRoleClient.auth.admin.updateUserById(
        testUser.id,
        { password: 'testpass123' }
      );

      if (error) {
        console.error(`Failed to update password for ${testUser.email}:`, error);
        errorCount++;
      } else {
        console.log(`✓ Updated password for ${testUser.email}`);
        successCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Reset ${successCount} passwords successfully`,
      successCount,
      errorCount,
      total: allUsers.length
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import FormationRequestForm from './FormationRequestForm';

export default async function FormationRequestPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Check if user is a certified leader
  const { data: userData } = await supabase
    .from('users')
    .select('name, is_leader_certified')
    .eq('id', user.id)
    .single();

  if (!userData?.is_leader_certified) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-earth-brown mb-4">
            Leader Certification Required
          </h1>
          <p className="text-stone-gray mb-4">
            You must be a certified leader to request a new chapter formation.
          </p>
          <p className="text-stone-gray">
            Contact your PUNC administrator to become certified.
          </p>
        </div>
      </div>
    );
  }

  // Get all unassigned users (no active chapter memberships)
  const { data: unassignedUsers } = await supabase
    .from('users')
    .select(`
      id,
      name,
      username,
      email,
      address
    `)
    .not('id', 'eq', user.id);

  // Filter to only users without active memberships
  const { data: activeMemberships } = await supabase
    .from('chapter_memberships')
    .select('user_id')
    .eq('is_active', true);

  const activeMemberIds = new Set(activeMemberships?.map(m => m.user_id) || []);
  const availableUsers = unassignedUsers?.filter(u => !activeMemberIds.has(u.id)) || [];

  return (
    <div className="min-h-screen bg-warm-cream py-8 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-earth-brown mb-2">
            Request New Chapter Formation
          </h1>
          <p className="text-stone-gray">
            Propose a new PUNC chapter with founding members
          </p>
        </div>

        <FormationRequestForm
          leaderId={user.id}
          leaderName={userData.name}
          availableUsers={availableUsers}
        />
      </div>
    </div>
  );
}

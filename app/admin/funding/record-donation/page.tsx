import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RecordDonationClient } from '@/components/admin/RecordDonationClient';

export default async function RecordDonationPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: userData } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_punc_admin) redirect('/');

  // Get all open chapters
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, name')
    .eq('status', 'open')
    .order('name');

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-earth-brown mb-2">Record Donation</h1>
          <p className="text-stone-gray">
            Record outside donations or cross-chapter donations
          </p>
        </div>

        <RecordDonationClient
          chapters={chapters || []}
          adminId={user.id}
        />
      </div>
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Verify user is admin
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('name, username, is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_punc_admin) {
    redirect('/');
  }

  const userName = userData.name || userData.username || 'Admin';

  return (
    <div className="flex min-h-screen bg-warm-cream">
      <AdminSidebar userName={userName} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

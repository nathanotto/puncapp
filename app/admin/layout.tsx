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

  console.log('[Admin Layout] User data:', userData);
  console.log('[Admin Layout] User error:', userError);
  console.log('[Admin Layout] is_punc_admin:', userData?.is_punc_admin);

  if (!userData?.is_punc_admin) {
    console.log('[Admin Layout] Not admin, redirecting to /');
    redirect('/');
  }

  console.log('[Admin Layout] User is admin, rendering admin layout');

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

import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ModuleEditorClient from './ModuleEditorClient';

export default async function ModuleEditorPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const supabase = await createClient();

  // Check admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_punc_admin) {
    redirect('/');
  }

  // If new, show empty form
  if (moduleId === 'new') {
    return (
      <div className="p-8">
        <div className="mb-6">
          <Link href="/admin/curriculum" className="text-blue-600 hover:underline">
            ← Back to Curriculum
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-6">Create New Module</h1>
        <ModuleEditorClient module={null} sequences={[]} allSequences={[]} />
      </div>
    );
  }

  // Load existing module
  const { data: module } = await supabase
    .from('curriculum_modules')
    .select('*')
    .eq('id', moduleId)
    .single();

  if (!module) {
    redirect('/admin/curriculum');
  }

  // Get sequences this module belongs to
  const { data: moduleSequences } = await supabase
    .from('curriculum_module_sequences')
    .select(`
      id,
      order_in_sequence,
      sequence:curriculum_sequences(*)
    `)
    .eq('module_id', moduleId);

  const sequences = moduleSequences?.map(ms => {
    const sequence = normalizeJoin(ms.sequence);
    return {
      linkId: ms.id,
      order: ms.order_in_sequence,
      id: sequence?.id || '',
      title: sequence?.title || '',
      description: sequence?.description || ''
    };
  }) || [];

  // Get all active sequences for the add dropdown
  const { data: allSequences } = await supabase
    .from('curriculum_sequences')
    .select('*')
    .eq('is_active', true)
    .order('title');

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/curriculum" className="text-blue-600 hover:underline">
          ← Back to Curriculum
        </Link>
      </div>
      <h1 className="text-3xl font-bold mb-6">Edit Module</h1>
      <ModuleEditorClient
        module={module}
        sequences={sequences}
        allSequences={allSequences || []}
      />
    </div>
  );
}

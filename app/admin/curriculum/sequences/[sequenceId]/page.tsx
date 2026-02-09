import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SequenceEditorClient from './SequenceEditorClient';

export default async function SequenceEditorPage({
  params,
}: {
  params: Promise<{ sequenceId: string }>;
}) {
  const { sequenceId } = await params;
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
  if (sequenceId === 'new') {
    return (
      <div className="p-8">
        <div className="mb-6">
          <Link href="/admin/curriculum" className="text-blue-600 hover:underline">
            ← Back to Curriculum
          </Link>
        </div>
        <h1 className="text-3xl font-bold mb-6">Create New Sequence</h1>
        <SequenceEditorClient sequence={null} modules={[]} allModules={[]} />
      </div>
    );
  }

  // Load existing sequence
  const { data: sequence } = await supabase
    .from('curriculum_sequences')
    .select('*')
    .eq('id', sequenceId)
    .single();

  if (!sequence) {
    redirect('/admin/curriculum');
  }

  // Get modules in this sequence
  const { data: moduleLinks } = await supabase
    .from('curriculum_module_sequences')
    .select(`
      id,
      order_in_sequence,
      module:curriculum_modules(*)
    `)
    .eq('sequence_id', sequenceId)
    .order('order_in_sequence');

  const modules = moduleLinks?.map(link => {
    const module = normalizeJoin(link.module);
    return {
      linkId: link.id,
      order: link.order_in_sequence,
      ...module
    };
  }).filter(m => m.id) || [];

  // Get all active modules for the add dropdown
  const { data: allModules } = await supabase
    .from('curriculum_modules')
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
      <h1 className="text-3xl font-bold mb-6">Edit Sequence</h1>
      <SequenceEditorClient
        sequence={sequence}
        modules={modules}
        allModules={allModules || []}
      />
    </div>
  );
}

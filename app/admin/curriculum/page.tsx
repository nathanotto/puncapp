import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RemoveModuleFromSequenceButton } from '@/components/admin/RemoveModuleFromSequenceButton';

export default async function CurriculumPage() {
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

  // Get all sequences with their modules
  const { data: sequences } = await supabase
    .from('curriculum_sequences')
    .select('*')
    .order('order_index');

  // Get module-sequence links with module data
  const { data: moduleLinks } = await supabase
    .from('curriculum_module_sequences')
    .select(`
      sequence_id,
      order_in_sequence,
      module:curriculum_modules(*)
    `)
    .order('order_in_sequence');

  // Get all active modules for library check
  const { data: allModules } = await supabase
    .from('curriculum_modules')
    .select('*')
    .eq('is_active', true);

  // Find orphan modules (not in any sequence)
  const linkedModuleIds = new Set(
    moduleLinks
      ?.map(l => {
        const module = normalizeJoin(l.module);
        return module?.id;
      })
      .filter(Boolean) || []
  );
  const orphanModules = allModules?.filter(m => !linkedModuleIds.has(m.id)) || [];

  // Group modules by sequence
  const sequencesWithModules = sequences?.map(seq => ({
    ...seq,
    modules: moduleLinks
      ?.filter(link => link.sequence_id === seq.id)
      .map(link => normalizeJoin(link.module))
      .filter(Boolean) || []
  })) || [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Curriculum</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/curriculum/modules/new"
            className="px-4 py-2 bg-orange-100 text-orange-900 font-medium rounded hover:bg-orange-200 transition-colors"
          >
            + New Module
          </Link>
          <Link
            href="/admin/curriculum/sequences/new"
            className="px-4 py-2 bg-blue-100 text-blue-900 font-medium rounded hover:bg-blue-200 transition-colors"
          >
            + New Sequence
          </Link>
        </div>
      </div>

      {/* Sequences Section */}
      <div className="space-y-6 mb-12">
        {sequencesWithModules.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">No sequences created yet.</p>
            <Link
              href="/admin/curriculum/sequences/new"
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              Create your first sequence
            </Link>
          </div>
        ) : (
          sequencesWithModules.map(sequence => (
            <div key={sequence.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
              {/* Sequence Header */}
              <div className="border-b border-gray-200 p-4 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">{sequence.title}</h2>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        sequence.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {sequence.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {sequence.description && (
                    <p className="text-gray-600 mt-1">{sequence.description}</p>
                  )}
                </div>
                <Link
                  href={`/admin/curriculum/sequences/${sequence.id}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Edit
                </Link>
              </div>

              {/* Modules in Sequence */}
              <div className="p-4">
                {sequence.modules.length === 0 ? (
                  <p className="text-gray-500 text-sm">No modules in this sequence yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sequence.modules.map((module: any, index: number) => (
                      <div
                        key={module.id}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded border border-gray-200"
                      >
                        <div className="text-sm font-medium text-gray-500 w-8">
                          {index + 1}.
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{module.title}</h3>
                            <div className="flex gap-1">
                              {module.is_meeting_only && (
                                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                  Meeting Only
                                </span>
                              )}
                              {module.assignment_text && (
                                <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                  Has Assignment
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {module.principle.length > 100
                              ? module.principle.substring(0, 100) + '...'
                              : module.principle}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/curriculum/modules/${module.id}`}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Edit
                          </Link>
                          <RemoveModuleFromSequenceButton
                            sequenceId={sequence.id}
                            moduleId={module.id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-4">
                <Link
                  href={`/admin/curriculum/sequences/${sequence.id}#add-module`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  + Add Module
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Module Library Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold">
            Module Library
            <span className="text-gray-500 text-sm ml-2">
              ({orphanModules.length} standalone {orphanModules.length === 1 ? 'module' : 'modules'})
            </span>
          </h2>
        </div>
        <div className="p-4">
          {orphanModules.length === 0 ? (
            <p className="text-gray-500 text-sm">
              All modules are assigned to sequences.
            </p>
          ) : (
            <div className="space-y-2">
              {orphanModules.map(module => (
                <div
                  key={module.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{module.title}</h3>
                      <div className="flex gap-1">
                        {module.is_meeting_only && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                            Meeting Only
                          </span>
                        )}
                        {module.assignment_text && (
                          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                            Has Assignment
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {module.principle.length > 100
                        ? module.principle.substring(0, 100) + '...'
                        : module.principle}
                    </p>
                  </div>
                  <Link
                    href={`/admin/curriculum/modules/${module.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

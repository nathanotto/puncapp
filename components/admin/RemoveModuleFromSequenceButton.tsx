'use client';

interface RemoveModuleFromSequenceButtonProps {
  sequenceId: string;
  moduleId: string;
}

export function RemoveModuleFromSequenceButton({ sequenceId, moduleId }: RemoveModuleFromSequenceButtonProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm('Remove this module from the sequence?')) {
      e.preventDefault();
    }
  };

  return (
    <form
      action={`/api/admin/curriculum/sequences/${sequenceId}/modules/${moduleId}`}
      method="POST"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="_method" value="DELETE" />
      <button
        type="submit"
        className="text-red-600 hover:underline text-sm"
      >
        Remove
      </button>
    </form>
  );
}

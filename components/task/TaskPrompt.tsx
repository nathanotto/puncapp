interface TaskPromptProps {
  title: string;
  subtitle?: string;
}

export default function TaskPrompt({ title, subtitle }: TaskPromptProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-earth-brown mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-lg text-stone-gray">
          {subtitle}
        </p>
      )}
    </div>
  );
}

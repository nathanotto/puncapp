import { ReactNode } from 'react';

interface TaskContextProps {
  children: ReactNode;
}

export default function TaskContext({ children }: TaskContextProps) {
  return (
    <div className="bg-bg-subtle rounded-lg p-6 mb-6">
      {children}
    </div>
  );
}

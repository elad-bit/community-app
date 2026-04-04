import type { TaskStatus } from "@/types/index";

const config: Record<TaskStatus, { label: string; className: string }> = {
  pending:     { label: "ממתין",    className: "bg-secondary-100 text-secondary-600" },
  in_progress: { label: "בביצוע",  className: "bg-amber-100 text-amber-700" },
  done:        { label: "הושלם",   className: "bg-green-100 text-green-700" },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { label, className } = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

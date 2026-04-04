import type { RequestStatus } from "@/types/index";

const config: Record<RequestStatus, { label: string; className: string }> = {
  new:         { label: "חדש",     className: "bg-blue-100 text-blue-700" },
  in_progress: { label: "בטיפול", className: "bg-amber-100 text-amber-700" },
  closed:      { label: "נסגר",   className: "bg-green-100 text-green-700" },
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const { label, className } = config[status] ?? config.new;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

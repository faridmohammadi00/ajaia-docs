import type { Role } from "@/lib/types";

const STYLES: Record<Role, string> = {
  owner: "bg-blue-50 text-blue-700 ring-blue-200",
  editor: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  viewer: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${STYLES[role]}`}>
      {role === "viewer" ? "View only" : role}
    </span>
  );
}

import type { Role } from "@/lib/types";

const STYLES: Record<Role, [string, string]> = {
  owner: ["Owner", "bg-brand-50 text-brand-700 ring-brand-100"],
  editor: ["Editor", "bg-emerald-50 text-emerald-700 ring-emerald-100"],
  viewer: ["View only", "bg-slate-100 text-slate-600 ring-slate-200"],
};

export function RoleBadge({ role }: { role: Role }) {
  const [label, cls] = STYLES[role];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${cls}`}>{label}</span>;
}

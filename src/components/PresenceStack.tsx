import { Pencil } from "lucide-react";
import type { ActiveUser } from "@/lib/types";
import { Avatar } from "./ui/Avatar";

const MAX = 4;

export function PresenceStack({ active }: { active: ActiveUser[] }) {
  const others = active.filter((a) => !a.self);
  if (others.length === 0) return null;
  const shown = others.slice(0, MAX);
  return (
    <div className="flex items-center gap-2" data-testid="presence" aria-label="People here now">
      <span className="hidden text-xs text-slate-500 lg:inline">Here now</span>
      <div className="flex -space-x-1">
        {shown.map(({ user, mode }) => (
          <span key={user.id} className="relative" title={`${user.name} · ${mode}`}>
            <Avatar id={user.email} name={user.name} ring />
            <span
              className={`absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full ring-2 ring-white ${
                mode === "editing" ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              {mode === "editing" && <Pencil className="size-2 text-white" strokeWidth={3} />}
            </span>
            <span className="sr-only">
              {user.name} is {mode}
            </span>
          </span>
        ))}
        {others.length > MAX && (
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600 ring-2 ring-white">
            +{others.length - MAX}
          </span>
        )}
      </div>
    </div>
  );
}

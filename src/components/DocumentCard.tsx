import Link from "next/link";
import { timeAgo } from "@/lib/time";
import type { DocumentSummary } from "@/lib/types";
import { RoleBadge } from "./RoleBadge";
import { Avatar } from "./ui/Avatar";

export function DocumentCard({ doc }: { doc: DocumentSummary }) {
  return (
    <Link
      href={`/documents/${doc.id}`}
      aria-label={doc.title}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20"
    >
      <div aria-hidden className="relative h-28 overflow-hidden border-b border-slate-100 bg-slate-50/70 px-4 pt-3.5">
        {doc.excerpt ? (
          <p className="line-clamp-5 text-[10.5px] leading-[1.45] text-slate-500">{doc.excerpt}</p>
        ) : (
          <p className="text-[11px] italic text-slate-400">Empty document</p>
        )}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-50 to-transparent" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-medium leading-snug text-slate-900 group-hover:text-brand-700">{doc.title}</h3>
        <div className="mt-auto flex items-center gap-2 text-xs text-slate-500">
          {doc.role !== "owner" && <Avatar id={doc.owner.email} name={doc.owner.name} size="sm" />}
          <span className="min-w-0 flex-1 truncate" suppressHydrationWarning>
            {doc.role !== "owner" ? `${doc.owner.name.split(" ")[0]} · ` : ""}
            {timeAgo(doc.updatedAt)}
          </span>
          <RoleBadge role={doc.role} />
        </div>
      </div>
    </Link>
  );
}

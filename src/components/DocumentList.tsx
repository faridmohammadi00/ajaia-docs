import Link from "next/link";
import type { DocumentSummary } from "@/lib/types";
import { RoleBadge } from "./RoleBadge";

const dateFmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

interface Props {
  title: string;
  docs: DocumentSummary[];
  empty: string;
  testId: string;
}

export function DocumentList({ title, docs, empty, testId }: Props) {
  return (
    <section data-testid={testId}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title} <span className="font-normal">({docs.length})</span>
      </h2>
      {docs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {docs.map((d) => (
            <li key={d.id}>
              <Link
                href={`/documents/${d.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{d.title}</span>
                {d.role !== "owner" && (
                  <span className="hidden text-sm text-slate-500 sm:inline">by {d.owner.name}</span>
                )}
                <RoleBadge role={d.role} />
                <time className="w-40 shrink-0 text-right text-xs text-slate-500" dateTime={d.updatedAt}>
                  {dateFmt.format(new Date(d.updatedAt))}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

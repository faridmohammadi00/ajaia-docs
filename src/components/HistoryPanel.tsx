"use client";

import type { JSONContent } from "@tiptap/core";
import { History, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatDate, timeAgo } from "@/lib/time";
import type { RevisionSummary } from "@/lib/types";
import { Avatar } from "./ui/Avatar";

export interface RevisionPreview {
  id: string;
  version: number;
  content: JSONContent;
  label: string;
}

interface Props {
  docId: string;
  selectedId: string | null;
  beforeLoad: () => Promise<unknown>;
  onSelect: (preview: RevisionPreview | null) => void;
  onClose: () => void;
}

export function HistoryPanel({ docId, selectedId, beforeLoad, onSelect, onClose }: Props) {
  const [items, setItems] = useState<RevisionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    beforeLoad()
      .catch(() => {})
      .then(() => api<RevisionSummary[]>(`/api/documents/${docId}/revisions`))
      .then((list) => alive && setItems(list))
      .catch((err) => alive && setError((err as Error).message));
    return () => {
      alive = false;
    };
  }, [docId, beforeLoad]);

  async function select(rev: RevisionSummary, isCurrent: boolean) {
    if (isCurrent) return onSelect(null);
    setLoadingId(rev.id);
    try {
      const full = await api<{ content: JSONContent }>(`/api/documents/${docId}/revisions/${rev.id}`);
      onSelect({
        id: rev.id,
        version: rev.version,
        content: full.content,
        label: `${rev.author.name} · ${formatDate(rev.updatedAt)}`,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <aside
      aria-label="Version history"
      className="animate-slide-in fixed bottom-0 right-0 top-16 z-20 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <History className="size-4 text-slate-500" />
        <h2 className="flex-1 font-semibold">Version history</h2>
        <button className="icon-btn" aria-label="Close history" onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>
      <p className="border-b border-slate-100 px-4 py-2.5 text-xs text-slate-500">
        Edits by the same person within 5 minutes are grouped into one version.
      </p>

      <div className="flex-1 overflow-y-auto p-2" data-testid="history-list">
        {error && <p className="p-3 text-sm text-red-600">{error}</p>}
        {!items && !error && (
          <div className="space-y-2 p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        )}
        {items?.length === 0 && <p className="p-3 text-sm text-slate-500">No saved versions yet.</p>}
        <ol className="space-y-1">
          {items?.map((rev, i) => {
            const isCurrent = i === 0;
            const selected = isCurrent ? selectedId === null : selectedId === rev.id;
            return (
              <li key={rev.id}>
                <button
                  onClick={() => select(rev, isCurrent)}
                  aria-current={selected}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    selected ? "bg-brand-50 ring-1 ring-brand-100" : "hover:bg-slate-50"
                  }`}
                >
                  <Avatar id={rev.author.email} name={rev.author.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <span title={formatDate(rev.updatedAt)}>{timeAgo(rev.updatedAt)}</span>
                      {isCurrent && (
                        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          Current
                        </span>
                      )}
                      {rev.restored && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          <RotateCcw className="size-2.5" /> Restored
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {rev.author.name} · v{rev.version}
                      {loadingId === rev.id && " · loading…"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}

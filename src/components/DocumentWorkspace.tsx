"use client";

import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { baseExtensions } from "@/lib/editor/extensions";
import type { DocumentView, PublicUser } from "@/lib/types";
import { RoleBadge } from "./RoleBadge";
import { ShareDialog } from "./ShareDialog";
import { TitleInput } from "./TitleInput";
import { Toolbar } from "./Toolbar";
import { useAutosave, type SaveStatus } from "./useAutosave";

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "All changes saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Save failed",
  conflict: "Not saved",
};

export function DocumentWorkspace({ doc, candidates }: { doc: DocumentView; candidates: PublicUser[] }) {
  const router = useRouter();
  const editable = doc.role !== "viewer";
  const [shareOpen, setShareOpen] = useState(false);

  const editor = useEditor({
    extensions: [...baseExtensions, Placeholder.configure({ placeholder: "Start writing…" })],
    content: doc.content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "doc-content", "aria-label": "Document content", "data-testid": "editor" },
    },
  });
  const { status, error, retry } = useAutosave(doc.id, doc.version, editable ? editor : null);

  async function remove() {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await api(`/api/documents/${doc.id}`, { method: "DELETE" });
      router.replace("/");
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <main className="mx-auto max-w-[880px] px-4 pb-24 pt-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <TitleInput docId={doc.id} initial={doc.title} editable={editable} />
        <RoleBadge role={doc.role} />
        <div className="ml-auto flex items-center gap-2">
          {editable && (
            <span
              data-testid="save-status"
              data-status={status}
              className={`text-xs ${status === "error" || status === "conflict" ? "text-red-600" : "text-slate-500"}`}
            >
              {STATUS_TEXT[status]}
            </span>
          )}
          <a className="btn" href={`/api/documents/${doc.id}/export`} title="Download as Markdown">
            Export .md
          </a>
          {doc.role === "owner" && (
            <>
              <button className="btn" onClick={remove}>
                Delete
              </button>
              <button className="btn-primary" onClick={() => setShareOpen(true)}>
                Share
              </button>
            </>
          )}
        </div>
      </div>

      {doc.role !== "owner" && (
        <p className="mb-3 text-sm text-slate-500">
          Shared with you by <span className="font-medium text-slate-700">{doc.owner.name}</span>
          {doc.role === "viewer" && " · you can view but not edit"}
        </p>
      )}

      {(status === "error" || status === "conflict") && error && (
        <div role="alert" className="mb-3 flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="flex-1">{error}</span>
          {status === "error" ? (
            <button className="btn" onClick={retry}>
              Retry
            </button>
          ) : (
            <button className="btn" onClick={() => window.location.reload()}>
              Reload
            </button>
          )}
        </div>
      )}

      {editable && editor && (
        <div className="sticky top-16 z-10 mb-3">
          <Toolbar editor={editor} />
        </div>
      )}

      <article className="rounded-lg border border-slate-200 bg-white px-8 py-10 shadow-sm sm:px-16">
        <EditorContent editor={editor} />
      </article>

      {shareOpen && <ShareDialog doc={doc} candidates={candidates} onClose={() => setShareOpen(false)} />}
    </main>
  );
}

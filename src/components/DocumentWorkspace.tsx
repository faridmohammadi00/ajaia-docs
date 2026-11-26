"use client";

import type { JSONContent } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  ArrowLeft,
  CloudOff,
  CloudCheck,
  Download,
  Eye,
  History,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { baseExtensions } from "@/lib/editor/extensions";
import type { DocumentView, PresenceState, PublicUser } from "@/lib/types";
import { HistoryPanel, type RevisionPreview } from "./HistoryPanel";
import { RoleBadge } from "./RoleBadge";
import { ShareDialog } from "./ShareDialog";
import { TitleInput } from "./TitleInput";
import { Toolbar } from "./Toolbar";
import { PresenceStack } from "./PresenceStack";
import { Avatar } from "./ui/Avatar";
import { ConfirmDialog } from "./ui/Modal";
import { useToast } from "./ui/Toast";
import { useAutosave, type SaveStatus } from "./useAutosave";
import { usePresence } from "./usePresence";

const STATUS: Record<SaveStatus, { text: string; icon: typeof CloudCheck; cls: string }> = {
  saved: { text: "Saved", icon: CloudCheck, cls: "text-slate-500" },
  unsaved: { text: "Unsaved changes", icon: LoaderCircle, cls: "text-slate-500" },
  saving: { text: "Saving…", icon: LoaderCircle, cls: "text-slate-500" },
  error: { text: "Save failed", icon: CloudOff, cls: "text-red-600" },
  conflict: { text: "Not saved", icon: CloudOff, cls: "text-red-600" },
};

interface Props {
  doc: DocumentView;
  candidates: PublicUser[];
  me: PublicUser;
}

export function DocumentWorkspace({ doc, candidates, me }: Props) {
  const router = useRouter();
  const toast = useToast();
  const editable = doc.role !== "viewer";
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [preview, setPreview] = useState<RevisionPreview | null>(null);
  const [confirm, setConfirm] = useState<"delete" | "restore" | null>(null);
  const [remote, setRemote] = useState<string | null>(null);
  const viewerVersion = useRef(doc.version);
  const lastEditAt = useRef(0);

  const editor = useEditor({
    extensions: [...baseExtensions, Placeholder.configure({ placeholder: "Start writing…" })],
    content: doc.content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "doc-content", "aria-label": "Document content", "data-testid": "editor" },
    },
  });
  const { status, error, flush, applyRemote, sync } = useAutosave(doc.id, doc.version, editable ? editor : null);
  const currentVersion = () => (editable ? sync.version() : viewerVersion.current);

  async function loadLatest() {
    try {
      const latest = await api<DocumentView>(`/api/documents/${doc.id}`);
      if (editable) applyRemote(latest.content, latest.version);
      else {
        editor?.commands.setContent(latest.content, { emitUpdate: false });
        viewerVersion.current = latest.version;
      }
      setRemote(null);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  function onPresence(state: PresenceState) {
    if (state.version <= currentVersion() || state.updatedBy?.id === me.id) return;
    const by = state.updatedBy?.name ?? "Someone";
    // Never overwrite what the user is typing; ask instead.
    if (editable && (sync.busy() || editor?.isFocused)) setRemote(by);
    else loadLatest();
  }

  const active = usePresence(
    doc.id,
    () => (editable && Date.now() - lastEditAt.current < 30_000 ? "editing" : "viewing"),
    onPresence,
  );
  const othersEditing = active.filter((a) => !a.self && a.mode === "editing");

  useEffect(() => {
    if (!editor) return;
    const mark = () => (lastEditAt.current = Date.now());
    editor.on("update", mark);
    return () => {
      editor.off("update", mark);
    };
  }, [editor]);
  const [words, setWords] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const count = () => {
      const d = editor.state.doc;
      setWords(d.textBetween(0, d.content.size, " ").split(/\s+/).filter(Boolean).length);
    };
    count();
    editor.on("update", count);
    return () => {
      editor.off("update", count);
    };
  }, [editor]);

  async function remove() {
    try {
      await api(`/api/documents/${doc.id}`, { method: "DELETE" });
      toast("Document deleted");
      router.replace("/");
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  async function restore() {
    if (!preview) return;
    try {
      await flush();
      await api(`/api/documents/${doc.id}/revisions/${preview.id}/restore`, { method: "POST" });
      toast("Version restored");
      window.location.reload();
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  const s = STATUS[status];
  const busy = status === "saving" || status === "unsaved";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <Link href="/" className="icon-btn" aria-label="Back to documents" title="Back to documents">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <TitleInput docId={doc.id} initial={doc.title} editable={editable} />
            <div className="flex items-center gap-2 px-2 text-xs">
              <RoleBadge role={doc.role} />
              {editable ? (
                <span data-testid="save-status" data-status={status} className={`inline-flex items-center gap-1 ${s.cls}`}>
                  <s.icon className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
                  {s.text}
                </span>
              ) : (
                <span className="truncate text-slate-500">Shared by {doc.owner.name}</span>
              )}
              {othersEditing.length > 0 && (
                <span className="hidden items-center gap-1 truncate text-emerald-700 sm:inline-flex" data-testid="editing-now">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {othersEditing.map((a) => a.user.name.split(" ")[0]).join(", ")}{" "}
                  {othersEditing.length === 1 ? "is" : "are"} editing
                </span>
              )}
            </div>
          </div>

          <PresenceStack active={active} />
          <button
            className={`icon-btn ${historyOpen ? "bg-slate-100 text-slate-900" : ""}`}
            aria-label="Version history"
            title="Version history"
            onClick={() => {
              setHistoryOpen((o) => !o);
              setPreview(null);
            }}
          >
            <History className="size-4" />
          </button>
          <a className="icon-btn" href={`/api/documents/${doc.id}/export`} aria-label="Export as Markdown" title="Export as Markdown">
            <Download className="size-4" />
          </a>
          {doc.role === "owner" && (
            <>
              <button className="icon-btn hover:text-red-600" aria-label="Delete document" title="Delete document" onClick={() => setConfirm("delete")}>
                <Trash2 className="size-4" />
              </button>
              <button className="btn-primary" onClick={() => setShareOpen(true)}>
                <Share2 className="size-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </>
          )}
          <span className="hidden sm:block">
            <Avatar id={me.email} name={me.name} />
          </span>
        </div>
      </header>

      <div className={`transition-[padding] ${historyOpen ? "lg:pr-96" : ""}`}>
      <main className="mx-auto max-w-[860px] px-3 pb-28 pt-5 sm:px-6">
        {remote && status !== "conflict" && (
          <div role="status" className="mb-4 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
            <RefreshCw className="size-4 shrink-0" />
            <span className="flex-1">
              {remote} made changes.{" "}
              {status === "saved" ? "Load them when you are ready." : "Loading them will discard your unsaved edits."}
            </span>
            <button className="btn" onClick={loadLatest}>
              Load latest
            </button>
          </div>
        )}

        {(status === "error" || status === "conflict") && error && (
          <div role="alert" className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <CloudOff className="size-4 shrink-0" />
            <span className="flex-1">{error}</span>
            {status === "error" ? (
              <button className="btn" onClick={flush}>
                Retry
              </button>
            ) : (
              <button className="btn" onClick={loadLatest}>
                Load latest
              </button>
            )}
          </div>
        )}

        {!editable && !preview && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600">
            <Eye className="size-4 text-slate-400" />
            Shared with you by <span className="font-medium text-slate-800">{doc.owner.name}</span>. You can view but not edit.
          </div>
        )}

        {preview && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <History className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              Viewing an earlier version · <span className="font-medium">{preview.label}</span>
            </span>
            <button className="btn" onClick={() => setPreview(null)}>
              Back to current
            </button>
            {editable && (
              <button className="btn-primary" onClick={() => setConfirm("restore")}>
                <RotateCcw className="size-4" /> Restore this version
              </button>
            )}
          </div>
        )}

        {editable && editor && !preview && (
          <div className="sticky top-[4.5rem] z-20 mb-4 flex justify-center">
            <Toolbar editor={editor} />
          </div>
        )}

        <article className="rounded-2xl border border-slate-200/80 bg-white px-6 py-10 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] sm:px-16 sm:py-14">
          <div hidden={Boolean(preview)}>
            <EditorContent editor={editor} />
          </div>
          {preview && <PreviewContent key={preview.id} content={preview.content} />}
        </article>
      </main>
      </div>

      <div className="pointer-events-none fixed bottom-4 left-4 hidden rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs text-slate-500 shadow-xs backdrop-blur sm:block">
        {words} {words === 1 ? "word" : "words"}
      </div>

      {historyOpen && (
        <HistoryPanel
          docId={doc.id}
          selectedId={preview?.id ?? null}
          beforeLoad={flush}
          onSelect={setPreview}
          onClose={() => {
            setHistoryOpen(false);
            setPreview(null);
          }}
        />
      )}

      {shareOpen && (
        <ShareDialog
          doc={doc}
          candidates={candidates}
          onClose={() => setShareOpen(false)}
        />
      )}

      {confirm === "delete" && (
        <ConfirmDialog
          title="Delete document?"
          message={`"${doc.title}" and its history will be permanently deleted for everyone it is shared with.`}
          confirmLabel="Delete"
          danger
          onConfirm={remove}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "restore" && preview && (
        <ConfirmDialog
          title="Restore this version?"
          message="The current content will be replaced. It stays in the history, so you can switch back at any time."
          confirmLabel="Restore"
          onConfirm={restore}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function PreviewContent({ content }: { content: JSONContent }) {
  const editor = useEditor({
    extensions: baseExtensions,
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { class: "doc-content", "data-testid": "preview" } },
  });
  return <EditorContent editor={editor} />;
}

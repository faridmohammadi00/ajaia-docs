"use client";

import { FilePlus, Search, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { DocumentSummary, PublicUser } from "@/lib/types";
import { DocumentCard } from "./DocumentCard";
import { useToast } from "./ui/Toast";

const ACCEPT = ".txt,.md,.markdown,.docx";
const MAX_BYTES = 2 * 1024 * 1024;

interface Props {
  user: PublicUser;
  owned: DocumentSummary[];
  shared: DocumentSummary[];
}

export function Dashboard({ user, owned, shared }: Props) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<"create" | "import" | null>(null);
  const [dragging, setDragging] = useState(false);

  const filter = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (docs: DocumentSummary[]) =>
      q ? docs.filter((d) => d.title.toLowerCase().includes(q) || d.owner.name.toLowerCase().includes(q)) : docs;
  }, [query]);

  async function run(kind: "create" | "import", fn: () => Promise<{ id: string }>) {
    setBusy(kind);
    try {
      const { id } = await fn();
      router.push(`/documents/${id}`);
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(null);
    }
  }

  function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) return toast("File is too large (max 2 MB)", "error");
    const body = new FormData();
    body.append("file", file);
    run("import", () => api("/api/documents/import", { method: "POST", body }));
  }

  const firstName = user.name.split(" ")[0];

  return (
    <main
      className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        importFile(e.dataTransfer.files[0]);
      }}
    >
      {dragging && (
        <div className="pointer-events-none fixed inset-4 z-40 flex items-center justify-center rounded-3xl border-2 border-dashed border-brand-500 bg-brand-50/90 text-brand-700">
          <div className="text-center">
            <Upload className="mx-auto mb-2 size-8" />
            <p className="font-semibold">Drop to import as a new document</p>
            <p className="text-sm">.txt, .md or .docx, up to 2 MB</p>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm text-slate-500">Create a document, import a file, or pick up where you left off.</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn"
            disabled={busy !== null}
            onClick={() => fileRef.current?.click()}
            title="Supported: .txt, .md, .docx (max 2 MB). You can also drag a file onto the page."
          >
            <Upload className="size-4" />
            {busy === "import" ? "Importing…" : "Import"}
          </button>
          <button
            className="btn-primary"
            disabled={busy !== null}
            onClick={() => run("create", () => api("/api/documents", { method: "POST", body: "{}" }))}
          >
            <FilePlus className="size-4" />
            {busy === "create" ? "Creating…" : "New document"}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          data-testid="import-input"
          onChange={(e) => {
            importFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="relative mb-8 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          aria-label="Search documents"
          placeholder="Search by title or owner"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input pl-9"
        />
      </div>

      <Section
        title="My documents"
        docs={filter(owned)}
        empty={query ? "No matches." : "No documents yet. Create one, or drop a .txt, .md or .docx file here."}
        testId="owned-docs"
      />
      <Section
        title="Shared with me"
        docs={filter(shared)}
        empty={query ? "No matches." : "When someone shares a document with you, it shows up here."}
        testId="shared-docs"
      />
      <p className="mt-10 text-xs text-slate-400">Import supports .txt, .md and .docx files up to 2 MB.</p>
    </main>
  );
}

function Section({ title, docs, empty, testId }: { title: string; docs: DocumentSummary[]; empty: string; testId: string }) {
  return (
    <section data-testid={testId} className="mb-10">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {title}
        <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-600">{docs.length}</span>
      </h2>
      {docs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {docs.map((d) => (
            <li key={d.id}>
              <DocumentCard doc={d} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

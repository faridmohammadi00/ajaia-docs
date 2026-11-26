"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api-client";

const ACCEPT = ".txt,.md,.markdown,.docx";

export function DashboardActions() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"create" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "create" | "import", fn: () => Promise<{ id: string }>) {
    setBusy(kind);
    setError(null);
    try {
      const { id } = await fn();
      router.push(`/documents/${id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("File is too large (max 2 MB)");
      return;
    }
    const body = new FormData();
    body.append("file", file);
    run("import", () => api("/api/documents/import", { method: "POST", body }));
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <button
          className="btn"
          disabled={busy !== null}
          onClick={() => fileRef.current?.click()}
          title="Supported: .txt, .md, .docx (max 2 MB)"
        >
          {busy === "import" ? "Importing…" : "Import file"}
        </button>
        <button
          className="btn-primary"
          disabled={busy !== null}
          onClick={() => run("create", () => api("/api/documents", { method: "POST", body: "{}" }))}
        >
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
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-slate-500">Import supports .txt, .md and .docx up to 2 MB.</p>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

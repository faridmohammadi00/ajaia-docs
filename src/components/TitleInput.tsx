"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api-client";

export function TitleInput({ docId, initial, editable }: { docId: string; initial: string; editable: boolean }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(initial);

  async function commit() {
    const next = value.trim();
    if (!next) {
      setValue(saved.current);
      setError("Title cannot be empty");
      return;
    }
    if (next === saved.current) return;
    try {
      const res = await api<{ title: string }>(`/api/documents/${docId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: next }),
      });
      saved.current = res.title;
      setValue(res.title);
      setError(null);
      document.title = `${res.title} · Ajaia Docs`;
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!editable) return <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">{initial}</h1>;

  return (
    <div className="min-w-0 flex-1">
      <input
        aria-label="Document title"
        value={value}
        maxLength={200}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setValue(saved.current);
            e.currentTarget.blur();
          }
        }}
        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-xl font-semibold outline-none hover:border-slate-300 focus:border-blue-500 focus:bg-white"
      />
      {error && <p className="px-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

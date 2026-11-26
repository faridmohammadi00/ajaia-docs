"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { DocumentView, PublicUser, ShareRole, ShareView } from "@/lib/types";

interface Props {
  doc: DocumentView;
  candidates: PublicUser[];
  onClose: () => void;
}

export function ShareDialog({ doc, candidates, onClose }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [shares, setShares] = useState<ShareView[]>(doc.shares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("editor");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const available = candidates.filter((c) => !shares.some((s) => s.user.id === c.id));

  async function upsert(targetEmail: string, targetRole: ShareRole) {
    setPending(true);
    setError(null);
    try {
      const res = await api<ShareView>(`/api/documents/${doc.id}/shares`, {
        method: "POST",
        body: JSON.stringify({ email: targetEmail, role: targetRole }),
      });
      setShares((prev) => [...prev.filter((s) => s.user.id !== res.user.id), res]);
      setEmail("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function revoke(userId: string) {
    setError(null);
    try {
      await api(`/api/documents/${doc.id}/shares/${userId}`, { method: "DELETE" });
      setShares((prev) => prev.filter((s) => s.user.id !== userId));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="share-title"
      className="m-auto w-full max-w-md rounded-xl p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="p-5">
        <h2 id="share-title" className="mb-4 text-lg font-semibold">
          Share “{doc.title}”
        </h2>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            upsert(email, role);
          }}
        >
          <input
            type="email"
            required
            list="share-candidates"
            placeholder="name@ajaia.dev"
            aria-label="Email to share with"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input flex-1"
          />
          <datalist id="share-candidates">
            {available.map((c) => (
              <option key={c.id} value={c.email}>
                {c.name}
              </option>
            ))}
          </datalist>
          <select
            aria-label="Access level"
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            className="input w-auto"
          >
            <option value="editor">Can edit</option>
            <option value="viewer">Can view</option>
          </select>
          <button type="submit" className="btn-primary" disabled={pending}>
            Share
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">People with access</h3>
        <ul className="divide-y divide-slate-100 text-sm" data-testid="share-list">
          <li className="flex items-center justify-between py-2">
            <span>
              <span className="font-medium">{doc.owner.name}</span>{" "}
              <span className="text-slate-500">{doc.owner.email}</span>
            </span>
            <span className="text-slate-500">Owner</span>
          </li>
          {shares.map((s) => (
            <li key={s.user.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{s.user.name}</span>{" "}
                <span className="text-slate-500">{s.user.email}</span>
              </span>
              <select
                aria-label={`Access for ${s.user.name}`}
                value={s.role}
                onChange={(e) => upsert(s.user.email, e.target.value as ShareRole)}
                className="rounded-md border border-slate-200 px-1 py-1 text-sm"
              >
                <option value="editor">Can edit</option>
                <option value="viewer">Can view</option>
              </select>
              <button
                className="text-sm text-red-600 hover:underline"
                onClick={() => revoke(s.user.id)}
                aria-label={`Remove ${s.user.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end">
          <button className="btn" onClick={() => ref.current?.close()}>
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}

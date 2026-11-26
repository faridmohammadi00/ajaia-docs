"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { DocumentView, PublicUser, ShareRole, ShareView } from "@/lib/types";
import { Avatar } from "./ui/Avatar";
import { Modal } from "./ui/Modal";
import { useToast } from "./ui/Toast";

interface Props {
  doc: DocumentView;
  candidates: PublicUser[];
  onChange: (shares: ShareView[]) => void;
  onClose: () => void;
}

export function ShareDialog({ doc, candidates, onChange, onClose }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [shares, setShares] = useState<ShareView[]>(doc.shares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("editor");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const available = candidates.filter((c) => !shares.some((s) => s.user.id === c.id));

  function update(next: ShareView[]) {
    setShares(next);
    onChange(next);
    router.refresh();
  }

  async function upsert(targetEmail: string, targetRole: ShareRole) {
    setPending(true);
    setError(null);
    try {
      const res = await api<ShareView>(`/api/documents/${doc.id}/shares`, {
        method: "POST",
        body: JSON.stringify({ email: targetEmail, role: targetRole }),
      });
      const exists = shares.some((s) => s.user.id === res.user.id);
      update(exists ? shares.map((s) => (s.user.id === res.user.id ? res : s)) : [...shares, res]);
      setEmail("");
      toast(exists ? `${res.user.name} can now ${res.role === "editor" ? "edit" : "view"}` : `Shared with ${res.user.name}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function revoke(user: PublicUser) {
    setError(null);
    try {
      await api(`/api/documents/${doc.id}/shares/${user.id}`, { method: "DELETE" });
      update(shares.filter((s) => s.user.id !== user.id));
      toast(`Removed ${user.name}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Modal title={`Share “${doc.title}”`} onClose={onClose} width="max-w-lg" footer={<CloseButton />}>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          upsert(email, role);
        }}
      >
        <input
          type="email"
          required
          list="share-candidates"
          placeholder="Add people by email"
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
        <div className="flex gap-2">
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
            <UserPlus className="size-4" /> Share
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {available.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {available.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setEmail(c.email)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 py-0.5 pl-0.5 pr-2.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              <Avatar id={c.email} name={c.name} size="sm" />
              {c.name}
            </button>
          ))}
        </div>
      )}

      <h3 className="mb-1 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">People with access</h3>
      <ul className="divide-y divide-slate-100" data-testid="share-list">
        <Person user={doc.owner}>
          <span className="text-sm text-slate-500">Owner</span>
        </Person>
        {shares.map((s) => (
          <Person key={s.user.id} user={s.user}>
            <select
              aria-label={`Access for ${s.user.name}`}
              value={s.role}
              onChange={(e) => upsert(s.user.email, e.target.value as ShareRole)}
              className="rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm text-slate-700 hover:border-slate-200"
            >
              <option value="editor">Can edit</option>
              <option value="viewer">Can view</option>
            </select>
            <button
              className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => revoke(s.user)}
              aria-label={`Remove ${s.user.name}`}
            >
              Remove
            </button>
          </Person>
        ))}
      </ul>
    </Modal>
  );
}

function Person({ user, children }: { user: PublicUser; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar id={user.email} name={user.name} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-medium">{user.name}</span>
        <span className="block truncate text-xs text-slate-500">{user.email}</span>
      </span>
      {children}
    </li>
  );
}

function CloseButton() {
  return (
    <form method="dialog">
      <button className="btn">Done</button>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";

interface Props {
  next: string;
  demoUsers: { email: string; name: string }[];
  demoPassword: string;
}

export function LoginForm({ next, demoUsers, demoPassword }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn(e: string, p: string) {
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: e, password: p }) });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          signIn(email, password);
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Demo accounts · password <code className="normal-case">{demoPassword}</code>
        </p>
        <div className="grid gap-2">
          {demoUsers.map((u) => (
            <button
              key={u.email}
              type="button"
              disabled={pending}
              onClick={() => signIn(u.email, demoPassword)}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
            >
              <span className="font-medium">{u.name}</span>
              <span className="text-slate-500">{u.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

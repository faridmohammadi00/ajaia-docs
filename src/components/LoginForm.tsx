"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api-client";
import { Avatar } from "./ui/Avatar";

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
        className="space-y-4"
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
        <button type="submit" disabled={pending} className="btn-primary h-10 w-full">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div>
        <div className="mb-3 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-200" />
          <span>
            Or continue as · password <code className="rounded bg-slate-100 px-1 py-0.5">{demoPassword}</code>
          </span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="grid gap-2">
          {demoUsers.map((u) => (
            <button
              key={u.email}
              type="button"
              disabled={pending}
              onClick={() => signIn(u.email, demoPassword)}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm shadow-xs transition hover:border-brand-500/40 hover:bg-brand-50/40 disabled:opacity-60"
            >
              <Avatar id={u.email} name={u.name} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{u.name}</span>
                <span className="block text-xs text-slate-500">{u.email}</span>
              </span>
              <ArrowRight className="size-4 text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

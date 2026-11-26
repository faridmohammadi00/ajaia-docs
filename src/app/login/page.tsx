import { FileText, History, Share2 } from "lucide-react";
import { Logo } from "@/components/AppHeader";
import { LoginForm } from "@/components/LoginForm";
import { SEED_PASSWORD, SEED_USERS } from "@/lib/db";

export const metadata = { title: "Sign in · Ajaia Docs" };

const FEATURES = [
  { icon: FileText, text: "Rich-text documents with autosave" },
  { icon: Share2, text: "Share as editor or viewer" },
  { icon: History, text: "Version history with one-click restore" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-violet-700 p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5 font-semibold">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white/15 font-bold">A</span>
          Ajaia Docs
        </div>
        <div className="my-auto max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Write together. Ship faster.</h2>
          <p className="mt-4 text-white/75">A focused editor for the documents your team actually works on.</p>
          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div aria-hidden className="absolute -bottom-32 -right-32 size-96 rounded-full bg-white/10 blur-3xl" />
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 font-semibold lg:hidden">
            <Logo /> Ajaia Docs
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">Use a demo account to explore sharing between users.</p>
          <LoginForm next={safeNext} demoUsers={SEED_USERS} demoPassword={SEED_PASSWORD} />
        </div>
      </section>
    </main>
  );
}

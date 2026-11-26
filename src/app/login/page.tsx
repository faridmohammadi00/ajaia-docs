import { LoginForm } from "@/components/LoginForm";
import { SEED_PASSWORD, SEED_USERS } from "@/lib/db";

export const metadata = { title: "Sign in · Ajaia Docs" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold">Ajaia Docs</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in with one of the demo accounts.</p>
        <LoginForm next={safeNext} demoUsers={SEED_USERS} demoPassword={SEED_PASSWORD} />
      </div>
    </main>
  );
}

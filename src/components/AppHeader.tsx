import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export function AppHeader({ userName, children }: { userName: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="shrink-0 font-semibold text-slate-900">
          Ajaia Docs
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
        <span className="hidden text-sm text-slate-500 sm:inline">{userName}</span>
        <SignOutButton />
      </div>
    </header>
  );
}

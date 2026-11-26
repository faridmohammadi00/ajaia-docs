import Link from "next/link";
import { Avatar } from "./ui/Avatar";
import { SignOutButton } from "./SignOutButton";

export function Logo() {
  return (
    <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white shadow-sm">
      A
    </span>
  );
}

export function AppHeader({ user }: { user: { id: string; name: string; email: string } }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-slate-900">
          <Logo />
          <span>Ajaia Docs</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-slate-500">{user.email}</div>
          </div>
          <Avatar id={user.email} name={user.name} />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

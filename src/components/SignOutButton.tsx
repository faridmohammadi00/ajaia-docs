"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="icon-btn"
      title="Sign out"
      aria-label="Sign out"
      onClick={async () => {
        await api("/api/auth/logout", { method: "POST" }).catch(() => {});
        router.replace("/login");
        router.refresh();
      }}
    >
      <LogOut className="size-4" />
    </button>
  );
}

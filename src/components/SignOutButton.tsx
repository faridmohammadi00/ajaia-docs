"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="btn"
      onClick={async () => {
        await api("/api/auth/logout", { method: "POST" }).catch(() => {});
        router.replace("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}

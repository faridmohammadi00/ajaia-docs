"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { ActiveUser, PresenceMode, PresenceState } from "@/lib/types";

const HEARTBEAT_MS = 10_000;

// Heartbeat-based presence: Vercel functions cannot hold WebSockets, so clients poll.
export function usePresence(
  docId: string,
  getMode: () => PresenceMode,
  onState: (state: PresenceState) => void,
) {
  const [active, setActive] = useState<ActiveUser[]>([]);
  const latest = useRef({ getMode, onState });
  latest.current = { getMode, onState };

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const beat = async () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") {
        try {
          const state = await api<PresenceState>(`/api/documents/${docId}/presence`, {
            method: "POST",
            body: JSON.stringify({ mode: latest.current.getMode() }),
          });
          if (stopped) return;
          setActive(state.active);
          latest.current.onState(state);
        } catch {
          // Presence is best-effort; the next beat retries.
        }
      }
      if (!stopped) timer = setTimeout(beat, HEARTBEAT_MS);
    };

    const onVisible = () => document.visibilityState === "visible" && beat();
    const leave = () =>
      fetch(`/api/documents/${docId}/presence`, { method: "DELETE", keepalive: true }).catch(() => {});

    beat();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", leave);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [docId]);

  return active;
}

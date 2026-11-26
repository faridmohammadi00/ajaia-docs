"use client";

import type { Editor, JSONContent } from "@tiptap/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api-client";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";

const DEBOUNCE_MS = 800;

export function useAutosave(docId: string, initialVersion: number, editor: Editor | null) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const version = useRef(initialVersion);
  const dirty = useRef(false);
  const inFlight = useRef(false);
  const blocked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!editor || inFlight.current || !dirty.current || blocked.current) return;
    dirty.current = false;
    inFlight.current = true;
    setStatus("saving");
    try {
      const res = await api<{ version: number }>(`/api/documents/${docId}`, {
        method: "PATCH",
        body: JSON.stringify({ content: editor.getJSON(), version: version.current }),
      });
      version.current = res.version;
      setError(null);
      setStatus(dirty.current ? "unsaved" : "saved");
    } catch (err) {
      const e = err as ApiError;
      setError(e.message);
      if (e.status === 409 || e.status === 403) {
        blocked.current = true;
        setStatus("conflict");
      } else {
        dirty.current = true;
        setStatus("error");
      }
    } finally {
      inFlight.current = false;
    }
    // Edits made while the request was in flight.
    if (dirty.current && !blocked.current) timer.current = setTimeout(flush, DEBOUNCE_MS);
  }, [docId, editor]);

  const markDirty = useCallback(() => {
    if (blocked.current) return;
    dirty.current = true;
    setStatus("unsaved");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, DEBOUNCE_MS);
  }, [flush]);

  useEffect(() => {
    if (!editor) return;
    editor.on("update", markDirty);
    return () => {
      editor.off("update", markDirty);
    };
  }, [editor, markDirty]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        flush();
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || inFlight.current) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [flush]);

  // Best-effort save when navigating away inside the app.
  useEffect(() => {
    return () => {
      clearTimeout(timer.current);
      if (!editor || !dirty.current || blocked.current || inFlight.current) return;
      const content: JSONContent = editor.getJSON();
      fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, version: version.current }),
      }).catch(() => {});
    };
  }, [docId, editor]);

  // Replaces content with a newer server version without triggering a save.
  const applyRemote = useCallback(
    (content: JSONContent, nextVersion: number) => {
      if (!editor) return;
      clearTimeout(timer.current);
      editor.commands.setContent(content, { emitUpdate: false });
      version.current = nextVersion;
      dirty.current = false;
      blocked.current = false;
      setError(null);
      setStatus("saved");
    },
    [editor],
  );

  const sync = {
    version: () => version.current,
    busy: () => dirty.current || inFlight.current,
  };

  return { status, error, flush, applyRemote, sync };
}

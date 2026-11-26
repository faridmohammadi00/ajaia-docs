# Architecture note

## Goal and approach

The brief asks for a coherent slice of a Google Docs-like product in a short timebox. I chose **depth over breadth**: a reliable editing and saving loop, real access control enforced on the server, and a useful import path, rather than a wide set of shallow features.

## Shape of the system

```
Browser (React + TipTap)
  │  JSON over fetch, httpOnly session cookie
  ▼
Next.js route handlers  ──  thin: parse input (Zod), call the service, map errors to HTTP
  ▼
lib/documents.ts        ──  every read/write goes through here; access rules live in one place
  ▼
MongoDB                 ──  users, documents (shares embedded)
```

- **One deployable.** Next.js serves pages and the API, which keeps setup and deployment to one step for reviewers. Pages are server components that call the service directly (no extra HTTP hop). Mutations go through JSON route handlers.
- **Service layer owns access control.** Route handlers never query the database. `lib/access.ts` defines roles once and also produces MongoDB filters, so permission checks are part of the query itself (`find({_id, ...readableBy(user)})`) instead of a separate check that can be forgotten.
- **Unreadable equals non-existent.** Users without access get 404, not 403, so document ids do not leak. Users with read access who try to write get 403 with a clear message.

## Data model

```ts
users     { _id, email (unique), name, passwordHash, createdAt }
documents { _id, ownerId, title, content (TipTap JSON), version,
            shares: [{ userId, role: "editor" | "viewer", addedAt }],
            createdAt, updatedAt }
```

Indexes: `users.email` (unique), `documents {ownerId, updatedAt}`, `documents {shares.userId, updatedAt}`. Both dashboard lists are served by indexes and sorted by recency. Content is excluded from list queries.

**Why embedded shares:** shares are small, always read with their document, and updated atomically with it. A separate collection would only pay off with thousands of collaborators per document or org/group sharing.

**Why MongoDB:** the editor's native format is a JSON tree, which is stored as is with no mapping layer. Atlas's free tier also gives reviewers a zero-cost deployment. Postgres with `jsonb` would have worked equally well.

## Key decisions

| Decision | Why |
|---|---|
| **TipTap (ProseMirror)** | Mature schema-based editor. Formatting is a structured document, not ad-hoc HTML, so it round-trips losslessly. |
| **Store ProseMirror JSON, not HTML** | Preserves structure exactly. The server validates every save against the **same schema the editor uses** (`Node.fromJSON(...).check()`), so malformed or injected content is rejected, and there is no stored-HTML XSS surface. |
| **Autosave + optimistic concurrency** | Each save sends the version it was based on. The update only matches `{_id, version}`, so two editors cannot silently overwrite each other. A stale write gets 409 and the UI offers a reload. This is the minimum correct behavior for shared editing without real-time sync. |
| **Debounced saves, one request in flight** | Typing produces at most one request every ~0.8 s, and edits made during a save are queued, not dropped. There is a warning on tab close with unsaved changes and a best-effort `keepalive` save on in-app navigation. |
| **Import pipeline: file → sanitized HTML → editor JSON** | `.md` via `marked`, `.docx` via `mammoth`, `.txt` escaped into paragraphs. Output is sanitized to an allow-list, then parsed by the editor schema on the server. Size (2 MB), type, magic bytes (`.docx`) and binary content are checked with specific error messages. |
| **Seeded users + signed JWT cookie** | The brief allows simulated users. Passwords are real bcrypt hashes and the cookie is httpOnly, SameSite=Lax, and signed. Middleware verifies the token at the edge for page redirects, and every API call re-checks the user. |
| **Zod at the boundary, typed errors inside** | Handlers parse input with Zod. Services throw `HttpError(status, message)`. A single mapper turns these into JSON responses, so error shapes are consistent and the UI can show `error` directly. |

## Performance notes

- Dashboard queries use indexes, project away document content, and resolve owner names with one batched `$in` lookup (no N+1).
- One cached MongoDB client per server instance, reused across warm serverless invocations.
- The toolbar subscribes to editor state through a selector (`useEditorState`), so typing does not re-render the whole page.
- The editor bundle is only loaded on the document route. The dashboard and login pages ship about 105 kB of JS.

## Deliberately out of scope

| Not built | Reason / what I would do |
|---|---|
| Real-time co-editing and presence | The biggest item in the space (CRDT via Yjs + a WebSocket provider). Optimistic versioning gives correct, if not live, multi-user behavior within the timebox. |
| Comments and suggestions | Needs anchored ranges that survive edits, which only makes sense on top of the real-time model. |
| Version history | The `version` counter is there. Next step: snapshot content every N versions into a `revisions` collection. |
| Real sign-up, password reset, orgs | Not what the exercise evaluates. Auth is isolated in `session.ts`, so it can be swapped for an IdP. |
| Attachments, images, tables | Would need object storage. Images would be the first addition. |

## What I would build next (2–4 hours)

1. Yjs-based real-time collaboration with presence avatars (replaces the 409 path for concurrent editors).
2. Version history with restore, built on the existing version counter.
3. Rate limiting on login and import, plus audit fields (`lastEditedBy`).
4. Import into an existing document (append at cursor) and `.docx` export.

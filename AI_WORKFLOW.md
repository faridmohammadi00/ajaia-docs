# AI workflow note

## Tools used

- **Claude Code** (agentic coding assistant in a cloud sandbox) for planning, scaffolding, implementation, tests, screenshots and first drafts of the docs.
- **Playwright** driven by the assistant to check the UI in a real browser and capture screenshots.

## Where AI materially sped things up

- **Planning:** turning the brief into a scoped plan (stack, data model, cuts, time budget) in minutes. I reviewed the plan and approved it before any code was written.
- **Boilerplate with known shape:** route handlers, Zod schemas, the TipTap toolbar, the share dialog, and the Markdown serializer.
- **Test scaffolding:** building a minimal `.docx` in-test with JSZip (so the import test needs no binary fixture), and the end-to-end spec.
- **Docs:** first drafts of README and this note, which I then edited.

## What I changed or rejected

- **Phantom autosave (caught by visual review).** A screenshot showed "Unsaved changes" right after clicking into an untouched document. The cause was TipTap's default `TrailingNode` extension, which appends a paragraph after a trailing list on the first transaction. That would have bumped the version and could cause false 409s for collaborators. I disabled it and reproduced the before and after with a scripted browser check.
- **Two more issues found in screenshot review:** the version history panel covered the document header actions, so I moved it below the header. The word counter stayed at 0 because the editor-state selector never ran again after the editor mounted, so I replaced it with an explicit `update` listener.
- **Presence design.** I rejected adding a hosted realtime service or WebSockets (not available on Vercel functions) in favor of heartbeats that also carry the latest version. A scripted two-browser check confirmed the key rule: incoming changes never replace text the user is typing. That user gets a prompt instead, and a stale save still gets a 409.
- **Edge runtime split.** The first draft imported the session module (which pulls in the MongoDB driver) into middleware. That module cannot run on the edge, so I split the token signing and verification into an edge-safe `session-token.ts`.
- **Error mapping in tests.** The service throws Zod errors for bad titles, and the first test asserted a `.status` that only route handlers add. Instead of patching the test, I made it reuse the exact `toErrorResponse` mapper the API uses, so the test checks real HTTP behavior.
- **Persistence choice.** The plan started with Postgres. I switched to MongoDB because the free Atlas cluster was the available zero-cost option, and the editor's JSON maps to it directly. I kept the access logic store-agnostic in `access.ts` and `documents.ts`.
- **Rejected suggestions:** storing editor HTML (XSS surface and lossy round-trips; I store schema-validated JSON instead), Google-hosted fonts (an extra network dependency at build time; the Geist font is bundled from npm instead), and a separate `shares` collection (unneeded joins at this scale).
- **Security hardening the AI did not add unprompted:** 404 instead of 403 for documents a user cannot read, a `next` redirect guard against `//evil.com`, magic-byte check for `.docx`, and NUL-byte detection for text imports.

## How correctness and quality were verified

- **Typecheck, lint and build** pass with no warnings.
- **16 unit and integration tests** (Vitest), including the document service against a real MongoDB: permission matrix, revoke, stale write rejection, and validation.
- **4 Playwright end-to-end tests** in Chromium covering the full user flow, file import, restoring a version written by another user, and two browsers seeing each other's presence and changes.
- **Manual API probing with curl** for every error path: 400, 401, 403, 404, 409, 413 and 415.
- **Visual review of screenshots** at each stage (login, dashboard, editor, share dialog, viewer mode). This is how the phantom save bug was found.
- **CI workflow** that reruns all of the above on each push.

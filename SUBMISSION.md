# Submission

## Links

- **Live app:** https://ajaia-docs-ecru-xi.vercel.app
- **Source:** https://github.com/faridmohammadi00/ajaia-docs
- **Walkthrough video:** https://youtu.be/E5SOW8ys03Q (also in `VIDEO_URL.txt`)

## Test accounts (password `ajaia-demo` for all)

| Email | Role in "Welcome to Ajaia Docs" |
|---|---|
| alice@ajaia.dev | Owner |
| bob@ajaia.dev | Editor |
| carol@ajaia.dev | Viewer |

Quick sharing check: sign in as Alice and open the welcome document, then sign in as Carol (viewer, read-only) and as Bob (editor).

## Included

| Item | Location |
|---|---|
| Source code | this folder (`src/`, `tests/`) |
| Setup and run instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| This file | `SUBMISSION.md` |
| Walkthrough video URL | `VIDEO_URL.txt` |
| Screenshots | `docs/screenshots/` |
| Automated tests | `tests/unit/` (Vitest), `tests/e2e/` (Playwright), CI in `.github/workflows/ci.yml` |
| Environment template | `.env.example` |

## Status

**Working end to end**
- Create, rename, edit, delete, and reopen documents. Autosave with save status and stale write protection.
- Rich text: bold, italic, underline, strikethrough, H1–H3, bulleted and numbered lists, quotes, undo and redo.
- Import of `.txt`, `.md` and `.docx` (max 2 MB) into a new document.
- Sharing by email with editor or viewer roles, role change and revoke. *My documents* and *Shared with me* lists. Read-only mode for viewers, enforced in the API.
- Persistence in MongoDB. Formatting is stored as structured editor JSON.
- Live presence: who is viewing or editing now, plus automatic pickup of other people's saves (stretch).
- Version history with preview and restore (stretch).
- Markdown export (stretch).

**Not included (deliberate)**
- Character-level co-editing with live cursors, comments, real sign-up, attachments and images. See `ARCHITECTURE.md` for the reasoning.

**Next with 2–4 more hours**
1. Character-level co-editing with Yjs and live cursors.
2. Visual diff between versions.
3. Rate limiting on login and import, and a "last edited by" field.

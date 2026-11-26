import type { JSONContent } from "@tiptap/core";
import type { ObjectId } from "mongodb";
import { canEdit, editableBy } from "./access";
import { collections } from "./db";
import { forbidden, HttpError } from "./errors";
import { excerptOf } from "./editor/text";
import { loadAccess, parseId, usersById } from "./documents";
import type { SessionUser } from "./session";
import type { PublicUser, RevisionSummary } from "./types";

// Consecutive saves by the same author within this window collapse into one history entry.
export const REVISION_WINDOW_MS = 5 * 60 * 1000;
const HISTORY_LIMIT = 100;

interface NewRevision {
  docId: ObjectId;
  authorId: ObjectId;
  version: number;
  title: string;
  content: JSONContent;
  restoredFrom?: ObjectId;
}

export async function recordRevision(rev: NewRevision, now = new Date()) {
  const { revisions } = await collections();
  if (!rev.restoredFrom) {
    const latest = await revisions.findOne(
      { docId: rev.docId },
      { sort: { updatedAt: -1 }, projection: { authorId: 1, createdAt: 1, restoredFrom: 1 } },
    );
    const mergeable =
      latest &&
      !latest.restoredFrom &&
      latest.authorId.equals(rev.authorId) &&
      now.getTime() - latest.createdAt.getTime() < REVISION_WINDOW_MS;
    if (mergeable) {
      await revisions.updateOne(
        { _id: latest._id },
        { $set: { version: rev.version, title: rev.title, content: rev.content, updatedAt: now } },
      );
      return;
    }
  }
  await revisions.insertOne({ ...rev, createdAt: now, updatedAt: now } as never);
}

const unknown = (id: ObjectId): PublicUser => ({ id: id.toHexString(), email: "", name: "Unknown user" });

export async function listRevisions(user: SessionUser, rawId: string): Promise<RevisionSummary[]> {
  const id = parseId(rawId);
  await loadAccess(user, id);
  const { revisions } = await collections();
  const list = await revisions
    .find({ docId: id }, { projection: { content: 0 } })
    .sort({ updatedAt: -1 })
    .limit(HISTORY_LIMIT)
    .toArray();
  const authors = await usersById([...new Map(list.map((r) => [r.authorId.toHexString(), r.authorId])).values()]);
  return list.map((r) => ({
    id: r._id.toHexString(),
    version: r.version,
    author: authors.get(r.authorId.toHexString()) ?? unknown(r.authorId),
    restored: Boolean(r.restoredFrom),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

async function findRevision(docId: ObjectId, rawRevId: string) {
  const { revisions } = await collections();
  const rev = await revisions.findOne({ _id: parseId(rawRevId), docId });
  if (!rev) throw new HttpError(404, "Version not found");
  return rev;
}

export async function getRevision(user: SessionUser, rawId: string, rawRevId: string) {
  const id = parseId(rawId);
  await loadAccess(user, id);
  const rev = await findRevision(id, rawRevId);
  return { id: rev._id.toHexString(), version: rev.version, title: rev.title, content: rev.content };
}

export async function restoreRevision(user: SessionUser, rawId: string, rawRevId: string) {
  const id = parseId(rawId);
  const { role } = await loadAccess(user, id);
  if (!canEdit(role)) throw forbidden("You have view-only access to this document");
  const rev = await findRevision(id, rawRevId);

  const { documents } = await collections();
  const updated = await documents.findOneAndUpdate(
    { _id: id, ...editableBy(user._id) },
    { $set: { content: rev.content, excerpt: excerptOf(rev.content), updatedAt: new Date() }, $inc: { version: 1 } },
    { returnDocument: "after", projection: { version: 1, title: 1 } },
  );
  if (!updated) throw forbidden();
  await recordRevision({
    docId: id,
    authorId: user._id,
    version: updated.version,
    title: updated.title,
    content: rev.content,
    restoredFrom: rev._id,
  });
  return { version: updated.version };
}

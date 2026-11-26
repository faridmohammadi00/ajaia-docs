import type { JSONContent } from "@tiptap/core";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { canEdit, canManage, editableBy, readableBy, roleFor } from "./access";
import { collections } from "./db";
import { EMPTY_DOC } from "./editor/extensions";
import { assertValidDoc } from "./editor/schema";
import { forbidden, HttpError, notFound } from "./errors";
import type { SessionUser } from "./session";
import type { DocumentRecord, DocumentSummary, DocumentView, PublicUser, ShareRole, UserRecord } from "./types";

export const titleSchema = z.string().trim().min(1, "Title cannot be empty").max(200, "Title is too long");
export const shareRoleSchema = z.enum(["editor", "viewer"]);

const toPublic = (u: Pick<UserRecord, "_id" | "email" | "name">): PublicUser => ({
  id: u._id.toHexString(),
  email: u.email,
  name: u.name,
});

const UNKNOWN_USER = (id: ObjectId): PublicUser => ({ id: id.toHexString(), email: "", name: "Unknown user" });

export function parseId(id: string): ObjectId {
  if (!ObjectId.isValid(id) || id.length !== 24) throw notFound();
  return new ObjectId(id);
}

async function usersById(ids: ObjectId[]): Promise<Map<string, PublicUser>> {
  if (ids.length === 0) return new Map();
  const { users } = await collections();
  const found = await users
    .find({ _id: { $in: ids } }, { projection: { email: 1, name: 1 } })
    .toArray();
  return new Map(found.map((u) => [u._id.toHexString(), toPublic(u)]));
}

async function loadAccess(user: SessionUser, id: ObjectId) {
  const { documents } = await collections();
  const doc = await documents.findOne({ _id: id }, { projection: { ownerId: 1, shares: 1 } });
  const role = doc ? roleFor(doc, user._id) : null;
  // Hide existence of documents the user cannot read.
  if (!doc || !role) throw notFound();
  return { doc, role };
}

export async function listDocuments(user: SessionUser) {
  const { documents } = await collections();
  const docs = await documents
    .find(readableBy(user._id), { projection: { title: 1, ownerId: 1, shares: 1, updatedAt: 1 } })
    .sort({ updatedAt: -1 })
    .limit(500)
    .toArray();
  const owners = await usersById([...new Map(docs.map((d) => [d.ownerId.toHexString(), d.ownerId])).values()]);

  const owned: DocumentSummary[] = [];
  const shared: DocumentSummary[] = [];
  for (const d of docs) {
    const role = roleFor(d, user._id)!;
    const summary: DocumentSummary = {
      id: d._id.toHexString(),
      title: d.title,
      role,
      owner: owners.get(d.ownerId.toHexString()) ?? UNKNOWN_USER(d.ownerId),
      updatedAt: d.updatedAt.toISOString(),
    };
    (role === "owner" ? owned : shared).push(summary);
  }
  return { owned, shared };
}

export async function getDocument(user: SessionUser, rawId: string): Promise<DocumentView> {
  const { documents } = await collections();
  const doc = await documents.findOne({ _id: parseId(rawId), ...readableBy(user._id) });
  if (!doc) throw notFound();
  const people = await usersById([doc.ownerId, ...doc.shares.map((s) => s.userId)]);
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    role: roleFor(doc, user._id)!,
    owner: people.get(doc.ownerId.toHexString()) ?? UNKNOWN_USER(doc.ownerId),
    updatedAt: doc.updatedAt.toISOString(),
    content: doc.content,
    version: doc.version,
    shares: doc.shares.map((s) => ({
      user: people.get(s.userId.toHexString()) ?? UNKNOWN_USER(s.userId),
      role: s.role,
    })),
  };
}

export async function createDocument(
  user: SessionUser,
  input: { title?: string; content?: JSONContent },
): Promise<{ id: string }> {
  const { documents } = await collections();
  const now = new Date();
  const record: Omit<DocumentRecord, "_id"> = {
    ownerId: user._id,
    title: titleSchema.parse(input.title ?? "Untitled document"),
    content: input.content ? assertValidDoc(input.content) : EMPTY_DOC,
    version: 1,
    shares: [],
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await documents.insertOne(record as DocumentRecord);
  return { id: insertedId.toHexString() };
}

// Optimistic concurrency: the write only lands if the client edited the latest version.
export async function saveContent(user: SessionUser, rawId: string, content: unknown, baseVersion: number) {
  const id = parseId(rawId);
  const valid = assertValidDoc(content);
  const { documents } = await collections();
  const updated = await documents.findOneAndUpdate(
    { _id: id, version: baseVersion, ...editableBy(user._id) },
    { $set: { content: valid, updatedAt: new Date() }, $inc: { version: 1 } },
    { returnDocument: "after", projection: { version: 1, updatedAt: 1 } },
  );
  if (updated) return { version: updated.version, updatedAt: updated.updatedAt.toISOString() };

  const { role } = await loadAccess(user, id);
  if (!canEdit(role)) throw forbidden("You have view-only access to this document");
  const current = await documents.findOne({ _id: id }, { projection: { version: 1 } });
  throw new HttpError(409, "This document was changed elsewhere. Reload to get the latest version.", {
    currentVersion: current?.version,
  });
}

export async function renameDocument(user: SessionUser, rawId: string, title: string) {
  const id = parseId(rawId);
  const clean = titleSchema.parse(title);
  const { documents } = await collections();
  const res = await documents.updateOne(
    { _id: id, ...editableBy(user._id) },
    { $set: { title: clean, updatedAt: new Date() } },
  );
  if (res.matchedCount === 0) {
    await loadAccess(user, id);
    throw forbidden("You have view-only access to this document");
  }
  return { title: clean };
}

export async function deleteDocument(user: SessionUser, rawId: string) {
  const id = parseId(rawId);
  const { role } = await loadAccess(user, id);
  if (!canManage(role)) throw forbidden("Only the owner can delete this document");
  const { documents } = await collections();
  await documents.deleteOne({ _id: id, ownerId: user._id });
}

export async function shareDocument(user: SessionUser, rawId: string, email: string, role: ShareRole) {
  const id = parseId(rawId);
  const access = await loadAccess(user, id);
  if (!canManage(access.role)) throw forbidden("Only the owner can share this document");

  const { users, documents } = await collections();
  const target = await users.findOne(
    { email: email.trim().toLowerCase() },
    { projection: { email: 1, name: 1 } },
  );
  if (!target) throw new HttpError(404, `No user with email ${email}`);
  if (target._id.equals(user._id)) throw new HttpError(400, "You already own this document");

  const existing = await documents.updateOne(
    { _id: id, ownerId: user._id, "shares.userId": target._id },
    { $set: { "shares.$.role": role } },
  );
  if (existing.matchedCount === 0) {
    await documents.updateOne(
      { _id: id, ownerId: user._id, "shares.userId": { $ne: target._id } },
      { $push: { shares: { userId: target._id, role, addedAt: new Date() } } },
    );
  }
  return { user: toPublic(target), role };
}

export async function unshareDocument(user: SessionUser, rawId: string, rawUserId: string) {
  const id = parseId(rawId);
  const access = await loadAccess(user, id);
  if (!canManage(access.role)) throw forbidden("Only the owner can change sharing");
  const { documents } = await collections();
  await documents.updateOne(
    { _id: id, ownerId: user._id },
    { $pull: { shares: { userId: parseId(rawUserId) } } },
  );
}

export async function listShareCandidates(user: SessionUser): Promise<PublicUser[]> {
  const { users } = await collections();
  const all = await users
    .find({ _id: { $ne: user._id } }, { projection: { email: 1, name: 1 } })
    .sort({ name: 1 })
    .limit(100)
    .toArray();
  return all.map(toPublic);
}

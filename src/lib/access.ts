import type { ObjectId } from "mongodb";
import type { DocumentRecord, Role } from "./types";

type AccessFields = Pick<DocumentRecord, "ownerId" | "shares">;

export function roleFor(doc: AccessFields, userId: ObjectId): Role | null {
  if (doc.ownerId.equals(userId)) return "owner";
  return doc.shares.find((s) => s.userId.equals(userId))?.role ?? null;
}

export const canEdit = (role: Role | null) => role === "owner" || role === "editor";
export const canManage = (role: Role | null) => role === "owner";

export const readableBy = (userId: ObjectId) => ({
  $or: [{ ownerId: userId }, { "shares.userId": userId }],
});

export const editableBy = (userId: ObjectId) => ({
  $or: [{ ownerId: userId }, { shares: { $elemMatch: { userId, role: "editor" } } }],
});

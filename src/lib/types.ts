import type { JSONContent } from "@tiptap/core";
import type { ObjectId } from "mongodb";

export type ShareRole = "editor" | "viewer";
export type Role = "owner" | ShareRole;

export interface UserRecord {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}

export interface ShareRecord {
  userId: ObjectId;
  role: ShareRole;
  addedAt: Date;
}

export interface DocumentRecord {
  _id: ObjectId;
  ownerId: ObjectId;
  title: string;
  content: JSONContent;
  excerpt?: string;
  version: number;
  shares: ShareRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RevisionRecord {
  _id: ObjectId;
  docId: ObjectId;
  authorId: ObjectId;
  version: number;
  title: string;
  content: JSONContent;
  restoredFrom?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevisionSummary {
  id: string;
  version: number;
  author: PublicUser;
  restored: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  role: Role;
  owner: PublicUser;
  updatedAt: string;
  excerpt: string;
}

export interface ShareView {
  user: PublicUser;
  role: ShareRole;
}

export interface DocumentView extends DocumentSummary {
  content: JSONContent;
  version: number;
  shares: ShareView[];
}

import { canEdit } from "./access";
import { collections } from "./db";
import { loadAccess, parseId, usersById } from "./documents";
import type { SessionUser } from "./session";
import type { PresenceMode, PresenceState } from "./types";

export const HEARTBEAT_MS = 10_000;
// A user counts as present for three missed heartbeats.
export const ACTIVE_WINDOW_MS = 3 * HEARTBEAT_MS;

export async function heartbeat(
  user: SessionUser,
  rawId: string,
  requested: PresenceMode,
  now = new Date(),
): Promise<PresenceState> {
  const id = parseId(rawId);
  const { role } = await loadAccess(user, id);
  const mode: PresenceMode = requested === "editing" && canEdit(role) ? "editing" : "viewing";
  const { presence, documents } = await collections();

  await presence.updateOne(
    { docId: id, userId: user._id },
    { $set: { mode, lastSeen: now } },
    { upsert: true },
  );

  const [active, doc] = await Promise.all([
    presence
      .find({ docId: id, lastSeen: { $gte: new Date(now.getTime() - ACTIVE_WINDOW_MS) } })
      .sort({ lastSeen: -1 })
      .limit(50)
      .toArray(),
    documents.findOne({ _id: id }, { projection: { version: 1, updatedBy: 1 } }),
  ]);
  const people = await usersById([...active.map((p) => p.userId), ...(doc?.updatedBy ? [doc.updatedBy] : [])]);

  return {
    active: active
      .filter((p) => people.has(p.userId.toHexString()))
      .map((p) => ({ user: people.get(p.userId.toHexString())!, mode: p.mode, self: p.userId.equals(user._id) })),
    version: doc?.version ?? 0,
    updatedBy: doc?.updatedBy ? (people.get(doc.updatedBy.toHexString()) ?? null) : null,
  };
}

export async function leave(user: SessionUser, rawId: string) {
  const { presence } = await collections();
  await presence.deleteOne({ docId: parseId(rawId), userId: user._id });
}

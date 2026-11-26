import { MongoClient } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { toErrorResponse } from "@/lib/errors";

// Integration test against a real MongoDB (see README). Skipped when none is configured.
const uri = process.env.TEST_MONGODB_URI;
const dbName = `ajaia_test_${Date.now()}`;

describe.skipIf(!uri)("document service (MongoDB)", () => {
  let svc: typeof import("@/lib/documents");
  let rev: typeof import("@/lib/revisions");
  type User = Parameters<typeof svc.listDocuments>[0];
  let alice: User, bob: User, carol: User;

  // Maps service errors exactly like the API routes do.
  const status = (p: Promise<unknown>) =>
    p.then(
      () => 200,
      (e) => toErrorResponse(e).status,
    );
  const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

  beforeAll(async () => {
    Object.assign(process.env, { MONGODB_URI: uri, MONGODB_DB: dbName, SESSION_SECRET: "x".repeat(32) });
    svc = await import("@/lib/documents");
    rev = await import("@/lib/revisions");
    const { collections } = await import("@/lib/db");
    const { users } = await collections();
    const byEmail = async (email: string) => {
      const u = (await users.findOne({ email }))!;
      return { _id: u._id, id: u._id.toHexString(), email: u.email, name: u.name };
    };
    [alice, bob, carol] = await Promise.all(["alice", "bob", "carol"].map((n) => byEmail(`${n}@ajaia.dev`)));
  });

  afterAll(async () => {
    const client = await MongoClient.connect(uri!);
    await client.db(dbName).dropDatabase();
    await client.close();
  });

  it("enforces owner / editor / viewer / no-access rules end to end", async () => {
    const { id } = await svc.createDocument(alice, { title: "Plan" });
    await svc.shareDocument(alice, id, "bob@ajaia.dev", "editor");
    await svc.shareDocument(alice, id, "carol@ajaia.dev", "viewer");

    expect((await svc.listDocuments(bob)).shared.map((d) => d.id)).toContain(id);
    expect((await svc.listDocuments(alice)).owned.map((d) => d.id)).toContain(id);

    expect(await status(svc.saveContent(bob, id, doc("from bob"), 1))).toBe(200);
    expect(await status(svc.saveContent(carol, id, doc("from carol"), 2))).toBe(403);
    expect(await status(svc.shareDocument(bob, id, "carol@ajaia.dev", "editor"))).toBe(403);
    expect(await status(svc.deleteDocument(bob, id))).toBe(403);

    await svc.unshareDocument(alice, id, carol.id);
    expect(await status(svc.getDocument(carol, id))).toBe(404);
  });

  it("rejects stale writes instead of overwriting newer content", async () => {
    const { id } = await svc.createDocument(alice, {});
    await svc.shareDocument(alice, id, "bob@ajaia.dev", "editor");

    expect(await svc.saveContent(alice, id, doc("alice v2"), 1)).toMatchObject({ version: 2 });
    expect(await status(svc.saveContent(bob, id, doc("bob on stale v1"), 1))).toBe(409);
    expect(JSON.stringify((await svc.getDocument(alice, id)).content)).toContain("alice v2");
  });

  it("validates input", async () => {
    const { id } = await svc.createDocument(alice, {});
    expect(await status(svc.renameDocument(alice, id, "   "))).toBe(400);
    expect(await status(svc.saveContent(alice, id, { type: "doc", content: [{ type: "script" }] }, 1))).toBe(400);
    expect(await status(svc.shareDocument(alice, id, "nobody@ajaia.dev", "viewer"))).toBe(404);
    expect(await status(svc.getDocument(alice, "not-an-id"))).toBe(404);
  });

  it("groups saves into history entries and restores an older version", async () => {
    const { id } = await svc.createDocument(alice, { title: "History" });
    await svc.shareDocument(alice, id, "bob@ajaia.dev", "editor");
    await svc.shareDocument(alice, id, "carol@ajaia.dev", "viewer");

    await svc.saveContent(alice, id, doc("alice draft"), 1);
    await svc.saveContent(alice, id, doc("alice final"), 2);
    await svc.saveContent(bob, id, doc("bob rewrite"), 3);

    const history = await rev.listRevisions(carol, id);
    expect(history.map((r) => [r.author.name, r.version])).toEqual([
      ["Bob Martin", 4],
      ["Alice Chen", 3],
    ]);

    const aliceEntry = history[1];
    expect(JSON.stringify((await rev.getRevision(carol, id, aliceEntry.id)).content)).toContain("alice final");
    expect(await status(rev.restoreRevision(carol, id, aliceEntry.id))).toBe(403);

    expect(await rev.restoreRevision(bob, id, aliceEntry.id)).toEqual({ version: 5 });
    const current = await svc.getDocument(alice, id);
    expect(JSON.stringify(current.content)).toContain("alice final");
    const after = await rev.listRevisions(alice, id);
    expect(after[0]).toMatchObject({ version: 5, restored: true });
    expect(await status(rev.listRevisions(alice, "0".repeat(24)))).toBe(404);
  });
});

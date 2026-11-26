import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { canEdit, canManage, roleFor } from "@/lib/access";

const owner = new ObjectId();
const editor = new ObjectId();
const viewer = new ObjectId();
const stranger = new ObjectId();
const doc = {
  ownerId: owner,
  shares: [
    { userId: editor, role: "editor" as const, addedAt: new Date() },
    { userId: viewer, role: "viewer" as const, addedAt: new Date() },
  ],
};

describe("roleFor", () => {
  it("resolves each user's role", () => {
    expect(roleFor(doc, owner)).toBe("owner");
    expect(roleFor(doc, editor)).toBe("editor");
    expect(roleFor(doc, viewer)).toBe("viewer");
    expect(roleFor(doc, stranger)).toBeNull();
  });

  it("compares ids by value, not reference", () => {
    expect(roleFor(doc, new ObjectId(editor.toHexString()))).toBe("editor");
  });
});

describe("permissions", () => {
  it("only owners and editors can edit", () => {
    expect([canEdit("owner"), canEdit("editor"), canEdit("viewer"), canEdit(null)]).toEqual([true, true, false, false]);
  });

  it("only owners can manage sharing", () => {
    expect([canManage("owner"), canManage("editor"), canManage("viewer")]).toEqual([true, false, false]);
  });
});

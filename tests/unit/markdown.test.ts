import { describe, expect, it } from "vitest";
import { docToMarkdown } from "@/lib/editor/markdown";

describe("docToMarkdown", () => {
  it("serializes headings, marks and nested lists", () => {
    const md = docToMarkdown({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Goals" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Ship", marks: [{ type: "bold" }] },
            { type: "text", text: " it " },
            { type: "text", text: "now", marks: [{ type: "underline" }] },
          ],
        },
        {
          type: "orderedList",
          attrs: { start: 1 },
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "two" }] }] },
          ],
        },
      ],
    });
    expect(md).toBe("## Goals\n\n**Ship** it <u>now</u>\n\n1. one\n2. two\n");
  });
});

describe("plainText", () => {
  it("separates blocks and truncates", async () => {
    const { plainText } = await import("@/lib/editor/text");
    const doc = {
      type: "doc",
      content: [
        { type: "heading", content: [{ type: "text", text: "Title" }] },
        { type: "paragraph", content: [{ type: "text", text: "Body text" }] },
      ],
    };
    expect(plainText(doc)).toBe("Title Body text");
    expect(plainText(doc, 7)).toBe("Title B");
  });
});

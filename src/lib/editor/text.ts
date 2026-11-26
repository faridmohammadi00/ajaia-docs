import type { JSONContent } from "@tiptap/core";

const BLOCKS = new Set(["paragraph", "heading", "listItem", "blockquote"]);

export function plainText(node: JSONContent, max = Infinity): string {
  const parts: string[] = [];
  let length = 0;
  const walk = (n: JSONContent) => {
    if (length >= max) return;
    if (n.text) {
      parts.push(n.text);
      length += n.text.length;
    }
    n.content?.forEach(walk);
    if (n.type && BLOCKS.has(n.type)) parts.push(" ");
  };
  walk(node);
  return parts.join("").replace(/\s+/g, " ").trim().slice(0, max);
}

export const excerptOf = (doc: JSONContent) => plainText(doc, 240);

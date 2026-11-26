import type { JSONContent } from "@tiptap/core";

const MARKS: Record<string, [string, string]> = {
  bold: ["**", "**"],
  italic: ["_", "_"],
  strike: ["~~", "~~"],
  underline: ["<u>", "</u>"],
};

function inline(nodes: JSONContent[] = []): string {
  return nodes
    .map((n) => {
      if (n.type === "hardBreak") return "  \n";
      let text = (n.text ?? "").replace(/([\\`*_~[\]#<>])/g, "\\$1");
      for (const mark of n.marks ?? []) {
        if (mark.type === "link") text = `[${text}](${mark.attrs?.href ?? ""})`;
        else if (MARKS[mark.type]) text = MARKS[mark.type][0] + text + MARKS[mark.type][1];
      }
      return text;
    })
    .join("");
}

function block(node: JSONContent, indent = ""): string {
  const children = node.content ?? [];
  switch (node.type) {
    case "heading":
      return `${"#".repeat(node.attrs?.level ?? 1)} ${inline(children)}`;
    case "paragraph":
      return indent + inline(children);
    case "blockquote":
      return children.map((c) => block(c).replace(/^/gm, "> ")).join("\n>\n");
    case "horizontalRule":
      return "---";
    case "bulletList":
    case "orderedList":
      return children
        .map((item, i) => {
          const marker = node.type === "orderedList" ? `${(node.attrs?.start ?? 1) + i}.` : "-";
          const [first, ...rest] = item.content ?? [];
          const head = `${indent}${marker} ${first ? block(first).trimStart() : ""}`;
          const tail = rest.map((c) => block(c, indent + "   "));
          return [head, ...tail].join("\n");
        })
        .join("\n");
    default:
      return inline(children);
  }
}

export function docToMarkdown(doc: JSONContent): string {
  return (doc.content ?? []).map((n) => block(n)).join("\n\n").trim() + "\n";
}
